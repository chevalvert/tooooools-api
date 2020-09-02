const fs = require('fs')
const path = require('path')
const anonymize = require('ip-anonymize')
const sanitize = require('sanitize-filename')
const csvWriter = require('csv-write-stream')

module.exports = {
  method: 'POST',
  endpoint: 'log/:namespace',
  description: "Append a new entry in the corresponding namespaced log, creating the file if none. Accepts a { action: '', data: {} } body. IP are anonymized, user inputs sanitized.",
  action: async (req, res, next) => {
    try {
      const filename = sanitize(req.params.namespace || '')
      if (!filename) {
        throw new Error(`Namespace results in an empty sanitized filename`)
      }

      const file = path.join(process.env.LOGS, filename + '.csv')
      const writer = csvWriter({ sendHeaders: !fs.existsSync(file) })
      writer.pipe(fs.createWriteStream(file, { flags: 'a' }))

      writer.write({
        date: new Date(),
        user: anonymize(process.env.REMOTE_IP_HEADER
          ? req.headers[process.env.REMOTE_IP_HEADER]
          : req.ip
        ),
        action: req.body.action || 'log',
        data: JSON.stringify(req.body.data || {})
      })

      writer.end()
      res.status(200).send()
    } catch (error) {
      next(error)
    }
  }
}
