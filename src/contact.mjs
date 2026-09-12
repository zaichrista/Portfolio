const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const MESSAGE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

const clean = (value) => typeof value === 'string' ? value.trim() : '';

export function validateContact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const name = clean(input.name);
  const email = clean(input.email).toLowerCase();
  const message = clean(input.message);
  const company = clean(input.company);
  const website = clean(input.website);
  const startedAt = Number(input.startedAt);

  // `website` is a honeypot. Human visitors must explicitly accept the notice.
  if (website || input.privacyAccepted !== true) return null;
  if (name.length < 2 || name.length > 100) return null;
  if (!EMAIL.test(email) || email.length > 254) return null;
  if (message.length < 20 || message.length > 5000) return null;
  if (company.length > 120) return null;
  if (CONTROL_CHARACTERS.test(name) || CONTROL_CHARACTERS.test(company)) return null;
  if (MESSAGE_CONTROL_CHARACTERS.test(message)) return null;
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500 || Date.now() - startedAt > 86_400_000) return null;

  return { name, email, message, company };
}

const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export async function deliverContact(contact, resend, signal) {
  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeCompany = escapeHtml(contact.company || 'Not supplied');
  const safeMessage = escapeHtml(contact.message).replaceAll('\n', '<br>');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resend.apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: resend.from,
      to: [resend.to],
      ...(resend.replyToVisitor ? { reply_to: contact.email } : {}),
      subject: `Portfolio enquiry from ${contact.name}`,
      html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Company:</strong> ${safeCompany}</p><p><strong>Message:</strong><br>${safeMessage}</p>`
    }),
    signal
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
