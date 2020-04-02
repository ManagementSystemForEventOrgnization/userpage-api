const passport = require('passport');
var express = require('express');
var router = express.Router();
const controller_User = require('../controller/user_Controller');
const Unauthorized = require('../middlewares/loginAuth');

router.get('/', (req, res) => {
    res.send(req.user)
});

// router.get('/api/getData', (req, res) => {
//     console.log(req.query);
//     res.send(req.user)
// });

router.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).json(info);
        }
        req.logIn(user._id, function (err) {
            if (err) { return next(err); }
            return res.status(200).json(user);
        });
    })(req, res, next);
});

router.post('/login-google', controller_User.login_google);

router.get('/logout', Unauthorized, controller_User.logout);
router.get('/current_user', Unauthorized, controller_User.current_user);
router.post('/register', controller_User.register);
router.post('/checkMail', Unauthorized, controller_User.check_Mail);
router.post('/verifyToken', Unauthorized, controller_User.verifyToken);

router.post('/requestForgotPassword', controller_User.requestForgotPassword);
router.post('/verifyForgotPassword', controller_User.verifyForgotPassword);
router.get('/forgotPassword', controller_User.forgotPassword);
router.get('/updatePassword', Unauthorized, controller_User.updatePassword);

router.post('/user/updateInfor', Unauthorized, controller_User.updateInfor);
router.get('/user/profile', Unauthorized, controller_User.profile_user);
router.get('/user/history', Unauthorized, controller_User.get_History);
module.exports = router;