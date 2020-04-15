const mongoose = require('mongoose');
const Cards = mongoose.model('cards');
const stripe = require('stripe')('sk_test_baGlYFE4mbVp9TgpMLM2MuqQ002wIAF0zR');


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
	create_order: async (req, res) => {
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

		axios.post(config.endpoint, null, { params: order })
  		.then(result => {
  		  res.send(result.data)
  		})
  		.catch(err => res.status(600).json({ message: err }));
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
  		res.json(result);
	},
	
	create_charges: async (req, res) => {
		if (typeof req.body.amount === 'undefined') {
            res.status(422).json({ message: 'Invalid data' });
            return;
        }
        
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ message: "card customer not found" });
        } else  {
			stripe.charges.create(
  			{
   				amount: req.body.amount,
  				currency: 'vnd',
  				customer: cardFind.customerId,
    			description: req.body.description,
  			},
  			function(err, charge) {
  				  if (err != null) {
  						res.status(600).json(err);
  					} else {
    					res.send({"result": charge});
  					}
 			});
		}
	},
	
	get_listcard: async (req, res) => {        
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ message: "card customer not found" });
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
  						res.status(600).json(err);
  					} else {
    					res.send(cards.data);
  					}
 				}
			);
		}
	},
	
	set_card_default: async (req, res) => {
		if (typeof req.body.cardId === 'undefined') {
            res.status(422).json({ message: 'Invalid data' });
            return;
        }
        
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ message: "card customer not found" });
        } else  {
        	console.log("customerId: ", cardFind.customerId)
        	
			stripe.customers.update(
 		 		cardFind.customerId,
		  		{ 
		  			default_source: req.body.cardId 
		 		},
 		 		function(err, customer) {
 			 	  if (err != null) {
  						res.status(600).json(err);
  					} else {
        				console.log("customer: ", customer, "\n")
    					res.send({"result": true});
  					}
 				}
			);
		}
	},
	
	del_card: async (req, res) => {
		if (typeof req.body.cardId === 'undefined') {
            res.status(422).json({ message: 'Invalid data' });
            return;
        }
        
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ message: "card customer not found" });
        } else  {
       		console.log("customerId: ", cardFind.customerId)
			stripe.customers.deleteSource(
 		 		cardFind.customerId,
		  		req.body.cardId,
 		 		function(err, confirmation) {
 		 		  if (err != null) {
  						res.status(600).json(err);
  					} else {
    					res.send({"result": confirmation.deleted});
  					}
 				}
			);
		}
	},
	
	del_customer: async (req, res) => {
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
        if (cardFind == null || cardFind.customerId == null) {
        	res.status(600).json({ message: "card customer not found" });
        } else  {
        	console.log("customerId: ", cardFind.customerId)
        	
        	let confirmation = null
        	
        	try {
        		confirmation = await stripe.customers.del(cardFind.customerId);
        	} catch (err) {
        		res.status(600).json({ message: err });
      	      	return;
        	}
			
			console.log("confirmation: ", confirmation, "\n")
			
			try {
				if (confirmation.deleted) {
					await Cards.remove({ 'userId': req.body.userId });
					res.send({"result": true})
				} else {
					res.send({"result": false})
				}
   			} catch (err) {
      	      res.status(600).json({ message: err });
      	      return;
     	 	}
		}
	},
	
	
	payouts: async (req, res) => {
		stripe.balance.retrieve(function(err, balance) {
			stripe.payouts.create(
  				{amount: req.body.amount, currency: 'vnd'},
  				function(err, payout) {
  					if (err != null) {
  						res.status(600).json({err, "balance": balance});
  					} else {
						res.send({"result": payout, "balance": balance});
  					}
 				 }
			);
		});
	},
	
	create_customer: async (req, res) => {
		if (typeof req.body.cardToken === 'undefined') {
            res.status(422).json({ message: 'Invalid data' });
            return;
        }
        
		let cardFind = null;
		
        try {
            cardFind = await Cards.findOne({ 'userId': req.body.userId });
        } catch (err) {
            res.status(600).json({ message: err });
            return;
        }
        
 		var createCard = function (customerId, cardToken, res) {
        	stripe.customers.createSource(
		  		customerId,
  				{ source: cardToken },
 				function(err, card) {
  		 	 		if (err != null) {
  						res.status(600).json(err);
  					} else {
						res.send(card);
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
            	res.status(600).json({ message: err });
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
            	res.status(600).json({ message: err });
            	return;
        	}
 		 } else { 				
    		console.log("create token: ", req.body.cardToken, "\n" )
    		createCard(cardFind.customerId, req.body.cardToken, res)
 		 }
	}
}