var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = mongoose.model('users');
const mailer = require('../utils/Mailer');
const otp = require('../utils/otp');
var passport = require('passport');

module.exports = {

    logout: async (req, res) => {
        req.logout();
        res.status(200).json({ message: 'success' });
    },

    current_user: async (req, res) => {
        let id = req.user;
        try {
            let u = await User.findById(id);
            res.status(200).json(u);
        } catch (err) {
            res.status(500).json({ message: err });
        }
    },

    check_Mail: async (req, res) => {
        if (typeof req.body.email === 'undefined') {
            return res.status(404).json({ message: 'Invalid value' });
        } else {
            let { email } = req.body;
            try {
                let user = await User.findOne({ email: email });
                if (!user) {
                    // xac nhan mail nay  chua dùng nên gữi mail đi và thông báo cho người dùng biết luôn là mail có tồn tại hay không để xác nhận.
                    const token = '123';
                    mailer.sentMailer('admin@gmail.com', req.body, 'confirm', token)
                        .then(json => {
                            return res.status(200).json({ token });
                        }).catch(err => {
                            return res.status(404).json(err);
                        })
                } else {
                    return res.status(409).json({ message: 'Email already exist' });
                }
            } catch (err) {
                return res.status(500).json({ message: err });
            }
        }
    },

    register: async (req, res, next) => {
        if ((typeof req.body.email === 'undefined')
            || (typeof req.body.password === 'undefined')
            || typeof req.body.fullName === 'undefined'
        ) {
            res.status(422).json({ msg: 'Invalid data' });
            return;
        }
        let { email, password, fullName } = req.body;
        let regex = /^[a-zA-Z][a-z0-9A-Z\.\_]{1,}@[a-z0-9]{2,}(\.[a-z0-9]{1,4}){1,2}$/gm
        if (!regex.test(email) || password.length < 3) {
            res.status(422).json({ msg: 'Invalid mail data' });
            return;
        }
        let userFind = null;
        try {
            userFind = await User.findOne({ 'email': email });
        }
        catch (err) {
            res.status(500).json({ msg: err });
            return;
        }
        if (userFind) {
            res.status(409).json({ msg: 'Email already exist' });
            return;
        }
        password = bcrypt.hashSync(password, 10);
        const newUser = new User({
            email: email,
            fullName: fullName,
            hashPass: password,
        });
        try {
            await newUser.save();
            passport.authenticate('local', function (err, user, info) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    return res.send(info);
                }
                req.logIn(user, function (err) {
                    if (err) { 
                        return next(err); 
                    }
                    return res.status(200).json(user);
                });
            })(req, res, next);
        }
        catch (err) {
            res.status(500).json({ msg: err });
            return;
        }
    },

    profile_user: async (req, res) => {
        let id = req.user;
        try {
            let u = await User.findById(id);
            res.status(200).json(u);
        } catch (err) {
            res.status(500).json({ message: err });
        }
    },

    requestForgotPassword: async (req, res) => {
        if (typeof req.body.email === 'undefined') {
            res.json({ message: "Invalid data" });
            return;
        }

        let email = req.body.email;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            res.json({ message: err });
            return;
        }

        if (currentUser == null) {
            res.status(422).json({ message: "Invalid data" });
        }

        mailer.sentMailer('admin@gmail.com', email, 'confirm', otp.generateOTP())
            .then(async (json) => {
                currentUser.token = token;
                try {
                    await currentUser.save();
                }
                catch (err) {
                    res.status(500).json({ message: err });
                    return;
                }
                res.status(201).json({ message: 'success', email: email })
            }).catch(err => {
                res.status(500).json({ message: 'Send email fail' });
                return;
            })
    },
    verifyToken: async (req, res) => {
        if (typeof req.body.token === 'undefined') {
            res.status(402).json({ message: 'Invalid value' });
            return;
        }
        let { token } = req.body;
        let userNow=null;
        try {
            let id = req.user;
            userNow = await User.findById(id);
        } catch (err) {
            res.json(err);
        }
        
        let tokenDB = userNow.TOKEN;
        if (token != tokenDB) {
            res.status(422).json({ message: "OTP fail" });
            return;
        } else {
            userNow.isActive = true;
            await userNow.save();
            res.status(200).json({ message: 'success' });
        }


    },

    verifyForgotPassword: async (req, res) => {
        if (typeof req.body.email === 'undefined'
            || typeof req.body.otp === 'undefined') {
            res.status(402).json({ message: "Invalid data" });
            return;
        }

        let { email, otp } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            res.json({ msg: err });
            return;
        }

        if (currentUser == null) {
            res.status(422).json({ message: "Invalid data" });
            return;
        }

        if (currentUser.token != otp) {
            res.status(422).json({ message: "OTP fail" });
            return;
        }

        res.status(200).json({ message: "success", otp: otp });
    },

    forgotPassword: async (req, res) => {
        if (typeof req.body.email === 'undefined'
            || typeof req.body.otp === 'undefined'
            || typeof req.body.newPassword === 'undefined') {
            res.status(402).json({ message: "Invalid data" });
            return;
        }

        let { email, otp, newPassword } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            res.json({ message: err });
            return;
        }

        if (currentUser == null) {
            res.status(422).json({ message: "Invalid data" });
            return;
        }

        if (currentUser.token != otp) {
            res.status(422).json({ message: "OTP fail" });
            return;
        }

        currentUser.hashPass = bcrypt.hashSync(newPassword, 10);

        try {
            await currentUser.save();
        }
        catch (err) {
            res.status(500).json({ message: err });
            return;
        }

        res.status(201).json({ message: 'success' })
    },

    updateInfor: async (req, res) => {
        if (typeof req.body.email === 'undefined') {
            res.status(422).json({ message: 'Invalid data' });
            return;
        }

        let { email, fullName, birthday, gender, job, phone, discription, avatarUrl } = req.body;
        let currentUser = null

        try {
            currentUser = await User.findOne({ 'email': email })
        }
        catch (err) {
            res.status(500).json({ message: err });
            return;
        }

        if (currentUser == null) {
            res.status(422).json({ message: "not found" });
            return;
        }

        currentUser.fullName = fullName;
        currentUser.birthday = birthday;
        currentUser.gender = gender;
        currentUser.job = job;
        currentUser.phone = phone;
        currentUser.discription = discription;
        currentUser.avatar = avatarUrl;

        try {
            await currentUser.save()
        }
        catch (err) {
            res.status(500).json({ message: err });
            return;
        }

        res.status(200).json({
            message: 'success', user: {
                email: currentUser.email,
                fullName: currentUser.fullName,
                birthday: currentUser.birthday,
                gender: currentUser.gender,
                job: currentUser.job,
                id: currentUser._id,
                phone: currentUser.phone,
                discription: currentUser.discription,
                avatar: currentUser.avatar
            }
        });
    },

    updatePassword: async (req, res) => {
        if (typeof req.body.oldpassword === 'undefined'
            || typeof req.body.newpassword === 'undefined'
            || typeof req.body.email === 'undefined') {
            res.status(422).json({ msg: 'Invalid data' });
            return;
        }

        let { email, oldpassword, newpassword } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            res.json({ message: err });
            return;
        }

        if (currentUser == null) {
            res.status(422).json({ message: "Invalid data" });
            return;
        }

        if (!bcrypt.compareSync(oldpassword, currentUser.hashPass)) {
            res.status(423).json({ message: 'Current password is wrong' });
            return;
        }

        currentUser.hashPass = bcrypt.hashSync(newpassword, 10);

        try {
            await currentUser.save()
        }
        catch (err) {
            res.status(500).json({ message: err });
            return;
        }

        res.status(200).json({ msg: 'success' });
    },

}

// }

//     // cai này bỏ nha nhựt vì chốt vs bên font-end là sẽ gữi mail sau khi nhập mail xong và gữi code đi luôn
//     // cai nay can trao doi lai de thuan tien cho viec check.
//     exports.verifyAccount = async (req, res) => {
//         if (typeof req.params.token === 'undefined') {
//             res.status(402).json({ msg: "!invalid" });
//             return;
//         }
//         let token = req.params.token;
//         let tokenFind = null;
//         try {
//             tokenFind = await user.findOne({ 'token': token });
//         }
//         catch (err) {
//             res.status(500).json({ msg: err });
//             return;
//         }
//         if (tokenFind == null) {
//             res.status(404).json({ msg: "not found!!!" });
//             return;
//         }
//         try {
//             await user.findByIdAndUpdate(tokenFind._id,
//                 { $set: { is_verify: true } }, { new: true });
//         }
//         catch (err) {
//             res.status(500).json({ msg: err });
//             return;
//         }
//         res.status(200).json({ msg: "success!" });
//     }
