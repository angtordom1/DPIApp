const path = require('path')

const User = require(path.join(__dirname, '../models/user'))
const { readSessionToken } = require(path.join(__dirname, '../tokens'))
const { asyncHandler } = require(path.join(__dirname, '../validation'))

const INVALID_SESSION = { message: 'Sesión no válida o caducada, inicie sesión de nuevo' }


const verifyAuth = asyncHandler(async (req, res, next) => {
    let userId
    try {
        userId = readSessionToken(req.get('token')).sub
    } catch {
        return res.status(401).json(INVALID_SESSION)
    }
    const user = await User.findById(userId, 'username email isAdmin isValid').lean()
    if (!user || !user.isValid) {
        return res.status(401).json(INVALID_SESSION)
    }
    req.user = user
    next()
})

const verifyAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Acceso denegado' })
    }
    next()
}

module.exports = { verifyAuth, verifyAdmin }
