const nodemailer = require('nodemailer');

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

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const body = parseBody(req.body);
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

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  const toEmail = String(process.env.EMAIL_TO || '').trim();
  const fromEmail = String(process.env.CONTACT_FROM_EMAIL || smtpUser).trim();

  if (!smtpUser || !smtpPass || !toEmail) {
    return json(res, 500, { message: 'Serveur non configure (SMTP).' });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br/>');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const emailPayload = {
    from: fromEmail,
    to: toEmail,
    subject: 'Nouveau message depuis le site IBETHEL AGEIB',
    replyTo: email,
    text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<h2>Nouveau message</h2><p><strong>Nom:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong><br/>${safeMessage}</p>`,
  };

  try {
    await transporter.sendMail(emailPayload);
    return json(res, 200, { message: 'Message envoye.' });
  } catch (error) {
    return json(res, 502, { message: 'Erreur envoi email: ' + String(error.message || error) });
  }
};
