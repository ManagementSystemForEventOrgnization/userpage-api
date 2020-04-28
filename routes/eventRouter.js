var express = require('express');
var router = express.Router();
const eventController = require('../controller/eventController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/save/event', Unauthorized ,eventController.saveEvent);

module.exports = router;