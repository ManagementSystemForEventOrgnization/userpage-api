var express = require('express');
var router = express.Router();
const controller_envenCategory = require('../controller/eventCategoryController');
const Unauthorized = require('../middlewares/loginAuth');


router.get('/',controller_envenCategory.getCategory);

module.exports = router;