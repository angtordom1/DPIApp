const expect = require('chai').expect;
const path = require('path')

const { codeFromName, codeCandidates } = require(path.join(__dirname, '../../server/modelCode'))

describe('Model code from its name', () => {

    it('should keep only lowercase letters, digits and underscores', () => {
        expect(codeFromName('Faster R-CNN (subido)')).to.equal('faster_r_cnn_subido')
    })

    it('should drop accents', () => {
        expect(codeFromName('Detección rápida v2')).to.equal('deteccion_rapida_v2')
    })

    it('should never be empty or a path', () => {
        expect(codeFromName('***')).to.equal('model')
        expect(codeFromName('../../etc')).to.equal('etc')
    })

    it('should offer numbered alternatives for collisions', () => {
        expect(codeCandidates('SSPNet', 3)).to.deep.equal(['sspnet', 'sspnet_2', 'sspnet_3'])
    })

})
