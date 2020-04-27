const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    sender: Schema.Types.ObjectId,
    receiver: [Schema.Types.ObjectId],
    type: Number, // (Email, notify: (event: (apply, start event), payment))
    message: String,
    title: String,
    linkTo: {
        key: String, // noti key link to screen
        _id: Schema.Types.ObjectId // id object link to
    },
    isRead: Boolean,
    isDelete: Boolean,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('notification', notificationSchema);