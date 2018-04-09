/*
	COMP 2406A (Winter 2017): Assignment #4 - Altin Rexhepaj (101000622)
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

var fs = require('fs');
var url = require('url');
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongo = require('mongodb').MongoClient;
const ROOT = "./public";

// checks if a user is correctly authenticated
var authenticated = false;

app.set('views', './views');
app.set('view engine', 'pug');

// rout for static file requests from /public
app.use('/public/', express.static('public'));

app.listen(2406, function() {
    console.log("Server listening on port 2406");
});

app.use(function(req, res, next) {
    console.log(req.method + " request for " + req.url);
    next();
});

app.get(['/', '/index'], cookieParser(), function(req, res) {
    mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
        if (err) {
            // couldn't connect to database, send 500 error code
            res.sendStatus(500);
        } else {
            db.collection("users").findOne({
                username: req.cookies.username
            }, function(err, user) {
                if (user && user.auth === parseInt(req.cookies.token)) {
                    console.log("Client logged in.");
                    authenticated = true;
                    res.render('index', {
                        user: {
                            username: req.cookies.username,
                            auth: user.auth
                        }
                    });
                } else {
                    console.log("Client not logged in.");
                    res.render('index', {});
                }
            });
        }
        db.close();
    });
});

app.get('/recipes', cookieParser(), function(req, res) {
    var recipes = {
        names: []
    };

    // check that the user is logged in before retreiving recipes
    if (authenticated) {
        // connect to database
        mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
            // if it doesnt exist, print an error statement
            if (err) {
                console.log("Failed to establish database connection.");
            }
            else {
                console.log("Established database connection.");
                // fetch the collection specific to the user logged in (e.g recipes.bob)
                var collection = db.collection("recipes." + req.cookies.username);
                var cursor = collection.find();
                cursor.each(function(err, obj) {
                    // if recipe doesnt exist, close the connection and return the current recipe obj
                    if (obj === null) {
                        db.close();
                        res.send(recipes);
                    } else {
                        // push the recipe name into the object
                        recipes["names"].push(obj["name"]);
                    }
                });
            }
        });
    }
});

app.get('/recipe/:recipeName', cookieParser(), function(req, res) {
    var name = req.params.recipeName;
    var recipes;

    // if a no-named recipe is requested, return a 404 status, otherwise, return the recipe
    if (name === "undefined") {
        res.sendStatus(404);
    } else {
        mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
            if (err) {
                console.log("Failed to establish database connection.");
            }
            else {
                var collection = db.collection("recipes." + req.cookies.username);
                var cursor = collection.find();
                cursor.each(function(err, obj) {
                    if (obj === null) {
                        db.close();

                        if (recipes["name"] !== "") {
                            res.send(recipes);
                        } else {
                            res.sendStatus(404);
                        }
                    } else if (obj["name"] === name) {
                        recipes = obj;
                        delete recipes["_id"];
                        recipes.duration = parseInt(recipes.duration);
                    }
                });
            }
        });
    }
});

app.post('/recipe', bodyParser.urlencoded({extended: true}), cookieParser(), function(req, res) {
    // get rid of underlines to match the recipe name in the DB
    req.body.name = req.body.name.split("_").join(" ");

    // if the name is empty, send 400 bad-code
    if (req.body.name === "") {
        res.sendStatus(400);
    } else {
        mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
            if (err) {
                console.log("Failed to establish database connection.");
            }
            else {
                console.log("Established database connection");
                var collection = db.collection("recipes." + req.cookies.username);;
                // insert if exists, otherwise update it
                collection.update({name: req.body.name}, req.body, {upsert: true, w: 1}, function(err, result) {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        console.log("Recipe added.");
                        db.close();
                        res.sendStatus(200);
                    }
                });
            }
        });
    }
});

// login route
app.get('/login', function(req, res) {
    res.render('login');
});

// registration route
app.get('/register', function(req, res) {
    res.render('register');
});

// logout route
app.get('/logout', cookieParser(), function(req, res) {
    // deletes all auth information for the user so they arent still logged in
    res.clearCookie('username');
    res.clearCookie('token');
    res.redirect('/');
});

app.use(['/login', '/register'], bodyParser.urlencoded({extended: false}));

app.post('/login', function(req, res) {
    mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
        db.collection("users").findOne({
            username: req.body.username.toLowerCase()
        }, function(err, user) {
            if (err) {
                res.sendStatus(500);
                db.close();
            } else if (!user) {
                console.log("This username couldn't be found!");
                res.render('login', {
                    message: "This username couldn't be found!"
                });
                db.close();
            } else if (user.password !== req.body.password) {
                console.log("You typed the wrong password!");
                res.render('login', {
                    message: "You typed the wrong password!"
                });
                db.close();
            } else {
                var auth = generateAuthToken();
                user.auth = auth;

                db.collection("users").update({
                    _id: user._id
                }, user, function(err, result) {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        console.log("A user has logged in.");
                        generateAuthCookie(user, res);
                        res.redirect("/");
                    }
                    db.close();
                });
            }
        });
    });
});

app.post('/register', function(req, res) {
    mongo.connect("mongodb://localhost:27017/recipeDB", function(err, db) {
        db.collection("users").findOne({
            username: req.body.username.toLowerCase()
        }, function(err, user) {
            if (err) {
                res.sendStatus(500);
                db.close();
            } else if (user) {
                res.render('register', {
                    message: "This username is taken!"
                });
                db.close();
            } else if (req.body.username === "") {
                res.render('register', {
                    message: "Please fill out all fields!"
                });
                db.close();
            } else {
                var user = new Client(req.body.username.toLowerCase(), req.body.password);
                var auth = generateAuthToken();
                user.auth = auth;
                user.recipes = "recipes." + req.body.username;

                db.collection("users").insert(user, function(err, result) {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        console.log("New user has been registered.");
                        generateAuthCookie(user, res);
                        res.redirect("/");
                    }
                    db.close();
                });
            }
        });
    });
});

// creates a random auth token
function generateAuthToken() {
    var min = 999;
    var max = 99999999;

    return Math.floor(Math.random() * (max - min) + min);
}

// creates a client object to be added to the DB
function Client(user, pass) {
    this.username = user;
    this.password = pass;
}

// creates auth cookie for the user (allows to be automatically logged in withn the session age)
function generateAuthCookie(user, res) {
    res.cookie('token', user.auth, {
        path: '/',
        maxAge: 500000
    });
    res.cookie('username', user.username, {
        path: '/',
        maxAge: 500000
    });
}