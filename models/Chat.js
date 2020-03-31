const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatSchema = new Schema({
    sender: Schema.Types.ObjectId,
    receiver: Schema.Types.ObjectId,
    content: String,
    isSeen: Boolean,
    isDelete: Boolean,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('chat', chatSchema);