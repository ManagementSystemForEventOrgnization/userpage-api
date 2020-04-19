const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    // req.user chi luu id cua user login
    if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
    } else {
        return next();
    }
}