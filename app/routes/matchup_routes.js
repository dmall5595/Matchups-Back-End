// routes/matchup_routes.js

var ObjectId = require('mongodb').ObjectId;
var jwt      = require('jsonwebtoken');
var bcrypt   = require('bcrypt-nodejs');

module.exports = function(app, db, passport) {
  app.get('/matchups/:id', (req, res) => {
    db.collection(req.params.id).find().toArray(function(err, result) {
      if (err) throw err;
      result.sort(compare)
      res.send(result)
    });
  });

  app.get('/list-info/:id', (req, res) => {
    const details = { "mongo_title": req.params.id };
    db.collection("all-lists").find(details).toArray(function(err, result) {
      if (err) throw err;
      res.send(result)
    });
  });

  app.get('/all-lists', (req, res) => {
    db.collection("all-lists").find().toArray(function(err, result) {
      if (err) throw err;
      result.sort(function(a, b){
        return a.display_title == b.display_title ? 0 : +(a.display_title > b.display_title) || -1;
      });
      res.send(result)
    });
  });

  app.get('/feed', (req, res) => {
    db.collection('feed').find().toArray(function(err, result) {
      if (err) throw err;
      result.reverse()
      result.splice(500, result.length-500);
      res.send(result)
    });
  });

  // process the signup form
  /*app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));*/

  // route to authenticate a user (POST http://localhost:8080/api/authenticate)
  app.post('/signin', function(req, res) {

    // find the user
    //db.User.findOne({ name: req.body.name }, function(err, user) {
    db.collection('users').findOne({ 'username' :  req.body.username }, function(err, user) {

      if (err) throw err;

      if (!user) {
        res.json({ success: false, message: 'Authentication failed. User not found.' });
      } else if (user) {

        // check if password matches
        if (!validatePassword(req.body.password, user.password)) {
          res.json({ success: false, message: 'Authentication failed. Wrong password.' });
        } else {

          // if user is found and password is right
          // create a token with only our given payload
          // we don't want to pass in the entire user since that has the password
          const payload = {
            admin: true
             
          };
          var token = jwt.sign(payload, 'baller', {
            expiresIn: 1440 // expires in 24 hours
          });

          // return the information including token as JSON
          res.json({
            success: true,
            message: 'Enjoy your token!',
            token: token,
            username: user.username,
   	    id: user._id,
            email: user.email
          });
        }   

      }

    });
  });

  app.post('/signup', function(req, res) {

    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    // console.log(db);
    db.collection('users').findOne({ 'email' :  req.body.email }, function(err, user) { // gotta check username
      // if there are any errors, return the error
      if (err) throw err;

      // check to see if theres already a user with that email
      if (user) {
        res.json({ success: false, message: 'Signup failed. User already exists.' });
      } else {

        // if user is found and password is right
        // create a token with only our given payload
        // we don't want to pass in the entire user since that has the password
        const payload = {
          admin: true
        };
        var token = jwt.sign(payload, app.get('superSecret'), {
          expiresIn: 1440 // expires in 24 hours
        });

        // if there is no user with that email
        // create the user
        var newUser            = {};

        // set the user's local credentials
        newUser.email    = req.body.email;
        newUser.password = generateHash(req.body.password);
	newUser.username = req.body.username;
	// newUser.id       = 2;

        // save the user
        db.collection('users').insert(newUser, (err, result) => {
          if (err) throw err;
          res.json({ success: true, user: newUser, token: token });
        });

      }

    });

  });

  function generateHash(password) {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  function validatePassword(pw1, pw2) {
    return bcrypt.compareSync(pw1, pw2);
  }

  /*app.get('/update-ting', (req, res) => {

    db.collection("players").find().snapshot().forEach(
    function (elem) {
        db.collection("players").update(
            {
                _id: elem._id
            },
            {
                $set: {
                    sub_title_val: elem.position
                }
            }
        );
     // res.send(true);
     }
     );

  });*/

  // app.get('/notes/:id', (req, res) => {
  //   const id = req.params.id;
  //   const details = { '_id': new ObjectID(id) };
  //   db.collection('aPlayers').findOne(details, (err, item) => {
  //     if (err) {
  //       res.send({'error':'An error has occurred'});
  //     } else {
  //       res.send(item);
  //     } 
  //   });
  // });

  app.post('/matchups', (req, res) => {
    var list = req.body['foo'];
    var username = req.body['user'];
    const listTitle = list[0]['main_title'].trim().toLowerCase().replace(/ /g, '-');
    
    if (list.length == 1) {
      addListTitle(listTitle, list[0]['main_title'].trim(), list[0]['subtitle'], list[0]['img'], list[0]['next_id'], res);
      createListToFeed(listTitle, list[0]['main_title'].trim(), 0, username);
    } else {
      var mainEl = list[0];
      list.splice(0, 1);
      // console.log(mainEl);
    
      db.collection(listTitle).insertMany(list, (err, result) => {
        if (err) { 
          res.send({ 'error': 'An error has occurred' }); 
        } else {
          //  res.send(result.ops[0]);
          // console.log(req.body);
          addListTitle(listTitle, mainEl['main_title'].trim(), mainEl['subtitle'], mainEl['img'], mainEl['next_id'], res);
        }
      });
      createListToFeed(listTitle, mainEl['main_title'].trim(), list.length, username);
    }
  });

  function addListTitle(mTitle, dTitle, subtitle, img, nextId, res) {
    const item = { 'mongo_title': mTitle, 'display_title': dTitle, 'subtitle': subtitle, 'img': img, 'active': 0, 'next_id': nextId };
    db.collection('all-lists').insert(item, (err, result) => {
      if (err) {
        res.send({ 'error': 'An error has occurred' });
        console.log("List titles not added");
      } else {
        res.send(result.ops[0]);
        console.log("List titles added");
      }
    });

  }

  function createListToFeed(mTitle, dTitle, numItems, username) {
    const time = getTime();
    const item = {'collection': mTitle, 'title': dTitle, 'numItems': numItems, 'time': time, 'username': username};

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

  app.post('/add-item', (req, res) => {
    var list = req.body['foo'];
    var username = req.body['user'];
    const listTitle = list[0]['main_title']; // .trim().toLowerCase().replace(/ /g, '-');

    const item = list[1]

    db.collection(listTitle).insert(item, (err, result) => {
        if (err) {
          res.send({ 'error': 'An error has occurred' });
        } else {
          // res.send(result.ops[0]);
          // console.log(req.body);
          var newId = item['id'] += 1
	  updateId(listTitle, newId, res);
 	  addItemFeed(listTitle, item['main_title'], username);
          // addListTitle(listTitle, mainEl['main_title'].trim(), mainEl['img'], mainEl['next_id'], res);
          // update next id
        }
      });

  });

  function addItemFeed(listTitle, item, username) {
    // need list title, link, and item
    var title;

    db.collection('all-lists').findOne({'mongo_title': listTitle}, function(err, result) {
      if (err) throw err;
      title = result['display_title'];
      addItemFeedHelper(listTitle, title, item, username);
    });
  }

  function addItemFeedHelper(listTitle, title, itemName, username) {

    var time = new Date().getTime();
    var date = new Date(time);
    var splitD = date.toString().split(' ').splice(1,4).join(' ');
    var time1 = getTime();

    const item = { 'collection': listTitle, 'title': title, 'item1': itemName, 'time': time1, 'username': username };

    db.collection('feed').insert(item, (err, result) => {
        if (err) {
          console.log("upload to feed unsuccessful");
          // res.send({ 'error': 'An error has occurred' });
        } else {
          console.log("upload to feed successful");
          // res.send(result.ops[0]);
        }
    });

  }

  function updateId(mongoTitle, newId, res) {

    const details = { 'mongo_title': mongoTitle };
    const newIdBody = { $set: {'next_id': newId} };

    db.collection('all-lists').findOneAndUpdate(details, newIdBody, (err, result) => {
      if (err) {
          //res.send({'error':'An error has occurred'});
          console.log(err);
      } else {
          // console.log(result);
          res.send(result);
          // otherPut(req, res, el1['score1'], err1)
      }
    });

  }

  // app.delete('/notes/:id', (req, res) => {
  //   const id = req.params.id;
  //   const details = { '_id': new ObjectID(id) };
  //   db.collection('notes').remove(details, (err, item) => {
  //     if (err) {
  //       res.send({'error':'An error has occurred'});
  //     } else {
  //       res.send('Note ' + id + ' deleted!');
  //     } 
  //   });
  // });

  app.put('/matchups/:id', (req, res) => {
    // res.send(req.body);

    const el1 = req.body['foo'][0]
    const details1 = { 'id': el1['id1'] };
    const newScore1 = { $set: {score: el1['score1'], numVotes: el1['newVote1']} };
    
    db.collection(req.params.id).findOneAndUpdate(details1, newScore1, (err1, result1) => {
      if (err1) {
          //res.send({'error':'An error has occurred'});
          console.log(err1)          
      } else {
          //res.send(newScore1);
          otherPut(req, res, el1['score1'], err1)
      } 
    }); 
    addToFeed(req.params.id, el1['id1'], req.body['foo'][1]['id2'], req.body['user']);
  }); 

  function otherPut(req, res, newScore1, err1) {
    const el2 = req.body['foo'][1]
    const details2 = { 'id': el2['id2'] };
    const newScore2 = { $set: {score: el2['score2'], numVotes: el2['newVote2']} };
    
    db.collection(req.params.id).findOneAndUpdate(details2, newScore2, (err2, result2) => {
      if (err1 || err2) {
          res.send({'error':'An error has occurred'});
          console.log(err2)          
      } else {
          res.send({"result": "New scores " + newScore1.toString() + " and " + el2['score2'].toString()});
      } 
    });
  }

  function addToFeed(collection, id1, id2, username) {
    var title;
    var item1;
    var item2;
  
    db.collection('all-lists').findOne({'mongo_title': collection}, function(err, result) {
      if (err) throw err;
      title = result['display_title'];
    });
 
    db.collection(collection).findOne({'id': id1}, function(err, result) {
      if (err) throw err;
      item1 = result['main_title'];
    });
    
    db.collection(collection).findOne({'id': id2}, function(err, result) {
      if (err) throw err;
      item2 = result['main_title'];
      // itemsToFeed(collection, title, item1, item2);
    });

    function checkIfDone() {
      if (!(title && item1 && item2)) {
        setTimeout(checkIfDone, 50);//wait 50 millisecnds then recheck
        return;
      }
      itemsToFeed(collection, title, item1, item2, username);
    }
    checkIfDone();
  }

  function itemsToFeed(collection, title, item1, item2, username) {

    var time = new Date().getTime();
    var date = new Date(time);
    var splitD = date.toString().split(' ').splice(1,4).join(' ');
   
    const time1 = getTime()
    const item = { 'collection': collection, 'title': title, 'item1': item1, 'item2': item2, 'time': time1, 'username': username};

    db.collection('feed').insert(item, (err, result) => {
        if (err) {
          console.log("upload to feed unsuccessful");
          // res.send({ 'error': 'An error has occurred' });
        } else {
          console.log("upload to feed successful: "  + item1 + " > " + item2);
          // res.send(result.ops[0]);
        }
    });

  }

  function compare(a,b) {
    if (Number(a.score) < Number(b.score))
      return 1;
    if (Number(a.score) > Number(b.score))
      return -1;
    return 0;
  }

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

};
