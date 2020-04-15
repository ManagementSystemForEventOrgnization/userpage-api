var express = require('express');
var router = express.Router();
const payment_Controller = require('../controller/payment_Controller');

router.post('/create_charges', payment_Controller.create_charges);
router.post('/get_listcard', payment_Controller.get_listcard);
router.post('/set_card_default', payment_Controller.set_card_default);
router.post('/del_card', payment_Controller.del_card);
router.post('/del_customer', payment_Controller.del_customer);
router.post('/create_customer', payment_Controller.create_customer);
router.post('/payouts', payment_Controller.payouts);


router.post('/create_order', payment_Controller.create_order);
router.post('/create_order_callback', payment_Controller.create_order_callback);

module.exports = router;