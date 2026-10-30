const express = require('express')
const router = express.Router()

const multer = require('multer')

const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const rateLimit = require('express-rate-limit')

const Model = require(path.join(__dirname,'../models/model'))
const { verifyAuth } = require(path.join(__dirname,'../middleware/auth'))
const { FLASK_URL } = require(path.join(__dirname,'../flask'))
const { asyncHandler } = require(path.join(__dirname,'../validation'))

// same limit as the client (pages/Main.vue)
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } })


const SAMPLE_IMAGE_DIRS = [path.join(__dirname, '../../client/public'), path.join(__dirname, '../public')]
const SAMPLE_IMAGE_RE = /^images\/[A-Za-z0-9_.-]+\.jpe?g$/


const MODEL_CODE_RE = /^[A-Za-z0-9_-]+$/
router.param('model', (req, res, next, model) => {
    if (!MODEL_CODE_RE.test(model)) return res.status(404).json({ message: 'Modelo no encontrado' })
    Model.exists({ code: model })
        .then((found) => found ? next() : res.status(404).json({ message: 'Modelo no encontrado' }))
        .catch(next)
})


const limitMessage = { message: 'Ha alcanzado el límite de inferencias (2 por minuto, 25 por hora y 100 al día), inténtelo más tarde.' }
const perUser = (windowMs, limit) => rateLimit({
    windowMs,
    limit,
    keyGenerator: (req) => String(req.user._id),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: limitMessage,
})
const inferenceQuota = [
    perUser(60 * 1000, 2),
    perUser(60 * 60 * 1000, 25),
    perUser(24 * 60 * 60 * 1000, 100),
]

// forwards the image to Flask and relays the annotated result
async function runInference(model, imageStream, filename, contentType, res) {
    const data = new FormData()
    data.append('data', imageStream, { filename, contentType })
    try {
        const response = await axios.post(`${FLASK_URL}/inference/${model}`, data, { headers: data.getHeaders(), timeout: 120 * 1000 })
        return res.json(response.data)
    } catch (err) {
        const status = err.response?.status
        console.error(`Inference with ${model} failed:`, err.response?.data || err.message)
        if (status === 400 || status === 413) {
            return res.status(status).json({ message: err.response.data?.message || 'Imagen no válida' })
        }
        if (status === 404) {
            return res.status(404).json({ message: 'Modelo no encontrado' })
        }
        return res.status(502).json({ message: 'El servidor de inferencia no está disponible, inténtelo más tarde' })
    }
}

router.post('/server/:model', verifyAuth, inferenceQuota, asyncHandler(async (req, res) => {
    const image = req.body.image
    const imagePath = typeof image === 'string' && SAMPLE_IMAGE_RE.test(image) &&
        SAMPLE_IMAGE_DIRS.map((dir) => path.join(dir, image)).find((candidate) => fs.existsSync(candidate))
    if (!imagePath) {
        console.warn('Rejected sample image:', JSON.stringify(image))
        return res.status(400).json({ message: 'Imagen de muestra no válida' })
    }
    return runInference(req.params.model, fs.createReadStream(imagePath), path.basename(imagePath), 'image/jpeg', res)
}))

router.post('/:model', verifyAuth, inferenceQuota, upload.single('data'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se envió ninguna imagen' })
    }
    try {
        return await runInference(req.params.model, fs.createReadStream(req.file.path), req.file.originalname, req.file.mimetype, res)
    } finally {
        fs.unlink(req.file.path, () => {})
    }
}))

module.exports = router
