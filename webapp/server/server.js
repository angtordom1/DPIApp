// .env lives at the repo root; in Docker the variables come from env_file instead
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const history = require('connect-history-api-fallback');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { seedModels } = require('./seedModels');
const { assertStrongSecret } = require('./tokens');

assertStrongSecret()

// This keeps the server up if something slips through
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err))

const app = express();

const PORT = process.env.PORT || 3000;
const DB = process.env.MONGODB_URI || "mongodb://localhost/tfg"

// Behind a reverse proxy, set TRUST_PROXY to the number of proxies (e.g. 1) so the rate limits
// see the client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)

// Security headers
app.use(helmet({
  // same as the CSP's frame-ancestors 'none': the app is never shown inside a frame
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      // the app may be served over plain HTTP (local Docker)
      upgradeInsecureRequests: null,
    },
  },
}));

// Browsers may only call the API from the app itself
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:3000')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(compression());
app.use(express.json());

// mongodb
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);
const server = mongoose.connect(DB)
.then( () => {
  console.log('Database is connected')
  // the unit tests run without an inference server
  if (process.env.NODE_ENV !== 'test') seedModels()
})
.catch( (err) => {
  console.error('Can not connect to the database:', err.message)
  process.exit(1)
})

app.use('/api/users', require('./routes/users'))
app.use('/api/login', require('./routes/login'))
app.use('/api/models', require('./routes/models'))
app.use('/api/inference', require('./routes/inference'))
// anything else under /api is an API error
app.use('/api', (req, res) => res.status(404).json({ message: 'Recurso no encontrado' }))

app.use(history());

const PUBLIC_DIR = path.join(__dirname, "public")
const IMMUTABLE = /^(js|css|fonts|img)[\\/]/
app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    // relative to the build folder: a parent folder called "js" must not match
    if (IMMUTABLE.test(path.relative(PUBLIC_DIR, filePath))) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    else if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
    else res.setHeader('Cache-Control', 'public, max-age=86400')
  },
}))

// last-resort error handler: log the details
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El archivo supera el tamaño máximo permitido' })
  }
  // the client's fault (malformed JSON or multipart, unexpected upload field...): body-parser
  // marks these with a 4xx status, multer with its own error class
  if (err instanceof multer.MulterError || (err.status >= 400 && err.status < 500 && err.expose)) {
    return res.status(400).json({ message: 'Petición no válida' })
  }
  console.error(err)
  res.status(500).json({ message: 'Ocurrió un problema, disculpe las molestias' })
})

// the unit tests import the app and let chai-http start it on a free port
if (require.main === module) {
  app.listen(PORT, function(){
    console.log('Server is running on Port:',PORT);
  });
}

module.exports = { app, server } ;
