var express = require('express');
var router = express.Router();
const chatController = require('../controller/chatController');
const Unauthorized = require('../middlewares/loginAuth');
const Authorization = require('../middlewares/authorization');

router.post('/chat/saveChat',chatController.saveChat);

router.get('/chat/getList',chatController.getList);

module.exports = router;