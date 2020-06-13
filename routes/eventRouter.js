var express = require('express');
var router = express.Router();
const eventController = require('../controller/eventController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/update/event', Unauthorized, eventController.updateEvent);
router.post('/delete/event', Unauthorized, eventController.deleteEvent);

router.post('/save/event', Unauthorized, eventController.saveEvent);
router.post('/save/page_event', Unauthorized, eventController.savePageEvent);
router.get('/event', eventController.getPageEvent);
router.get('/get_list_event', eventController.getListEvent);
router.get('/get_list_event_coming_up', eventController.getListEventComingUp);
router.get('/get_event_inf', eventController.getEventInf);
router.get('/get_user_join_event', eventController.getUserJoinEvent);

module.exports = router;
