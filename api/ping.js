const pkg = require('../package.json')

module.exports = {
  method: 'GET',
  endpoint: '/ping',
  action: (req, res, next) => {
    res.status(200).json({ version: pkg.version })
  }
}
