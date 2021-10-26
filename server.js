//jshint esversion:6
// Load Node modules
const express = require('express');
const ejs = require('ejs');
// Initialize Express

const app = express();

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
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
    secret: 'Our little secret.',
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
    await mongoose.connect('mongodb://localhost:27017/cookiesSessionsDB', { useNewUrlParser: true });
}

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
// passport-local-mongoose is a Mongoose plugin.
userSchema.plugin(passportLocalMongoose);
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

const User = mongoose.model('User', userSchema);

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ==========================================
// ==========================================
// This section comes from passport package
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});
// ==========================================
// ==========================================
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


app.get('/', (req, res) => {
    res.render('home');
});

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

