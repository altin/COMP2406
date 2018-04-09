/*
	COMP 2406A (Winter 2017): Assignment #3 - Altin Rexhepaj
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

// load modules
var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var url = require('url');
const ROOT = "./public_html";

// create and listen http server in port 2406
http.listen(2406);
console.log("Chat server listening on port 2406");

// handler for incoming requests
function handler(req, res) {
    var urlObj = url.parse(req.url, true);
    var pathname = urlObj.pathname;
    var filename = ROOT + pathname;

    fs.stat(filename, function(err, stats) {
        if (err) {
            res.writeHead(404);
            res.end();
        } else {
            if (stats.isDirectory()) {
                filename += "/index.html";
            }
            fs.readFile(filename, "utf8", function(err, data) {
                if (err) {
                    res.writeHead(500);
                    return res.end("Error loading " + filename);
                } else {
                    res.writeHead(200);
                    res.end(data);
                };
            });
        }
    });
};

// global users object
var clients = [];

io.on("connection", function(socket) {
    console.log("New connection");

    // on the initial connection of a user, build their server side client object
    socket.on("intro", function(data) {
        socket.username = data;
        socket.blockedUsers = [];
        clients.push(socket);
        socket.broadcast.emit("message", timestamp() + ": " + socket.username + " has entered the chatroom.");
        socket.emit("message", "Welcome, " + socket.username + ".");
        io.emit("activeUsers", getUsers());
    });

    socket.on("message", function(data) {
        console.log("New message: " + data);

        // messages will only appear to users who are unblocked
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].username != socket.username &&
                clients[i].blockedUsers.indexOf(socket.username) === -1) {
                clients[i].emit("message", timestamp() + ", " + socket.username + ": " + data);
            }
        }
    });

    // private messaging
    socket.on("privateMessage", function(data) {
        console.log("privateMessage: " + JSON.stringify(data));

        // this only allows the communication of unlocked users
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].username === data.username &&
                socket.blockedUsers.indexOf(data.username) === -1 &&
                clients[i].blockedUsers.indexOf(socket.username) === -1) {
                clients[i].emit("privateMessage", {
                    from: socket.username,
                    message: data.message
                });
                break;
            }
        }
    });

    // blocking a user
    socket.on("blockUser", function(data) {
        console.log("blockUser: " + JSON.stringify(data));

        // unblock the user if they are already blocked
        if (socket.blockedUsers.indexOf(data.username) > -1) {
            console.log("Unblocked " + data.username);
            socket.blockedUsers.splice(socket.blockedUsers.indexOf(data.username), 1);
            socket.emit("message", "Unblocked " + data.username + ".");
        } // if they aren't on the block list, then block them
        else {
            console.log("Blocking: " + data.username);
            socket.emit("message", "Blocked " + data.username + ".");
            socket.blockedUsers.push(data.username);
        }
    });

    // when a client disconnects
    socket.on("disconnect", function() {
        clients = clients.filter(function(ele) {
            return ele !== socket;
        });

        console.log(socket.username + " disconnected.");
        io.emit("message", timestamp() + ": " + socket.username + " disconnected.");
        io.emit("activeUsers", getUsers(socket));
    });
});

function getUsers() {
    var activeUsers = [];
    for (var i = 0; i < clients.length; i++) {
        activeUsers.push(clients[i].username);
    }
    return activeUsers;
}

function timestamp() {
    return new Date().toLocaleTimeString();
}