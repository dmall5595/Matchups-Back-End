// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

// load up the user model
var User            = require('../app/models/user');

var bcrypt   	    = require('bcrypt-nodejs');

// expose this function to our app using module.exports
module.exports = function(passport, db) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        db.collection('users').findOne({ '_id' :  id }, function(err, user) {
        //User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        // console.log(db);
        db.collection('users').findOne({ 'email' :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            } else {

                // if there is no user with that email
                // create the user
                var newUser            = {};

                // set the user's local credentials
                newUser.email    = email;
                newUser.password = generateHash(password);

                // save the user
                db.collection('users').insert(newUser, (err, result) => {
                  if (err)
            	    throw err;
 		  return done(null, newUser);
                });
                
 	 	/*newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });*/
            }

        });    

        });

    }));

};

function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

function validatePassword(password) {
  return bcrypt.compareSync(password, this.local.password);
}

