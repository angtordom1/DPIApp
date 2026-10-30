const nodemailer = require('nodemailer')

// Any SMTP server works: Mailpit in the Docker stack or a real provider in
// production. The unit tests (NODE_ENV=test) only build the message, nothing is sent.
const transporter = process.env.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT) || 1025,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })

const sendMail = (msg) => transporter.sendMail({ from: process.env.MAIL_FROM || 'DPIApp <no-reply@dpiapp.local>', ...msg })

module.exports = { sendMail }
