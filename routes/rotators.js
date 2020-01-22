var config = require('../config/application.json')
var dateFns = require('date-fns')
var express = require('express')
var R = require('ramda')
var request = require('request-promise-native')
var router = express.Router()

/* GET rotators page. */
router.get('/', function (req, res, next) {
  const qs = R.omit(['contentstatus', 'siteid'], req.query)
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
  const getContentStatus = status => {
    let contentStatus
    switch (status) {
      case '0':
        contentStatus = 'logout'
        break
      case 1:
        contentStatus = 'login'
        break
      default:
        contentStatus = 'logout'
    }
    return contentStatus
  }
  const contentStatus = getContentStatus(
    R.path(['contentstatus'], req.query)
  )
  const transformSlide = slide => {
    if (contentOnSchedule(slide)) {
      return {
        desktop: {
          url: slide[`desktop_${contentStatus}`]
            ? slide[`desktop_${contentStatus}`].url
            : ''
        },
        mobile: {
          url: slide[`mobile_${contentStatus}`]
            ? slide[`mobile_${contentStatus}`].url
            : ''
        },
        cta: slide[`cta_${contentStatus}`],
        alt: slide.alt
      }
    }
  }

  request({ url: `${baseUrl}/rotators`, qs: qs, json: true })
    .then(function (rotators) {
      let slides = []
      if (rotators.length > 0 && contentOnSchedule(rotators[0])) {
        console.log('rotator', rotators[0])
        const rotator = rotators[0]
        if (rotator.slides) {
          slides = R.map(transformSlide, sortByPriority(rotator.slides))
        }
        console.log('slides', slides)
        res.render('rotator', { title: 'Rotator', slides: slides })
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
            res.render('rotator', {
              title: 'Default Rotator',
              slides: slides
            })
          }
        })
      }
    })
    .catch(function (err) {
      console.error(err)
    })
})

module.exports = router
