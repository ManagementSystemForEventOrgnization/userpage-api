const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    name: { type:String, "index": "text" },
    joinNumber: {type: Number, default: 0},
    userId: Schema.Types.ObjectId,
    limitNumber: Number,
    typeOfEvent : String,
    urlWeb: String,
    category: String,
    isSellTicket: Boolean,
    ticket: {
        price: Number,
        discount: Number
    },
    session :{type : Array},
    category: String,
    // endTime: Date,
    limitNumber: Number,
    // startTime: { type: Date, default: Date() },
    status: { type:String, "index": "text", default: "PENDING" },
    urlWeb: String,
    banner: {type: String},
    createAt: { type: Date, default: Date() },
    isPreview: {type: Boolean},
    updateAt: Date
})

mongoose.model('event', eventSchema);