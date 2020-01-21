var config = require('../config/application.json')
var dateFns = require('date-fns')
var express = require('express')
var R = require('ramda')
var request = require('request-promise-native')
var router = express.Router()

/* GET rotators page. */
router.get('/', function (req, res, next) {
  var qs = R.omit(['state', 'site'], req.query)
  var user_state = R.path(['state'], R.pick(['state'], req.query)) || 'logout'
  const site = R.path(['site'], R.pick(['site'], req.query))
  const baseUrl = R.path([site], config) || 'baseUrlSb'
  var sortByPriority = R.sortBy(R.prop('priority'))
  const contentOnSchedule = content => {
    currentDate = new Date()
    const validStart = !content.start || dateFns.compareAsc(dateFns.parseISO(content.start), currentDate)
    const validEnd = !content.end || dateFns.compareDesc(dateFns.parseISO(content.end), currentDate)
    return validStart && validEnd
  }
  const transformSlide = slide => {
    if (contentOnSchedule(slide)) {
      return {
        desktop: {
          url: slide[`desktop_${user_state}`]
            ? slide[`desktop_${user_state}`].url
            : ''
        },
        mobile: {
          url: slide[`mobile_${user_state}`]
            ? slide[`mobile_${user_state}`].url
            : ''
        },
        cta: slide[`cta_${user_state}`],
        alt: slide.alt
      }
    }
  }

  request({ url: `${config[baseUrl]}/rotators`, qs: qs, json: true })
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
            slides = R.map(transformSlide, sortByPriority(rotatorByPriority.slides))
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
