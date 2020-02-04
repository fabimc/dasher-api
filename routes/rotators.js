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

/* GET rotators page. */
router.get('/', function (req, res, next) {
  const qs = R.omit(['userstate', 'siteid', 'json'], req.query)
  const sortByPriority = R.sortBy(R.prop('priority'))
  const contentOnSchedule = content => {
    currentDate = new Date()
    const validStart =
      !content.start ||
      dateFns.compareAsc(dateFns.parseISO(content.start), currentDate)
    const validEnd =
      !content.end ||
      dateFns.compareDesc(dateFns.parseISO(content.end), currentDate)
    return validStart && validEnd
  }
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
  const getUserState = state => {
    let userState
    switch (state) {
      case '0':
        userState = 'logout'
        break
      case 1:
        userState = 'login'
        break
      default:
        userState = 'logout'
    }
    return userState
  }
  const userState = getUserState(R.path(['userstate'], req.query))
  const transformSlide = slide => {
    if (contentOnSchedule(slide)) {
      return {
        desktop: {
          url: R.path([`desktop_${userState}`, 'file', 0, 'url'], slide)
        },
        mobile: {
          url: R.path([`mobile_${userState}`, 'file', 0, 'url'], slide)
        },
        cta: slide[`cta_${userState}`],
        alt: slide.alt
      }
    }
  }

  request({ url: `${baseUrl}/rotators`, qs: qs, json: true })
    .then(function (rotators) {
      let slides = []
      if (rotators.length > 0 && contentOnSchedule(rotators[0])) {
        logger.log('Rotators called', { rotators })
        const rotator = rotators[0]
        if (rotator.slides) {
          slides = R.map(transformSlide, sortByPriority(rotator.slides))
        }
        console.log('slides', slides)
        if (jsonOnly) {
          res.json(slides)
        } else {
          res.render('rotator', { title: 'Rotator', slides: slides })
        }
      } else {
        request({
          url: `${baseUrl}/rotators`,
          qs: { priority: 1 },
          json: true
        }).then(function (rotatorsByPriority) {
          if (rotatorsByPriority.length > 0) {
            console.log('rotatorsByPriority', rotatorsByPriority[0])
            const rotatorByPriority = rotatorsByPriority[0]
            slides = R.map(
              transformSlide,
              sortByPriority(rotatorByPriority.slides)
            )
            console.log('default slides', slides)
            if (jsonOnly) {
              res.json(slides)
            } else {
              res.render('rotator', {
                title: 'Default Rotator',
                slides: slides
              })
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
