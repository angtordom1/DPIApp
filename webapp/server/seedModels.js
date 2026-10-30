const axios = require('axios').default
const mongoose = require('mongoose')
const path = require('path')

const Model = require(path.join(__dirname, 'models/model'))
const { FLASK_URL } = require(path.join(__dirname, 'flask'))

// Display names for the models published with the project; any other model keeps its code as name
const KNOWN_MODELS = {
    faster_rcnn_r50_sspnet_1x: 'SSPNet (v2)',
    faster_rcnn_r50_sspnet_1x_Tiny: 'SSPNet Tiny (v1)',
    faster_rcnn_r50_fpn_1x_tiny: 'Faster R-CNN R50-FPN (2026)',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// On a fresh database, register the models the inference server already has so the app is usable
// right away. It happens once per database (a marker in the "meta" collection), so models an
// admin deletes stay deleted, even all of them.
const meta = () => mongoose.connection.collection('meta')
const SEEDED = { _id: 'modelsSeeded' }
const markSeeded = () => meta().updateOne(SEEDED, { $set: { at: new Date() } }, { upsert: true })

async function seedModels({ attempts = 20, delayMs = 3000 } = {}) {
    if (await meta().findOne(SEEDED)) return
    // databases seeded before the marker existed
    if (await Model.estimatedDocumentCount() > 0) return markSeeded()

    for (let i = 1; i <= attempts; i++) {
        try {
            const { data } = await axios.get(`${FLASK_URL}/models`)
            const models = data.models.map((code) => ({ code, name: KNOWN_MODELS[code] || code }))
            // no weights downloaded yet: try again on the next start
            if (!models.length) return console.log('The inference server has no models yet')
            await Model.insertMany(models)
            await markSeeded()
            console.log(`Registered ${models.length} models from the inference server`)
            return
        } catch (err) {
            // Flask takes a few seconds to start
            if (i === attempts) console.error('Could not register models from the inference server:', err.message)
            else await sleep(delayMs)
        }
    }
}

module.exports = { seedModels }
