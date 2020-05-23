const mongoose = require('mongoose');
const Event = mongoose.model('event');

module.exports = async (req, res, next) => {
    let _id = req.user;
    let e = Event.findOne({})
    if (!req.user) {
        res.status(601).json({ error: { message: 'Unauthorized', code: 401 } });
    } else {
        return next();
    }
}