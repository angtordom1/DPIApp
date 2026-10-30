// Server-side input rules
const USERNAME_RE = /^(?=.*[A-Za-z])[A-Za-z0-9_.-]{4,20}$/
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>".]+$/
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72  // bytes: bcrypt ignores anything past 72 bytes (an accented letter takes 2)
// exact names, case-insensitive: they would look like official accounts
const RESERVED_USERNAMES = ['admin', 'administrator', 'root', 'test']

const MESSAGES = {
    missing: 'Uno o más campos requeridos están vacíos',
    username: 'El usuario debe tener entre 4 y 20 caracteres (letras, números, punto, guion o guion bajo) y al menos una letra',
    email: 'Debe ser un correo válido',
    password: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres (las letras con tilde cuentan doble)`,
    reserved: 'Nombre de usuario no permitido',
}

function signupError({ username, email, password } = {}) {
    const fields = [username, email, password]
    if (!fields.every((field) => typeof field === 'string' && field !== '')) return MESSAGES.missing
    if (!USERNAME_RE.test(username)) return MESSAGES.username
    if (email.length > 254 || !EMAIL_RE.test(email)) return MESSAGES.email
    if (password.length < PASSWORD_MIN || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX) return MESSAGES.password
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) return MESSAGES.reserved
    return null
}


const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

module.exports = { signupError, asyncHandler, escapeHtml, MESSAGES }
