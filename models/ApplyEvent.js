const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    isConfirm: Boolean,
    isReject: Boolean,
    paymentId: Schema.Types.ObjectId,
    joinTime: Date,
    qrcode: { type:String, "index": "text" },
    createdAt: { type: Date, default: Date() },
    updatedAt: Date
})

mongoose.model('applyEvent', applyEventSchema);