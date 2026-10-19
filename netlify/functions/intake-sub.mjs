// Public subcontractor-intake endpoint for /cadastro.
// Parses the multipart submission (JSON `payload` field + up to 4 files) and
// e-mails it to ngf@ as a structured block + attachments, so the /novo-sub Fase B
// can read it deterministically from Gmail. No DB, no storage — just the email.
//
// Env (set in the Netlify dashboard, never in the repo):
//   SMTP_HOST   (default smtp.gmail.com)
//   SMTP_PORT   (default 465, secure)
//   SMTP_USER   (required — the ngf@ mailbox)
//   SMTP_PASS   (required — a Gmail app password, not the account password)
//   INTAKE_TO   (default ngf@nextgenfiberllc.com)
//   INTAKE_FROM (default SMTP_USER)
import { parse } from 'parse-multipart-data';
import nodemailer from 'nodemailer';

const MARK = '---NGF-INTAKE-JSON---';
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 9 * 1024 * 1024;

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

  const ctype = event.headers['content-type'] || event.headers['Content-Type'] || '';
  const m = /boundary=(.+)$/.exec(ctype);
  if (!m) return json(400, { error: 'expected multipart/form-data' });

  const buf = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
  let parts;
  try {
    parts = parse(buf, m[1]);
  } catch {
    return json(400, { error: 'could not parse form' });
  }

  const fields = {};
  const files = [];
  for (const p of parts) {
    if (p.filename) files.push(p);
    else fields[p.name] = p.data.toString('utf8');
  }

  // honeypot — a real browser never fills this
  if (fields.company_website) return json(200, { ok: true });

  let payload;
  try {
    payload = JSON.parse(fields.payload || '{}');
  } catch {
    return json(400, { error: 'bad payload' });
  }
  if (!payload.legal_name || !String(payload.legal_name).trim()) {
    return json(400, { error: 'legal_name required' });
  }

  let total = 0;
  for (const f of files) {
    if (!OK_TYPES.includes(f.type)) return json(400, { error: 'file type not allowed: ' + f.type });
    if (f.data.length > MAX_FILE) return json(413, { error: 'file too large: ' + f.filename });
    total += f.data.length;
  }
  if (total > MAX_TOTAL) return json(413, { error: 'attachments too large' });

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return json(500, { error: 'mail transport not configured' });

  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const to = process.env.INTAKE_TO || 'ngf@nextgenfiberllc.com';
  const from = process.env.INTAKE_FROM || user;
  const legal = String(payload.legal_name).trim();
  const summary =
    `Novo cadastro de subcontratado recebido pelo formulario (/cadastro).\n\n` +
    `Razao social: ${legal}\n` +
    `Signatario:   ${payload?.signer?.name || '—'} <${payload?.signer?.email || '—'}>\n` +
    `Escopo:       ${(payload.scope || []).join(', ') || '—'}\n` +
    `Workers comp: ${payload.wc || '—'}\n` +
    `Anexos:       ${files.map((f) => f.filename).join(', ') || 'nenhum'}\n\n` +
    `Dados completos (JSON para a Fase B do /novo-sub):\n\n` +
    `${MARK}\n${JSON.stringify(payload, null, 2)}\n${MARK}\n`;

  try {
    await transport.sendMail({
      from,
      to,
      replyTo: payload?.signer?.email || payload.company_email || undefined,
      subject: `NOVO SUB — ${legal}`,
      text: summary,
      attachments: files.map((f) => ({ filename: f.filename, content: f.data, contentType: f.type })),
    });
  } catch (e) {
    return json(502, { error: 'send failed', detail: String(e && e.message || e).slice(0, 200) });
  }

  return json(200, { ok: true });
}
