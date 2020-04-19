
const mongoose = require('mongoose');
const User = mongoose.model('users');

module.exports = {

    loginGoogle: async function (req, res) {
        //3
        if (!req.user) {
            res.status(401).json({ message: 'Login-google false' });
        } else {
            let u = await User.findById(req.user);
            res.redirect('/api/current_user');
            //res.status(200).json(u);
        }
    },

}