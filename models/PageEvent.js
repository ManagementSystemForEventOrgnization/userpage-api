const mongoose = require('mongoose');
const { Schema } = mongoose;

const pageEventSchema = new Schema({
    title: { type:String, "index": "text" },
    discription: { type:String, "index": "text" },
    eventId: Schema.Types.ObjectId,
    index: {
        row: Number,
        section: Number
    },
    // rows: [{
    //     title: String,
    //     content: [String],
    //     linkFile: [String],
    //     image: [String],
    //     index: Number,
    //     contentColor: String,
    //     titleColor: String,
    //     titleFont: Number,
    //     contentFont: Number,
    //     titleIcon: String, // dấu chấm hay dấu sao trước text
    //     contentIcon: String,
    //     type: String, //banner, text, table, speaker
    //     level: Number,
    //     style: String //horizontal, vertical
    // }],
    rows: {type: Array},
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('pageEvent', pageEventSchema);