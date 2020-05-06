const mongoose = require('mongoose');
const Cards = mongoose.model('cards');
const stripe = require('stripe')('sk_test_baGlYFE4mbVp9TgpMLM2MuqQ002wIAF0zR');

const ApplyEvent = mongoose.model('applyEvent');
const Payment = mongoose.model('payment');

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
	refundNoti: async (req, res, next) => {
       
	},
	
	paymentHistory: async (req, res, next) => {
		
	},

	refund: async (req, res, next) => {
		let { paymentId } = req.body;

		stripe.refunds.create(
			{charge: paymentId},
			function(err, refund) {
			  if (err) {
				  refundNoti()
			  } else {
				  refundNoti()
			  }
			}
		  );
	},

	//refund zalopay
	
	payouts: async (req, res, next) => {
		stripe.balance.retrieve(function(err, balance) {
			stripe.payouts.create(
  				{amount: req.body.amount, currency: 'vnd'},
  				function(err, payout) {
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
            var currentApplyEvent = await ApplyEvent.findOne({userId: userId, eventId: eventId, joinTime: joinTime});
			var currentPayment = await Payment.findOne({sender: userId, eventId: eventId, receiver: receiver});
			
			if (currentApplyEvent) {
				try {
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
			
					var result = null

					axios.post(config.endpoint, null, { params: order })
					  .then(result => {
						result = result.data
						// res.status(200).json({ result: result.data });
					  })
					  .catch(err =>{ 
						  next(err); 
						  return; 
					});

					const newPayment = new Payment({
						sender: userId,
						eventId: eventId,
						receiver: receiver,
						amount: amount,
						discription: discription,
						createdAt: Date()
					});

					currentApplyEvent.paymentId = newPayment._id;
					currentApplyEvent.updatedAt = Date();

					if (result) {
						try {
							if (currentPayment) {
								result.paymentId = currentPayment._id;
								currentPayment.cardId = null;
								currentPayment.status = "PAID";

								await currentPayment.save();
							} else {
								result.paymentId = newPayment._id;
								newPayment.status = "PAID";
								
								await newPayment.save();
								await currentApplyEvent.save();
							}
							
							res.status(200).json({result: result});
						} catch(err) {
							next(err);
						}
					} else {
						try {
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
						} catch(err) {
							next(err);
						}
					}
				} catch (err) {
					next(err);
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
            var currentApplyEvent = await ApplyEvent.findOne({userId: userId, eventId: eventId, joinTime: joinTime});
			var currentPayment = await Payment.findOne({sender: userId, eventId: eventId, receiver: receiver});
			
			if (currentApplyEvent) {
				try {
					let cardFind = await Cards.findOne({ 'userId': req.user });

					if (cardFind) {
						let charge = null
        	
						try {
							charge = await stripe.charges.create(
								{
									amount: amount,
									currency: 'vnd',
									customer: cardFind.customerId,
									description: description,
								});
						} catch (err) {
							next(err);
							return;
						}

						const newPayment = new Payment({
							sender: userId,
							eventId: eventId,
							receiver: receiver,
							amount: amount,
							discription: discription,
							cardId: cardFind.id,
							createdAt: Date()
						});

						currentApplyEvent.updatedAt = Date();

						if (charge) {
							try {
								currentApplyEvent.qrcode = userId

								if (currentPayment) {
									currentPayment.chargeId = charge.id;
									currentPayment.cardId = cardFind.id;
									currentPayment.status = "PAID";
	
									await currentPayment.save();
								} else {
									currentApplyEvent.paymentId = newPayment._id;
									newPayment.chargeId = charge.id;
									newPayment.status = "PAID";
									
									await newPayment.save();
								}
								
								await currentApplyEvent.save();

								res.status(200).json({result: true});
							} catch(err) {
								next(err);
							}
						} else {
							try {
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
							} catch(err) {
								next(err);
							}
						}
					} else {
						next({ error: { message: 'Card customer not found', code: 900 } });
					}
				} catch (err) {
					next(err);
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
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            next(err);
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
			res.status(600).json({ error: { message: "card customer not found", code: 900 } });
        } else  {
        	console.log("customerId: ", cardFind.customerId)
			stripe.customers.listSources(
  				cardFind.customerId,
			  	{ 
			  		object: 'card', 
			  		limit: 50 
			  	}, 
			  	function(err, cards) {
			  		if (err != null) {
						next(err);
  					} else {
    					res.status(200).json({result: cards.data});
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
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            next(err);
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ error: { message: "card customer not found", code: 900 } });
        } else  {
        	console.log("customerId: ", cardFind.customerId)
        	
			stripe.customers.update(
 		 		cardFind.customerId,
		  		{ 
		  			default_source: req.body.cardId 
		 		},
 		 		function(err, customer) {
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
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            next(err);
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ error: { message: "card customer not found", code: 900 } });
        } else  {
       		console.log("customerId: ", cardFind.customerId)
			stripe.customers.deleteSource(
 		 		cardFind.customerId,
		  		req.body.cardId,
 		 		function(err, confirmation) {
 		 		  if (err != null) {
						next(err);
  					} else {
    					res.status(200).json({result: confirmation.deleted});
  					}
 				}
			);
		}
	},
	
	del_customer: async (req, res, next) => {
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            next(err);
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ error: { message: "card customer not found", code: 900 } });
        } else  {
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
					await Cards.remove({ 'userId': req.body.userId });
					res.status(200).json({result: true})
				} else {
					res.status(200).json({result: false})
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
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            next(err);
            return;
        }
        
 		var createCard = function (customerId, cardToken, res) {
        	stripe.customers.createSource(
		  		customerId,
  				{ source: cardToken },
 				function(err, card) {
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
            			userId: req.body.userId
        			});
        			
       				console.log("save customer: ", newCard, "\n")
            		await newCard.save();
    					
    				console.log("create token: ", req.body.cardToken, "\n" )
    				createCard(customer.id, req.body.cardToken, res)
 		 		} else {
 		 			res.status(600).json({ message: "can't create card customer" });
 		 		} 
            } catch (err) {
            	next(err);
            	return;
        	}
 		 } else { 				
    		console.log("create token: ", req.body.cardToken, "\n" )
    		createCard(cardFind.customerId, req.body.cardToken, res)
 		 }
	}
}