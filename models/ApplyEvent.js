const mongoose = require('mongoose');
const { Schema } = mongoose;

const applyEventSchema = new Schema({
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    eventId: { type : Schema.Types.ObjectId, ref: 'event' },
    session :  [
        {
            id: String,
            day: Date,
            address: { type: Object },
            limitNumber: Number,
            joinNumber: { type: Number, default: 0 },
            name: String,
            documents: { type: Array },
            detail: { type: Array },
            status: String,
            isConfirm: Boolean,
            isReject: Boolean,
            paymentId: {type: Schema.Types.ObjectId, ref: 'payment'},
            isCancel: Boolean,
        }
    ],
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
