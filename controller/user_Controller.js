var bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model("users");
const Event = mongoose.model("event");

const ApplyEvent = mongoose.model("applyEvent");

const mailer = require("../utils/Mailer");
const otp = require("../utils/otp");
var passport = require("passport");

module.exports = {

  login: (req, res, next) => {
    passport.authenticate("local", function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next({ error: { message: info.message, code: 620 } });
      }

      req.logIn(user._id, function (err) {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ result: user });
      });
    })(req, res, next);
  },

  logout: async (req, res) => {
    req.logout();
    res.status(200).json({ result: true });
  },

  current_user: async (req, res, next) => {
    let id = req.user;
    try {
      let u = await User.findById(id);
      res.status(200).json({ result: u });
    } catch (err) {
      next(err);
    }
  },

  login_google: async (req, res, next) => {
    if (typeof req.body.profile === "undefined") {
      next({ error: { message: "Invalid value", code: 400 } });
      return;
    }

    let { googleId, name, imageUrl, email } = req.body.profile;
    let userPassport = null;
    // can check lai về vấn đề nó đã đăng kí = form trước. thì cần check lại.
    let userExisting = await User.findOne({
      $or: [{ google_id: googleId }, { email: email }],
    });

    req.body.password = googleId;
    req.body.email = email;

    if (userExisting) {
      userPassport = userExisting;
      userExisting.google_id = googleId;
      userExisting.isActive = true;
      userExisting.save();
    } else {
      let userSave = await new User({
        email,
        avatar: imageUrl,
        fullName: name,
        google_id: googleId,
        isActive: true,
      }).save();
      userPassport = userSave;
    }

    passport.authenticate("local", function (err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next({ error: { message: info.message, code: 620 } });
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
    if (
      typeof req.body.email === "undefined" ||
      typeof req.body.password === "undefined" ||
      typeof req.body.fullName === "undefined"
    ) {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    let { email, password, fullName } = req.body;
    let regex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    if (!regex.test(email) || password.length < 3) {
      next({
        error: {
          message: "incorrect Email or password little than 3 characters",
          code: 422,
        },
      });
      return;
    }

    let userFind = null;

    try {
      userFind = await User.findOne({ email: email });
    } catch (err) {
      next(err);
      return;
    }

    if (userFind) {
      next({ error: { message: "Email already exist", code: 409 } });
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

      passport.authenticate("local", function (err, user, info) {
        if (err) {
          return next(err);
        }
        if (!user) {
          return next({ error: { message: info.message, code: 620 } });
        }

        req.logIn(user._id, function (err) {
          if (err) {
            return next(err);
          }
          return res.status(200).json({ result: user });
        });
      })(req, res, next);
    } catch (err) {
      next(err);
      return;
    }
  },

  // verify account khi register
  verifyToken: async (req, res, next) => {
    if (typeof req.query.token === "undefined") {
      next({ error: { message: "Invalid value", code: 402 } });
      return;
    }

    let { token } = req.query;
    let userNow = null;

    try {
      let id = req.user;
      userNow = await User.findById(id);
    } catch (err) {
      next(err);
    }

    let tokenDB = userNow.TOKEN;

    if (token != tokenDB) {
      next({ error: { message: "OTP fail", code: 422 } });
    } else {
      userNow.isActive = true;
      userNow.TOKEN = "";

      try {
        await userNow.save();
        return res.status(200).json({ result: true });
      } catch (err) {
        next(err);
      }
    }
  },

  profile_user: async (req, res, next) => {
    let id = req.user;

    try {
      let u = await User.findById(id);
      res.status(200).json({ result: u });
    } catch (err) {
      next(err);
    }
  },

  requestForgotPassword: async (req, res, next) => {
    if (typeof req.body.email === "undefined") {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    let email = req.body.email;
    let currentUser = null;

    try {
      currentUser = await User.findOne({ email: email });
    } catch (err) {
      next(err);
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "Invalid data", code: 422 } });
    }

    let token = otp.generateOTP();

    mailer.sentMailer("admin@gmail.com", { email }, "confirm", token)
      .then(async (json) => {
        currentUser.TOKEN = token;

        try {
          await currentUser.save();
        } catch (err) {
          next(err);
          return;
        }

        res.status(200).json({ result: true });
      })
      .catch((err) => {
        next(err);
        return;
      });
  },

  verifyForgotPassword: async (req, res, next) => {
    if (
      typeof req.body.email === "undefined" ||
      typeof req.body.otp === "undefined"
    ) {
      next({ error: { message: "Invalid data", code: 402 } });
      return;
    }

    let { email, otp } = req.body;
    let currentUser = null;

    try {
      currentUser = await User.findOne({ email: email });
    } catch (err) {
      next(err);
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    console.log("verifyForgotPassword", currentUser);
    if (currentUser.TOKEN != otp) {
      next({ error: { message: "OTP fail", code: 621 } });
      return;
    }
    res.status(200).json({ result: true });
  },

  forgotPassword: async (req, res, next) => {
    if (
      typeof req.body.email === "undefined" ||
      typeof req.body.otp === "undefined" ||
      typeof req.body.newPassword === "undefined"
    ) {
      next({ error: { message: "Invalid data", code: 402 } });
      return;
    }

    let { email, otp, newPassword } = req.body;
    let currentUser = null;

    try {
      currentUser = await User.findOne({ email: email });
    } catch (err) {
      next(err);
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    if (currentUser.TOKEN != otp) {
      next({ error: { message: "OTP fail", code: 422 } });
      return;
    }

    currentUser.hashPass = bcrypt.hashSync(newPassword, 10);
    currentUser.TOKEN = "";
    currentUser.isActive = true;

    try {
      await currentUser.save();
      res.status(200).json({ result: true });
    } catch (err) {
      next(err);
    }
  },

  updateInfor: async (req, res, next) => {
    let id = req.user;
    let {
      fullName,
      birthday,
      gender,
      job,
      phone,
      discription,
      avatarUrl,
      orgName,
      orgDes,
      orgWeb,
      orgPhone,
      orgEmail,
      orgUrl,
      address
    } = req.body;

    let currentUser = null;

    try {
      currentUser = await User.findById(id);
    } catch (err) {
      next(err);
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "not found", code: 422 } });
      return;
    }

	if (fullName != undefined && fullName != null) {
    	currentUser.fullName = fullName;
    }
    if (birthday != undefined && birthday != null) {
    	currentUser.birthday = birthday;
    }
    if (gender != undefined && gender != null) {
    	currentUser.gender = gender;
    }
    if (job != undefined && job != null) {
    	currentUser.job = job;
    }
    if (phone != undefined && phone != null) {
    	currentUser.phone = phone;
    }
    if (discription != undefined && discription != null) {
    	currentUser.discription = discription;
    }
    if (avatarUrl != undefined && avatarUrl != null) {
    	currentUser.avatar = avatarUrl;
    }
    
    if (orgName != undefined && orgName != null) {
    	currentUser.orgName = orgName;
    }
    if (orgDes != undefined && orgDes != null) {
    	currentUser.orgDes = orgDes;
    }
    if (orgWeb != undefined && orgWeb != null) {
    	currentUser.orgWeb = orgWeb;
    }
    if (orgPhone != undefined && orgPhone != null) {
    	currentUser.orgPhone = orgPhone;
    }
    if (orgEmail != undefined && orgEmail != null) {
    	currentUser.orgEmail = orgEmail;
    }
    if (orgUrl != undefined && orgUrl != null) {
    	currentUser.orgUrl = orgUrl;
    }
    if (address != undefined && address != null) {
    	currentUser.address = address;
    }
    
    try {
      let u = await currentUser.save();
      res.status(200).json({
        result: u
      });
    } catch (err) {
      next(err);
    }
  },

  updatePassword: async (req, res, next) => {
    if (
      typeof req.body.oldpassword === "undefined" ||
      typeof req.body.newpassword === "undefined"
    ) {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    let id = req.user;
    let { oldpassword, newpassword } = req.body;
    let currentUser = null;

    try {
      currentUser = await User.findById(id);
    } catch (err) {
      next(err);
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "Invalid data", code: 422 } });
      return;
    }

    if (!bcrypt.compareSync(oldpassword, currentUser.hashPass)) {
      next({ error: { message: "Current password is wrong", code: 423 } });
      return;
    }

    currentUser.hashPass = bcrypt.hashSync(newpassword, 10);

    try {
      await currentUser.save();
      res.status(200).json({ result: true });
    } catch (err) {
      next(err);
    }
  },

  get_History: async (req, res, next) => {
    let {
      categoryEventId,
      startDate,
      endDate,
      txtSearch,
      pageNumber,
      numberRecord,
    } = req.query;
    txtSearch = txtSearch || "";

    pageNumber = pageNumber || 1;
    numberRecord = numberRecord || 10;

    let idUserLogin = req.user;
    try {
      let arrEvent = null;

      let conditionQuery = {
        $expr: {
          $and: [
            { $eq: ["$_id", "$$event_id"] },
            {
              $cond: [
                categoryEventId,
                { $eq: ["$category", categoryEventId] },
                {},
              ],
            },
          ],
        },
      };

      if (txtSearch != "") {
        conditionQuery.$text = { $search: txtSearch };
      }
      arrEvent = await ApplyEvent.aggregate([
        {
          $match: {
            userId: ObjectId(idUserLogin),
          },
        },
        {
          $lookup: {
            from: "events",
            let: { event_id: "$eventId" },
            pipeline: [
              {
                $match: conditionQuery,
              },
            ],
            as: "events",
          },
        },
        {
          $match: {
            $and: [
              {
                "events.startTime": {
                  $gt: new Date(startDate || "1940-01-01"),
                  $lt: new Date(endDate || new Date().toString()),
                },
              },
              { "events.status": { $nin: ["HUY"] } },
            ],
          },
        },
        {
          $project: { events: 1 },
        },
        { $skip: +numberRecord * (+pageNumber - 1) },
        { $limit: numberRecord },
      ]);

      res.status(200).json({ result: arrEvent });
    } catch (err) {
      next(err);
    }
  },

  get_HistoryCreate: async (req, res, next) => {
    let {
      categoryEventId,
      startDate,
      endDate,
      txtSearch,
      pageNumber,
      numberRecord,
    } = req.query;
    txtSearch = txtSearch || "";
    startDate = startDate || "";

    pageNumber = pageNumber || 1;
    numberRecord = numberRecord || 10;

    let idUserLogin = req.user;
    try {
      let arrEvent = null;

      let conditionQuery = {
        $and: [{
          userId: ObjectId(idUserLogin)
        }]
      };
      if (startDate !== "") {
        conditionQuery.$and.push({
          startTime : {
            $gt: new Date(startDate),
            $lt: new Date(endDate || new Date().toString()),
          }
        })
      }

      if (txtSearch != "") {
        conditionQuery.$text = { $search: txtSearch };
      }
      console.log(conditionQuery);
      arrEvent = await Event.find(conditionQuery).skip(+numberRecord * (+pageNumber - 1)).limit(+numberRecord);//.sort(conditionSort)

      res.status(200).json({ result: arrEvent });
    } catch (err) {
      next(err);
    }
  },
};
