const tmp = require('tmp')
const mime = require('mime-types')
const ImageMagick = require('imagemagick')

module.exports = {
  method: 'POST',
  endpoint: 'dpi/:dpi/:format?',
  contentType: 'multipart/form-data',
  description: 'Change file DPI, and optionally format',
  action: async (req, res, next) => {
    try {
      const file = Object.values(req.files || {})[0]
      if (!file) throw new Error('A file <blob> is expected in the FormData')
      if (req.files.length > 1) throw new Error('Only one file is handled by this API')

      const input = tmp.tmpNameSync()
      await new Promise(resolve => file.mv(input, resolve))

      const format = req.params.format || mime.extension(file.mimetype)
      const output = tmp.tmpNameSync({ dir: process.env.PUBLIC })
      const cmd = `-units PixelsPerInch ${input} -density ${req.params.dpi} ${format ? (format + ':' + output) : output}`

      await new Promise((resolve, reject) => ImageMagick.convert(cmd.split(' '), error => error ? reject(error) : resolve()))

      res.status(201).download(output)
    } catch (error) {
      // Handled by the errorHandler middleware defined in index.js
      next(error)
    }
  }
}
