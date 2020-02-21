var config = require('../config/application.json')
var dateFns = require('date-fns')
var express = require('express')
var R = require('ramda')
var request = require('request-promise-native')
var router = express.Router()
var graylog2 = require('graylog2')

var logger = new graylog2.graylog({
  servers: [{ host: 'gl-input.itspty.dom', port: 12201 }], // hostname: 'server.name', // the name of this host (optional, default: os.hostname())
  facility: 'CONTENT-SOURCE-API', // the facility for these log messages (optional, default: "Node.js")
  bufferSize: 1350 // max UDP packet size, should never exceed the MTU of your system (optional, default: 1400)
})

logger.on('error', function (error) {
  console.error('Error while trying to write to graylog2:', error)
})

/* GET rotators page. */
router.get('/', function (req, res, next) {
  const qs = R.merge(
    { status: 'published' },
    R.omit(['json', 'pagename', 'siteid', 'template', 'userstate'], req.query)
  )
  const sortByPriority = R.sortWith([
    R.descend(R.prop('created_at')),
    R.ascend(R.prop('priority'))
  ])
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
  const pageName = R.path(['pagename'], req.query)
  const template = R.pathOr('rotator', ['template'], req.query)
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
        const rotator = rotators[0]
        if (rotator.slides) {
          slides = R.map(transformSlide, sortByPriority(rotator.slides))
        }
        if (jsonOnly) {
          res.json(slides)
        } else {
          res.render(template, {
            pageName,
            slides,
            rotatorId: rotator.id,
            rotatorName: rotator.name,
            template,
            title: 'Rotator'
          })
        }
      } else {
        request({
          url: `${baseUrl}/rotators`,
          qs: { priority: 1 },
          json: true
        }).then(function (rotatorsByPriority) {
          if (rotatorsByPriority.length > 0) {
            const rotatorByPriority = rotatorsByPriority[0]
            slides = R.map(
              transformSlide,
              sortByPriority(rotatorByPriority.slides)
            )
            if (jsonOnly) {
              res.json(slides)
            } else {
              res.render(template, {
                pageName,
                rotatorId: rotatorByPriority.id,
                rotatorName: rotatorByPriority.name,
                slides,
                template,
                title: 'Default Rotator'
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
