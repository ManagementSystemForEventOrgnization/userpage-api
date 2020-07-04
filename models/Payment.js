const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'users' },
    receiver: { type: Schema.Types.ObjectId, ref: 'users' },
    amount: Number,
    status: String, //UNPAID, FAILED, WAITING, PAID
    description: String,
    eventId: { type: Schema.Types.ObjectId, ref: 'event' },
    cardId: { type: mongoose.Types.ObjectId },
    chargeId: String,
    zptransId: String,
    payType: String,
    sessionRefunded: [String],
    session: [String],
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
})

mongoose.model('payment', paymentSchema);
