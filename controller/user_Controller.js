var bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model('users');
const Event = mongoose.model('event');

Event.createIndexes({ "$**": 'text' });

const ApplyEvent = mongoose.model('applyEvent');

const mailer = require('../utils/Mailer');
const otp = require('../utils/otp');
var passport = require('passport');

module.exports = {

    login: (req, res, next) => {
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(600).json({ error: { message: info.message, code: 620 } });
            }
            req.logIn(user._id, function (err) {
                if (err) { return next(err); }
                return res.status(200).json({ result: user });;
            });
        })(req, res, next);
    },

    logout: async (req, res) => {
        req.logout();
        res.status(200).json({ result: { message: 'success' } });
    },

    current_user: async (req, res, next) => {
        let id = req.user;
        try {
            let u = await User.findById(id);
            res.status(200).json({ result: u });
        } catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err)
        }
    },

    check_Mail: async (req, res,next) => {
        if (typeof req.body.email === 'undefined') {
            return res.status(600).json({ error: { message: 'Invalid value', code: 400 } });
        } else {
            let { email } = req.body;
            try {
                let user = await User.findOne({ email: email });
                if (!user) {
                    // xac nhan mail nay  chua dùng nên gữi mail đi và thông báo cho người dùng biết luôn là mail có tồn tại hay không để xác nhận.
                    const token = Math.floor(Math.random() * 1000) + 1000;
                    mailer.sentMailer('admin@gmail.com', req.body, 'confirm', `${token}`)
                        .then(json => {
                            return res.status(200).json({ result: token });
                        }).catch(err => {
                            //return res.status(600).json({ error: { message: err, code: 400 } })
                            next(err);
                        })
                } else {
                    return res.status(600).json({ error: { message: 'Email already exist', code: 500 } });
                }
            } catch (err) {
                return res.status(600).json({ error: { message: err, code: 500 } })
            }
        }
    },

    login_google: async (req, res, next) => {
        if ((typeof req.body.profile === 'undefined')) {
            res.status(600).json({ error: { message: 'Invalid value', code: 400 } });
            return;
        }

        let { googleId, name, imageUrl, email } = req.body.profile;
        let userPassport = null;
        // can check lai về vấn đề nó đã đăng kí = form trước. thì cần check lại.
        let userExisting = await User.findOne({ $or: [{ TOKEN: googleId }, { email: email }] });

        req.body.password = googleId;
        req.body.email = email;
        if (userExisting) {
            userPassport = userExisting;
            userExisting.TOKEN = googleId;
            userExisting.isActive = true;
            userExisting.save();
        } else {
            let userSave = await new User({ email, avatar: imageUrl, fullName: name, TOKEN: googleId, isActive: true }).save();
            userPassport = userSave;
        }
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(600).json({ error: { message: info.message, code: 620 } });
            }
            req.logIn(user._id, function (err) {
                if (err) {
                    return next(err);
                }
                return res.status(200).json({ result: user });
            });
        })(req, res, next);

    },

    register: async (req, res, next) => {
        if ((typeof req.body.email === 'undefined')
            || (typeof req.body.password === 'undefined')
            || typeof req.body.fullName === 'undefined'
        ) {
            res.status(600).json({ error: { message: 'Invalid data', code: 422 } });
            return;
        }
        let { email, password, fullName } = req.body;
        let regex = /^[a-zA-Z][a-z0-9A-Z\.\_]{1,}@[a-z0-9]{2,}(\.[a-z0-9]{1,4}){1,2}$/gm
        if (!regex.test(email) || password.length < 3) {
            res.status(600).json({ error: { message: 'Invalid mail data', code: 422 } });
            return;
        }
        let userFind = null;
        try {
            userFind = await User.findOne({ 'email': email });
        }catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err);
            return;
        }
        if (userFind) {
            res.status(600).json({ error: { message: 'Email already exist', code: 409 } });
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
                    return res.status(600).json({ error: { message: info.message, code: 620 } });
                }
                req.logIn(user._id, function (err) {
                    if (err) {
                        return next(err);
                    }
                    return res.status(200).json({ result: user });
                });
            })(req, res, next);
        }
        catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err);
            return;
        }
    },

    profile_user: async (req, res, next) => {
        let id = req.user;
        try {
            let u = await User.findById(id);
            res.status(200).json({ result: u });
        } catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err);
        }
    },

    requestForgotPassword: async (req, res, next) => {
        if (typeof req.body.email === 'undefined') {
            res.status(600).json({ error: { message: "Invalid data", code: 422 } });
            return;
        }

        let email = req.body.email;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err)
            return;
        }

        if (currentUser == null) {
            res.status(600).json({ error: { message: "Invalid data", code: 422 } });
        }

        mailer.sentMailer('admin@gmail.com', email, 'confirm', otp.generateOTP())
            .then(async (json) => {
                currentUser.token = token;
                try {
                    await currentUser.save();
                }
                catch (err) {
                    //res.status(600).json({ error: { message: err, code: 500 } });
                    next(err)
                    return;
                }
                res.status(200).json({ result: { message: 'success', email: email } })
            }).catch(err => {
                //res.status(600).json({ error: { message: err, code: 500 } });
                next(err);
                return;
            })
    },
    verifyToken: async (req, res, next) => {
        if (typeof req.body.token === 'undefined') {
            res.status(600).json({ error: { message: 'Invalid value', code: 402 } });
            return;
        }
        let { token } = req.body;
        let userNow = null;
        try {
            let id = req.user;
            userNow = await User.findById(id);
        } catch (err) {
            //res.json(err);
            next(err);
        }

        let tokenDB = userNow.TOKEN;
        if (token != tokenDB) {
            res.status(600).json({ error: { message: "OTP fail", code: 422 } });
            return;
        } else {
            userNow.isActive = true;
            userNow.TOKEN = "";
            await userNow.save();
            res.status(200).json({ result: { message: 'success' } });
        }
    },

    verifyForgotPassword: async (req, res, next) => {
        if (typeof req.body.email === 'undefined'
            || typeof req.body.otp === 'undefined') {
            res.status(600).json({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { email, otp } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            //res.json({ message: err });
            next(err);
            return;
        }

        if (currentUser == null) {
            res.status(600).json({ error: { message: "Invalid data", code: 422 } });
            return;
        }

        if (currentUser.token != otp) {
            res.status(600).json({ error: { message: "OTP fail", code: 422 } });
            return;
        }

        res.status(200).json({ result: { message: "success", otp: otp } });
    },

    forgotPassword: async (req, res, next) => {
        if (typeof req.body.email === 'undefined'
            || typeof req.body.otp === 'undefined'
            || typeof req.body.newPassword === 'undefined') {
            res.status(600).json({ error: { message: "Invalid data", code: 402 } });
            return;
        }

        let { email, otp, newPassword } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            //res.json({ message: err });
            next(err)
            return;
        }

        if (currentUser == null) {
            res.status(600).json({ error: { message: "Invalid data", code: 422 } });
            return;
        }

        if (currentUser.token != otp) {
            res.status(600).json({ error: { message: "OTP fail", code: 422 } });
            return;
        }

        currentUser.hashPass = bcrypt.hashSync(newPassword, 10);

        try {
            await currentUser.save();
        }
        catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err);
            return;
        }

        res.status(200).json({ result: { message: 'success' } })
    },

    updateInfor: async (req, res, next) => {
        if (typeof req.body.email === 'undefined') {
            res.status(600).json({ error: { message: 'Invalid data', code: 422 } });
            return;
        }

        let { email, fullName, birthday, gender, job, phone, discription, avatarUrl } = req.body;
        let currentUser = null

        try {
            currentUser = await User.findOne({ 'email': email })
        }
        catch (err) {
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err)
            return;
        }

        if (currentUser == null) {
            res.status(600).json({ error: { message: "not found", code: 422 } });
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
            //res.status(600).json({ error: { message: err, code: 500 } });
            next(err)
            return;
        }

        res.status(200).json({
            result: {
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
            }
        });
    },

    updatePassword: async (req, res, next) => {
        if (typeof req.body.oldpassword === 'undefined'
            || typeof req.body.newpassword === 'undefined'
            || typeof req.body.email === 'undefined') {
            res.status(600).json({ error: { message: 'Invalid data', code: 422 } });
            return;
        }

        let { email, oldpassword, newpassword } = req.body;
        let currentUser = null;

        try {
            currentUser = await User.findOne({ 'email': email });
        }
        catch (err) {
            //res.json({ message: err });
            next(err)
            return;
        }

        if (currentUser == null) {
            res.status(600).json({ error: { message: "Invalid data", code: 422 } });
            return;
        }

        if (!bcrypt.compareSync(oldpassword, currentUser.hashPass)) {
            res.status(600).json({ error: { message: 'Current password is wrong', code: 423 } });
            return;
        }

        currentUser.hashPass = bcrypt.hashSync(newpassword, 10);

        try {
            await currentUser.save()
        }
        catch (err) {
            //res.status(600).json({error: {  message: err, code: 500 }});
            next(err)
            return;
        }
        res.status(200).json({result:{ message: 'success' }});
    },

    get_History: async (req, res, next) => {

        let { categoryEventId, startDate, endDate, txtSearch, pageNumber, numberRecord } = req.body;
        txtSearch = txtSearch || '';

        pageNumber = pageNumber || 1;
        numberRecord = numberRecord || 10;

        let idUserLogin = req.user;
        try {

            let arrEvent = null;

            let conditionQuery = {
                $expr: {
                    $and: [
                        { $eq: ["$_id", "$$event_id"] },
                        { $cond: [categoryEventId, { $eq: ["$category", categoryEventId] }, {}] },
                    ],
                },
            };

            if (txtSearch != "") {
                conditionQuery.$text = { $search: txtSearch };
            }
            arrEvent = await ApplyEvent.aggregate([
                {
                    $match: {
                        userId: ObjectId(idUserLogin)
                    }
                },
                {
                    $lookup:
                    {
                        from: "events",
                        let: { event_id: "$eventId" },
                        pipeline: [
                            {
                                $match: conditionQuery
                            },
                        ],
                        as: "events"
                    }
                },
                {
                    $match: {
                        $and: [{
                            "events.startTime": {
                                $gt: new Date((startDate || '1940-01-01')),
                                $lt: new Date(endDate || (new Date().toString()))
                            }
                        },
                        { "events.status": { $nin: ["HUY"] } }
                        ]

                    },
                },
                {
                    $project: { "events": 1 }
                },
                { $skip: (+numberRecord * (+pageNumber - 1)) },
                { $limit: numberRecord }
            ]);

            res.status(200).json({result: arrEvent});
        } catch (err) {
            //res.status(600).json({error: {  message: err, code: 500 }});
            next(err);
        }


    }

}