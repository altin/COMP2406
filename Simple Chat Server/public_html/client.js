/*
	COMP 2406A (Winter 2017): Assignment #3 - Altin Rexhepaj
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

$(document).ready(function() {
    var username = prompt('Type a username') || 'User';

    var socket = io(); // connect to the socket
    socket.on('connect', function() {
        socket.emit('intro', username);
    });

    $('#messageBar').keypress(function(ev) {
        // on 'enter' button
        if (ev.which === 13) {
            // send message to this socket
            socket.emit('message', $(this).val());
            ev.preventDefault();
            $('#chatLog').append((new Date()).toLocaleTimeString() + ", " + username + ": " + $(this).val() + "\n");
            // clear the message bar
            $(this).val("");
        }
    });
	
	// Provided by professor for easy scrolling
    socket.on('message', function(data) {
        $('#chatLog').append(data + "\n");
        $('#chatLog')[0].scrollTop = $('#chatLog')[0].scrollHeight; // Scroll to the bottom
    });

    socket.on('activeUsers', function(data) {
        $('#activeUsers').empty();

        for (var i = 0; i < data.length; i++) {
            // create a p tag with an id set to the client username
            var currUser = "<p id=" + '"' + data[i] + '">' + data[i] + "</p>";
            $('#activeUsers').append(currUser);

            $('#activeUsers p#' + data[i]).dblclick(function(ev) {
                var userClicked = ev.target.id; // Obtain the clicked li's id (which is the username)

                // if the 'shift' key is pressed while double clicking
                if (ev.shiftKey) {
                    // create a strike-through on the current users name if blocked
                    $(this).toggleClass("blockedUser");
                    var user = {
                        username: userClicked
                    };
                    // tell the socket to block this user through the blockUser event
                    socket.emit("blockUser", user);
                } else if (ev.ctrlKey) {
                    var privateMessage = prompt("Message: ");

                    // send only non-empty private messages
                    if (privateMessage !== "" && privateMessage) {
                        var privateMessageObj = {
                            username: userClicked,
                            message: privateMessage
                        };
                        socket.emit("privateMessage", privateMessageObj);
                    }
                }
            });
        }
        console.log(data);
    });

    // receiving private message
    socket.on('privateMessage', function(data) {
        var reply = prompt("From: " + data.from + "\nMessage: " + data.message);

        if (reply !== "" && reply) {
            var privateMessageObj = {
                username: data.from,
                message: reply
            };
            socket.emit('privateMessage', privateMessageObj);
        }
    });
});