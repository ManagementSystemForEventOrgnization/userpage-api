const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    eventId: { type : Schema.Types.ObjectId, ref: 'event' },
    session : { type : Array },
    qrcode: { type:String, "index": "text" }
}, { 
	timestamps: { 
		createdAt: 'createdAt', 
		updatedAt: 'updatedAt' 
	}
})

mongoose.model('applyEvent', applyEventSchema);


//status session: "", CANCEL, REJECT, MEMBERCANCEL, JOINED  
// paymentId: Schema.Types.ObjectId,
// isConfirm: Boolean, // check when take part in event
// isReject: Boolean,