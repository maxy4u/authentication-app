// Require deps
var express = require('express');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var fs = require('fs');
var tokenBase = {};

// Database
var dbFile = './user.json';
var personalDB = './user-personal.json';
if (fs.existsSync(__dirname + '/user.local.json')) {
  dbFile = './user.local.json';
}
var user = require(dbFile);
var userPassword = user.password;
delete user.password;

// setup server
var app = express();

app.use(bodyParser());

// setup jwt
var jwtSuperSecretCode = 'super-secret-key';
var validateJwt = expressJwt({secret: jwtSuperSecretCode});
// serve app from server
app.use(express.static('../frontend'));
app.use('/', function (req, res, next) {
  if (req.originalUrl === '/login') {
    next();
  } else {
    if(req.query && req.query.hasOwnProperty('access_token')) {
      req.headers.authorization = 'Bearer ' + req.query.access_token;
    }
    validateJwt(req, res, next);
  }
});


// setup cors
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  next();
});


// setup passport
passport.use(new LocalStrategy(function(username, password, done) {
  if (username === user.username && password === userPassword) {
    return done(null, user);
  } else {
    done(null, false, { message: 'Incorrect username or password' });
  }
}));

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(username, done) {
  if (username === user.username) {
    done(null, user);
  } else {
    done('No user with username ' + username);
  }
});

app.use(passport.initialize());



// setup routes
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.json(404, 'No user found...');
    }
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      var token = jwt.sign({
        username: user.username
      }, jwtSuperSecretCode);
	  tokenBase[user.username] = 'Bearer ' +token; // smartmove
      return res.json(200, { token: token, user: user });
    });
  })(req, res, next);
});

app.get('/logout', function(req, res) {
  req.logout();
  res.json(200, { success: true });
});

app.get('/users/me', function(req, res) {
  if (req.user) {
    res.json(user);
  } else {
    res.json(403, { message: 'Not authorized' });
  }
});
app.get('/personal',function(req,res){
	 // How smart
	console.log(req.headers)
	console.log(req.user);
	console.log("Received Token :- " + req.headers.authorization) 
    console.log("Token we got :- " + tokenBase[req.user.username])
	if (req.headers.authorization === tokenBase[req.user.username]) {
    res.status(200).json({"favoriteIceCream":"Vanilla","bigSecret":"That is Secret",});
  } else {
    res.json(403, { message: 'Not authorized' });
  }
})
var funnyPicIndex = Math.floor(Math.random()*12);
function getNextFunnyPic() {
  console.log(funnyPicIndex	);
  funnyPicIndex++;
  if (funnyPicIndex > 12) {
    funnyPicIndex = 0;
  }
  return __dirname + '/funny-pics/' + funnyPicIndex + '.jpg';
}

app.get('/funny-pic', function(req, res) {
  if (req.user) {
    res.sendfile(getNextFunnyPic());
  } else {
    res.json(403, { message: 'Not authorized' });
  }
});

// listen on port
var server = app.listen(3000, function() {
  var addy = server.address();
  console.log('Server listening at: ', addy.address + ':' + addy.port);
});
