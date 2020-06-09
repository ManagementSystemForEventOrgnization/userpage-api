const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    sender: { type : Schema.Types.ObjectId , ref: 'users'},
    receiver: { type : Schema.Types.ObjectId , ref: 'users'},
    amount: Number, 
    status: String, //UNPAID, FAILED, WAITING, PAID
    description: String,
    eventId: { type : Schema.Types.ObjectId , ref: 'event'},
    cardId: String,
    chargeId: String,
    zptransId: String,
    payType: String,
    createdAt: { type: Date, default: new Date() },
    sessionRefunded: [String],
    updatedAt: Date,
    session: [String],
})

mongoose.model('payment', paymentSchema);
