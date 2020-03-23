const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('../config/key.js');
const mongoose = require('mongoose');

const User = mongoose.model('users');


passport.serializeUser((user, done) => {
    //2
    done(null, user._id);
})

passport.deserializeUser((id, done) => {
    //4
    done(null, id);
})

passport.use(
    new GoogleStrategy({
        clientID: keys.gooleClientID,
        clientSecret: keys.googleClientSecret,
        callbackURL: '/auth/google/callback',
        proxy: true
    },
        async (accessToken, refreshToken, profile, done) => {
            //1
            let { sub, name, picture, email } = profile._json;
            let userExisting = await User.findOne({ TOKEN: sub });

            if (userExisting) {
                return done(null, userExisting);
            } else {
                let userSave = await new User({ email, avatar: picture, fullName: name, TOKEN: sub }).save();
                return done(null, userSave);
            }
        }
    ));

