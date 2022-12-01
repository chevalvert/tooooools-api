const tmp = require('tmp')
const path = require('path')
const svgToPdf = require('svg-to-pdf')
const { exec } = require('child_process')

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
  contentType: 'multipart/form-data',
  body: {
    svg: {
      required: true,
      type: 'string',
      description: 'SVG string'
    },
    options: {
      required: false,
      default: '{}',
      type: 'string',
      description: 'Stringified JSON object defining svg-to-pdf options'
    },
    ghostscript: {
      required: false,
      default: null,
      type: 'string',
      description: 'Stringified JSON object defining ghostscript optimization parameters: { dpi[Color|Gray|Mono] = 720, preset = screen }'
    }
  },
  action: async (req, res, next) => {
    try {
      const filename = tmp.tmpNameSync({ dir: process.env.PUBLIC })
      let output = filename + '.pdf'

      // Get all transfered files and convert the SVG input to PDF
      await moveAllRequestFiles(req.files, filename)
      const result = await svgToPdf(req.body.svg, {
        ...JSON.parse(req.body.options),
        docPath: output,
        rootPath: filename
      })

      // Optimize the PDF output if asked for
      if (req.body.ghostscript) {
        output = filename + '-optimized.pdf'
        await ghostscript({
          ...JSON.parse(req.body.ghostscript),
          input: filename + '.pdf',
          output: filename + '-optimized.pdf'
        })
      }

      res
        .status(201)
        .location(path.relative(process.env.PUBLIC, output))
        .json(result)
    } catch (error) {
      // Handled by the errorHandler middleware defined in index.js
      next(error)
    }
  }
}

function ghostscript ({
  input,
  output = '',
  dpi = 720,
  dpiColor = dpi,
  dpiGray = dpi,
  dpiMono = dpi,
  preset = 'screen' // SEE https://ghostscript.com/docs/9.54.0/VectorDevices.htm#PSPDF_IN
} = {}) {
  return new Promise((resolve, reject) => {
    exec([
      process.env.GS_BINARY || 'gs',
      '-sDEVICE=pdfwrite',
      `-dPDFSETTINGS=/${preset}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dCompatibilityLevel=1.5',
      '-dSubsetFonts=true',
      '-dCompressFonts=true',
      '-dEmbedAllFonts=true',
      '-sProcessColorModel=DeviceRGB',
      '-sColorConversionStrategy=RGB',
      '-sColorConversionStrategyForImages=RGB',
      '-dConvertCMYKImagesToRGB=true',
      '-dDetectDuplicateImages=true',
      '-dColorImageDownsampleType=/Bicubic',
      `-dColorImageResolution=${dpiColor}`,
      '-dGrayImageDownsampleType=/Bicubic',
      `-dGrayImageResolution=${dpiGray}`,
      '-dMonoImageDownsampleType=/Bicubic',
      `-dMonoImageResolution=${dpiMono}`,
      '-dDownsampleColorImages=true',
      '-dDoThumbnails=false',
      '-dCreateJobTicket=false',
      '-dPreserveEPSInfo=false',
      '-dPreserveOPIComments=false',
      '-dPreserveOverprintSettings=false',
      '-dUCRandBGInfo=/Remove',
      `-sOutputFile="${output}"`,
      `"${input}"`
    ].join(' '), (error, stdout, stderr) => {
      if (error) return reject(error)
      if (process.env.NODE_ENV === 'development') {
        console.log(stdout)
        console.error(stderr)
      }
      resolve()
    })
  })
}
