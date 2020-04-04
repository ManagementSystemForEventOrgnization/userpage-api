const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    // req.user chi luu id cua user login
    if (!req.user) {
        res.status(401).json({message:'Unauthorized'});
    } else {
        let u = await User.findById(req.user);

        if(!u.isActive){
            res.status(402).json({message:'Not active'});
        }
        return next();
    }
}