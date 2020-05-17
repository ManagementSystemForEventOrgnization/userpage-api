const mongoose = require('mongoose');
const eventCategory = mongoose.model('eventCategory');

 
module.exports = {
    getCategory: async (req, res, next) => {
        try {
            let category = await eventCategory.find({isDelete : false});
            res.status(200).json({result: category});
        } catch (err) {
            next({error: {message: 'Lỗi không lấy được dữ liệu', code: 500}})
        }

    }


}