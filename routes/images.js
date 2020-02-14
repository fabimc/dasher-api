var config = require('../config/application.json')
var dateFns = require('date-fns')
var express = require('express')
var R = require('ramda')
var request = require('request-promise-native')
var router = express.Router()
var graylog2 = require('graylog2')

var logger = new graylog2.graylog({
  servers: [{ host: 'gl.input.itspty.dom', port: 12201 }], // hostname: 'server.name', // the name of this host (optional, default: os.hostname())
  facility: 'CONTENT-SOURCE-API', // the facility for these log messages (optional, default: "Node.js")
  bufferSize: 1350 // max UDP packet size, should never exceed the MTU of your system (optional, default: 1400)
})

logger.on('error', function (error) {
  console.error('Error while trying to write to graylog2:', error)
})

/* GET images page. */
router.get('/', function (req, res, next) {
  const qs = R.merge(
    { status: 'published' },
    R.omit(['userstate', 'siteid', 'json'], req.query)
  )
  const getBaseUrl = siteId => {
    let baseUrl
    switch (siteId) {
      case '10':
        baseUrl = config.baseUrlBol
        break
      case '11':
        baseUrl = config.baseUrlSb
        break
      default:
        baseUrl = config.baseUrlSb
    }
    return baseUrl
  }
  const baseUrl = getBaseUrl(R.path(['siteid'], req.query))
  const jsonOnly = R.path(['json'], req.query) === '1'

  request({ url: `${baseUrl}/images`, qs, json: true })
    .then(images => {
      if (images.length > 0) {
        const image = images[0]
        if (jsonOnly) {
          res.json(image)
        } else {
          res.render('image', { image })
        }
      } else {
        request({
          url: `${baseUrl}/images`,
          qs: { _limit: 1 },
          json: true
        }).then(images => {
          if (images.length > 0) {
            const image = images[0]
            if (jsonOnly) {
              res.json(image)
            } else {
              res.render('image', { image })
            }
          }
        })
      }
    })
    .catch(function (err) {
      console.error(err)
      logger.log(err)
    })
})

module.exports = router
