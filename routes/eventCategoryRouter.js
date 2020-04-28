var express = require('express');
var router = express.Router();
const controller_evenCategory = require('../controller/eventCategoryController');
const Unauthorized = require('../middlewares/loginAuth');


router.get('/',controller_evenCategory.getCategory);

module.exports = router;