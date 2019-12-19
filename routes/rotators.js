var express = require("express");
var request = require("request-promise-native");
var router = express.Router();

/* GET rotators page. */
router.get("/", function(req, res, next) {
  var qs = req.query;
  request({ url: "http://localhost:1337/rotators", qs: qs, json: true })
    .then(function(rotators) {
      var slides = rotators[0].slides.map(function(slide) {
        return {
          desktop_login: {
            url: slide.desktopLogin ? slide.desktopLogin.url : ""
          },
          desktop_logout: {
            url: slide.desktopLogout ? slide.desktopLogout.url : ""
          },
          mobile_login: {
            url: slide.mobileLogin ? slide.mobileLogin.url : ""
          },
          mobile_logout: {
            url: slide.mobileLogout ? slide.mobileLogout.url : ""
          }
        };
      });
      console.log("slides", slides);
      res.render("rotator", { title: "Rotator", slides: slides });
    })
    .catch(function(err) {
      console.error(err);
    });
  // res.render("rotator", { title: "Rotator", slides: slides });
});

module.exports = router;
