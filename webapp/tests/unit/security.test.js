process.env.NODE_ENV = 'test'

const { app } = require('../../server/server')
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;

chai.use(chaiHttp)
const appOrigin = (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:3000').split(',')[0].trim()

describe('Security headers and CORS', () => {

    it('should send security headers', async () => {
        const res = await chai.request(app).get('/api/models')
        expect(res).to.have.header('content-security-policy', /default-src 'self'/)
        expect(res).to.have.header('x-content-type-options', 'nosniff')
        expect(res).to.have.header('x-frame-options', 'DENY')
    })

    it('should allow the app origin', async () => {
        const res = await chai.request(app).get('/api/models').set('Origin', appOrigin)
        expect(res).to.have.header('access-control-allow-origin', appOrigin)
    })

    it('should not allow other origins', async () => {
        const res = await chai.request(app).get('/api/models').set('Origin', 'https://evil.example')
        expect(res).to.not.have.header('access-control-allow-origin')
    })

})

describe('Request handling', () => {

    it('should answer the API, not the SPA, to a browser opening an API URL', async () => {
        const res = await chai.request(app).get('/api/models').set('Accept', 'text/html,*/*;q=0.8')
        expect(res).to.have.status(200)
        expect(res).to.be.json
    })

    it('should answer unknown API routes with a JSON 404', async () => {
        for (const res of [await chai.request(app).get('/api/nope'), await chai.request(app).get('/api/login')]) {
            expect(res).to.have.status(404)
            expect(res).to.be.json
        }
    })

    it('should answer 413 to an oversized JSON body', async () => {
        const res = await chai.request(app).post('/api/login').send({ username: 'x'.repeat(200 * 1024), password: 'x' })
        expect(res).to.have.status(413)
    })

    it('should not accept form-encoded bodies', async () => {
        const res = await chai.request(app).post('/api/users').type('form').send({ username: 'formUser', email: 'form@example.com', password: 'formpassword' })
        expect(res).to.have.status(400)
    })

    it('should answer 400 to malformed JSON', async () => {
        const res = await chai.request(app).post('/api/login').set('Content-Type', 'application/json').send('{"username":')
        expect(res).to.have.status(400)
    })

})
