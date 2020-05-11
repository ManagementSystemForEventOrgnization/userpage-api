var express = require('express');
var router = express.Router();
const eventController = require('../controller/eventController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/save/event', Unauthorized ,eventController.saveEvent);
router.post('/save/page_event', Unauthorized ,eventController.savePageEvent);
router.get('/event', Unauthorized, eventController.getPageEvent);

router.get('/getListEvent', Unauthorized, eventController.getListEvent);

module.exports = router;