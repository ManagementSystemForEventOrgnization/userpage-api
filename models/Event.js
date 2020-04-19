const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
    name: { type:String, "index": "text" },
    joinNumber: Number,
    userId: Schema.Types.ObjectId,
    isPayment: Boolean,
    page: [Schema.Types.ObjectId],
    map: {
        long: String,
        lat: String
    },
    address : { type:String, "index": "text" },
    ticket: {
        price: Number,
        discount: Number
    },
    category: String,
    endTime: Date,
    limitNumber: Number,
    startTime: { type: Date, default: Date() },
    status: { type:String, "index": "text" },
    urlWeb: String,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('event', eventSchema);