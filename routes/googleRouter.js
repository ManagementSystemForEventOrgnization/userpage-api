const passport = require('passport');
var express = require('express');
var router = express.Router();
const controller_User = require('../controller/google_Controller');


router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/auth/google/callback', passport.authenticate('google'), controller_User.loginGoogle);

module.exports = router;