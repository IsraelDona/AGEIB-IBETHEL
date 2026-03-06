function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(payload));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();

  if (!name || !email || !message) {
    return json(res, 400, { message: 'Tous les champs sont obligatoires.' });
  }
  if (!isValidEmail(email)) {
    return json(res, 400, { message: 'Email invalide.' });
  }
  if (name.length > 120 || email.length > 190 || message.length > 5000) {
    return json(res, 400, { message: 'Contenu trop long.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey || !toEmail) {
    return json(res, 500, { message: 'Serveur non configure (emails).' });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br/>');

  const emailPayload = {
    from: fromEmail,
    to: [toEmail],
    subject: 'Nouveau message depuis le site IBETHEL AGEIB',
    reply_to: email,
    text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<h2>Nouveau message</h2><p><strong>Nom:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong><br/>${safeMessage}</p>`,
  };

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return json(res, 502, { message: `Erreur service email: ${errorText}` });
    }

    return json(res, 200, { message: 'Message envoye.' });
  } catch (error) {
    return json(res, 500, { message: 'Erreur serveur, reessayez plus tard.' });
  }
}
