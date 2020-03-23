const passport = require('passport');
var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');

const User = mongoose.model('users');

router.get('/', (req, res) => {
    res.send(req.user)
});

//#region login google
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/auth/google/callback', passport.authenticate('google'),
    function (req, res) {
        //3
        res.redirect('/');
    }
);
//#endregion

//#region login by form - logout - check current_user
router.post('/api/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.send(info); }
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            return res.send(user);
        });
    })(req, res, next);
});
// logout user
router.get('/api/logout', (req, res) => {
    req.logOut();
    res.redirect('/');
});
// get profile luon
router.get('/api/current_user', async (req, res) => {
    let id = req.user;
    let u = await User.findById(id);
    res.send(u);
});
//#endregion


module.exports = router;