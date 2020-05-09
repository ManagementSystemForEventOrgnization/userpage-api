const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    let u = await User.findById(req.user);

    if (!u.isActive) {
        res.status(600).json({ error: { message: 'Not active', coe: 203 } });
    } else {    
        return next();
    }
}