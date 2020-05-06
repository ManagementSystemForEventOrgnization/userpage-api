var express = require('express');
var router = express.Router();
const controller_User = require('../controller/user_Controller');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.get('/', (req, res) => {
    res.send(req.user)
});

router.post('/login', controller_User.login);
router.post('/login-google', controller_User.login_google);
router.post('/register', controller_User.register);
router.post('/requestForgotPassword', controller_User.requestForgotPassword);
router.post('/verifyForgotPassword', controller_User.verifyForgotPassword);
router.post('/forgotPassword', controller_User.forgotPassword);


// api user middlewares
router.get('/logout', Unauthorized, controller_User.logout);
// check xem co active chua.
router.get('/current_user', Unauthorized, Authorization, controller_User.current_user);
router.post('/verifyToken', Unauthorized, controller_User.verifyToken);
router.post('/updatePassword', Unauthorized, controller_User.updatePassword);
router.post('/user/updateInfo', Unauthorized, controller_User.updateInfor);
router.get('/user/profile', Unauthorized, controller_User.profile_user);
router.post('/user/history', Unauthorized, controller_User.get_History);

module.exports = router;