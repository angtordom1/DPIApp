// Base URL of the Flask inference server
const FLASK_URL = (process.env.WEB_SERVER_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/inference$/, '')

module.exports = { FLASK_URL }
