// The model code is a model's internal id: Flask names its files after it and the inference URL
// carries it. Admins only type a display name; the code is derived from it.
const MAX_LENGTH = 50

// "Faster R-CNN (subido)" -> "faster_r_cnn_subido"
function codeFromName(name) {
    const code = String(name)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // drop accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, MAX_LENGTH)
        .replace(/^_+|_+$/g, '')
    return code || 'model'
}

// the code, then code_2, code_3... for names that collide
function codeCandidates(name, count = 20) {
    const base = codeFromName(name)
    return [base, ...Array.from({ length: count - 1 }, (_, i) => `${base}_${i + 2}`)]
}

module.exports = { codeFromName, codeCandidates }
