var express = require('express');
var router = express.Router();
const eventController = require('../controller/eventController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/save/event', Unauthorized ,eventController.saveEvent);
router.post('/save/page_event', Unauthorized ,eventController.savePageEvent);
<<<<<<< HEAD
router.get('/getPageEventEdit', Unauthorized ,eventController.getPageEventEdit);

router.get('/event' ,eventController.getPageEvent);
=======
router.get('/event', Unauthorized, eventController.getPageEvent);

router.get('/getListEvent', Unauthorized, eventController.getListEvent);

>>>>>>> ee903c9c50dbd103d2891b5e48c1434ce3ec9c33
module.exports = router;