const mongoose = require('mongoose');
const Cards = mongoose.model('cards');
const stripe = require('stripe')('sk_test_baGlYFE4mbVp9TgpMLM2MuqQ002wIAF0zR');

const ApplyEvent = mongoose.model('applyEvent');
const Payment = mongoose.model('payment');
const Event = mongoose.model('event');
const Notification = mongoose.model('notification');

const ObjectId = mongoose.Types.ObjectId;
const keys = require('../config/key.js');

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

		let condition = { sender: ObjectId(userId) };

		Promise.all([
			Payment.aggregate([
				{ $match: condition },
				{
					$lookup: {
						from: 'users',
						localField: 'sender',
						foreignField: '_id',
						as: 'sender'
					}
				},
				{
					$unwind: "$sender"
				},
				{
					$lookup: {
						from: 'users',
						localField: 'receiver',
						foreignField: '_id',
						as: 'receiver'
					}
				},
				{
					$unwind: "$receiver"
				},
				{
					$lookup: {
						from: 'events',
						localField: 'eventId',
						foreignField: '_id',
						as: 'eventId'
					}
				},
				{
					$unwind: "$eventId"
				},
				{ $sort: { createdAt: -1 } },
				{ $skip: +numberRecord * (+pageNumber - 1) },
				{ $limit: +numberRecord }
			])
		]).then(([payments]) => {
			res.status(200).json({ result: payments || [] });
		}).catch(err => {
			return next({ error: { message: 'Something went wrong', code: 776 } });
		})
	},

	paymentHistoryTotal: async (req, res, next) => {
		let userId = req.user;
		let conditionRevenue = { sender: ObjectId(keys.adminId), receiver: ObjectId(userId), status: 'PAID' }
		let conditionExp = { sender: ObjectId(userId), status: 'PAID' };

		Promise.all([
			Payment.aggregate([
				{ $match: conditionRevenue },
				{
					$group: {
						_id: null,
						total: { $sum: "$amount" }
					}
				}

			]),
			Payment.aggregate([
				{ $match: conditionExp },
				{
					$project: {
						num: { $size: '$session' },
						num1: { $size: '$sessionRefunded' },
						amount: 1
					}
				},
				{
					$group: {
						_id: null,
						total: { $sum: { $subtract: ["$amount", { $multiply: ['$amount', { $divide: ['$num1', '$num'] }] }] } },
					}
				}

			])
		]).then(([revenueTotal, expTotal]) => {
			
			res.status(200).json({ 
				result: {
					revenueTotal: revenueTotal[0] && revenueTotal[0].total || 0, 
					expTotal: expTotal[0] && expTotal[0].total || 0
				} 
			});
		}).catch(err => {
			return next({ error: { message: 'Something went wrong', code: 776 } });
		})
	},

	paymentDetail: async (req, res, next) => {
		if (typeof req.query.paymentId === 'undefined') {
			next({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		let { paymentId } = req.query;
		let condition = { _id: ObjectId(paymentId) };

		let pay = await Payment.aggregate([
			{ $match: condition },
			{
				$lookup: {
					from: 'users',
					localField: 'sender',
					foreignField: '_id',
					as: 'sender'
				}
			},
			{
				$unwind: "$sender"
			},
			{
				$lookup: {
					from: 'users',
					localField: 'receiver',
					foreignField: '_id',
					as: 'receiver'
				}
			},
			{
				$unwind: "$receiver"
			},
			{
				$lookup: {
					from: 'events',
					localField: 'eventId',
					foreignField: '_id',
					as: 'eventId'
				}
			},
			{
				$unwind: "$eventId"
			}
		])

		if (!pay || pay.length == 0) {
			return next({ error: { message: 'Payment not found', code: 728 } });
		}

		res.status(200).json({ result: pay[0] });
	},

	refund: async (req, res, next, nextHandle) => {
		let { paymentId, joinUserId, eventId, sessionId, applyEvent, sendNoti, eventChange, isUserEvent, isRejectUser } = req.body;

		if (paymentId) {
			try {
				Promise.all([
					Payment.findById(paymentId),
					Event.findById(eventId)
				]).then(async ([currentPayment, event]) => {
					let userId = event.userId;
					var sendEvent = eventChange || event

					if (currentPayment.status !== "PAID") {
						if (isUserEvent != false && isRejectUser != true) {
							sendEvent.session.forEach(ele => {
								if (ele.id == sessionId) {
									var refundNumber = ele.refundNumber || 0;
									refundNumber += 1;
									ele.refundNumber = refundNumber;
								}
							})
						}

						await nextHandle(true, isUserEvent, applyEvent, sendEvent, sendNoti, sessionId);
						return;
					}

					if (!currentPayment.sessionRefunded.includes(sessionId)) {
						var refundNoti = async function (type, success) {
							const newNotification = new Notification({
								sender: userId,
								receiver: success == true ? joinUserId : keys.adminId,
								type: type,
								message: "",
								title: "{sender} refunded for event " + event.name,
								linkTo: {
									key: "PaymentInfo",
									_id: paymentId,
									urlWeb: event.urlWeb
								},
								isRead: false,
								isDelete: false,
								session: [sessionId]
							});

							let needNotification = sendNoti || newNotification

							if (success == true) {
								currentPayment.sessionRefunded.push(sessionId)

								Promise.all([
									Payment.findByIdAndUpdate({ _id: currentPayment._id }, { sessionRefunded: currentPayment.sessionRefunded }),
									needNotification.save()
								]).then(async ([p, n]) => {
									if (isUserEvent == true) {
										applyEvent.session.forEach(ele => {
											if (ele.id == sessionId) {
												ele.isRefund = true;
											}
										})

										if (isRejectUser != true) {
											sendEvent.session.forEach(ele => {
												if (ele.id == sessionId) {
													var refundNumber = ele.refundNumber || 0;
													refundNumber += 1;
													ele.refundNumber = refundNumber;
												}
											})
										}
									}

									nextHandle(true, isUserEvent, applyEvent, sendEvent, newNotification, sessionId);
								}).catch((err) => {
									nextHandle(false, isUserEvent, applyEvent, sendEvent, null, sessionId)
								})
							} else {
								newNotification.save();
								nextHandle(false, isUserEvent, applyEvent, sendEvent, null, sessionId)
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
									if (res.data.returncode > 0) {
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
					console.log("refund", err);
					return;
				})
			} catch (err) {
				next({ error: { message: "Something went wrong", code: 776 } });
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

		let { eventId, sessionIds, amount, description, receiver, event } = req.body;
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
				
				if (result.data) {
					result.data.paymentId = newPayment._id;
					newPayment.zptransId = result.data.zptranstoken;
				} else {
					newPayment.status = "UNPAID";
				}

				currentApplyEvent.session.forEach(element => {
					if (sessionIds.includes(element.id)) {
						element.paymentId = newPayment._id;
						element.paymentStatus = newPayment.status;
					}
				})

				Promise.all([
					newPayment.save(),
					ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session }),
					// Event.findByIdAndUpdate({ _id: event._id }, { session: event.session }),
					result.data
				]).then(([payment, applyEvent, dataResult]) => {
					if (dataResult) {
						res.status(200).json({ result: true, resultOrder: dataResult });
					} else {
						next({ error: { message: 'Payment failed', code: 901 } });
					}
				}).catch(() => {
					next({ error: { message: "Something went wrong", code: 776 } });
				})
			} else {
				next({ error: { message: 'You have not participated in this event', code: 702 } });
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
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

		let { eventId, sessionIds, cardId, amount, description, receiver, event } = req.body;
		let userId = req.user;
		
		try {
			var currentApplyEvent = await ApplyEvent.findOne({ userId: userId, eventId: eventId });

			if (currentApplyEvent) {
				let cardFind = await Cards.findOne({ userId: req.user });

				if (cardFind) {
					const nextHandle = async function (cardFind, currentApplyEvent, charge, err) {
						const newPayment = new Payment({
							sender: userId,
							eventId: eventId,
							receiver: receiver,
							amount: amount,
							payType: "CREDIT_CARD",
							description: description,
							cardId: cardFind.id,
							cardStripeId: cardId,
							session: sessionIds
						});

						if (charge) {
							newPayment.cardId = cardFind.id;
							newPayment.chargeId = charge.id;
							newPayment.status = "PAID";
						} else {
							newPayment.status = "FAILED";
						}

						currentApplyEvent.session.forEach(element => {
							if (sessionIds.includes(element.id)) {
								element.paymentId = newPayment._id;
								element.paymentStatus = newPayment.status;
							}
						})

						let eventCondition = { _id: event._id }
						let eventUpdate = { $inc: { "session.$[element].joinNumber" : 1 } }
						let eventFilter = { arrayFilters: [ { "element.id": { $in: sessionIds } } ] }
					
						Promise.all([
							newPayment.save(),
							ApplyEvent.findByIdAndUpdate({ _id: currentApplyEvent._id }, { session: currentApplyEvent.session }),
							Event.findOneAndUpdate(eventCondition, eventUpdate, eventFilter),
							charge
						]).then(([payment, applyEvent, event, charge]) => {
							if (charge) {
								res.status(200).json({ result: true });
							} else {
								next({ error: { message: 'Payment failed', code: 901 } });
							}
						}).catch(() => {
							next({ error: { message: "Something went wrong", code: 776 } });
						})
					}

					stripe.charges.create(
						{
							amount: amount,
							currency: 'vnd',
							customer: cardFind.customerId,
							source: cardId,
							description: description || ("Payment for event " + eventId),
						},
						function (err, charge) {
							nextHandle(cardFind, currentApplyEvent, charge, err);
						});
				} else {
					next({ error: { message: 'Card customer not found', code: 900 } });
				}
			} else {
				next({ error: { message: 'You have not participated in this event', code: 702 } });
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
		}
	},


	get_card_info: async (req, res, next) => {
		if (typeof req.cardId == undefined) {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}
		let { cardId } = req.query;

		try {
			let cardFind = await Cards.findOne({ 'userId': req.user });

			if (cardFind == null || cardFind.customerId == null) {
				next({ error: { message: "Card not found!", code: 747 } });
			} else {
				stripe.customers.retrieveSource(
					cardFind.customerId,
					cardId,
					function (err, card) {
						if (err != null) {
							next({ error: { message: "Something went wrong", code: 776 } });
						} else {
							res.status(200).json({ result: card });
						}
					}
				);
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
		}
	},

	get_listcard: async (req, res, next) => {
		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
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
						next({ error: { message: "Something went wrong", code: 776 } });
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

		try {
			let cardFind = await Cards.findOne({ 'userId': req.user });

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
							next({ error: { message: "Something went wrong", code: 776 } });
						} else {
							res.status(200).json({ result: true });
						}
					}
				);
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
			return;
		}
	},

	del_card: async (req, res, next) => {
		if (typeof req.body.cardId === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		try {
			let cardFind = await Cards.findOne({ 'userId': req.user });

			if (cardFind == null || cardFind.customerId == null) {
				res.status(600).json({ error: { message: "card customer not found", code: 900 } });
			} else {
				stripe.customers.deleteSource(
					cardFind.customerId,
					req.body.cardId,
					function (err, confirmation) {
						if (err != null) {
							next({ error: { message: "Something went wrong", code: 776 } });
						} else {
							res.status(200).json({ result: confirmation.deleted });
						}
					}
				);
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
			return;
		}
	},

	del_customer: async (req, res, next) => {
		let cardFind = null;

		try {
			cardFind = await Cards.findOne({ 'userId': req.user });
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
			return;
		}

		if (cardFind == null || cardFind.customerId == null) {
			res.status(600).json({ error: { message: "card customer not found", code: 900 } });
		} else {
			let confirmation = null

			try {
				confirmation = await stripe.customers.del(cardFind.customerId);
			} catch (err) {
				next({ error: { message: "Something went wrong", code: 776 } });
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
				next({ error: { message: "Something went wrong", code: 776 } });
			}
		}
	},

	create_customer: async (req, res, next) => {
		if (typeof req.body.cardToken === 'undefined') {
			res.status(600).json({ error: { message: "Invalid data", code: 402 } });
			return;
		}

		try {
			let cardFind = await Cards.findOne({ 'userId': req.user });

			var createCard = function (customerId, cardToken, res) {
				stripe.customers.createSource(
					customerId,
					{ source: cardToken },
					function (err, card) {
						if (err != null) {
							next({ error: { message: "Something went wrong", code: 776 } });
						} else {
							res.status(200).json({ result: card });
						}
					}
				);
			}

			if (cardFind == null || cardFind.customerId == null) {
				var customer = await stripe.customers.create({
					description: 'My First Test Customer (created for API docs)'
				});

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
			} else {
				createCard(cardFind.customerId, req.body.cardToken, res)
			}
		} catch (err) {
			next({ error: { message: "Something went wrong", code: 776 } });
			return;
		}
	}
}