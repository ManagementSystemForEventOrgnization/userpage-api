const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('../config/key.js');


passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser((id, done) => {
    
})


passport.use(
    new GoogleStrategy({
        clientID: keys.gooleClientID,
        clientSecret: keys.googleClientSecret,
        callbackURL: '/auth/google/callback',
        proxy: true
    },
         (accessToken, refreshToken, profile, done) => {
             console.log(profile);
            // User.findOne({ googleId: profile.id })
            //     .then((existingUser) => {
            //         if (existingUser) {
            //             console.log(existingUser);
            //             done(null, existingUser);
            //         } else {
            //             new User({ googleId: profile.id }).save()
            //                 .then(u => done(null, u));
            //         }
            //     })

        }
    ));