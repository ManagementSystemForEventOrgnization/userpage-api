var bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = mongoose.model("users");
const Event = mongoose.model("event");
const Payment = mongoose.model('payment');
const ApplyEvent = mongoose.model("applyEvent");

const mailer = require("../utils/Mailer");
const otp = require("../utils/otp");
var passport = require("passport");
const funcLogin = require('../utils/loginUtil');
const myFunction = require('../utils/function');
const loginUtil = require("../utils/loginUtil");
const session = require("express-session");

module.exports = {
  login: (req, res, next) => {


    funcLogin(req, res, next);



    // passport.authenticate("local", async function (err, userData, info) {
    //   if (err) {
    //     return next({ error: { message: "Something went wrong", code: 776 } });
    //   }

    //   if (!userData) {
    //     return next({ error: { message: info.message, code: 620 } });
    //   }

    //   User.findById(userData._id, function(err, user) { 
    //     console.log("login", user)

    //     req.logIn(user, function (err) {
    //       if (err) {
    //           return next({ error: { message: "Something went wrong", code: 776 } });
    //       }

    //       return res.status(200).json({ result: user });
    //     });
    //   })
    // })(req, res, next);

  },

  logout: async (req, res) => {
    req.logout();
    res.status(200).json({ result: true });
  },

  current_user: async (req, res, next) => {
    let { userId } = req.query;
    let id = userId || req.user;
    try {
      let u = await User.findById(id, { bank: 0 });
      res.status(200).json({ result: u });
    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
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

    loginUtil(req, res, next);


    // passport.authenticate("local", function (err, user, info) {

    //   if (err) {
    //     return next({ error: { message: "Something went wrong", code: 776 } });
    //   }

    //   if (!user) {
    //     return next({ error: { message: info.message, code: 620 } });
    //   }

    //   req.logIn(user._id, function (err) {
    //     if (err) {
    //       return next({ error: { message: "Something went wrong", code: 776 } });
    //     }

    //     return res.status(200).json({ result: user });
    //   });
    // })(req, res, next);
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
      next({ error: { message: "Something went wrong", code: 776 } });
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

      loginUtil(req, res, next);

      // passport.authenticate("local", function (err, user, info) {
      //   if (err) {
      //     return next({ error: { message: "Something went wrong", code: 776 } });
      //   }
      //   if (!user) {
      //     return next({ error: { message: info.message, code: 620 } });
      //   }

      //   req.logIn(user._id, function (err) {
      //     if (err) {
      //       return next({ error: { message: "Something went wrong", code: 776 } });
      //     }

      //     return res.status(200).json({ result: user });
      //   });
      // })(req, res, next);


    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
        next({ error: { message: "Something went wrong", code: 776 } });
      }
    }
  },

  profile_user: async (req, res, next) => {
    let { id } = req.query;

    try {
      let u = await User.findById(id, { bank: 0 });
      if (!u) {
        return next({ error: { message: 'User is not exists!', code: 700 } });
      }
      res.status(200).json({ result: u });
    } catch (err) {
      next({ error: { message: err, code: 500 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
      return;
    }

    if (currentUser == null) {
      next({ error: { message: "Invalid data", code: 422 } });
    }

    let token = otp.generateOTP();

    mailer.sentMailer("admin@gmail.com", { email, fullName: currentUser.fullName }, "FORGOT", token)
      .then(async (json) => {
        currentUser.TOKEN = token;

        try {
          await currentUser.save();
        } catch (err) {
          next({ error: { message: "Something went wrong", code: 776 } });
          return;
        }

        res.status(200).json({ result: true });
      })
      .catch((err) => {
        next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
    }
  },

  updateInfor: async (req, res, next) => {
    let id = req.user;
    let currentUser = null;

    try {
      currentUser = await User.findById(id);
    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
      next({ error: { message: "Something went wrong", code: 776 } });
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
      typeOfEvent,
    } = req.query;
    txtSearch = txtSearch || "";

    pageNumber = +pageNumber || 1;
    numberRecord = +numberRecord || 10;
    categoryEventId = categoryEventId || '';
    categoryEventId = categoryEventId.split(",");

    startDate = startDate || '';
    endDate = endDate || new Date().toISOString();
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


      if (categoryEventId[0]) {
        let category = { $or: [] };
        categoryEventId.forEach(e => {
          category.$or.push({ $eq: ["$category", ObjectId(e)] });
        });
        //conditionQuery["$expr"]["$and"].push({ $eq: ["$category", categoryEventId] });
        conditionQuery["$expr"]["$and"].push(category);
      }

      if (txtSearch) {
        conditionQuery.$text = { $search: txtSearch };
      }

      let conditionMath = {
        $and: [
          { "events.status": { $nin: ["CANCEL", "DELETE"] } },
        ],
      };

      if (startDate != "") {
        conditionMath["$and"].push(
          {
            "events.session.day": {
              $gt: new Date(startDate),
              $lt: new Date(endDate),
            },
          })
      }
      if (type) {
        switch (type) {
          case 'RECENT':
            conditionMath["$and"].push(
              {
                'events.session.day': {
                  $gt: new Date(),
                }
              }
            );


            break;
          case 'PAST':
            conditionMath["$and"].push(
              {
                'events.session.day': {
                  $lt: new Date(),
                }
              }
            );
            break;

          case 'ALL':

            break;
        }
      }

      if (typeOfEvent) {
        conditionMath["$and"].push({ 'events.typeOfEvent': typeOfEvent });
      }

      conditionMath.$and.push({
        'events.session': { $exists: true, $not: { $type: 'null', $size: 0 } }
      })

      Promise.all([
        ApplyEvent.aggregate([
          {
            $match: {
              $or: [
                { 'session': { $elemMatch: { isCancel: { $ne: true }, isReject: false, paymentStatus: 'PAID' } } },
                { 'session': { $elemMatch: { isCancel: { $ne: true }, isReject: false, paymentId: { $exists: false } } } }
              ],
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
            $project: { events: 1, eventCategories: 1, _id: 0 },
          },
          { $skip: +numberRecord * (+pageNumber - 1) },
          { $limit: +numberRecord },
        ]),
        User.findById(req.user)
      ]).then(([arrEvent, user]) => {
        if (!user) {
          next({ error: { message: 'You have to login', code: 700 } });
        }
        let result = [];
        arrEvent.forEach((e, i) => {
          let temp = e.events;
          temp.eventCategory = e.eventCategories;
          temp.user = user;
          result.push(temp);
        });

        res.status(200).json({ result: result });

      }).catch(err => {
        next({ error: { message: 'Error', code: 700 } });
      })
    } catch (err) {
      next({ error: { message: err, code: 700 } });
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
      typeOfEvent
    } = req.query;

    status = status || '';
    txtSearch = txtSearch || "";
    startDate = startDate || "";
    categoryEventId = categoryEventId || '';
    pageNumber = +pageNumber || 1;
    numberRecord = +numberRecord || 10;
    categoryEventId = categoryEventId.split(',');
    let idUserLogin = req.user;
    try {
      let arrEvent = null;

      let conditionQuery = {
        $and: [{
          userId: ObjectId(idUserLogin)
        },
        { status: { $nin: ["DELETE"] } }
        ]
      };
      if (status) {
        if (status != "WAITING") {
          conditionQuery.$and.push({ status });
        } else {
          conditionQuery.$and.push({ status: { $in: ["WAITING", "EDITED"] } });
        }
      }
      if (startDate !== "") {
        conditionQuery.$and.push({
          'session.day': {
            $gt: new Date(startDate)
          }
        })
        if (endDate) {
          conditionQuery.$and.push({
            'session.day': {
              $lte: new Date(endDate),
            }
          })
        }
      }
      if (categoryEventId[0]) {
        let category = { $or: [] };
        categoryEventId.forEach(e => {
          category.$or.push({ "category": ObjectId(e) });
        });
        conditionQuery["$and"].push(category);
      }
      if (txtSearch != "") {
        conditionQuery.$text = { $search: txtSearch };
      }
      if (typeOfEvent) {
        conditionQuery.$and.push({ typeOfEvent });
      }

      conditionQuery.$and.push({ session: { $exists: true, $not: { $type: 'null', $size: 0 } } });

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
        { $sort: { createdAt: -1 } }
      ])

      res.status(200).json({ result: e });
    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
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

  },

  reportUser: async (req, res, next) => {
    let { userId, cause, eventId } = req.body;
    if (!userId) {
      return next({ error: { message: 'Invalid data', code: 600 } });
    }

    let userReport = req.user;

    if (userId == userReport) {
      return next({ error: { message: 'You can\'t report yourself' } });
    }

    let objData = { userId: userReport, cause: cause || '' };
    if (eventId) {
      objData.eventId = eventId;
    }

    try {
      let u = await User.findByIdAndUpdate(userId, { $push: { "userReport": objData } });
      if (!u) {
        return next({ error: { message: 'User is not exists', code: 601 } });
      }

      res.status(200).json({ result: u });
    } catch (error) {
      next({ error: { message: error, code: 500 } });
    }
  },

  report_revenus: async (req, res, next) => {
    try {
      let { startDate, endDate, eventId, urlWeb } = req.query;
      startDate = startDate || '';
      endDate = endDate || '';
      if (!eventId) {
        if (urlWeb) {
          let e = await Event.findOne({ urlWeb });
          eventId = e._id;
          if (!eventId) {
            return next({ error: { message: 'Invalid data', code: 401 } });
          }
        }
      }
      let userId = req.user;

      let conditionFilter = {
        $and: [
          { $ne: ["$$item.isCancel", true] }
        ]
      };
      let condition = { userId: ObjectId(userId), status: 'PUBLIC', isSellTicket: true };

      if (eventId) {
        condition._id = ObjectId(eventId);
      }
      if (startDate) {
        conditionFilter.$and.push({ $gte: ["$$item.day", new Date(startDate)] });
      }
      if (endDate) {
        conditionFilter.$and.push({ $lte: ["$$item.day", new Date(endDate)] });
      }

      let e = await Event.aggregate([
        {
          // điều kiện để lấy ra danh sacshc ác sự kiện 
          $match: condition
        },
        { // chuyển sang danh sách các sesion đạt chuẩn cần phải lấy ra.
          $project: {
            sessionId: {
              $filter: {
                input: "$session",
                as: "item",
                cond: conditionFilter
              }
            }, name: 1, ticket: 1, status: 1, urlWeb: 1, bannerUrl: 1, paymentId: 1,
          }
        },
        {// chuyển sang danh sách các id của dnah sách đã có
          $project: {
            sessionId: 1, name: 1, ticket: 1, status: 1, urlWeb: 1, bannerUrl: 1, paymentId: 1,
            session_id: {
              "$map": {
                "input": "$sessionId", "as": "ar", "in": "$$ar.id"
              }
            }
          }
        },
        {
          $lookup:
          {
            // lấy danh sách các payment của sự kiện 
            from: "payments",
            let: { eventId: "$_id", sessionId: "$session_id" },
            pipeline: [
              {
                $match: {
                  // điều kiện là phải paid và chưa refund
                  status: 'PAID', sessionRefunded: { $size: 0 },
                  $expr: {
                    $and: [
                      { $eq: ["$eventId", "$$eventId"] },
                    ],
                  },
                }
              },
            ],
            as: "payments"
          }
        },
        { $match: { payments: { $not: { $size: 0 } } } },
        {
          $project: {

            session_id: 1,
            SumAmount: {
              $sum: "$payments.amount"
            },
            sessionId: 1, name: 1, ticket: 1, status: 1, urlWeb: 1, paymentId: 1, bannerUrl: 1, paymentId: 1,
            "amountSession": {
              $map:
              {
                input: "$session_id",
                as: "id",
                in: {
                  $reduce: {
                    input: "$payments",
                    initialValue: { total: 0 },
                    in: {
                      total: {
                        $sum: ["$$value.total", {
                          $cond: {
                            if: { $in: ["$$id", "$$this.session"] },
                            then: "$$this.amount",
                            else: 0
                          }
                        }]
                      }
                    }
                  }
                }
              }
            }
          }
        }, {
          $project: {
            sessionId: 1, name: 1, ticket: 1, status: 1, urlWeb: 1, paymentId: 1, bannerUrl: 1, paymentId: 1,
            SumAmount: 1, amountSession: 1,

            totalSession: {
              $reduce: {
                input: "$amountSession",
                initialValue: 0,
                in: {
                  $add: ["$$value", "$$this.total"]
                }
              }
            }
          }
        }
      ]);

      res.status(200).json({ result: e });
    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
    }
  },

  list_payment_session: async (req, res, next) => {
    let { sessionId, eventId, urlWeb } = req.query;

    try {
      if (!eventId) {
        if (urlWeb) {
          let e = await Event.findOne({ urlWeb });
          eventId = e._id;
        }
      }
      if (!eventId || !sessionId) {
        return next({ error: { message: 'Invalid data', code: 401 } });
      }

      let userId = req.user;

      let payments = await Payment.find(
        {
          eventId: ObjectId(eventId),
          status: "PAID",
          sessionRefunded: { $size: 0 },
          "session.0": sessionId
        }
      ).populate(
        {
          path: 'sender',
          select: ["avatar", "fullName"]
        })

      return res.status(200).send({ result: payments })
    } catch (err) {
      next({ error: { message: "Something went wrong", code: 776 } });
    }
  }
};
