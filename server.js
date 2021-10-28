//jshint esversion:6
// Load Node modules
const express = require('express');
const ejs = require('ejs');
// Initialize Express

const app = express();

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
const findOrCreate = require('mongoose-findorcreate');
// Include environment variable package for port, email and password
const dotenv = require("dotenv");
dotenv.config();
// process.env.GOOGLE_OAUTH_CLIENT_ID
// process.env.GOOGLE_OAUTH_CLIENT_SECRET
// http://localhost:3000/auth/google/secrets
// process.env.FACEBOOK_OAUTH_CLIENT_ID
// process.env.FACEBOOK_OAUTH_CLIENT_SECRET
// http://localhost:3000/auth/facebook/secrets
// process.env.SESSION_SECRET
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
// express-session is a middleware
const passport = require('passport');
// passport-local-mongoose salts and hashes user password
const passportLocalMongoose = require('passport-local-mongoose');
// passport-local is a dependency needed by passport-local-mongoose
// but we dont need to create a separate constant for that such as
// const passportLocal = require('passport-local');
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
app.use(bodyParser.urlencoded({extended: true}));

// Render static files
app.use(express.static(__dirname + '/public'));
// Set the view engine to ejs
app.set('view engine', 'ejs');

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
// This section will use express-session. It should be before all app.use methods
// but above mongoose connect.
app.use(session({
    // This secret will be stored in environmental variable.
    // You do not want to expose this to the public.
    // It means if the secret is invalid, then the session is invalid as well.
    // SESSION_SECRET is saved as Our little secret.
    // I give it here because this is a test server.
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // After a day, the cookie will be deleted.
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day in total
        // Do not send secure true if it is not an https server.
        // secure: true,
    }
}));
app.use(passport.initialize());
app.use(passport.session());
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

main().catch((err) => console.log(err));

async function main() {
    await mongoose.connect('mongodb://localhost:27017/googleApiDB', { useNewUrlParser: true });
}

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
// passport-local-mongoose is a Mongoose plugin.
// googleId section is to prevent userID to be created again on DB
// when login page for google prompted.
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

const User = mongoose.model('User', userSchema);

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
// This section comes from passport package
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // This is added here for future proofing
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    // findOrCreate is not a function in mongoose, you need to install package
    // called mongoose-findorcreate
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
passport.deserializeUser(function(user, done) {
    done(null, user);
});
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


app.get('/', (req, res) => {
    res.render('home');
});

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
});
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
app.get('/logout', (req, res) => {
    // logout() method comes from passport package.
    req.logout();
    res.redirect('/');
});
app.get('/secrets', (req, res) => {
    if(req.isAuthenticated()) {
        res.render('secrets');
        // req.session comes from espress-session package.
        // It gives out info about session created in server side.
        console.log(req.session);
    } else {
        res.redirect('/login');
    }
});
app.post('/register', (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, user) => {
      if(err) {
          console.err(err);
          res.redirect('/register');
      } else {
          passport.authenticate('local')(req, res, () => {
            res.redirect('/secrets');
          });
      }
    });
});
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

// Do not use findOne method with 2 parameters, this is not how it is documented.
// Use only email or password instead. See below app.post code for more details
// on how to use both values to validate if a user registered and entered correct password,
// used wrong password or never registered.

// app.post('/login', (req, res) => {
//     const email = req.body.username;
//     const password = req.body.password;

//     User.findOne({email: email, password: password}, (err, user) => {
//         if(err) {
//             console.error(err);
//         } else {
//             if(user){
//                 console.log('You are already registered!');
//                 res.render('secrets');
//             } else {
//                 console.error('You are never registered!');
//             }
//         }
//     });
// });

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
app.post('/login', (req, res) => {
    const user = new User({
    email: req.body.username,
    password: req.body.password 
    });

    // this method comes from passport
    req.login(user, (err) => {
        if(err) {
            console.error(err);
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            });
        }
    });
});
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

// Port website will run on
const port = 3000;
app.listen(port, function() {
	console.log(`Server is running on port ${port}`);
});

