const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    eventId: { type : Schema.Types.ObjectId , ref: 'event'},
    content: String,
    isDelete: Boolean,
    createAt: { type: Date, default: new Date() },
    updateAt: Date
})

mongoose.model('comment', commentSchema);