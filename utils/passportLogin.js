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
        console.log("serializeUser")
        console.log(user)
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
        if (!username || !password) {
            return done(null, false, { message: 'Invalid data' });
        }
        User.findOne({ 'email': username }).then( user => {
            if (!user) {
                return done(null, false, { message: 'username incorrect' });
            }//compareSync

            const loginWithPass = async function () {
                let ret =  bcrypt.compareSync(password, user.hashPass);

                if (!ret) {
                    return done(null, false, { message: 'Password incorrect' });
                }

                if (!user.isActive) {
                    // false
                    let too = otp.generateOTP();
                    
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
                    
                } else {
                    return done(null, user);
                }
            }

            if (user.google_id) {
                let ret1 = password == user.google_id;
                
                if(ret1){
                    return done(null,user);
                } else {
                    loginWithPass()
                    
                }
            } else {
                loginWithPass()
            }
        }).catch(err => {
            // nay la sai cai ten dn
            return done(err, false, { message: err });
        });

    });

    passport.use('local',ls);

}
