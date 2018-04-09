/*
	COMP 2406A (Winter 2017): Assignment #2 - Altin Rexhepaj (101000622)
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

// load modules
var http = require('http');
var fs = require('fs');
var mime = require('mime-types');
var url = require('url');
var board = require('./makeBoard.js');

const ROOT = "./public_html";

// create http server
var server = http.createServer(handleRequest);
// R1.1)
server.listen(2406);
console.log('Server listening on port 2406');

// global users object
var users = {};

// handler for incoming requests
function handleRequest(req, res) {
    // process the request
    console.log(req.method + " request for: " + req.url);

    // parse the url
    var urlObj = url.parse(req.url, true);
    var pathname = urlObj.pathname;
    var query = urlObj.query;
    var filename = ROOT + urlObj.pathname;

    // page load route
    if (pathname === "/memory/intro") {
        // build the client object
        var username = query.username;
        var gameboard = board.makeBoard(4);
        var client = {
            "gameboard": gameboard,
            "difficulty": 4
        };

        // add the client object to the users dictionary
        users[username] = client;
        respond(200, JSON.stringify(client));
    }
    // card selection route
    else if (pathname === "/memory/card") {
        var user = query.username;
        var row = query.row;
        var col = query.col;
        var selection = users[user].gameboard[row][col];

        // send back the state of the board once a user makes a selection
        var boardState = {
            gameboard: users[user].gameboard,
            row: row,
            col: col,
            card: selection
        };
        respond(200, JSON.stringify(boardState));
    }
    // difficulty handler
    else if (pathname === "/memory/difficulty") {
        var username = query.username;
        var correctCards = parseInt(query.correctCards);

        if (correctCards === (users[username].gameboard.length * users[username].gameboard.length)) {
            users[username].difficulty += 2;
            users[username].gameboard = board.makeBoard(users[username].difficulty);

            var data = JSON.stringify(users[username]);
        }
        respond(200, data);
    }
    // show the index.html
    else {
        fs.stat(filename, function(err, stats) {
            if (err) {
                respondErr(err);
            } else {
                if (stats.isDirectory()) {
                    filename += "/index.html";
                }

                fs.readFile(filename, "utf8", function(err, data) {
                    if (err) {
                        respondErr(err);
                    } else {
                        respond(200, data);
                    }
                });
            }
        });
    }

    // Serves 404 files
    function serve404() {
        fs.readFile(ROOT + "/404.html", "utf8", function(err, data) {
            if (err) respond(500, err.message);
            else respond(404, data);
        });
    }

    // Responds in error, and outputs to the console
    function respondErr(err) {
        console.log("Handling error: ", err);
        if (err.code === "ENOENT") {
            serve404();
        } else {
            respond(500, err.message);
        }
    }

    // sends response message
    function respond(code, data) {
        res.writeHead(code, {
            'content-type': mime.lookup(filename) || 'text/html'
        });
        res.end(data);
    }
};