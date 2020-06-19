const mongoose = require('mongoose');
const Cards = mongoose.model('cards');
const stripe = require('stripe')('sk_test_baGlYFE4mbVp9TgpMLM2MuqQ002wIAF0zR');

const ApplyEvent = mongoose.model('applyEvent');
const Payment = mongoose.model('payment');
const Event = mongoose.model('event');
const Notification = mongoose.model('notification');

const ObjectId = mongoose.Types.ObjectId;
const adminId = "5ee5d9aff7a5a623d08718d5"

const axios = require('axios');
const CryptoJS = require('crypto-js');
const uuidv1 = require('uuid/v1');
const moment = require('moment');

const config = {
	appid: "553",
	key1: "9phuAOYhan4urywHTh0ndEXiV3pKHr5Q",
	key2: "Iyz2habzyr7AG8SgvoBCbKwKi3UzlLi3",

	urlCreate: "https://sandbox.zalopay.com.vn/v001/tpe/createorder",
	urlCreateStaging: "https://stg.zalopay.com.vn/v001/tpe/createorder",
	urlCreateReal: "https://zalopay.com.vn/v001/tpe/createorder",

	urlRefund: "https://sandbox.zalopay.com.vn/v001/tpe/partialrefund",
	urlRefundStaging: "https://stgmerchant.zalopay.vn/v001/partialrefund",
	urlRefundReal: "https://merchant.zalopay.vn/v001/partialrefund"
};

const embeddata = {
	merchantinfo: "embeddata123"
};

