const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    sender: Schema.Types.ObjectId,
    receiver: Schema.Types.ObjectId,
    amount: Number, 
    status: String, //UNPAID, FAILED, WAITING, PAID
    description: String,
    eventId: Schema.Types.ObjectId,
    cardId: String,
    chargeId: String,
    zptransId: String,
    payType: String,
    sessionRefunded: [String],
    createdAt: { type: Date, default: Date() },
    updatedAt: Date,
    session: [String],
})

mongoose.model('payment', paymentSchema);