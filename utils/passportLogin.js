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
        passwordField: 'password',
    }, async (username, password, done) => {
        //1
        if (typeof username === 'undefined' || typeof password === 'undefined') {
            return done(null, false, { message: 'Invalid data' });
        }
        
        User.findOne({ 'email': username }).then( user => {
            if (!user) {
                return done(null, false, { message: 'username incorrect' });
            }//compareSync
            let ret =  bcrypt.compareSync(password, user.hashPass);
            
            let ret1 = password == user.google_id;
            
            if (!ret) {
                if(ret1){
                    return done(null,user);
                }
                return done(null, false, { message: 'Password incorrect' });
            }
            if (!user.isActive) {
                // false
                let too = Math.floor( Math.random()*1000)+ 1000;
                try {
                    mailer.sentMailer('admin@gmail.com', { email: user.email }, 'confirm', `${too}`).then(json=>{
                        if(json.code==400){
                            return done(null, false, json);
                        }else{
                            user.TOKEN = too;
                            user.save();
                            return done(null, user);
                        }
                    });
                } catch (err) {
                    return done(null, false,err);
                }
                
            }else{
                return done(null, user);
            }

            

        }).catch(err => {
            // nay la sai cai ten dn
            return done(err, false, { message: err });
        });

    });

    passport.use(ls);

}
