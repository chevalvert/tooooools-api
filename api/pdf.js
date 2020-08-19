const tmp = require('tmp')
const path = require('path')
const svgToPdf = require('svg-to-pdf')

async function moveAllRequestFiles (files = {}, docPath) {
  return files && Promise.all(
    Object.values(files).map(file => new Promise(resolve => {
      file.mv(path.join(docPath, file.name), resolve)
    }))
  )
}

module.exports = {
  method: 'POST',
  description: 'Convert svg to pdf',
  action: async (req, res, next) => {
    try {
      const tmpPath = tmp.tmpNameSync({ dir: process.env.PUBLIC })
      const options = Object.assign({}, JSON.parse(req.body.options || '{}'), {
        docPath: tmpPath + '.pdf',
        rootPath: tmpPath
      })

      await moveAllRequestFiles(req.files, tmpPath)
      const result = await svgToPdf(req.body.svg, options)

      res
        .status(201)
        .location(path.relative(process.env.PUBLIC, tmpPath + '.pdf'))
        .json(result)
    } catch (error) {
      // Handled by the errorHandler middleWare defined in index.js
      next(error)
    }
  }
}
