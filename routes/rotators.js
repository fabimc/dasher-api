var express = require('express')
var R = require('ramda')
var request = require('request-promise-native')
var router = express.Router()
var baseUrl = require('../config/application.json').baseUrl

/* GET rotators page. */
router.get('/', function (req, res, next) {
  var qs = R.omit(['state'], req.query)
  var user_state = R.path(['state'], R.pick(['state'], req.query)) || 'logout'
  var sortByPriority = R.sortBy(R.prop('priority'))
  const transformSlide = slide => ({
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
  })

  request({ url: `${baseUrl}/rotators`, qs: qs, json: true })
    .then(function (rotators) {
      let slides = []
      if (rotators.length > 0) {
        console.log("rotator", rotators[0])
        if (rotators[0].slides) {
          slides = R.map(transformSlide, rotators[0].slides)
          slides = sortByPriority(slides)
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
            console.log("rotatorsByPriority", rotatorsByPriority[0])
            slides = R.map(transformSlide, rotatorsByPriority[0].slides)
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
