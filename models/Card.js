const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardSchema = new Schema({
    customerId: String,
    userId: Schema.Types.ObjectId,
    cardNumber: String,
    cardExpire: String,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('cards', cardSchema);