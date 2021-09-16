#!/usr/bin/env node

const cors = require('cors')
const express = require('express')
const fs = require('fs-extra')
const glob = require('glob')
const http = require('http')
const path = require('path')
const upload = require('express-fileupload')

require('dotenv').config({ path: path.resolve(__dirname, '.env') })

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
process.env.API_ENDPOINT = process.env.API_ENDPOINT
  ? ensureLeadingSlash(process.env.API_ENDPOINT)
  : ''
process.env.HTTP_PORT = process.env.HTTP_PORT || 8080

process.env.MODULES = path.resolve(__dirname, 'api')
process.env.PUBLIC = path.resolve(__dirname, process.env.PUBLIC)
process.env.LOGS = path.resolve(__dirname, process.env.LOGS)

fs.ensureDirSync(process.env.PUBLIC)
fs.ensureDirSync(process.env.LOGS)

// Setup and start server

const endpoints = {}
const app = express()
const router = express.Router()

app.use(logRequest)
app.use(cors({ exposedHeaders: '*' }))
app.use(upload({
  createParentPath: true,
  limits: {
    fieldSize: 50 * 1024 * 1024
  }
}))
app.use(express.json())
app.use(express.static(process.env.PUBLIC))
app.use(process.env.API_ENDPOINT, router)
app.use(errorHandler)

// Display API when requesting root
registerEndpoint({
  endpoint: '/',
  description: 'Get this response',
  method: 'GET',
  action: (_, res) => res.status(200).json(endpoints)
})

// Build the API with /api files
const files = glob.sync('**/*.js', { cwd: process.env.MODULES })
for (const file of files) {
  const service = require(path.join(process.env.MODULES, file))
  if (!service.action) continue

  service.endpoint = service.endpoint || file.replace(/(.js)$/, '')
  registerEndpoint(service)
}

// Start server
http
  .createServer(app)
  .listen(process.env.HTTP_PORT, () => {
    console.log(new Date(), `Server is up and running on port ${process.env.HTTP_PORT}`)
  })

function logRequest (req, res, next) {
  const message = { endpoint: req.originalUrl, method: req.method, ip: req.ip }
  console.log(new Date(), message)
  next()
}

function errorHandler (err, req, res, next) {
  console.error(new Date(), err)
  res.status(500).json({ error: err.message })
}

function registerEndpoint ({
  endpoint,
  method = 'GET',
  action,
  body,
  description = 'No description available'
} = {}) {
  if (!action) return

  endpoint = endpoint ? ensureLeadingSlash(endpoint) : ''
  endpoints[process.env.API_ENDPOINT + endpoint] = { description, method, body }

  if (method === 'GET') router.get(endpoint, ensureValidBody(action, body))
  if (method === 'POST') router.post(endpoint, ensureValidBody(action, body))
  else router.all(endpoint, ensureValidBody(action, body))
}

// Decorate an action to ensure that it validates its req.body against a body
// signature before running its action
function ensureValidBody (action, bodySignature) {
  return function (req, res, next) {
    if (!bodySignature) return action(req, res, next)

    for (const [key, { required, type }] of Object.entries(bodySignature)) {
      if (required && !req.body.hasOwnProperty(key)) return next(new Error(`Query malformation: '${key}' key expected in body`))

      const allowedTypes = Array.isArray(type) ? type : [type]
      if (!allowedTypes.includes(typeof req.body[key])) {
        return next(new TypeError(`Query malformation: '${key}' key expected to be of type '${allowedTypes.join('|')}', got '${typeof req.body[key]}' instead`))
      }
    }

    action(req, res, next)
  }
}

function ensureLeadingSlash (endpoint) {
  return '/' + endpoint.replace(/^\/|\/$/g, '')
}
