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


mongoose.connect(keys.mongoURI,  {useNewUrlParser: true, useUnifiedTopology: true});

var app = express();

app.use(
    cookieSession({
        maxAge: 30*24*60*60*1000,
        keys:[keys.cookieKey]
    })
);
app.use(cors());
// app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(passport.session());

require('./models/User');
require('./routes/passport-google'); 
require('./routes/passportLogin')(app);

app.use('/api', require('./routes/authRouters'));
app.use('/',  require('./routes/googleRouter'));

//require('./routes/authRouters')(app);

app.listen(process.env.PORT || 5000, ()=>{
    console.log('open http://localhost:5000');
})