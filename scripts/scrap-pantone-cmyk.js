#!/usr/bin/env node

/**
 * Add CMYK values to a Pantone® JSON book file by scrapping the Pantone® website
 * Usage: scrap-pantone-cmyk <path-to-book>
 *
 * IMPORTANT: the target file will only be written once all scrapping is done
 */

const fs = require('fs-extra')
const path = require('path')
const args = process.argv.slice(2)
const fetch = require('node-fetch')

const BOOK_FILE = path.resolve(process.cwd(), args[0])
const URL = id => `https://pantone.com/color-finder/${id.replace(/\s/g, '-')}`

;(async () => {
  try {
    const book = await fs.readJson(BOOK_FILE)
    console.log(`Scrapping CMYK values for ${book.id}…`)

    // Keep track of this scrap process in the file
    book.CMYKScrappedAt = Date.now()

    for (const index in book.colors) {
      const code = book.colors[index].code
      console.log(`\n[${+index + 1}/${book.colors.length}]`)

      // Fetch the color page
      const url = URL(code)
      const response = await fetch(url)
      const html = await response.text()

      // Scrap a specific JSON object on the page
      const scrap = html.match(/{"Cyan":([0-9]{1,3}),"Magenta":([0-9]{1,3}),"Yellow":([0-9]{1,3}),"Key":([0-9]{1,3})}/i)
      if (!scrap) throw new Error(`Could not find CMYK value in the body response of ${url}`)

      // Parse the scrapped object
      const CMYK = JSON.parse(scrap[0])

      // Update the color
      book.colors[index].cmyk = {
        c: CMYK.Cyan,
        m: CMYK.Magenta,
        y: CMYK.Yellow,
        k: CMYK.Key
      }

      console.log(book.colors[index])
    }

    await fs.writeJson(BOOK_FILE, book)
    console.log(`\nSuccess: ${args[0]} has been updated`)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
})()
