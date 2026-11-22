// Cloudflare Pages Function — public subcontractor-intake endpoint for /cadastro.
// Runs on the Workers runtime (request.formData() parses multipart natively).
// E-mails ngf@ a human summary + intake.json + the uploaded files via the Resend
// HTTP API, so the /novo-sub Fase B reads intake.json deterministically.
//
// Env (Cloudflare Pages → Settings → Environment variables, never in the repo):
//   RESEND_API_KEY (required)
//   INTAKE_TO      (default ngf@nextgenfiberllc.com)
//   INTAKE_FROM    (default "NextGen Fiber <ngf@nextgenfiberllc.com>" — domain verified in Resend)

const OK_FIELDS = { w9: 'w9', wc: 'wc', gl: 'gl', auto: 'auto', dl: 'dl' };
// crew driver's licenses: dl_c1 .. dl_c20
for (let i = 1; i <= 20; i++) OK_FIELDS[`dl_c${i}`] = `dl_c${i}`;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 9 * 1024 * 1024;
// magic bytes -> (type, ext); client MIME/filename are not trusted
const SIGS = [
  { ext: 'pdf', type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: 'jpg', type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sniff = (u8) => SIGS.find((s) => s.bytes.every((b, i) => u8[i] === b)) || null;

const clean = (v, max = 200) =>
  String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max) || '—';

function toBase64(u8) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  return btoa(bin);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'expected multipart/form-data' });
  }

  // honeypot — a real browser never fills this
  if (form.get('company_website')) return json(200, { ok: true });

  let payload;
  try {
    payload = JSON.parse(form.get('payload') || '{}');
  } catch {
    return json(400, { error: 'bad payload' });
  }
  if (!payload.legal_name || !String(payload.legal_name).trim()) {
    return json(400, { error: 'legal_name required' });
  }

  // collect files from the known fields only, validate by magic bytes
  const attachments = [];
  let total = 0;
  for (const field of Object.keys(OK_FIELDS)) {
    const f = form.get(field);
    if (!f || typeof f === 'string') continue;
    const u8 = new Uint8Array(await f.arrayBuffer());
    if (u8.length > MAX_FILE) return json(413, { error: 'file too large' });
    const sig = sniff(u8);
    if (!sig) return json(400, { error: 'file type not allowed' });
    total += u8.length;
    attachments.push({ filename: `${OK_FIELDS[field]}.${sig.ext}`, content: toBase64(u8) });
  }
  if (total > MAX_TOTAL) return json(413, { error: 'attachments too large' });

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return json(500, { error: 'mail transport not configured' });

  const to = env.INTAKE_TO || 'ngf@nextgenfiberllc.com';
  const from = env.INTAKE_FROM || 'NextGen Fiber <ngf@nextgenfiberllc.com>';
  const legal = String(payload.legal_name).trim();

  const summary =
    `Novo cadastro de subcontratado recebido pelo formulario (/cadastro).\n\n` +
    `Razao social: ${clean(legal)}\n` +
    `Signatario:   ${clean(payload?.signer?.name)} <${clean(payload?.signer?.email, 120)}>\n` +
    `Escopo:       ${clean((payload.scope || []).join(', '))}\n` +
    `Seguro:       ${clean(payload.wc, 20)}${payload.no_vehicle ? ' (sem veiculo)' : ''}\n` +
    `COI:          ${payload.coi_delivery === 'broker'
      ? `vem do corretor ${clean(payload?.broker?.name, 120)} <${clean(payload?.broker?.email, 120)}> ${clean(payload?.broker?.phone, 40)}`
      : clean(payload.coi_delivery, 20)}\n` +
    `NDA:          ${payload.nda_agreed ? `aceito (${clean(payload.nda_version, 20)}) em ${clean(payload.nda_agreed_at, 40)}` : 'NAO aceito'}\n` +
    `Capacidade:   aereo ${clean(payload?.capacity?.aerial_crews, 4)} · subterraneo ${clean(payload?.capacity?.underground_crews, 4)} · splicing ${clean(payload?.capacity?.splicing_crews, 4)} · estados ${clean(payload?.capacity?.states_working, 80)}\n` +
    `Condicoes:    ${payload.terms_agreed ? `aceitas em ${clean(payload.terms_agreed_at, 40)}` : 'NAO aceitas'}\n` +
    `Anexos:       ${clean(attachments.map((a) => a.filename).join(', '))}\n\n` +
    `Dados completos para a Fase B do /novo-sub: anexo intake.json.`;

  const resendAttachments = [
    { filename: 'intake.json', content: toBase64(new TextEncoder().encode(JSON.stringify(payload, null, 2))) },
    ...attachments,
  ];
  const replyTo = /.+@.+\..+/.test(payload?.signer?.email || '') ? payload.signer.email : undefined;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject: `NOVO SUB — ${clean(legal, 120)}`,
        text: summary,
        attachments: resendAttachments,
      }),
    });
    if (!r.ok) {
      console.error('intake Resend failed:', r.status, (await r.text()).slice(0, 300));
      return json(502, { error: 'send failed' });
    }
  } catch (e) {
    console.error('intake send error:', e && e.message);
    return json(502, { error: 'send failed' });
  }

  return json(200, { ok: true });
}

// Any non-POST method
export const onRequest = async (context) =>
  context.request.method === 'POST'
    ? onRequestPost(context)
    : json(405, { error: 'method not allowed' });
