var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const User = mongoose.model('users');

module.exports = (app) => {

    passport.serializeUser((user, done) => {
        //2
        return done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        // save req.user
        return done(null, id);
    });

    var ls = new LocalStrategy((username, password, done) => {
        //1
        User.findOne({ 'email': username }).then(user => {
            if (!user) {
                return done(null, false, { message: 'Tên dang nhap khong đúng' });
            }
            let ret = bcrypt.compare(user.hashPass, password);
            if (ret) {
                return done(null, false, { message: 'Sai mat khau' });
            }
            return done(null, user);

        }).catch(err => {
            // nay la sai cai ten dn
            return done(err, false, { message: 'Tên dang nhap khong đúng' });
        });
        
    });

    passport.use(ls);

}
