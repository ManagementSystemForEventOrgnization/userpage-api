const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'Users' },
    eventId: Schema.Types.ObjectId,
    session : { type : Array },
    qrcode: { type:String, "index": "text" },
    createdAt: { type: Date, default: new Date() },
    updatedAt: Date
})

mongoose.model('applyEvent', applyEventSchema);


//status session: "", CANCEL, REJECT, MEMBERCANCEL, JOINED  
// paymentId: Schema.Types.ObjectId,
// isConfirm: Boolean, // check when take part in event
// isReject: Boolean,