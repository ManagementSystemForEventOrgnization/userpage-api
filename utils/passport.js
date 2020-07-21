const key = require('../config/key');
const mongoose = require('mongoose');
const User = mongoose.model('users');

const JwtStrategy = require('passport-jwt').Strategy,
ExtractJwt = require('passport-jwt').ExtractJwt;
const options = {
    jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey : key.PRIV_KEY,
    // algorithms: ["RS256"]
}

const strategy = new JwtStrategy(options, (payload, done)=>{
    User.findById(payload.sub).then(u=>{
        if(u){
            return done(null, u._id);
        }
        return done(null, false);
    }).catch(err=>{
        return done(err, null);
    })
    
})
module.exports = (passport) => {


    passport.serializeUser((user, done) => {
        //2
        return done(null, user._id);
     
    });

    passport.deserializeUser((id, done) => {
        // save req.user
        return done(null, id);
    });

    passport.use(strategy);

}
