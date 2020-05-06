const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    sender: Schema.Types.ObjectId,
    receiver: Schema.Types.ObjectId,
    amount: Number, 
    status: String, //UNPAID, FAILED, WAITING, PAID
    discription: String,
    eventId: Schema.Types.ObjectId,
    cardId: String,
    chargeId: String,
    createdAt: { type: Date, default: Date() },
    updatedAt: Date
})

mongoose.model('payment', paymentSchema);