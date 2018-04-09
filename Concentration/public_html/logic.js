/*
	COMP 2406A (Winter 2017): Assignment #2 - Altin Rexhepaj (101000622)
	Sources: Professor's course notes (Dr. Andrew Runka)
*/

// get username
var user = prompt("Enter a username");
// status of a card: [true]: active, [false]: innactive, [undefined]: matched
var cardState = [];
// amount of match attempts
var attempts = 0;
// levels
var level = 1;

// when the page finishes loading...
$(document).ready(function() {
    // default username
    if (user === "" || !user) {
        user = "User";
    }

    // get request to the /memory/intro route in the server, call startGameO() on success
    $.ajax({
        method: "GET",
        url: "/memory/intro",
        data: {
            'username': user
        },
        success: startGame,
        dataType: 'json'
    });
});

// starts the game (retrieves the board data from server)
function startGame(data) {
    // prints board to console (for cheaters reference)
    console.log(data);

    // clear the board of answers the game starts
    $("#gameboard").empty();

    // show the level in the html
    $('#level').html("Level " + level);

    // show the answers
    $('#showAnswers').one("click", function() {
        for (var i = 0; i < data.gameboard.length; i++) {
            $("#answers").append(data.gameboard[i] + ",");
            if (data.gameboard.length % 2 == 0) {
                $("#answers").append("<br>");
            }
        }
    });

    // lay out the cards on the screen
    var cardPos = 0;
    for (var row = 0; row < data.gameboard.length; row++) {
        $("#gameboard").last().append("<tr id=row" + row + "></tr>");
        for (var col = 0; col < data.gameboard.length; col++) {
            // add each tile to its corresponding row
            $("#row" + row.toString()).append(("<div class='tile' data-index='" + cardPos + "'><span></span></div>"));
            // click handler on each card
            $(".tile").eq(cardPos).click(function() {
                pickCard(data.gameboard.length, $(this).data('index'));
            });
            // push tile state to the cardState array
            cardState.push(false);
            cardPos++;
        }
    }
}

// gets the row that the current card is on
function getRow(length, pos) {
    var row = -1;
    for (var i = 0; i < length * length; i++) {
        if (i % length === 0) {
            row++;
        }

        if (i === pos) {
            return row;
        }
    }
}

// gets the col that the current card is on
function getCol(length, pos, row) {
    return Math.abs(((length * row) - pos) - length);
}

// gets the amount of cards that are active
function getActiveCards() {
    var counter = 0;
    for (var i = 0; i < cardState.length; i++) {
        if (cardState[i] === true) {
            counter++;
        }
    }
    return counter;
}

// gets the number of tiles that have been matched
function getCorrectCards() {
    var counter = 0;
    for (var i = 0; i < cardState.length; i++) {
        if ($(".tile").eq(i).css("background-color") === "rgb(255, 255, 255)") {
            counter++;
        }
    }
    return counter;
}

function pickCard(length, card) {
    var row = getRow(length, card);
    var col = getCol(length, card, row + 1);

    $.ajax({
        method: "GET",
        url: "/memory/card",
        data: {
            'username': user,
            'row': row,
            'col': col
        },
        success: flipCard,
        dataType: 'json'
    });
}

