const jwt = require('jsonwebtoken')

const SESSION = { audience: 'session', expiresIn: '7d' }
const VERIFY = { audience: 'verify', expiresIn: '1h' }


const sessionToken = (user) =>
    jwt.sign({ data: { username: user.username, isAdmin: Boolean(user.isAdmin) } }, process.env.JWT_SECRET,
        { ...SESSION, subject: String(user._id) })

const verificationToken = (user) =>
    jwt.sign({}, process.env.JWT_SECRET, { ...VERIFY, subject: String(user._id) })

const readSessionToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { audience: SESSION.audience })
const readVerificationToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { audience: VERIFY.audience })

function assertStrongSecret() {
    const secret = process.env.JWT_SECRET
    if (!secret || secret.length < 32 || secret === 'change_me') {
        throw new Error('JWT_SECRET must be set to a random value of at least 32 characters (see .env.example)')
    }
}

module.exports = { sessionToken, verificationToken, readSessionToken, readVerificationToken, assertStrongSecret }
