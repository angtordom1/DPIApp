// Grants (or with --revoke, removes) the admin role of an existing, verified account.
// Docker:  docker compose exec webapp node scripts/makeAdmin.js <username> [--revoke]
// Local:   cd webapp && npm run make-admin -- <username> [--revoke]
// The change applies at once on the API; the "Administración" menu shows after logging in again.
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })
const mongoose = require('mongoose')

const User = require(path.join(__dirname, '../models/user'))

async function main() {
    const [username, flag] = process.argv.slice(2)
    if (!username || (flag && flag !== '--revoke')) {
        throw new Error('usage: makeAdmin.js <username> [--revoke]')
    }
    mongoose.set('strictQuery', true)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/tfg')
    const isAdmin = flag !== '--revoke'
    const user = await User.findOneAndUpdate({ username }, { isAdmin }, { new: true })
    if (!user) throw new Error(`No user named "${username}"`)
    if (!user.isValid) console.warn(`"${username}" has not verified the account yet: it can't log in until it does`)
    console.log(`${username}: admin ${isAdmin ? 'granted' : 'revoked'}`)
}

main()
    .catch((err) => {
        console.error(err.message)
        process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
