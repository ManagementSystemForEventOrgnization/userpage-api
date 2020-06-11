const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardSchema = new Schema({
    customerId: String,
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    cardNumber: String,
    cardExpire: String
}, { 
	timestamps: { 
		createdAt: 'createdAt', 
		updatedAt: 'updatedAt' 
	}
})

mongoose.model('cards', cardSchema);