var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  const a = '123'
  res.send({a});
});

module.exports = router;
