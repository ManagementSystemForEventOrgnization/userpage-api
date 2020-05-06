const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    email: { type:String, "index": "text" },
    hashPass: String,
    dateCreate: {type: Date , default: Date.now },
    fullName: { type:String, "index": "text" },
    TOKEN: String,
    google_id: String,
    birthday: Date,
    gender: { type:String, "index": "text" },
    typeUser: String,
    job: String,
    phone: String,
    avatar: { type: String, default: '/avata.png'},
    isReported: {type: Boolean, default: false},
    dateDelete: Date,
    discription: { type:String, "index": "text" },
    isActive:{type:Boolean,default: false},
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('users', userSchema);