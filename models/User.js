const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    email: String,
    hashPass: String,
    dateCreate: {type: Date , default: Date.now },
    fullName: String,
    TOKEN: String,
    birthday: Date,
    gender: String,
    typeUser: String,
    job: String,
    phone: String,
    avatar: { type: String, default: '/avata.png'},
    isReported: {type: Boolean, default: false},
    dateDelete: Date,
    discription: String,
    phoneNumber: String,
})

mongoose.model('users', userSchema);