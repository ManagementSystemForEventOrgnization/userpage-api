const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    userId: Schema.Types.ObjectId,
    joinNumber: Number,
    limitNumber: Number,
    typeOfEvent : String,
    urlWeb: String,
    category: String,
    isSellTicket: Boolean,
    name: { type:String, "index": "text" },
    ticket: {
        price: Number,
        discount: Number
    },
    status: { type:String, "index": "text" },
    map: [{
        long: String,
        lat: String
    }],
    address : [{ type:String, "index": "text" }],
    detailAddress: [String],
    endTime: [Date],
    startTime: [{ type: Date, default: Date() }],
    cancelTime: [Date],
    isCancel: Boolean,
    createdAt: { type: Date, default: Date() },
    updatedAt: Date
})

mongoose.model('event', eventSchema);