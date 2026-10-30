process.env.NODE_ENV = 'test'

const { app } = require('../../server/server')
const path = require('path')
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;

const User = require(path.join(__dirname, '../../server/models/user'))
const { verificationToken, sessionToken } = require(path.join(__dirname, '../../server/tokens'))

chai.use(chaiHttp)
const signup = (body) => chai.request(app).post('/api/users').send(body)
const login = async (username, password) =>
    (await chai.request(app).post('/api/login').send({ username, password })).body.token

const newUser = { username: 'testUser', password: 'testtest', email: 'new.user@example.com' }

describe('Sign-up validation', () => {

    const rejected = [
        ['missing email', { username: 'someUser', password: 'testtest' }, 'Uno o más campos requeridos están vacíos'],
        ['empty fields', { username: '', password: '', email: '' }, 'Uno o más campos requeridos están vacíos'],
        ['empty body', {}, 'Uno o más campos requeridos están vacíos'],
        ['query operator as username', { username: { $regex: '.' }, password: 'testtest', email: 'a@example.com' }, 'Uno o más campos requeridos están vacíos'],
        ['array as email', { username: 'someUser', password: 'testtest', email: ['a@example.com'] }, 'Uno o más campos requeridos están vacíos'],
        ['username without letters', { username: '1234', password: 'testtest', email: 'a@example.com' }, 'El usuario debe tener'],
        ['username too long', { username: 'a'.repeat(21), password: 'testtest', email: 'a@example.com' }, 'El usuario debe tener'],
        ['several recipients', { username: 'someUser', password: 'testtest', email: 'a@example.com, b@example.com' }, 'Debe ser un correo válido'],
        ['HTML in the username', { username: 'some<u>User', password: 'testtest', email: 'a@example.com' }, 'El usuario debe tener'],
        ['short password', { username: 'someUser', password: 'short', email: 'a@example.com' }, 'La contraseña debe tener'],
        ['reserved username', { username: 'Admin', password: 'testtest', email: 'a@example.com' }, 'Nombre de usuario no permitido'],
    ]
    for (const [name, body, message] of rejected) {
        it(`should reject ${name}`, async () => {
            const res = await signup(body)
            expect(res).to.have.status(400)
            expect(res.body.message).to.include(message)
        })
    }

    it('should accept long top-level domains and "+" addresses', async () => {
        // valid input, so it fails later on the taken username: what matters is passing validation
        const res = await signup({ username: 'emailOwner', password: 'testtest', email: 'first+tag@mail.studio' })
        expect(res).to.have.status(409)
    })

    it('should not create an user (username taken)', async () => {
        const res = await signup({ ...newUser, username: 'emailOwner' })
        expect(res).to.have.status(409)
        expect(res.body.message).to.equal('Este nombre de usuario ya está siendo utilizado')
    })

    it('should treat usernames and emails case-insensitively', async () => {
        expect(await signup({ ...newUser, username: 'EMAILOWNER' })).to.have.status(409)
        expect(await signup({ ...newUser, username: 'otherName', email: 'USED.Email@example.com' })).to.have.status(409)
    })

    it('should reject passwords over 72 bytes even if shorter in characters', async () => {
        const res = await signup({ ...newUser, password: 'ñ'.repeat(40) })
        expect(res).to.have.status(400)
        expect(res.body.message).to.include('La contraseña debe tener')
    })

    it('should not create an user (email taken)', async () => {
        const res = await signup({ ...newUser, username: 'userEmailUsed', email: 'used.email@example.com' })
        expect(res).to.have.status(409)
        expect(res.body.message).to.equal('Este correo ya está siendo utilizado')
    })

})

describe('Sign-up, verification and account deletion', () => {
    let userDB, session

    after(() => User.deleteMany({ username: newUser.username }))

    it('should create an unverified user', async () => {
        const res = await signup(newUser)
        expect(res).to.have.status(200)
        expect(res.body).to.not.have.property('password')
        expect(res.body.isValid).to.equal(false)
        userDB = res.body
    })

    it('should not accept the verification token as a session', async () => {
        const res = await chai.request(app).delete(`/api/users/${newUser.username}`).set('token', verificationToken(userDB))
        expect(res).to.have.status(401)
    })

    it('should not accept a session token as verification link', async () => {
        const res = await chai.request(app).get(`/api/users/verify/${sessionToken(userDB)}`).redirects(0)
        expect(res).to.have.status(400)
    })

    it('should not verify with an invalid link', async () => {
        const res = await chai.request(app).get('/api/users/verify/123')
        expect(res).to.have.status(400)
        expect(res.body.message).to.equal('La verificación falló, el link puede ser inválido o estar expirado')
    })

    it('should verify the user', async () => {
        const res = await chai.request(app).get(`/api/users/verify/${verificationToken(userDB)}`).redirects(0)
        expect(res).to.redirectTo(/\/login$/)
    })

    it('should log in after verifying', async () => {
        session = await login(newUser.username, newUser.password)
        expect(session).to.be.a('string')
    })

    it('should not delete user (no session)', async () => {
        const res = await chai.request(app).delete(`/api/users/${newUser.username}`)
        expect(res).to.have.status(401)
    })

    it('should not delete another user', async () => {
        const res = await chai.request(app).delete('/api/users/emailOwner').set('token', session)
        expect(res).to.have.status(403)
    })

    it('should not tell regular users whether an account exists', async () => {
        const res = await chai.request(app).delete('/api/users/nobodyWithThisName').set('token', session)
        expect(res).to.have.status(403)
    })

    it('should delete the own account', async () => {
        const res = await chai.request(app).delete(`/api/users/${newUser.username}`).set('token', session)
        expect(res).to.have.status(200)
        expect(res.body.message).to.equal('Usuario borrado')
    })

    it('should not accept the token of a deleted account', async () => {
        const res = await chai.request(app).delete(`/api/users/${newUser.username}`).set('token', session)
        expect(res).to.have.status(401)
    })

    it('should not verify a deleted account', async () => {
        const res = await chai.request(app).get(`/api/users/verify/${verificationToken(userDB)}`).redirects(0)
        expect(res).to.have.status(400)
    })

    it('should let admins delete any account, and say when it does not exist', async () => {
        const res = await chai.request(app).delete('/api/users/nobodyWithThisName').set('token', await login('admin', 'admin'))
        expect(res).to.have.status(404)
    })

})
