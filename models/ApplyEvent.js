const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    isConfirm: Boolean,
    qrcode: String,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('applyEvent', applyEventSchema);