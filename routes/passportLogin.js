var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const mailer = require('../utils/Mailer')
const otp = require('../utils/otp')

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

    var ls = new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, (username, password, done) => {
        //1
        if(typeof username === 'undefined' || typeof password === 'undefined'){
            return done(null, false, {message : 'Invalid data'});
        }
        User.findOne({ 'email': username }).then(async user => {
            if (!user) {
                return done(null, false, { message: 'username incorrect' });
            }//compareSync

            let ret = bcrypt.compare(user.hashPass, password);
            
            if (!ret) {
                return done(null, false, { message: 'Password incorrect' });
            }
            if(!user.isActive){
                // false
                let too = '123';
                console.log(user.email)
                mailer.sentMailer('admin@gmail.com',{email:user.email},'confirm',too);
                user.TOKEN = too;
                user.save();
            }

            return done(null, user);

        }).catch(err => {
            // nay la sai cai ten dn
            return done(err, false, { message: err });
        });
        
    });

    passport.use(ls);

}
