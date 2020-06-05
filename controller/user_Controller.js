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
      let u = await User.findById(id, { bank: 0 });
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
      let u = await User.findById(id, { bank: 0 });
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

    const keys = ['fullName',
      'birthday',
      'gender',
      'job',
      'phone',
      'discription',
      'avatar',
      'orgName',
      'orgDes',
      'orgWeb',
      'orgPhone',
      'orgEmail',
      'orgUrl',
      'address'];

    for (let key in req.body) {
      if (keys.includes(key) && req.body[key] !== null) {
        currentUser[key] = req.body[key]
      }
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

  get_history_take_part_in: async (req, res, next) => {
    let {
      categoryEventId,
      startDate,
      endDate,
      txtSearch,
      pageNumber,
      numberRecord,
      type,
    } = req.query;
    txtSearch = txtSearch || "";

    pageNumber = +pageNumber || 1;
    numberRecord = +numberRecord || 10;
    categoryEventId = categoryEventId || '';
    startDate = startDate || '';
    let idUserLogin = req.user;
    try {
      let arrEvent = null;

      let conditionQuery = {
        $expr: {
          $and: [
            { $eq: ["$_id", "$$event_id"] },
          ],
        },
      };
      type = type || 'ALL';


      if (categoryEventId != "") {
        conditionQuery["$expr"]["$and"].push({ $eq: ["$category", categoryEventId] });
      }

      if (txtSearch) {
        conditionQuery.$text = { $search: txtSearch };
      }


      let conditionMath = {
        $and: [
          { "events.status": { $nin: ["CANCEL"] } },
        ],
      };

      if (startDate != "") {
        conditionMath["$and"].push(
          {
            "events.session.day": {
              $gt: startDate,
              $lt: endDate,
            },
          })
      }
      if (type) {
        switch (type) {
          case 'RECENT':
            conditionMath["$and"].push(
              {
                'events.session.day': {
                  $gt: new Date().toISOString(),
                }
              }
            );


            break;
          case 'PAST':
            conditionMath["$and"].push(
              {
                'events.session.day': {
                  $lt: `${new Date().toISOString()}`,
                }
              }
            );
            break;

          case 'ALL':

            break;
        }
      }

      Promise.all([
        ApplyEvent.aggregate([
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
              $unwind: "$events"
            },
            {
              $lookup:
              {
                from: "eventcategories",
                localField: "events.category",
                foreignField: "_id",
                as: "eventCategories"
              }
            },
            {
              $unwind: "$eventCategories"
            },
            {
              $match: conditionMath,
            },
            {
              $project: { events: 1, eventCategories: 1, _id:0 },
            },
            { $skip: +numberRecord * (+pageNumber - 1) },
            { $limit: +numberRecord },
          ]),
          User.findById(req.user)
      ]).then(([arrEvent,user])=>{
        if(!user){
            next({error: {message: 'You have to login', code: 700}});
        }
        let result = [];
        arrEvent.forEach((e,i) => {
            let temp = e.events;
            temp.eventCategory = e.eventCategories;
            temp.user = user;
            result.push(temp);
        });

      res.status(200).json({ result: result });

      }).catch(err=>{
        next({error: {message: 'Error', code: 700}});
      })
    } catch (err) {
      next({error: {message: err, code: 700}});
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
      status,
    } = req.query;
    status = status || '';
    txtSearch = txtSearch || "";
    startDate = startDate || "";

    pageNumber = +pageNumber || 1;
    numberRecord = +numberRecord || 10;

    let idUserLogin = req.user;
    try {
      let arrEvent = null;

      let conditionQuery = {
        $and: [{
          userId: ObjectId(idUserLogin)
        }]
      };
      if(status){
        conditionQuery.$and.push({status});
      }

      if (startDate !== "") {
        conditionQuery.$and.push({
          startTime: {
            $gt: new Date(startDate),
            $lt: new Date(endDate || new Date().toString()),
          }
        })
      }

      if (txtSearch != "") {
        conditionQuery.$text = { $search: txtSearch };
      }

      //arrEvent = await Event.find(conditionQuery).skip(+numberRecord * (+pageNumber - 1)).limit(+numberRecord).sort({ createAt: 1 });

      let e = await Event.aggregate([
        { $match: conditionQuery },
        {
            $lookup:
            {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $lookup:
            {
                from: "eventcategories",
                localField: "category",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        {
            $unwind: "$eventCategory"
        },
        { $skip: +numberRecord * (+pageNumber - 1) },
        { $limit: +numberRecord },
        { $sort: { 'session.day': 1 } }
    ])

      res.status(200).json({ result: e });
    } catch (err) {
      next(err);
    }
  },

  getBankInf: async (req, res, next) => {
    let _id = req.user;

    let user = await User.findById(_id, { bank: 1 });


    res.status(200).json({ result: user });

  },

  updateBankInf: async (req, res, next) => {
    let { bankName, bankNumber, accountOwner, bankBranch } = req.body;
    let _id = req.user;
    let user = await User.findByIdAndUpdate(_id, { bank: { bankName, bankNumber, accountOwner, bankBranch } });

    if (!user) {
      return next({ error: { message: 'User is not exists!' } });
    }

    res.status(200).json({ result: 'success' });

  }

};
