#!/usr/bin/env node

const cors = require('cors')
const express = require('express')
const fs = require('fs-extra')
const glob = require('glob')
const http = require('http')
const path = require('path')
const upload = require('express-fileupload')
const pkg = require('./package.json')

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

const whitelist = (process.env.WHITELIST || '').trim().split('\n')

// Setup and start server

const endpoints = {}
const app = express()
const router = express.Router()

app.use(logRequest)
app.use(cors({
  exposedHeaders: '*',
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) callback(null, true)
    else callback(new Error(`Not allowed by CORS, make sure '${origin}' is in ${pkg.name} whitelist`))
  }
}))
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
    console.log(new Date())
    console.log(`  Server is up and running on port ${process.env.HTTP_PORT}`)
    console.log(`  Allowed CORS origins:\n${whitelist.map(o => '    → ' + o).join('\n')}`)
  })

function logRequest (req, res, next) {
  const message = { origin: req.headers.origin, endpoint: req.originalUrl, method: req.method, ip: req.ip }
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
  description = 'No description available',
  contentType
} = {}) {
  if (!action) return

  endpoint = endpoint ? ensureLeadingSlash(endpoint) : ''
  endpoints[process.env.API_ENDPOINT + endpoint] = { description, method, body, contentType }

  action = ensureValidBody(action, body)
  action = ensureValidContentType(action, contentType)

  if (method === 'GET') router.get(endpoint, action)
  if (method === 'POST') router.post(endpoint, action)
  else router.all(endpoint, action)
}

// Decorate an action to ensure that it validates its content-type header
function ensureValidContentType (action, expectedContentType) {
  return function (req, res, next) {
    return expectedContentType && !req.is(expectedContentType)
      ? next(new Error(`Content-Type is expected to be '${expectedContentType}', got ${req.get('Content-Type') || 'nothing'}`))
      : action(req, res, next)
  }
}

// Decorate an action to ensure that it validates its req.body against a body
// signature before running its action
function ensureValidBody (action, bodySignature) {
  return function (req, res, next) {
    if (!bodySignature) return action(req, res, next)

    for (const [key, { required, type, default: defaultValue }] of Object.entries(bodySignature)) {
      // Ensure all required keys are present
      if (required && typeof req.body[key] === 'undefined') {
        return next(new Error(`Query malformation: '${key}' key expected in body`))
      }

      // Ensure type of all keys
      const allowedTypes = Array.isArray(type) ? type : [type]
      if (![...allowedTypes, 'undefined'].includes(typeof req.body[key])) {
        return next(new TypeError(`Query malformation: '${key}' key expected to be of type '${allowedTypes.join('|')}', got '${typeof req.body[key]}' instead`))
      }

      // Set empty keys with default if defined in the signature
      if (req.body[key] === undefined && defaultValue !== undefined) {
        req.body[key] = defaultValue
      }
    }

    action(req, res, next)
  }
}

function ensureLeadingSlash (endpoint) {
  return '/' + endpoint.replace(/^\/|\/$/g, '')
}
