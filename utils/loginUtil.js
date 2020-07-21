
var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const mailer = require('../utils/Mailer')
const otp = require('../utils/otp')
let { issueJWT } = require('../utils/function');
const User = mongoose.model('users');

module.exports = async (req, res, next) => {
    //1
    let { email: username, password } = req.body;

    if (!username || !password) {
        return next({ error: { message: 'Invalid data' } });
    }
    User.findOne({ 'email': username }).then(async (user) => {
        if (!user) {
            return next({ error: { message: 'username incorrect' } });
        }//compareSync

        if (user.dateDelete) {
            return next({ error: { message: 'User is not exists' } });
        }

        if (user.isReported) {
            return next({ error: { message: 'You baned' } });
        }


        const loginWithPass = async function () {
            let ret = bcrypt.compareSync(password, user.hashPass);

            if (!ret) {
                return next({ error: { message: 'Password incorrect' } });
            }

            if (!user.isActive) {
                // false
                let too = otp.generateOTP();

                try {
                    mailer.sentMailer('admin@gmail.com', { email: user.email }, 'confirm', `${too}`).then(async (json) => {
                        if (json.code == 400) {
                            return next({ error: { message: json } });
                        } else {
                            user.TOKEN = too;
                            user.save();
                            let token = await issueJWT(user);
                            
                            let { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank } = user;
                            return res.status(200).json({ result: { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank, accessToken: token } });

                        }
                    });
                } catch (err) {
                    return next({ error: { message: err } });
                }

            } else {
                let token = await issueJWT(user);
                
                let { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank } = user;
                return res.status(200).json({ result: { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank, accessToken: token } });

            }
        }

        if (user.google_id) {
            let ret1 = password == user.google_id;

            if (ret1) {
                let token = await issueJWT(user);
                let { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank } = user;
                
                return res.status(200).json({ result: { email,fullName,birthday,gender,job,phone,avatar,discription, isActive, bank, accessToken: token } });

            } else {
                loginWithPass()
            }
        } else {
            loginWithPass()
        }
    }).catch(err => {
        // nay la sai cai ten dn
        return next({ error: { message: err } });
    });

}