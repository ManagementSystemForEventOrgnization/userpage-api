const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    name: { type: String, "index": "text" },
    userId: Schema.Types.ObjectId,
    typeOfEvent : String,
    urlWeb: String,
    isSellTicket: Boolean,
    ticket: {
        price: Number,
        discount: Number
    },
    session :{type : Array}, // limitNumber, joinNumber, endTime, startTime, detail, imageMap, address, linkfile, status, isCancel 
    category: String,
    status: { type: String, "index": "text", default: "PENDING" }, //PENDING, START, FINISH, DRAFT, CANCEL
    bannerUrl: String,
    createdAt: { type: Date, default: Date() },
    isPreview: {type: Boolean},
    updatedAt: Date
})

mongoose.model('event', eventSchema);
