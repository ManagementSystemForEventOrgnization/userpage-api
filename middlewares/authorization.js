const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    let u = await User.findById(req.user); 
    if(!u){
        res.status(602).json({error: {message: 'You have to login', code : 700}})
        return;
    }
    if (u.isReported) {
        res.status(602).json({ error: { message: 'Not active', code: 203 } });
        return;
    } else if(!u.isActive){
        res.status(603).json({error: {message: 'You are baned by admin', code : 500}})
        return;
    }else {    
        return next();
    }
}