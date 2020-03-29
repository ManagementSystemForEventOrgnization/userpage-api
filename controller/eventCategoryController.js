const mongoose = require('mongoose');
const eventCategory = mongoose.model('eventCategory');


module.exports = {
    getCategory: async (req, res) => {
        
        try {
            let category = await eventCategory.find({});
            res.status(200).json(category);
        } catch (err) {
            console.log(err)
            res.send(err)
        }

    }


}