const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
//     isConfirm: Boolean,
//     isReject: Boolean,
    paymentId: Schema.Types.ObjectId,
    session : { type : Array },
    qrcode: { type:String, "index": "text" },
    createdAt: { type: Date, default: new Date() },
    updatedAt: Date
})

mongoose.model('applyEvent', applyEventSchema);


//status session: "", CANCEL, REJECT, MEMBERCANCEL, JOINED  