const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    userId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId,
    content: String,
    isDelete: Boolean,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('comment', commentSchema);