const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_USER,
        SMTP_PASS,
        SMTP_FROM
    } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        logger.error('EMAIL_SERVICE', 'SMTP configuration is missing required environment variables');
        throw new Error('Email service is not configured correctly');
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: SMTP_SECURE === 'true',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    logger.success('EMAIL_SERVICE', `SMTP transporter initialised for ${SMTP_USER}`);

    transporter.verify().then(() => {
        logger.success('EMAIL_SERVICE', 'SMTP connection verified');
    }).catch((err) => {
        logger.error('EMAIL_SERVICE', 'Failed to verify SMTP connection', err);
    });

    return transporter;
}

async function sendEmail({ to, subject, text, html }) {
    const mailer = getTransporter();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
        from,
        to,
        subject,
        text,
        html
    };

    try {
        const info = await mailer.sendMail(mailOptions);
        logger.success('EMAIL_SERVICE', `Email sent to ${to} (messageId=${info.messageId})`);
        return info;
    } catch (error) {
        logger.error('EMAIL_SERVICE', `Failed to send email to ${to}`, error);
        throw error;
    }
}

async function sendClientWelcomeEmail({ name, email, tempPassword }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const subject = 'Your client access for Ad Campaign Automation';

    const plainText = [
        `Hi ${name || 'there'},`,
        '',
        'Your client account has been created for the Ad Campaign Automation dashboard.',
        '',
        `Login URL: ${frontendUrl}`,
        `Email: ${email}`,
        `Temporary password: ${tempPassword}`,
        '',
        'For security, please sign in and change your password as soon as possible.',
        '',
        'If you did not expect this email, you can ignore it.'
    ].join('\n');

    const html = `
        <p>Hi ${name || 'there'},</p>
        <p>Your client account has been created for the <strong>Ad Campaign Automation</strong> dashboard.</p>
        <p><strong>Login URL:</strong> <a href="${frontendUrl}" target="_blank" rel="noopener noreferrer">${frontendUrl}</a><br/>
        <strong>Email:</strong> ${email}<br/>
        <strong>Temporary password:</strong> ${tempPassword}</p>
        <p style="margin-top: 16px;">For security, please sign in and change your password as soon as possible.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">If you did not expect this email, you can safely ignore it.</p>
    `;

    return sendEmail({
        to: email,
        subject,
        text: plainText,
        html
    });
}

module.exports = {
    sendEmail,
    sendClientWelcomeEmail
};

