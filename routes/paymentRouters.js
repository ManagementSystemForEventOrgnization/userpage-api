var express = require('express');
var router = express.Router();
const Unauthorized = require('../middlewares/loginAuth');
const payment_Controller = require('../controller/payment_Controller');

// router.post('/create_charges', payment_Controller.create_charges);
router.get('/get_listcard', Unauthorized, payment_Controller.get_listcard);
router.post('/set_card_default', Unauthorized, payment_Controller.set_card_default);
router.post('/del_card', Unauthorized, payment_Controller.del_card);
// router.post('/del_customer', Unauthorized, payment_Controller.del_customer);
router.post('/add_card', Unauthorized, payment_Controller.create_customer);
// router.post('/payouts', payment_Controller.payouts);

// router.post('/zalopay_create_order', payment_Controller.create_order);
router.post('/create_order_callback', Unauthorized, payment_Controller.create_order_callback);

router.get('/payment_history', Unauthorized, payment_Controller.paymentHis);



module.exports = router;