const mongoose = require('mongoose')
const Schema =  mongoose.Schema

const userSchema = Schema({

    username: { 
        type: String, 
        required: [true, 'El nombre de usuario es requerido'], 
        unique: [true, 'El nombre de usuario ya está en uso'] 
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es requerida']
    },
    email: { 
        type: String, 
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true
    },
    isValid: { 
        type: Boolean, 
        default: false 
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    }

})


// delete password from JSON response
userSchema.methods.toJSON = function() {

    var obj = this.toObject()
    delete obj.password

    return obj

}

module.exports = mongoose.model('User', userSchema)