const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const cookieSession = require('cookie-session');
const keys = require('./config/key');
// start cai passport len;
require('./routes/passport');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(
    cookieSession({
        maxAge: 30*24*60*60*1000,
        keys:[keys.cookieKey]
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


require('./routes/authRouters')(app);


app.listen(process.env.PORT || 5000, ()=>{
    console.log('open http://localhost:5000');

})