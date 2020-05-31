var express = require('express');
var router = express.Router();
const chatController = require('../controller/chatController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/chat/save',chatController.saveChat);

router.get('/chat/get_list',chatController.getList);

module.exports = router;