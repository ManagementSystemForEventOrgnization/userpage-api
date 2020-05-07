var express = require('express');
var router = express.Router();
const applyEvent_Controller = require('../controller/applyEventController');

router.post('/joinEvent', applyEvent_Controller.joinEvent);
router.post('/verifyEventMember', applyEvent_Controller.verifyEventMember);
router.post('/rejectEventMenber', applyEvent_Controller.rejectEventMenber);
router.post('/cancelEvent', applyEvent_Controller.cancelEvent);
router.post('/updatePaymentStatus', applyEvent_Controller.updatePaymentStatus);
router.get('/getListApplyEvent', applyEvent_Controller.getListApplyEvent);
router.post('/prepayEvent', applyEvent_Controller.prepayEvent);

module.exports = router;