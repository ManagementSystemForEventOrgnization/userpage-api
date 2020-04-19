const mongoose = require('mongoose');
const { Schema } = mongoose;

const bankAccountSchema = new Schema({
    userId: Schema.Types.ObjectId,
    bankName: String,
    bankCode: String,
    branchName: String,
    branchCode: String,
    accountNumber: String,
    accountName: String,
    createAt: { type: Date, default: Date() },
    updateAt: Date
})

mongoose.model('bankAccount', bankAccountSchema);