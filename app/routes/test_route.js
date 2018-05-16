var express = require('express')
var router = express.Router()

const MongoClient    = require('mongodb').MongoClient;
const db1             = require('../../config/db');
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens

MongoClient.connect(db1.url, (err, db) => {
    if (err) return console.log(err)
    
  /* middleware that is specific to this router
  router.use(function timeLog (req, res, next) {
    console.log('Time: ', Date.now())
    next()
  })*/

  // route middleware to verify a token
  router.use(function(req, res, next) {

    if (req.method == 'OPTIONS') {
     //return; //res.status(200).send();
      // next();
      res.sendStatus(200);
    } else {
      //next();
    //} 
    
     // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    //console.log(req.body);

    // decode token
    if (token) {

      // verifies secret and checks exp
      jwt.verify(token, 'baller', function(err, decoded) {      
        if (err) {
          return res.json({ success: false, message: 'Failed to authenticate token.' });    
        } else {
          // if everything is good, save to request for use in other routes
          req.decoded = decoded;    
          next();
        }
      });

    } else {

      // if there is no token
      // return an error
      return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
      });

    }
  }

  });

  // define the home page route
  router.post('/', function (req, res) {
    console.log(req.body)
    res.send({'yo': 'yoyo'})
  })
  // define the about route
  router.get('/about', function (req, res) {
    res.send('About birds')
  })

  router.post('/add-list', (req, res) => {
    var list = req.body['foo'];
    const listTitle = list[0]['main_title'].trim().toLowerCase().replace(/ /g, '-');

    if (list.length == 1) {
      addListTitle(listTitle, list[0]['main_title'].trim(), list[0]['subtitle'], list[0]['img'], list[0]['next_id'], res);
      createListToFeed(listTitle, list[0]['main_title'].trim(), 0);
    } else {
      var mainEl = list[0];
      list.splice(0, 1);
      //console.log(mainEl);
    
      db.collection(listTitle).insertMany(list, (err, result) => {
        if (err) { 
          res.send({ 'error': 'An error has occurred' }); 
        } else {
          //  res.send(result.ops[0]);
          //console.log(req.body);
          addListTitle(listTitle, mainEl['main_title'].trim(), mainEl['subtitle'], mainEl['img'], mainEl['next_id'], res);
        }
      });
      createListToFeed(listTitle, mainEl['main_title'].trim(), list.length);
    }
  });

  function addListTitle(mTitle, dTitle, subtitle, img, nextId, res) {
    const item = { 'mongo_title': mTitle, 'display_title': dTitle, 'subtitle': subtitle, 'img': img, 'active': 0, 'next_id': nextId };
    db.collection('all-lists').insert(item, (err, result) => {
      if (err) {
        res.send({ 'error': 'An error has occurred' });
        console.log("List titles not added");
      } else {
        //res.send(result.ops[0]);
	res.status(200).send();
        console.log("List titles added");
      }
    });

  }

  function createListToFeed(mTitle, dTitle, numItems) {
    const time = getTime();
    const item = {'collection': mTitle, 'title': dTitle, 'numItems': numItems, 'time': time};

    db.collection('feed').insert(item, (err, result) => {
        if (err) {
          console.log("upload to feed unsuccessful");
          // res.send({ 'error': 'An error has occurred' });
        } else {
          console.log("upload to feed successful: added "  + numItems + " items");
          // res.send(result.ops[0]);
        }
    }); 
  }

})

function getTime() {
    var fullTime = new Date().getTime();
    var fullTimeStr = new Date(fullTime);
    var date = fullTimeStr.toString().split(' ').splice(1,3).join(' ');
    var time = fullTimeStr.toString().split(' ')[4].split(':').splice(0,2);
    // console.log(time)
    if (time[0] > 12) {
      time[0] -= 12
      time = time.join(':') + " pm";
    } else if (time[0] == 12)
      time = time.join(':') + " pm";
    else
      time = time.join(':') + " am";

    return date + " " + time + " EST";
    // return fullTimeStr.toString();
}

module.exports = router
