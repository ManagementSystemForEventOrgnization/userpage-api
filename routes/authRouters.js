const passport = require('passport');
var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('users');
const controller_User = require('../controller/user_Controller');

router.get('/', (req, res) => {
    res.send(req.user)
});

router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/auth/google/callback', passport.authenticate('google'),
    function (req, res) {
        //3
        res.status(200).json(req.user);
    }
);

router.post('/api/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.send(info);
        }
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            return res.status(200).json(user);
        });
    })(req, res, next);
});

router.get('/logout', controller_User.logout);
router.get('/current_user', controller_User.current_user);
router.post('/register', controller_User.register);
router.post('/checkMail', controller_User.check_Mail);

router.post('/requestForgotPassword', controller_User.requestForgotPassword);
router.post('/verifyForgotPassword', controller_User.verifyForgotPassword);
router.get('/forgotPassword', controller_User.forgotPassword);
router.get('/updatePassword', controller_User.updatePassword);

router.post('/user/updateInfor', controller_User.updateInfor);
router.get('/user/profile', controller_User.profile_user);

module.exports = router;