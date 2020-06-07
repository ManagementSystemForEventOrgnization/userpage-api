const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardSchema = new Schema({
    customerId: String,
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    cardNumber: String,
    cardExpire: String,
    createAt: { type: Date, default: new Date() },
    updateAt: Date
})

mongoose.model('cards', cardSchema);