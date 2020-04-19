const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
    sender: Schema.Types.ObjectId,
    receiver: Schema.Types.ObjectId,
    amount: Number, 
    status: String,
    discription: String,
    eventId: Schema.Types.ObjectId,
    cardId: Schema.Types.ObjectId,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('payment', paymentSchema);