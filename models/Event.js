const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    name: { type: String, "index": "text" },
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    typeOfEvent: String,
    urlWeb: String,
    domain: String ,
    isSellTicket: Boolean,
    ticket: {
        price: Number,
        discount: Number
    },
    session: [
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
            qrcode: { type: String },
            paymentId: {type: Schema.Types.ObjectId, ref: 'payment'},
            isCancel: Boolean,
            refundNumber: Number
        }
    ],//{type : Array}, // limitNumber, joinNumber, endTime, startTime, detail, imageMap, address, linkfile, status 
    category: { type : Schema.Types.ObjectId , ref: 'eventCategory'},
    status: { type: String, "index": "text", default: "DRAFT" }, // DRAFT, WAITING, PUBLIC, EDITED, CANCEL
    bannerUrl: String,
    isEdit : {type: String},
    isRequire: {type: Boolean, default : false},
    isPreview: { type: Boolean },
    paymentId: {type: mongoose.Types.ObjectId, ref: 'payment'}
}, { 
	timestamps: { 
		createdAt: 'createdAt', 
		updatedAt: 'updatedAt' 
	}
})

mongoose.model('event', eventSchema);
