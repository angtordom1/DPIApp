process.env.NODE_ENV = 'test'

const { app } = require('../../server/server')
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;

chai.use(chaiHttp)
const MODEL = 'faster_rcnn_r50_fpn_1x_tiny'  // registered by tests/unit/fixtures.js

// requests are rejected before reaching Flask (invalid sample image), but still count towards the quota
const sampleRequest = (token, image = 'images/missing.jpg') => {
    const req = chai.request(app).post(`/api/inference/server/${MODEL}`).send({ image })
    return token ? req.set('token', token) : req
}
const login = async (username, password) =>
    (await chai.request(app).post('/api/login').send({ username, password })).body.token

describe('Inference tests', () => {
    let userToken, otherToken, adminToken

    before(async () => {
        userToken = await login(process.env.TEST_USER_USERNAME, process.env.TEST_USER_PASSWORD)
        otherToken = await login('emailOwner', 'owner')
        adminToken = await login('admin', 'admin')
    })

    it('should require a session', async () => {
        expect(await sampleRequest()).to.have.status(401)
    })

    it('should refuse models that are not registered', async () => {
        const res = await chai.request(app).post('/api/inference/server/not_registered').set('token', adminToken)
            .send({ image: 'images/bb_V0000_I0001320.jpg' })
        expect(res).to.have.status(404)
    })

    it('should reject sample images outside the bundled set', async () => {
        expect(await sampleRequest(adminToken, '../../../etc/passwd')).to.have.status(400)
    })

    it('should reject a sample image sent as an array instead of crashing', async () => {
        const res = await sampleRequest(adminToken, ['images/bb_V0000_I0001320.jpg'])
        expect(res).to.have.status(400)
        // still up
        expect(await chai.request(app).get('/api/models')).to.have.status(200)
    })

    it('should ask for an image on uploads without one', async () => {
        const res = await chai.request(app).post(`/api/inference/${MODEL}`).set('token', otherToken)
        expect(res).to.have.status(400)
        expect(res.body.message).to.equal('No se envió ninguna imagen')
    })

    it('should limit each user to 2 inferences per minute', async () => {
        expect(await sampleRequest(userToken)).to.have.status(400)
        expect(await sampleRequest(userToken)).to.have.status(400)
        const res = await sampleRequest(userToken)
        expect(res).to.have.status(429)
        expect(res.body.message).to.include('límite de inferencias')
    })

    it('should not share the quota between users', async () => {
        expect(await sampleRequest(otherToken)).to.have.status(400)
    })
})
