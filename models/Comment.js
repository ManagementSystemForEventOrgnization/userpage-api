const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    userId: { type : Schema.Types.ObjectId , ref: 'users'},
    eventId: { type : Schema.Types.ObjectId , ref: 'event'},
    content: String,
    isDelete: Boolean,
}, { 
	timestamps: { 
		createdAt: 'createdAt', 
		updatedAt: 'updatedAt' 
	}
})

mongoose.model('comment', commentSchema);