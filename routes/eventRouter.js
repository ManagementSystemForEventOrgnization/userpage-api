var express = require('express');
var router = express.Router();
const eventController = require('../controller/eventController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/save/event', Unauthorized ,eventController.saveEvent);
router.post('/save/page_event', Unauthorized ,eventController.savePageEvent);
router.get('/event/test' ,eventController.test);
router.get('/event' ,eventController.getPageEvent);
router.get('/get_list_event', eventController.getListEvent);
router.get('/get_list_event_coming_up', eventController.getListEventComingUp);

module.exports = router;