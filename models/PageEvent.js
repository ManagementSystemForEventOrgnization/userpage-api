const mongoose = require('mongoose');
const { Schema } = mongoose;

const pageEventSchema = new Schema({
    title: { type:String, "index": "text" },
    discription: { type:String, "index": "text" },
    eventId: Schema.Types.ObjectId,
    // index: {
    //     row: Number,
    //     section: Number
    // },
    rows: {type: Array},
    header: {type: Array},
    createAt: { type: Date, default: new Date() },
    updateAt: Date
})

mongoose.model('pageEvent', pageEventSchema);