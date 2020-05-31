const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const keys = require('./config/key');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');


mongoose.connect(keys.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, 'useCreateIndex': true, useFindAndModify: false });

var app = express();

app.use(
    cookieSession({
        maxAge: 30 * 24 * 60 * 60 * 1000,
        keys: [keys.cookieKey]
    })
);
// app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());

require('./middlewares/loadMongoose');

require('./utils/passport-google');
require('./utils/passportLogin')(app);

app.use('/api', require('./routes/chatRouter'));
app.use('/api', require('./routes/eventRouter'));
app.use('/api', require('./routes/notificationRouters'));
app.use('/api', require('./routes/applyEventRouters'));
app.use('/api', require('./routes/paymentRouters'));
app.use('/api', require('./routes/authRouters'));
app.use('/api', require('./routes/eventRouter'));
app.use('/api/evenCategory', require('./routes/eventCategoryRouter'));
app.use('/', require('./routes/googleRouter'));

//require('./routes/authRouters')(app);

//Xử lý error 404
app.use((req, res, next) => {
    res.status(404).json({ error: { message: 'API này hiện tại chưa hổ trợ' } });
})

app.use((error, req, res, next) => {
    res.status(600).json(error);
})

app.listen(process.env.PORT || 5000, () => {
    console.log('open http://localhost:5000');
})