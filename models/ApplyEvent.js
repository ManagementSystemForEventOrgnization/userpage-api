const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    isConfirm: Boolean,
    willJoinTime: Date(),
    qrcode: { type:String, "index": "text" },
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('applyEvent', applyEventSchema);