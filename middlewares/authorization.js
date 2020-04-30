const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    let u = await User.findById(req.user);

    if (!u.isActive) {
         res.status(203).json({ message: 'Not active' });
    } else {
        return next();
    }
}