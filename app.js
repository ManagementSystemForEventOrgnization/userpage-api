const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const keys = require('./config/key');
const bodyParser = require('body-parser');
const passport = require('passport');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const mongoose = require('mongoose');
require('./models/User');

mongoose.connect(keys.mongoURI,  {useNewUrlParser: true, useUnifiedTopology: true});

var app = express();


app.use(
    cookieSession({
        maxAge: 30*24*60*60*1000,
        keys:[keys.cookieKey]
    })
);
// app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());

require('./routes/passport-google'); 
require('./routes/passportLogin')(app);

app.use('/', require('./routes/authRouters'));
app.use('/users', usersRouter);


//require('./routes/authRouters')(app);


app.listen(process.env.PORT || 5000, ()=>{
    console.log('open http://localhost:5000');
})