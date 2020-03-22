var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

var api = new ParseServer({
    databaseURI: "mongodb+srv://mydb:texttospeech@cluster0-r2eia.mongodb.net/test?retryWrites=true&w=majority",
    cloud: "./main.js",
    appId: "APPLICATION_ID",
    masterKey: "mySecretMasterKey",
    fileKey: "myFileKey",
    clientKey: "clientKey",
    restAPIKey: "restAPIKey",
    serverURL: "http://127.0.0.1:1337/api",
});

var dashboard = new ParseDashboard({
    apps: [
        {
            appName: "My Event Parse API",
	        appId: "APPLICATION_ID",
    	    masterKey: "mySecretMasterKey",
    	    fileKey: "myFileKey",
    	    clientKey: "clientKey",
    		restAPIKey: "restAPIKey",
            serverURL: "http://127.0.0.1:1337/api"
        }
    ],
    users: [
        {
      	    "user":"test",
      	    "pass":"test"
        }
    ]
});

app.use('/dashboard', dashboard);
app.use('/api', api);

var port = 1337;

app.listen(port, function() {
    console.log('parse-server running on port ' + port);
});

module.exports = app;
