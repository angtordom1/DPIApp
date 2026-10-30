process.env.NODE_ENV = 'test'

const { app } = require('../../server/server')
let chai = require('chai');
let chaiHttp = require('chai-http');
const expect = require('chai').expect;
const path = require('path')

const User = require(path.join(__dirname, '../../server/models/user'))
const Model = require(path.join(__dirname, '../../server/models/model'))

chai.use(chaiHttp)
const login = async (username, password) =>
    (await chai.request(app).post('/api/login').send({ username, password })).body.token

const adminRequest = (token) => chai.request(app).delete('/api/models/000000000000000000000000').set('token', token)

describe('Admin role', () => {
    let adminToken, userToken

    before(async () => {
        adminToken = await login('admin', 'admin')
        userToken = await login('emailOwner', 'owner')
    })

    after(() => User.updateOne({ username: 'admin' }, { $set: { isAdmin: true } }))

    it('should deny admin routes to regular users', async () => {
        expect(await adminRequest(userToken)).to.have.status(403)
    })

    it('should let admins through', async () => {
        expect(await adminRequest(adminToken)).to.have.status(404)
    })

    it('should apply a revoked role at once, even with a token issued before', async () => {
        const token = await login('admin', 'admin')
        await User.updateOne({ username: 'admin' }, { $set: { isAdmin: false } })
        expect(await adminRequest(token)).to.have.status(403)
        await User.updateOne({ username: 'admin' }, { $set: { isAdmin: true } })
    })

    describe('model management', () => {
        it('should refuse model uploads from regular users before storing anything', async () => {
            const res = await chai.request(app).post('/api/models').set('token', userToken)
                .field('name', 'x').field('base_config', 'faster_rcnn_r50_fpn_1x_tiny')
                .attach('onnx_file', Buffer.from('onnx'), 'model.onnx')
            expect(res).to.have.status(403)
        })

        it('should reject uploads that are not ONNX files', async () => {
            const res = await chai.request(app).post('/api/models').set('token', adminToken)
                .field('name', 'x').field('base_config', 'faster_rcnn_r50_fpn_1x_tiny')
                .attach('onnx_file', Buffer.from('#!/bin/sh'), 'model.sh')
            expect(res).to.have.status(400)
        })

        it('should reject an invalid repository config name', async () => {
            const res = await chai.request(app).post('/api/models').set('token', adminToken)
                .field('name', 'x').field('base_config', '../x')
                .attach('onnx_file', Buffer.from('onnx'), 'model.onnx')
            expect(res).to.have.status(400)
        })

        it('should answer 400 for an invalid model id', async () => {
            const res = await chai.request(app).delete('/api/models/not-an-id').set('token', adminToken)
            expect(res).to.have.status(400)
        })

        it('should unregister a model', async () => {
            const model = await Model.create({ code: 'unit_test_model', name: 'Unit test model' })
            const res = await chai.request(app).delete(`/api/models/${model._id}`).set('token', adminToken)
            expect(res).to.have.status(200)
            expect(await Model.exists({ code: 'unit_test_model' })).to.equal(null)
        })
    })
})
