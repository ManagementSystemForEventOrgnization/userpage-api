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
<<<<<<< HEAD
    session :{type : Array},
    category: String,
    endTime: Date,
    limitNumber: Number,
    startTime: { type: Date, default: Date() },
    status: { type:String, "index": "text", default: "PENDING" },
    urlWeb: String,
    createAt: { type: Date, default: Date() },
    isPreview: {type: Boolean},
    updateAt: Date
=======
    status: { type:String, "index": "text", default: "PENDING" },
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
    updatedAt: Date,
>>>>>>> ee903c9c50dbd103d2891b5e48c1434ce3ec9c33
})

mongoose.model('event', eventSchema);