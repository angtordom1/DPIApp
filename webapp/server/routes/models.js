const axios = require('axios').default
const express = require('express')
const router = express.Router()
const path = require('path');
const multer = require('multer')
const FormData = require('form-data')
const fs = require('fs')
const mongoose = require('mongoose')

const Model = require(path.join(__dirname,'../models/model'))
const { verifyAuth, verifyAdmin } = require(path.join(__dirname,'../middleware/auth'))
const { FLASK_URL } = require(path.join(__dirname,'../flask'))
const { codeCandidates } = require(path.join(__dirname,'../modelCode'))
const { asyncHandler } = require(path.join(__dirname,'../validation'))

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.onnx$/i.test(file.originalname)),
})

const CONFIG_NAME_RE = /^[A-Za-z0-9_-]+$/

router.get('/', async (req, res) => {
    try {
        const ModelDB = await Model.find().sort({ name: 'asc' })
        res.json(ModelDB)
    } catch (err) {
        console.error('Model listing failed:', err)
        return res.status(500).json({ message: 'Ocurrió un problema, disculpe las molestias' })
    }
})


router.post('/', verifyAuth, verifyAdmin, upload.single('onnx_file'), async (req, res) => {
    const onnxPath = req.file?.path
    const cleanup = () => {
        if (onnxPath && fs.existsSync(onnxPath)) fs.unlinkSync(onnxPath)
    }
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const baseConfig = req.body.base_config
    if (!onnxPath || !name || name.length > 100 || !CONFIG_NAME_RE.test(baseConfig || '')) {
        cleanup()
        return res.status(400).json({ message: 'Datos del modelo no válidos' })
    }
    const sendToFlask = (code) => {
        const form = new FormData()
        form.append('model_name', code)
        form.append('base_config', baseConfig)
        form.append('onnx_file', fs.createReadStream(onnxPath), `${code}.onnx`)
        return axios.post(`${FLASK_URL}/upload-model`, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        })
    }
    try {
        for (const code of codeCandidates(name)) {
            if (await Model.exists({ code })) continue
            try {
                await sendToFlask(code)
            } catch (err) {
                if (err.response?.status === 409) continue
                throw err
            }
            return res.json(await Model.create({ name, code }))
        }
        return res.status(409).json({ message: 'Ya existen demasiados modelos con ese nombre' })
    } catch (err) {
        const status = err.response?.status
        console.error('Model upload failed:', err.response?.data || err.message)
        if (status === 400) {
            return res.status(status).json({ message: err.response.data.message })
        }
        if (err.response || err.request) {
            return res.status(502).json({ message: 'El servidor de inferencia no pudo guardar el modelo' })
        }
        return res.status(500).json({ message: 'Ocurrió un problema, disculpe las molestias' })
    } finally {
        cleanup()
    }
})

router.get('/configs', verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/configs`)
        res.json(response.data)
    } catch (err) {
        console.error('Flask config listing failed:', err.message)
        return res.status(502).json({ message: 'No se pudo contactar con Flask' })
    }
})

router.get('/flask', verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const response = await axios.get(`${FLASK_URL}/models`)
        res.json(response.data)
    } catch (err) {
        console.error('Flask model listing failed:', err.message)
        return res.status(502).json({ message: 'No se pudo contactar con Flask' })
    }
})


router.delete('/:id', verifyAuth, verifyAdmin, asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Identificador de modelo no válido' })
    }
    if (!await Model.findByIdAndDelete(req.params.id)) {
        return res.status(404).json({ message: 'Modelo no encontrado' })
    }
    res.json({ message: 'Modelo eliminado' })
}))

module.exports = router
