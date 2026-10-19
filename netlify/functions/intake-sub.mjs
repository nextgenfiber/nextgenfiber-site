// Public subcontractor-intake endpoint for /cadastro.
// Parses the multipart submission (JSON `payload` field + up to 4 files) and
// e-mails it to ngf@ as a human summary + `intake.json` + the uploaded files, so
// the /novo-sub Fase B reads intake.json deterministically. No DB, no storage.
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

const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 9 * 1024 * 1024;
const FIELDS = { w9: 'w9', wc: 'wc', gl: 'gl', dl: 'dl' }; // upload field -> safe basename
// magic bytes -> (type, extension); the client's filename/MIME are not trusted
const SIGS = [
  { ext: 'pdf', type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: 'jpg', type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

const sniff = (data) =>
  SIGS.find((s) => s.bytes.every((b, i) => data[i] === b)) || null;

// one-line, length-capped, no control chars — safe to drop into a text email
const clean = (v, max = 200) =>
  String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) || '—';

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

  if (files.length > 4) return json(400, { error: 'too many files' });
  let total = 0;
  const attachments = [];
  for (const f of files) {
    const base = FIELDS[f.name];
    if (!base) return json(400, { error: 'unexpected file field' });
    if (f.data.length > MAX_FILE) return json(413, { error: 'file too large' });
    const sig = sniff(f.data); // trust the bytes, not the client's type/name
    if (!sig) return json(400, { error: 'file type not allowed' });
    total += f.data.length;
    // server-built filename — never the client's string
    attachments.push({ filename: `${base}.${sig.ext}`, content: f.data, contentType: sig.type });
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
  // Human summary uses only sanitized one-line values; the source of truth for
  // Fase B is the intake.json attachment (no in-body marker to inject into).
  const summary =
    `Novo cadastro de subcontratado recebido pelo formulario (/cadastro).\n\n` +
    `Razao social: ${clean(legal)}\n` +
    `Signatario:   ${clean(payload?.signer?.name)} <${clean(payload?.signer?.email, 120)}>\n` +
    `Escopo:       ${clean((payload.scope || []).join(', '))}\n` +
    `Workers comp: ${clean(payload.wc, 20)}\n` +
    `Anexos:       ${clean(attachments.map((a) => a.filename).join(', ')) }\n\n` +
    `Dados completos para a Fase B do /novo-sub: anexo intake.json.`;

  attachments.unshift({
    filename: 'intake.json',
    content: Buffer.from(JSON.stringify(payload, null, 2), 'utf8'),
    contentType: 'application/json',
  });

  try {
    await transport.sendMail({
      from,
      to,
      replyTo: /.+@.+\..+/.test(payload?.signer?.email || '') ? payload.signer.email : undefined,
      subject: `NOVO SUB — ${clean(legal, 120)}`,
      text: summary,
      attachments,
    });
  } catch (e) {
    console.error('intake-sub sendMail failed:', e && e.message); // detail stays server-side
    return json(502, { error: 'send failed' });
  }

  return json(200, { ok: true });
}
