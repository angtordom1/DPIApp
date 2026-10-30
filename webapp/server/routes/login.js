const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const path = require('path')

const User = require(path.join(__dirname,'../models/user'))
const { sessionToken } = require(path.join(__dirname,'../tokens'))
const { asyncHandler } = require(path.join(__dirname,'../validation'))

// Brute-force protection
const WINDOW_MS = 15 * 60 * 1000
function failureCounter(limit, keyOf) {
    const failures = new Map()  // key -> { count, resetAt }
    const entry = (key) => {
        const e = failures.get(key)
        if (e && e.resetAt <= Date.now()) failures.delete(key)
        return failures.get(key)
    }
    // drop expired entries so the map doesn't grow with every address seen
    setInterval(() => [...failures.keys()].forEach(entry), WINDOW_MS).unref()
    return {
        // seconds until the key is unblocked, or 0 if it isn't blocked
        blockedFor: (req) => {
            const e = entry(keyOf(req))
            return e && e.count >= limit ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0
        },
        record: (req) => {
            const key = keyOf(req)
            const e = entry(key) || { count: 0, resetAt: Date.now() + WINDOW_MS }
            e.count++
            failures.set(key, e)
        },
        // takes back a recorded attempt that turned out to have the right credentials
        release: (req) => {
            const e = entry(keyOf(req))
            if (e && e.count > 0) e.count--
        },
    }
}
// 10 per account and IP stops password guessing without letting anyone behind the same IP
const perAccount = failureCounter(10, (req) => `${req.ip}|${req.body.username.toLowerCase()}`)
// 100 per IP across accounts stops password spraying over many usernames
const perIp = failureCounter(100, (req) => req.ip)

const INVALID_CREDENTIALS = 'Usuario o contraseña incorrectos'
// compared against when the user does not exist, so both cases take the same bcrypt time
const DUMMY_HASH = bcrypt.hashSync('dummy password', 10)

router.post('/', asyncHandler(async (req, res) => {

    let body = req.body;

    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
        return res.status(400).json({ message: 'Por favor, introduzca usuario y contraseña' })
    }

    const retryAfter = Math.max(perAccount.blockedFor(req), perIp.blockedFor(req))
    if (retryAfter) {
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({ message: 'Demasiados intentos fallidos, inténtelo de nuevo en 15 minutos.' })
    }
    // Counted as a failure right away and taken back if the credentials are right: checking and
    // recording only after the (slow) password comparison would let a burst of parallel guesses
    // all pass the check above before any of them is recorded.
    perAccount.record(req)
    perIp.record(req)
    const succeeded = () => {
        perAccount.release(req)
        perIp.release(req)
    }

    let userDB
    try {
        userDB = await User.findOne({$or: [ {username: body.username}, {email: body.username.toLowerCase()} ]})
        // unknown users are compared too, so both cases take the same time
        const passwordOk = await bcrypt.compare(body.password, userDB ? userDB.password : DUMMY_HASH)
        if (!userDB || !passwordOk) {
            return res.status(401).json({ message: INVALID_CREDENTIALS })
        }
    } catch (err) {
        succeeded()  // a server error is not a guess
        throw err
    }
    succeeded()

    if (!userDB.isValid) {
        return res.status(403).json({
            message: '¡Debe validar la cuenta con el correo de confirmación!',
        })
    }

    return res.json({
        userDB,
        token: sessionToken(userDB)
    })

}))

module.exports = router
