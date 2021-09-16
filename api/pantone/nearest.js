const fs = require('fs-extra')
const path = require('path')

function colorDistanceSq ([r1, g1, b1], [r2, g2, b2]) {
  return Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
}

module.exports = {
  method: 'POST',
  description: 'Find Pantone® references similar to a RGB color',
  body: {
    rgb: {
      required: true,
      type: 'object',
      description: '[r, g, b] color to match against'
    },
    book: {
      required: true,
      type: 'string',
      description: 'Book ID from where to find Pantone® references'
    },
    length: {
      required: false,
      default: 1,
      type: 'number',
      description: 'Length of Pantone® references to return'
    }
  },
  action: async (req, res, next) => {
    try {
      const bookFile = path.join(__dirname, 'data', req.body.book + '.json')
      if (!await fs.pathExists(bookFile)) {
        throw new Error(`Could not find a book named '${req.body.book}'`)
      }

      const book = await fs.readJson(bookFile)
      const colors = book.colors.sort((a, b) => {
        return colorDistanceSq([a.rgb.r, a.rgb.g, a.rgb.b], req.body.rgb) - colorDistanceSq([b.rgb.r, b.rgb.g, b.rgb.b], req.body.rgb)
      })

      res.status(200).json(colors.slice(0, req.body.length))
    } catch (error) {
      next(error)
    }
  }
}
