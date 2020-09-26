var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // console.log(req.query)
  res.render("index", {
    title: "Xooa Blockchain",
    token: req.query.token,
    ballotId: req.query.ballotId,
  });
});

module.exports = router;
