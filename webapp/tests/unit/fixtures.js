// Mocha root hooks (loaded with --require): seeds the users and model the unit tests rely on.
// Only the fixtures below are upserted/removed, never the whole collection.

// before any spec file loads the server: no model seeding, no real emails (mailer.js)
process.env.NODE_ENV = 'test'
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const path = require('path')

const User = require(path.join(__dirname, '../../server/models/user'))
const Model = require(path.join(__dirname, '../../server/models/model'))

const hash = (password) => bcrypt.hashSync(password, 10)

const fixtures = [
    // valid user used by the login tests
    {
        username: process.env.TEST_USER_USERNAME,
        email: 'valid.user@example.com',
        password: hash(process.env.TEST_USER_PASSWORD || ''),
        isValid: true
    },
    // registered but not verified
    { username: 'notValidUser', email: 'not.valid@example.com', password: hash('test'), isValid: false },
    // admin
    { username: 'admin', email: 'admin@example.com', password: hash('admin'), isValid: true, isAdmin: true },
    // regular user; its email is also the "already taken" one
    { username: 'emailOwner', email: 'used.email@example.com', password: hash('owner'), isValid: true },
    // only the brute-force tests log in with it, so locking it out affects no other suite
    { username: 'lockoutTarget', email: 'lockout@example.com', password: hash('lockout'), isValid: true },
]

// the model the inference tests call (inference is refused for unregistered models)
const fixtureModel = { code: 'faster_rcnn_r50_fpn_1x_tiny', name: 'Faster R-CNN R50-FPN' }

exports.mochaHooks = {
    async beforeAll() {
        if (!process.env.TEST_USER_USERNAME || !process.env.TEST_USER_PASSWORD) {
            throw new Error('TEST_USER_USERNAME and TEST_USER_PASSWORD must be set')
        }
        require(path.join(__dirname, '../../server/server'))
        await mongoose.connection.asPromise()

        // the fixtures include an admin with a known password: never write them to a real database
        if (!mongoose.connection.name.endsWith('_test')) {
            throw new Error(`Refusing to seed "${mongoose.connection.name}": point MONGODB_URI at a database ending in _test`)
        }

        // leftovers from an interrupted run
        // (trusted: the server enables sanitizeFilter, which would neutralise the operator)
        await User.deleteMany({ username: mongoose.trusted({ $in: ['testUser', 'raceUser'] }) })
        for (const user of fixtures) {
            await User.updateOne({ username: user.username }, { $set: user }, { upsert: true })
        }
        await Model.updateOne({ code: fixtureModel.code }, { $set: fixtureModel }, { upsert: true })
    }
}
