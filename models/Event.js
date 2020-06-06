const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    name: { type: String, "index": "text" },
    userId: Schema.Types.ObjectId,
    typeOfEvent: String,
    urlWeb: String,
    isSellTicket: Boolean,
    ticket: {
        price: Number,
        discount: Number
    },
    session: [
        {
            day: Date,
            address : {type: Object},
            limitNumber: Number,
            joinNumber: Number,
            name : String,
            documents: {type: Array},
            detail : {type: Array},
            status: String,
            isConfirm: Boolean,
            isReject: Boolean,
            paymentId: String,
            isCancel: String,
        }
    ],//{type : Array}, // limitNumber, joinNumber, endTime, startTime, detail, imageMap, address, linkfile, status 
    category: Schema.Types.ObjectId,
    status: { type: String, "index": "text", default: "PENDING" }, //PENDING, START, FINISH, DRAFT, CANCEL
    bannerUrl: String,
    createdAt: { type: Date, default: new Date() },
    isPreview: { type: Boolean },
    updatedAt: Date
})

mongoose.model('event', eventSchema);
