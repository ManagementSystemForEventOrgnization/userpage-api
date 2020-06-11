const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatSchema = new Schema({
    sender: String,// Schema.Types.ObjectId,
    receiver: String,// Schema.Types.ObjectId,
    content: String,
    isSeen: Boolean,
    isDelete: Boolean
}, { 
	timestamps: { 
		createdAt: 'createdAt', 
		updatedAt: 'updatedAt' 
	}
})

mongoose.model('chat', chatSchema);