// when a card is flipped, handle the logic
function flipCard(data) {
    var gameboardLength = data.gameboard.length;
    var row = data.row;
    var col = data.col;
    var card = data.card;

    row = parseInt(row);
    col = parseInt(col);

    // position of the card in an array
    var pos = (row * gameboardLength) + col;

    var activeCards = getActiveCards();

    // don't do anything if two cards are currently active
    if (activeCards > 2) {
        return;
    }
    // don't do anything if a matched card is face up
    if (cardState[pos] === undefined) {
        return;
    } // don't do anything if an active card is face up
    else if (cardState[pos] === true) {
        return;
    } // if this is the only face down card
    else if (cardState[pos] === false && activeCards === 0) {
        animation(pos, col, gameboardLength, card);
        cardState[pos] = true;
        return;
    } // match the cards if the second one is active
    else if (cardState[pos] === false && activeCards === 1) {
        // increase attempts
        attempts++;
        // recieve the second cards information
        var secondCardPos = cardState.indexOf(true);
        var secondCardRow = getRow(gameboardLength, secondCardPos);
        var secondCardCol = getCol(gameboardLength, secondCardPos, secondCardRow + 1);
        var secondCard = data.gameboard[secondCardRow][secondCardCol];

        // show the clicked card
        animation(pos, col, gameboardLength, card);
        cardState[pos] = true;

        // if the values of the two cards are the same, this is a matching set
        if (data.card === secondCard && secondCard !== undefined) {
            // set them to their corresponding values to undefined since they match
            cardState[pos] = undefined;
            cardState[secondCardPos] = undefined;

            // check if the game has been won
            var correctCards;
            window.setTimeout(function() {
                correctCards = getCorrectCards();
                // once the user wins, alert them that they won and reset the game with a new difficulty
                if (correctCards === (gameboardLength * gameboardLength)) {
                    // display green text to indicate a win
                    $('#level').css('color', 'green');
                    // set the text in the #level div to Winner!
                    $('#level').html("Winner!");
                    // tell the user the amount of attempts it took them to win
                    $('#guesses').html("It took you " + attempts + " attempts!");
                    // wait for 5 seconds until next round
                    timer(5);
                    window.setTimeout(function() {
                        // reset the #level div back to default text
                        $('#level').css('color', 'white');

                        // empty the divs that aren't needed during gameplay
                        $('#guesses').empty();
                        $('#timer').empty();
                        // empty the answers since a new set will be generated
                        $("#answers").empty();

                        // set the attempts to 0, increase the level and reset game
                        attempts = 0;
                        reset();
                        level++;

                        // make ajax GET request for the level the current client is on
                        $.ajax({
                            method: "GET",
                            url: "/memory/difficulty",
                            data: {
                                'username': user,
                                'correctCards': correctCards
                            },
                            success: startGame,
                            dataType: 'json'
                        });
                    }, 5000);
                }
            }, 300);

            return;
        } else {
            // show cards for 1 second and then make them faced down again
            window.setTimeout(function(event) {
                reverseAnimation(pos, col, gameboardLength);
                reverseAnimation(secondCardPos, secondCardCol, gameboardLength);
                // set the card selected card in the array back to false in cardState
                for (var i = 0; i < cardState.length; i++) {
                    if (cardState[i] === true) {
                        cardState[i] = false;
                    }
                }
            }, 1000);

            return;
        }
    } // If the card is face down and two other cards are active, do nothing
    else if (cardState[pos] === false && activeCards === 2) {
        return;
    }
}

// timer used to count down seconds until next game
function timer(time) {
    if (time > 0) {
        $('#timer').html("Next level in: " + time);
        setTimeout(function() {
            timer(time - 1);
        }, 1000);
    } else {
        $('#timer').empty();
    }
}

// animates card when clicked
function animation(pos, col, gameboardLength, card) {
    $(".tile").eq(pos).animate({
        opacity: 0.5
    });
    window.setTimeout(function() {
        $(".tile").eq(pos).css("background-color", "white"); // R2.5)
        $(".tile span").eq(pos).text(card);
    }, 150);
}

// reverse the animation once timer is up
function reverseAnimation(pos, col, gameboardLength) {
    // Deal with the specific animation for the card at the end of a row
    $(".tile").eq(pos).animate({
        opacity: 1
    }, 1000);
    // Reset the card's colour back to its unflipped default and set its text value to nothing
    window.setTimeout(function() {
        $(".tile").eq(pos).css("background-color", "rgb(90, 90, 90)");
        $(".tile span").eq(pos).text("");
    }, 200);
}

// resets the status of the cards
function reset() {
    cardState = [];
}