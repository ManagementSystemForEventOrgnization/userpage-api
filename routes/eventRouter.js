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
router.get('/get_event_inf', Unauthorized, eventController.getEventInf);
router.get('/get_user_join_event', Unauthorized, eventController.getUserJoinEvent);
router.get('/test',eventController.test);
router.post('/require_edit_event', Unauthorized, eventController.require_edit_event);

router.post('/public_private_event', Unauthorized, eventController.publicPrivateEvent);
router.post('/publish_event', Unauthorized, eventController.publishEvent);

module.exports = router;
