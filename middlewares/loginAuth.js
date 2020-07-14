const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    // req.user chi luu id cua user login
    console.log(req.session)
    if (!req.user) {
        res.status(601).json({ error: { message: 'Unauthorized', code: 401 } });
        return;
    } else {
        return next();
    }
}