module.exports = {
	paymentHis: async (req, res, next) => {
		let {
			startDate,
			endDate,
			pageNumber,
			numberRecord, } = req.query;

		pageNumber = +pageNumber || 1;
		numberRecord = +numberRecord || 10;
		let userId = req.user;

		let condition = { $or: [{ sender: ObjectId(userId) }, { receiver: ObjectId(userId) }] };

		let pay = await Payment.find(condition)
			.populate("sender").populate("eventId").populate("receiver")
			.sort({ createdAt: -1 }).skip(+numberRecord * (+pageNumber - 1)).limit(+numberRecord);

		if (!pay) {
			return next({ error: { message: 'Err', code: 700 } });
		}

		res.status(200).json({ result: pay });
	},

	refund: async (req, res, next, nextHandle) => {
		let { paymentId, joinUserId, eventId, sessionId, applyEvent, sendNoti, eventChange, isUserEvent} = req.body;

		if (paymentId) {
			try {
				Promise.all([
					Payment.findById(paymentId),
					Event.findById(eventId)
				]).then(async ([currentPayment, event]) => {
					let userId = event.userId;

					if (!currentPayment.sessionRefunded.includes(sessionId)) {
						var refundNoti = async function (type, success) {
							const newNotification = new Notification({
								sender: userId,
								receiver: success == true ? joinUserId : adminId,
								type: type,
								message: "",
								title: "{sender} refunded for event " + event.name,
								linkTo: {
									key: "PaymentInfo",
									_id: paymentId
								},
								isRead: false,
								isDelete: false,
								session: [sessionId]
							});

							let sendEvent = eventChange || event
							let needNotification = sendNoti || newNotification

							if (success == true) {
								currentPayment.sessionRefunded.push(sessionId)

								Promise.all([
									Payment.findByIdAndUpdate({ _id: currentPayment._id }, { sessionRefunded: currentPayment.sessionRefunded }),
									needNotification.save()
								]).then(async ([p, n]) => {
									nextHandle(true, isUserEvent, applyEvent, sendEvent, newNotification);
									return true;
								}).catch((err) => {
									nextHandle(false, isUserEvent, applyEvent, sendEvent, null)
									return false;
								})
							} else {
								newNotification.save();
								nextHandle(false, isUserEvent, applyEvent, sendEvent, null)
								return false;
							}
						}

						if (currentPayment.payType === "CREDIT_CARD") {
							stripe.refunds.create(
								{
									charge: currentPayment.chargeId,
									amount: (currentPayment.amount / currentPayment.session.length)
								},
								function (err, refund) {
									if (err) {
										refundNoti("CREDIT_REFUND_FAILED", false)
									} else {
										refundNoti("CREDIT_REFUND_SUCCESS", true)
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
								amount: (currentPayment.amount / currentPayment.session.length),
								description: currentPayment.receiver + ' Refund for event',
							};

							// appid|zptransid|amount|description|timestamp
							let data = params.appid + "|" + params.zptransid + "|" + params.amount + "|" + params.description + "|" + params.timestamp;
							params.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

							axios.post(config.urlRefund, null, { params })
								.then(res => {
									if (res.data.returncode == 1) {
										refundNoti("ZALOPAY_REFUND_SUCCESS", true);
									} else {
										refundNoti("ZALOPAY_REFUND_FAILED", false);
									}
								})
								.catch(err => {
									refundNoti("ZALOPAY_REFUND_FAILED", false);
								});
						}
					} else {
						next({ error: { message: 'Not found session for refund', code: 850 } });
					}
				}).catch((err) => {
					return false;
				})
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

		let { eventId, sessionIds, amount, description, receiver } = req.body;
		let userId = req.user;

		try {
			var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

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

				var result = await axios.post(config.urlCreate, null, { params: order })

				const newPayment = new Payment({
					sender: userId,
					eventId: eventId,
					receiver: receiver,
					amount: amount,
					description: description,
					payType: "ZALOPAY",
					status: "WAITING",
					session: sessionIds
				});

				currentApplyEvent.session.forEach(element => {
					if (sessionIds.includes(element.id)) {
						element.paymentId = newPayment._id;
					}
				})

				if (result.data) {
					result.data.paymentId = newPayment._id;
					newPayment.zptransId = result.data.zptranstoken;
					await newPayment.save();
					await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })

					res.status(200).json({ result: true, resultOrder: result.data });
				} else {
					newPayment.status = "UNPAID";
					await newPayment.save();
					await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })

					next({ error: { message: 'Create payment failed', code: 901 } });
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

		let { eventId, sessionIds, amount, description, receiver } = req.body;
		let userId = req.user;

		try {
			var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

			if (currentApplyEvent) {
				let cardFind = await Cards.findOne({ userId: req.user });

				if (cardFind) {
					let charge = await stripe.charges.create(
						{
							amount: amount,
							currency: 'vnd',
							customer: cardFind.customerId,
							description: description || ("Payment for event " + eventId),
						});

					const newPayment = new Payment({
						sender: userId,
						eventId: eventId,
						receiver: receiver,
						amount: amount,
						payType: "CREDIT_CARD",
						description: description,
						cardId: cardFind.id,
						session: sessionIds
					});

					currentApplyEvent.session.forEach(element => {
						if (sessionIds.includes(element.id)) {
							element.paymentId = newPayment._id;
						}
					})

					if (charge) {
						newPayment.cardId = cardFind.id;
						newPayment.chargeId = charge.id;
						newPayment.status = "PAID";

						await newPayment.save();
						await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })

						res.status(200).json({ result: true });
					} else {
						newPayment.status = "FAILED";
						await newPayment.save();
						await ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session })

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
			stripe.customers.update(
				cardFind.customerId,
				{
					default_source: req.body.cardId
				},
				function (err, customer) {
					if (err != null) {
						next(err);
					} else {
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
			let confirmation = null

			try {
				confirmation = await stripe.customers.del(cardFind.customerId);
			} catch (err) {
				next(err);
				return;
			}

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
						res.status(200).json({ result: card });
					}
				}
			);
		}

		if (cardFind == null || cardFind.customerId == null) {
			var customer = null

			try {
				customer = await stripe.customers.create({
					description: 'My First Test Customer (created for API docs)'
				});
			} catch (err) {
				next(err);
				return;
			}

			try {
				if (customer) {
					const newCard = new Cards({
						customerId: customer.id,
						userId: req.user
					});
					
					await newCard.save();
					
					createCard(customer.id, req.body.cardToken, res)
				} else {
					res.status(600).json({ message: "can't create card customer" });
				}
			} catch (err) {
				next(err);
				return;
			}
		} else {
			createCard(cardFind.customerId, req.body.cardToken, res)
		}
	}
}