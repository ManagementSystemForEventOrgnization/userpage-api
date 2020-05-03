var express = require('express');
var router = express.Router();
const notification_Controller = require('../controller/notificationController');

router.get('/getBadgeNumber', notification_Controller.getBadgeNumber);
router.post('/startEventNoti', notification_Controller.startEventNoti);
router.post('/getListNotification', notification_Controller.getListNotification);

module.exports = router;