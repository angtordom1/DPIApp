const mongoose = require('mongoose')
const Schema =  mongoose.Schema

const modelSchema = Schema({

    name: { 
        type: String,
        required: [true, 'El nombre es requerido']
    },
    // identifies the model on the inference server (file names, inference URL)
    code: { type: String, required: true, unique: true },

})

module.exports = mongoose.model('Model', modelSchema)