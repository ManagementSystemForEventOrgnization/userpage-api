var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const User = mongoose.model('users');
const mailer = require('../untils/Mailer');

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

    register: async (req, res) => {
        if ((typeof req.body.email === 'undefined')
            || (typeof req.body.password === 'undefined')
            || typeof req.body.fullName === 'undefined'
        ) {
            res.status(422).json({ msg: 'Invalid data' });
            return;
        }
        let { email, password, fullName } = req.body;
        let regex = /^[a-zA-Z][a-z0-9A-Z\.\_]{1,}@[a-z0-9]{2,}(\.[a-z0-9]{1,4}){1,2}$/gm
        if (regex.test(email) || password.length < 6) {
            res.status(422).json({ msg: 'Invalid data' });
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
        if (userFind.length > 0) {
            res.status(409).json({ msg: 'Email already exist' });
            return;
        }
        password = bcrypt.hashSync(password, 10);
        const newUser = new user({
            email: email,
            fullName: fullName,
            hashPass: password,
        });
        try {
            await newUser.save();
        }
        catch (err) {
            console.log(err);
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
