const mongoose = require('mongoose');
const Cards = mongoose.model('cards');
const stripe = require('stripe')('sk_test_baGlYFE4mbVp9TgpMLM2MuqQ002wIAF0zR');

const ApplyEvent = mongoose.model('applyEvent');
const Payment = mongoose.model('payment');
const Notification = mongoose.model('notification');

const axios = require('axios');
const CryptoJS = require('crypto-js');
const uuidv1 = require('uuid/v1');
const moment = require('moment');

const config = {
	appid: "553",
	key1: "9phuAOYhan4urywHTh0ndEXiV3pKHr5Q",
	key2: "Iyz2habzyr7AG8SgvoBCbKwKi3UzlLi3",
	endpoint: "https://sandbox.zalopay.com.vn/v001/tpe/createorder"
};

const embeddata = {
	merchantinfo: "embeddata123"
};

module.exports = {

	paymentHistorySend: async (req, res, next) => {
		let {
			startDate,
			endDate,
			pageNumber,
			numberRecord, } = req.query;

		pageNumber = pageNumber || 1;
		numberRecord = numberRecord || 10;
		let userId = req.user;

		let query = { sender: userId };

		let e = await Payment.aggregate([
			{ $match: query },
			{
				$lookup:
				{
					from: "users",
					localField: "receiver",
					foreignField: "_id",
					as: "users_receiver"
				}
			},
			{
				$unwind: "$users_receiver"
			},
			{
				$lookup:
				{
					from: "users",
					localField: "sender",
					foreignField: "_id",
					as: "users_sender"
				}
			},
			{
				$unwind: "$users_sender"
			},
			{ $skip: +numberRecord * (+pageNumber - 1) },
			{ $limit: numberRecord },
			{ $sort: { createdAt: 1 } }
		]);

		res.status(200).json({result: e});
	},

	paymentHistoryReceive: async (req, res, next) => {
		let {
			startDate,
			endDate,
			pageNumber,
			numberRecord, } = req.query;

		pageNumber = pageNumber || 1;
		numberRecord = numberRecord || 10;
		let userId = req.user;

		let query = { receiver: userId };


		let e = await Payment.aggregate([
			{ $match: query },
			{
				$lookup:
				{
					from: "users",
					localField: "receiver",
					foreignField: "_id",
					as: "users_receiver"
				}
			},
			{
				$unwind: "$users_receiver"
			},
			{
				$lookup:
				{
					from: "users",
					localField: "sender",
					foreignField: "_id",
					as: "users_sender"
				}
			},
			{
				$unwind: "$users_sender"
			},
			{ $skip: +numberRecord * (+pageNumber - 1) },
			{ $limit: numberRecord },
			{ $sort: { createdAt: 1 } }
		])

		res.status(200).json({result: e});
	},



	refund: async (req, res, next) => {
		let { paymentId, joinUserId, eventId } = req.body;
		let userId = req.user;

		if (paymentId) {
			try {
				var currentPayment = await Payment.findOne({ sender: joinUserId, eventId: eventId, receiver: userId });

				if (currentPayment.isRefund != true) {
					var refundNoti = async function (type) {
						const newNotification = new Notification({
							sender: userId,
							receiver: joinUserId,
							type: type,
							message: "",
							title: "{sender} refunded for event" + eventId,
							isRead: false,
							isDelete: false,
							createdAt: Date()
						});

						currentPayment.isRefund = type == "SUCCESS";
						await currentPayment.save();
						await newNotification.save();
					}

					if (currentPayment.payType == "CREDIT_CARD") {
						stripe.refunds.create(
							{ charge: currentPayment.chargeId },
							function (err, refund) {
								if (err) {
									refundNoti("FAILED")
								} else {
									refundNoti("SUCCESS")
								}
							}
						);
					} else {
						const timestamp = Date.now();
						const uid = `${timestamp}${Math.floor(111 + Math.random() * 999)}`; // unique id

						let params = {
							appid: config.appid,
							mrefundid: `${moment().format('YYMMDD')}_${config.appid}_${uid}`,
							timestamp, // miliseconds
							zptransid: currentPayment.zptransId,
							amount: currentPayment.amount,
							description: currentPayment.receiver + ' Refund for event',
						};

						// appid|zptransid|amount|description|timestamp
						let data = params.appid + "|" + params.zptransid + "|" + params.amount + "|" + params.description + "|" + params.timestamp;
						params.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

						axios.post(config.endpoint, null, { params })
							.then(res => {
								console.log(res.data);
								refundNoti("SUCCESS");
							})
							.catch(err => {
								console.log(err);
								refundNoti("FAILED");
							});
					}
				}
			} catch (err) {
				next(err);
				return;
			}
		}
	},

	//refund zalopay

	payouts: async (req, res, next) => {
		stripe.balance.retrieve(function (err, balance) {
			stripe.payouts.create(
				{ amount: req.body.amount, currency: 'vnd' },
				function (err, payout) {
					if (err != null) {
						res.status(600).json({ error: { message: err, code: 500 }, balance });
					} else {
						res.status(200).json({ result: { payout, balance } });
					}
				}
			);
		});
	},

	create_order: async (req, res, next) => {
		if (typeof req.body.amount === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let { eventId, joinTime, amount, description, receiver } = req.body;
		let userId = req.user;

		try {
			var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId, joinTime: joinTime });
			var currentPayment = await Payment.findOne({ sender: userId, eventId: eventId, receiver: receiver });

			if (currentApplyEvent) {
				const items = [];

				const order = {
					appid: config.appid,
					apptransid: `${moment().format('YYMMDD')}_${uuidv1()}`, // mã giao dich có định dạng yyMMdd_xxxx
					appuser: "demo",
					apptime: Date.now(), // miliseconds
					item: JSON.stringify(items),
					embeddata: JSON.stringify(embeddata),
					amount: req.body.amount,
					bankcode: "zalopayapp",
				};

				// appid|apptransid|appuser|amount|apptime|embeddata|item
				const data = config.appid + "|" + order.apptransid + "|" + order.appuser + "|" + order.amount + "|" + order.apptime + "|" + order.embeddata + "|" + order.item;
				order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

				var result = await axios.post(config.endpoint, null, { params: order })

				if (result.data) {
					let { zptranstoken } = result.data;

					console.log("start: ", zptranstoken);

					if (currentPayment) {
						console.log("start1: ", currentPayment);
						result.data.paymentId = currentPayment._id;
						currentPayment.cardId = undefined;
						currentPayment.zptransId = zptranstoken;
						currentPayment.status = "PAID";

						console.log("start2: ", currentPayment);
						await currentPayment.save();
					} else {
						console.log("save info---");
						const newPayment = new Payment({
							sender: userId,
							eventId: eventId,
							receiver: receiver,
							amount: amount,
							description: description,
							payType: "ZALOPAY",
							zptransId: zptranstoken,
							status: "PAID"
						});

						console.log("save info");
						result.data.paymentId = newPayment._id;
						currentApplyEvent.updatedAt = Date();
						currentApplyEvent.paymentId = newPayment._id;
						console.log("really save info");
						await newPayment.save();
						await currentApplyEvent.save();
					}

					console.log("123456:");
					res.status(200).json({ result: result.data });
				} else {
					if (currentPayment) {
						currentPayment.cardId = null;
						currentPayment.status = "FAILED";

						await currentPayment.save();
					} else {
						newPayment.status = "FAILED";
						await newPayment.save();
						await currentApplyEvent.save();
					}

					next({ error: { message: 'Payment failed', code: 901 } });
				}
			} else {
				next({ error: { message: 'You have not participated in this event', code: 702 } });
			}
		} catch (err) {
			next(err);
		}
	},

	create_order_callback: async (req, res) => {
		let result = {};

		try {
			let dataStr = req.body.data;
			let reqMac = req.body.mac;

			let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
			console.log("mac =", mac);


			// kiểm tra callback hợp lệ (đến từ ZaloPay server)
			if (reqMac !== mac) {
				// callback không hợp lệ
				result.returncode = -1;
				result.returnmessage = "mac not equal";
			} else {
				// thanh toán thành công
				// merchant cập nhật trạng thái cho đơn hàng
				let dataJson = JSON.parse(dataStr, config.key2);
				console.log("update order's status = success where apptransid =", dataJson["apptransid"]);

				result.returncode = 1;
				result.returnmessage = "success";
			}
		} catch (ex) {
			result.returncode = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
			result.returnmessage = ex.message;
		}

		// thông báo kết quả cho ZaloPay server
		res.status(200).json(result);
	},

	create_charges: async (req, res, next) => {
		if (typeof req.body.amount === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let { eventId, joinTime, amount, description, receiver } = req.body;
		let userId = req.user;

		try {
			var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId, joinTime: joinTime });
			var currentPayment = await Payment.findOne({ sender: userId, eventId: eventId, receiver: receiver });

			if (currentApplyEvent) {
				let cardFind = await Cards.findOne({ 'userId': req.user });

				if (cardFind) {
					let charge = await stripe.charges.create(
						{
							amount: amount,
							currency: 'vnd',
							customer: cardFind.customerId,
							description: description,
						});

					const newPayment = new Payment({
						sender: userId,
						eventId: eventId,
						receiver: receiver,
						amount: amount,
						payType: "CREDIT_CARD",
						description: description,
						cardId: cardFind.id,
						createdAt: Date()
					});

					currentApplyEvent.updatedAt = Date();

					if (charge) {
						currentApplyEvent.qrcode = userId

						if (currentPayment) {
							currentPayment.chargeId = charge.id;
							currentPayment.cardId = cardFind.id;
							currentPayment.status = "PAID";

							await currentPayment.save();
						} else {
							currentApplyEvent.paymentId = newPayment._id;
							newPayment.cardId = cardFind.id;
							newPayment.chargeId = charge.id;
							newPayment.status = "PAID";

							await newPayment.save();
						}

						await currentApplyEvent.save();

						res.status(200).json({ result: true });
					} else {
						if (currentPayment) {
							currentPayment.cardId = cardFind.id;
							currentPayment.status = "FAILED";

							await currentPayment.save();
						} else {
							currentApplyEvent.paymentId = newPayment._id;
							newPayment.status = "FAILED";
							await newPayment.save();
							await currentApplyEvent.save();
						}

						next({ error: { message: 'Payment failed', code: 901 } });
					}
				} else {
					next({ error: { message: 'Card customer not found', code: 900 } });
				}
			} else {
				next({ error: { message: 'You have not participated in this event', code: 702 } });
			}
		} catch (err) {
			next(err);
		}
	},

	get_listcard: async (req, res, next) => {
		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next(err);
			return;
		}

		if (cardFind == null || cardFind.customerId == null) {
			res.status(200).json({ result: [] });
		} else {
			console.log("customerId: ", cardFind.customerId)
			stripe.customers.listSources(
				cardFind.customerId,
				{
					object: 'card',
					limit: 50
				},
				function (err, cards) {
					if (err != null) {
						next(err);
					} else {
						res.status(200).json({ result: cards.data });
					}
				}
			);
		}
	},

	set_card_default: async (req, res, next) => {
		if (typeof req.body.cardId === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next(err);
			return;
		}

		if (cardFind == null || cardFind.customerId == null) {
			res.status(600).json({ error: { message: "card customer not found", code: 900 } });
		} else {
			console.log("customerId: ", cardFind.customerId)

			stripe.customers.update(
				cardFind.customerId,
				{
					default_source: req.body.cardId
				},
				function (err, customer) {
					if (err != null) {
						next(err);
					} else {
						console.log("customer: ", customer, "\n")
						res.status(200).json({ result: true });
					}
				}
			);
		}
	},

	del_card: async (req, res, next) => {
		if (typeof req.body.cardId === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next(err);
			return;
		}

		if (cardFind == null || cardFind.customerId == null) {
			res.status(600).json({ error: { message: "card customer not found", code: 900 } });
		} else {
			console.log("customerId: ", cardFind.customerId)
			stripe.customers.deleteSource(
				cardFind.customerId,
				req.body.cardId,
				function (err, confirmation) {
					if (err != null) {
						next(err);
					} else {
						res.status(200).json({ result: confirmation.deleted });
					}
				}
			);
		}
	},

	del_customer: async (req, res, next) => {
		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next(err);
			return;
		}

		if (cardFind == null || cardFind.customerId == null) {
			res.status(600).json({ error: { message: "card customer not found", code: 900 } });
		} else {
			console.log("customerId: ", cardFind.customerId)

			let confirmation = null

			try {
				confirmation = await stripe.customers.del(cardFind.customerId);
			} catch (err) {
				next(err);
				return;
			}

			console.log("confirmation: ", confirmation, "\n")

			try {
				if (confirmation.deleted) {
					await Cards.remove({ 'userId': req.user });
					res.status(200).json({ result: true })
				} else {
					res.status(200).json({ result: false })
				}
			} catch (err) {
				next(err);
			}
		}
	},

	create_customer: async (req, res, next) => {
		if (typeof req.body.cardToken === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next(err);
			return;
		}

		var createCard = function (customerId, cardToken, res) {
			stripe.customers.createSource(
				customerId,
				{ source: cardToken },
				function (err, card) {
					if (err != null) {
						next(err);
					} else {
						res.status(200).json({ result: true });
					}
				}
			);
		}

		if (cardFind == null || cardFind.customerId == null) {
			console.log("create customer \n")

			var customer = null

			try {
				customer = await stripe.customers.create({
					description: 'My First Test Customer (created for API docs)'
				});
			} catch (err) {
				next(err);
				return;
			}

			console.log("customer: ", customer, "\n")

			try {
				if (customer) {
					const newCard = new Cards({
						customerId: customer.id,
						userId: req.user
					});

					console.log("save customer: ", newCard, "\n")
					await newCard.save();

					console.log("create token: ", req.body.cardToken, "\n")
					createCard(customer.id, req.body.cardToken, res)
				} else {
					res.status(600).json({ message: "can't create card customer" });
				}
			} catch (err) {
				next(err);
				return;
			}
		} else {
			console.log("create token: ", req.body.cardToken, "\n")
			createCard(cardFind.customerId, req.body.cardToken, res)
		}
	}
}