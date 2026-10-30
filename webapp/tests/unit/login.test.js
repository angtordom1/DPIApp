process.env.NODE_ENV = 'test'

const { app } = require('../../server/server')
const jwt = require('jsonwebtoken')
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;

chai.use(chaiHttp)
const login = (body) => chai.request(app).post('/api/login').send(body)

describe('login tests', () => {

    it('should login and return a session token without the password', async () => {
        const res = await login({ username: process.env.TEST_USER_USERNAME, password: process.env.TEST_USER_PASSWORD })
        expect(res).to.have.status(200)
        expect(res.body.userDB).to.not.have.property('password')
        const payload = jwt.decode(res.body.token)
        expect(payload.aud).to.equal('session')
        expect(payload.data).to.deep.equal({ username: process.env.TEST_USER_USERNAME, isAdmin: false })
    })

    it('should also accept the email as username, in any case', async () => {
        const res = await login({ username: 'Used.Email@example.com', password: 'owner' })
        expect(res).to.have.status(200)
    })

    it('should not login (not verified)', async () => {
        const res = await login({ username: 'notValidUser', password: 'test' })
        expect(res).to.have.status(403)
        expect(res.body.message).to.equal('¡Debe validar la cuenta con el correo de confirmación!')
    })

    it('should not login (wrong password)', async () => {
        const res = await login({ username: 'notValidUser', password: '' })
        expect(res).to.have.status(401)
        expect(res.body.message).to.equal('Usuario o contraseña incorrectos')
    })

    it('should not login (unknown user, same message)', async () => {
        const res = await login({ username: '', password: 'test' })
        expect(res).to.have.status(401)
        expect(res.body.message).to.equal('Usuario o contraseña incorrectos')
    })

    it('should not login (missing password)', async () => {
        const res = await login({ username: 'notValidUser' })
        expect(res).to.have.status(400)
        expect(res.body.message).to.equal('Por favor, introduzca usuario y contraseña')
    })

    it('should reject query operators instead of credentials', async () => {
        const res = await login({ username: { $ne: null }, password: { $ne: null } })
        expect(res).to.have.status(400)
    })

})

describe('login brute-force protection', () => {
    const target = { username: 'lockoutTarget', password: 'lockout' }

    it('should block an account after 10 failed attempts from an IP, even with the right password', async () => {
        let res
        for (let i = 0; i < 11; i++) {
            res = await login({ username: target.username, password: 'wrong password' })
        }
        expect(res).to.have.status(429)
        expect(res).to.have.header('retry-after')
        expect(res.body.message).to.include('Demasiados intentos fallidos')
        res = await login(target)
        expect(res).to.have.status(429)
    })

    it('should not lock other accounts out from the same IP', async () => {
        const res = await login({ username: process.env.TEST_USER_USERNAME, password: process.env.TEST_USER_PASSWORD })
        expect(res).to.have.status(200)
    })

    it('should not let a burst of parallel guesses past the limit', async () => {
        const results = await Promise.all(Array.from({ length: 15 }, () =>
            login({ username: 'raceUser', password: 'wrong password' })))
        const statuses = results.map((res) => res.status)
        expect(statuses.filter((status) => status === 401)).to.have.length(10)
        expect(statuses.filter((status) => status === 429)).to.have.length(5)
    })
})
