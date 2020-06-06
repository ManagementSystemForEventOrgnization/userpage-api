var express = require('express');
var router = express.Router();
const commentController = require('../controller/commentController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/comment/save', Unauthorized, Authorization ,commentController.saveComment);

router.get('/comment/get_list',commentController.getList);

module.exports = router;