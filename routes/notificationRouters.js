var express = require('express');
var router = express.Router();
const Unauthorized = require('../middlewares/loginAuth');
const notification_Controller = require('../controller/notificationController');

router.get('/getBadgeNumber', Unauthorized, notification_Controller.getBadgeNumber);
router.post('/startEventNoti', notification_Controller.startEventNoti);
router.get('/getListNotification', Unauthorized, notification_Controller.getListNotification);
router.post('/setReadNotification', Unauthorized, notification_Controller.setReadNotification);
router.post('/setDeleteNotification', Unauthorized, notification_Controller.setDeleteNotification);

module.exports = router;