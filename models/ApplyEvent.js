const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    session : { type : Array },
<<<<<<< HEAD
    qrcode: { type:String, "index": "text" },
    createdAt: { type: Date, default: new Date() },
=======
    qrcode: { type: String, "index": "text" },
    createdAt: { type: Date, default: Date() },
>>>>>>> 4eb9c3b9027e5b71afb15d37072e201299cf3325
    updatedAt: Date
})

mongoose.model('applyEvent', applyEventSchema);


//status session: "", CANCEL, REJECT, MEMBERCANCEL, JOINED  
// paymentId: Schema.Types.ObjectId,
// isConfirm: Boolean, // check when take part in event
// isReject: Boolean,