// server.js
const express        = require('express');
const MongoClient    = require('mongodb').MongoClient;
const bodyParser     = require('body-parser');
const app            = express();
const db             = require('./config/db');

// https
var fs = require('fs');
var https = require('https');

// auth ***
var passport = require('passport');
// var flash    = require('connect-flash');
var cookieParser = require('cookie-parser');
// var session      = require('express-session');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens

// real keys
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/www.matchups-backend.ml/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/www.matchups-backend.ml/fullchain.pem')
};

const port = 8000;

app.use(bodyParser.urlencoded({ extended: false })); // for signup form

app.use(bodyParser.json());
app.use(cookieParser()); // read cookies (needed for auth) ***

//app.set('superSecret', db.secret); // Not sure if I need this ***

// passport setup ***
//app.use(session({ secret: 'iloveball', resave: false, saveUninitialized: false })); // session secret
//app.use(passport.initialize());
//app.use(passport.session()); // persistent login sessions
//app.use(flash()); // use connect-flash for flash messages stored in session

var cors=require('./cors');
app.use(cors.permission)

var auth = require('./app/routes/test_route')
app.use('/auth', auth)

MongoClient.connect(db.url, (err, database) => {
    if (err) return console.log(err)
    require('./app/routes')(app, database, passport);
    //require('./config/passport')(passport, database); // ** This might work
    https.createServer(options, app).listen(port, () => {
      console.log('We are live on ' + port);
    });               
}) 

