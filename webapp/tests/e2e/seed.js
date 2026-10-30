// Prepares the database of the app instance the E2E and load tests drive (webapp-e2e in Docker,
// database dpiapp_e2e)
// usage: node tests/e2e/seed.js   (reads MONGODB_URI and TEST_USER_*)
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const path = require('path')

const User = require(path.join(__dirname, '../../server/models/user'))

const { MONGODB_URI, TEST_USER_USERNAME, TEST_USER_PASSWORD } = process.env

async function main() {
    if (!TEST_USER_USERNAME || !TEST_USER_PASSWORD) {
        throw new Error('TEST_USER_USERNAME and TEST_USER_PASSWORD must be set')
    }
    mongoose.set('strictQuery', true)
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost/dpiapp_e2e')
    const { name } = mongoose.connection
    if (!/_(e2e|test)$/.test(name)) {
        throw new Error(`Refusing to seed "${name}": point MONGODB_URI at a database ending in _e2e`)
    }

    const users = [
        { username: TEST_USER_USERNAME, email: 'e2e.user@example.com', password: TEST_USER_PASSWORD, isValid: true },
        { username: 'notValidUser', email: 'not.valid@example.com', password: 'test', isValid: false },
    ]
    for (const { password, ...user } of users) {
        await User.updateOne({ username: user.username }, { $set: { ...user, password: bcrypt.hashSync(password, 10) } }, { upsert: true })
    }

    await User.deleteMany({ $or: [{ username: 'usuario1' }, { email: 'usuario1@example.com' }] })

    console.log(`Seeded E2E users: ${users.map((u) => u.username).join(', ')}`)
    await mongoose.disconnect()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
