const fs = require('fs-extra')
const glob = require('glob')
const path = require('path')

module.exports = {
  method: 'GET',
  description: 'Get the list of all available Pantone® books, or the content of a specific book',
  endpoint: 'pantone/:book?',
  action: (req, res, next) => {
    const cwd = path.join(__dirname, 'data')
    try {
      res
        .status(200)
        .json(req.params.book
          ? fs.readJsonSync(path.join(cwd, req.params.book + '.json'))
          : glob.sync('*.json', { cwd }).map(f => path.basename(f, '.json'))
        )
    } catch (error) {
      next(error)
    }
  }
}
