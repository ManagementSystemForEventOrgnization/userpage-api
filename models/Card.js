const mongoose = require('mongoose');
const { Schema } = mongoose;

const cardSchema = new Schema({
    cardCustomerId: Schema.Types.ObjectId,
    userId: Schema.Types.ObjectId,
    cardNumber: String,
    cardExpire: String,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('card', cardSchema);