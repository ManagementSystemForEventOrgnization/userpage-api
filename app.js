const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const keys = require('./config/key');
const bodyParser = require('body-parser');
const passport = require('passport');
const mongoose = require('mongoose');
const cors = require('cors');

mongoose.connect(keys.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, 'useCreateIndex': true, useFindAndModify: false });

require('./middlewares/loadMongoose');
const notification_Controller = require('./controller/notificationController');
require('./utils/passport')(passport);
var app = express();


// app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json());
app.use(cookieParser());
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


require('./utils/passportLogin')(app);

app.use(passport.initialize());
// app.use(passport.session());
// app.use(cors());
app.use(
    cookieSession({
        maxAge: 30 * 24 * 60 * 60 * 1000,
        keys: [keys.cookieKey]
    })
);
app.use(cors({
    credentials: true,
    origin: ['http://localhost:3000', 'https://event-management-team.herokuapp.com']
}));

app.use('/api', require('./routes/commentRouter'));
app.use('/api', require('./routes/chatRouter'));
app.use('/api', require('./routes/eventRouter'));
app.use('/api', require('./routes/notificationRouters'));
app.use('/api', require('./routes/applyEventRouters'));
app.use('/api', require('./routes/paymentRouters'));
app.use('/api', require('./routes/authRouters'));
app.use('/api', require('./routes/eventRouter'));
app.use('/api/evenCategory', require('./routes/eventCategoryRouter'));
app.use('/', require('./routes/googleRouter'));
require('./utils/upload')(app);
//require('./routes/authRouters')(app);

notification_Controller.startEventNoti();


//Xử lý error 404
app.use((req, res, next) => {
    res.status(404).json({ error: { message: 'API Not Found' } });
})

app.use((error, req, res, next) => {
    res.status(600).json(error);
})

app.listen(process.env.PORT || 5000, () => {
    console.log('open http://localhost:5000');
})
