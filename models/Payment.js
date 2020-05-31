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
<<<<<<< HEAD
    isRefunded: Boolean,
    createdAt: { type: Date, default: new Date() },
=======
    sessionRefunded: [String],
    createdAt: { type: Date, default: Date() },
>>>>>>> 4eb9c3b9027e5b71afb15d37072e201299cf3325
    updatedAt: Date,
    session: [String],
})

mongoose.model('payment', paymentSchema);