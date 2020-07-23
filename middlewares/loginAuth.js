const mongoose = require('mongoose');
const User = mongoose.model('users');

const passport = require('passport');

module.exports = async (req, res, next) => {
    // req.user chi luu id cua user login
    return passport.authenticate('jwt', { session: false })(req,res,next);

    // next();

    console.log(req.user);
    if (!req.user) {
        res.status(601).json({ error: { message: 'Unauthorized', code: 401 } });
        return;
    } else {
        return next();
    }
}