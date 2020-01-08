var express = require("express");
var R = require("ramda");
var request = require("request-promise-native");
var router = express.Router();
var baseUrl = require("../config/application.json").baseUrl;

/* GET rotators page. */
router.get("/", function(req, res, next) {
  var qs = R.omit(["state"], req.query);
  var user_state = R.path(["state"], R.pick(["state"], req.query)) || "logout";
  request({ url: `${baseUrl}/rotators`, qs: qs, json: true })
    .then(function(rotators) {
      // console.log("rotators[0].slides", rotators[0].slides);
      var slides = rotators[0].slides.map(function(slide) {
        return {
          desktop: {
            url: slide[`desktop_${user_state}`] ? slide[`desktop_${user_state}`].url : ""
          },
          mobile: {
            url: slide[`mobile_${user_state}`] ? slide[`mobile_${user_state}`].url : ""
          },
          cta: slide[`cta_${user_state}`],
          alt: slide.alt
        };
      });
      
      // console.log("slides", slides);
      res.render("rotator", { title: "Rotator", slides: slides });
    })
    .catch(function(err) {
      console.error(err);
    });
});

module.exports = router;
