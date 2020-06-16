var express = require('express');
var router = express.Router();
const Unauthorized = require('../middlewares/loginAuth');
const applyEvent_Controller = require('../controller/applyEventController');

router.post('/joinEvent', Unauthorized, applyEvent_Controller.joinEvent);
router.post('/verifyEventMember', Unauthorized, applyEvent_Controller.verifyEventMember);
router.post('/rejectEventMenber', Unauthorized, applyEvent_Controller.rejectEventMenber);
router.post('/cancelEvent', Unauthorized, applyEvent_Controller.cancelEvent);
router.post('/updatePaymentStatus', Unauthorized, applyEvent_Controller.updatePaymentStatus);
router.get('/getListApplyEvent', Unauthorized, applyEvent_Controller.getListApplyEvent);
router.post('/prepayEvent', Unauthorized, applyEvent_Controller.prepayEvent);
router.post('/refundForCancelledUser', applyEvent_Controller.refundForCancelledUser);

module.exports = router;