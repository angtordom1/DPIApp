const express = require('express')
const bcrypt = require('bcrypt')
const path = require('path')
const rateLimit = require('express-rate-limit')

const User = require(path.join(__dirname,'../models/user'))
const { verifyAuth } = require(path.join(__dirname,'../middleware/auth'))
const { sendMail } = require(path.join(__dirname,'../mailer'))
const { verificationToken, readVerificationToken } = require(path.join(__dirname,'../tokens'))
const { signupError, asyncHandler, escapeHtml } = require(path.join(__dirname,'../validation'))

const router = express.Router()
const saltRounds = 10
const frontendURL = process.env.APP_URL || "http://localhost:3000"

const CASE_INSENSITIVE = { locale: 'en', strength: 2 }
const VERIFICATION_FAILED = { message: 'La verificación falló, el link puede ser inválido o estar expirado' }

// Each sign-up sends an email, so the endpoint could be used to spam from the app's address.
// Only accounts actually created count (failed attempts are already cheap and say why).
const signupLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    skipFailedRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiados registros desde esta conexión, inténtelo más tarde.' },
})

router.post('/', signupLimit, asyncHandler(async (req, res) => {

    const error = signupError(req.body)
    if (error) {
        return res.status(400).json({ message: error })
    }
    const { username, password } = req.body
    const email = req.body.email.toLowerCase()

    if (await User.exists({ username }).collation(CASE_INSENSITIVE)) {
        return res.status(409).json({ message: 'Este nombre de usuario ya está siendo utilizado' })
    }
    if (await User.exists({ email })) {
        return res.status(409).json({ message: 'Este correo ya está siendo utilizado' })
    }

    let userDB
    try {
        userDB = await User.create({ username, email, password: await bcrypt.hash(password, saltRounds) })
    } catch (err) {
        // two sign-ups with the same name or email at once: the unique index stops the second one
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Este nombre de usuario o correo ya está siendo utilizado' })
        }
        throw err
    }
    console.log('User saved: ', userDB.username)

    const verificationUrl = `${frontendURL}/api/users/verify/${verificationToken(userDB)}`
    const msg = {
        to: email,
        subject: 'Verificación de cuenta - DPIAPP',
        html: `<p>Buenas ${escapeHtml(userDB.username)},</p>
        <p>Ha creado una cuenta en nuestra web.</p>
        <p>Para poder verificar su cuenta, clique sobre el siguiente botón:<p>
        <a href="${escapeHtml(verificationUrl)}"><button style="color: #ffffff;background: #6366F1;border: 1px solid #6366F1;">Verificar cuenta</button></a>`,
    }

    try {
        await sendMail(msg)
        console.log('Email sent successfully!')
        return res.json(userDB)
    } catch (err) {
        // without the email the account could never be verified, so let the user register again
        console.error('Verification email failed:', err.message)
        await User.deleteOne({ _id: userDB._id })
        return res.status(502).json({
            message: 'Ocurrió un problema al enviar el correo, disculpe las molestias',
        })
    }
}))

router.get('/verify/:token', asyncHandler(async (req, res) => {
    let userId
    try {
        userId = readVerificationToken(req.params.token).sub
    } catch {
        return res.status(400).json(VERIFICATION_FAILED)
    }
    const user = await User.findByIdAndUpdate(userId, { isValid: true })
    if (!user) {
        return res.status(400).json(VERIFICATION_FAILED)
    }
    console.log('User verified: ', user.username)
    return res.redirect(`${frontendURL}/login`)
}))

// users can delete their own account; admins can delete any
router.delete('/:username', verifyAuth, asyncHandler(async (req, res) => {
    const target = await User.findOne({ username: req.params.username }, '_id').lean()
    // checked before saying whether the account exists, so regular users can't probe for names
    if (String(target?._id) !== String(req.user._id) && !req.user.isAdmin) {
        return res.status(403).json({ message: 'Acceso denegado' })
    }
    if (!target) {
        return res.status(404).json({ message: 'No se pudo borrar el usuario, no existe' })
    }
    await User.deleteOne({ _id: target._id })
    res.status(200).json({ message: 'Usuario borrado' })
}))

module.exports = router
