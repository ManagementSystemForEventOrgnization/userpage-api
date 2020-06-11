const mongoose = require('mongoose');
const { Schema } = mongoose;

const evenCategorySchema = new Schema({
    name: String,
    isDelete: { type: Boolean, default: false },
    updateAt: Date,
    createAt: {type: Date, default: Date()}
})

mongoose.model('eventCategory', evenCategorySchema);