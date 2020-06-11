const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    sender: { type : Schema.Types.ObjectId , ref: 'users'},
    receiver: [{ type : Schema.Types.ObjectId , ref: 'users'},],
    type: String, // (event: (apply, start event), payment))
    message: String,
    title: String,
    linkTo: {
        key: String, // noti key link to screen
        _id: Schema.Types.ObjectId // id object link to
    },
    isRead: Boolean,
    isDelete: Boolean,
    createAt: { type: Date, default: Date() },
    updateAt: Date,
    session: [String],
})

mongoose.model('notification', notificationSchema);