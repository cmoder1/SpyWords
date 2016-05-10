// Required modules
var fs = require('fs');
var http = require('http'); 
var express = require('express');
var	bodyParser = require('body-parser');
var engines = require('consolidate');
var mongoose = require('mongoose');
var sanitizeHtml = require('sanitize-html');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Prepare variables
var app = express(); 
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', __dirname + '/templates'); // tell Express where to find templates

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// allow access to the scipts and styles for the webpages
app.use('/scripts', express.static('scripts'));
app.use('/styles', express.static('styles'));

// heroku code for setting the port
app.set('port', (process.env.PORT || 8080));

/* ========================================================
 * ================ Connect to Database  ==================
 * ======================================================== */

var db = mongoose.connection;
var gameData = {}; // Small-scale data storage
db.on('error', console.error);
db.once('open', function() {
    // Create your schemas and models here
    //console.log("Connected to DB!");

    /* ========================================================
     * ================  Build Schema/Model  ==================
     * ======================================================== */

    var gameSchema = new mongoose.Schema({
        open: Boolean,
        gameID: String,
        cards: [{ word: String, team: String, guessed: Boolean }],
        numPlayers: Number,
        players: [{ username: String, team: String, role: String }],
        roles: [String],
        order: [String],
        turn: String,
        clueTimer: String,
        guessTimer: String,
        guessCount: Number,
        gameStatus: String,
        blueRemaining: Number,
        redRemaining: Number
    });

    var Game = mongoose.model('Game', gameSchema);

    /* ========================================================
     * =                                                      =
     * =                 Socket Communications                =
     * =                                                      =
     * ======================================================== */

    io.sockets.on('connection', function(socket){


        /* ========================================================
         * ================  Home Screen Sockets  =================
         * ======================================================== */

        // Join the room of home screens
        socket.on('joinHome', function(callback){
            socket.join('Home');
            callback();
        });

        // Check to see if the game exists or is already full
        socket.on('validateName', function(gameID, callback) {
            // Try finding the game data
            var g = gameData[gameID];
            if (g === undefined) {
                // The game doesn't exist, and thus is a valid name and not full
                callback(true, false);
            } else {
                // The game exists and may be full
                callback(false, g.roles.length === 0);
            }

        });

        // Find games that are open to the public and not yet full
        socket.on('findGames', function(callback) {
            findOpenGames(callback);
        });

        // Create a new game with the given settings
        socket.on('createGame', function(gameID, username, claimedRole, numPlayers, clueTime, guessTime, callback) {
            createGame(gameID, claimedRole, numPlayers, clueTime, guessTime, callback);
        });

        // Retrieve the available roles for a game and pass them to a callback
        socket.on('getRoles', function(gameID, callback) {
            var g = gameData[gameID];
            // Call callback with the given game's available roles
            if (g !== undefined) {
                callback(g['roles']);
            }
        });

        // Ensure that there is room in the game to join
        socket.on('joinGame', function(gameID, username, claimedRole, callback) { 
            var g = gameData[gameID];
            if (claimedRole === null || g === undefined) {
                callback(false);
                return;
            }
            callback(g.roles.length !== 0);
        });


        /* ========================================================
         * =================  Game Screen Setup  ==================
         * ======================================================== */


        // Game client waiting for the game to start
        socket.on('waiting', function(gameID, role, username) {

            // Join the room for the given gameID
            socket.join(gameID);
            socket.gameID = gameID;
            socket.role = role;
            socket.username = username;

            var g = gameData[gameID];
            if (g !== undefined) {
                // Your desired role has been taken!
                if (g.roles.indexOf(role) === -1) {
                    socket.role = null;
                    socket.emit('roleTaken');
                    return;
                }

                // Add the player to the game and claim their role
                var p = { username: username, team: role[0], role: role };
                g.players.push(p);
                g.roles.splice(g.roles.indexOf(role), 1);
                
                // Update the home and game clients of this change
                io.sockets.in('Home').emit('roleUpdate', g.gameID, g.roles, g.players);
                io.sockets.in(gameID).emit('newPlayer', role, username);
            }

            // Check to see if all of the roles have been claimed, so the game can start
            if (g !== undefined && g.roles.length === 0) {
                if (g.gameStatus === 'pregame') {
                    g.gameStatus = 'active';
                    io.sockets.in(gameID).emit('startGame', g.turn, g.clueTimer);
                    
                    // If computer is first player have them submit a clue
                    checkComputerTurn(g, g.order[0], null);

                } else if (g.gameStatus === 'active') {

                    //Joining or REFRESHING in the middle of the game
                    var guessedCards = [];
                    for (var i=0; i<g.cards.length; i++) {
                        if (g.cards[i].guessed === true) {
                            guessedCards.push({ index : g.cards[i].index, team : g.cards[i].team });
                        }
                    }
                    var time = g.clueTimer;
                    if (g.turn[1] === 'F') {
                        time = g.guessTimer;
                    }
                    socket.emit('rejoin', g.turn, time, guessedCards);
                }
            }
        });

        // Retrieve all players in a game and pass to callback
        socket.on('getPlayers', function(gameID, callback) {
            var g = gameData[gameID];
            // Pass along players if they exist
            if (g !== undefined) {
                callback(g.players);
            } else {
                callback(null);
            }
        });

        // Add a robot player to the game
        socket.on('setRobotPlayer', function(role, callback) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            //callback();

            // Add the computer player and submit update
            var p = { username: 'Computer', team: role[0], role: role };
            g.players.push(p);
            g.roles.splice(g.roles.indexOf(role), 1);
            g.order.human[g.order.indexOf(role)] = false;
            io.sockets.in('Home').emit('roleUpdate', g.gameID, g.roles);
            io.sockets.in(gameID).emit('newPlayer', role, 'Computer');

            // Start the game if the robot fills the game
            if (g !== undefined && g.roles.length === 0) {//g.players.length == g.numPlayers) {//clients.length === 4) {
                if (g.gameStatus === 'pregame') {
                    g.gameStatus = 'active';
                    io.sockets.in(gameID).emit('startGame', g.turn, g.clueTimer);
                }

                // If computer is first player have them submit a clue
                checkComputerTurn(g, g.order[0], null);
            }
        });


        /* ========================================================
         * =================  Game Play Control  ==================
         * ======================================================== */


        socket.on('validateClue', function(clue, num, callback) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            var valid = 'valid';
            if (num > 0 && clue.split(' ').length === 1 && clue.split(' ').join('') !== '') {
                if (clue.match('[A-Za-z]*')[0] !== clue) {
                    valid = "The clue can only contain letters of the alphabet";
                }
                var cards = g.cards;
                for (var i=0; i<cards.length; i++) {
                    if (!cards[i].guessed) {
                        var w = cards[i].word.toLowerCase();
                        var c = clue.toLowerCase();
                        if (w.match('.*'+c+'.*') !== null || c.match('.*'+w+'.*') !== null) {
                            valid = "You're clue can't be a part of any unguessed card";
                        }
                    }
                }
                callback(valid);
            } else {
                if (clue.split(' ').length !== 1 || clue.split(' ').join('') === '' ) {
                    callback('Your clue must consist of a single word');
                } else {
                    callback('number');
                }
            }
        });

        function checkComputerTurn(g, role, clue) {
            //console.log('RED: '+g.redRemaining);
            //console.log('BLUE: '+g.blueRemaining);
            if (g.redRemaining === 0 || g.blueRemaining === 0) {
                g.gameStatus = 'gameOver';
            }
            if (g.gameStatus === 'gameOver') {
                return;
            }
            if (!g.order.human[g.order.indexOf(role)]) {
                if (role[1] === 'S') {
                    computerClue(g, role);
                } else {
                    computerGuess(g, role, clue);
                }
            }
        }

        function computerGuess(g, role, clue) {
            var unguessedWords = [];
            var gameID = g.gameID;
            for (var i=0; i<g.cards.length; i++) {
                if (g.cards[i].guessed === false) {
                    unguessedWords.push(g.cards[i].word);
                }
            }
            //console.log('COMPUTER GUESSING...');

            // It's the computer's time to shine!
            guessClue(clue.split(" ")[0], unguessedWords, function(guesses, words) {
                guesses.sort(function(a, b) {
                    return b.prob - a.prob;
                });
                //console.log(guesses);
                var keepGuessing = true;
                var index = 0;
                while (keepGuessing) {
                    var guess = guesses[index].word;
                    var cardTeam = '';
                    var wordIdx = -1;
                    var cardsLeft = [];
                    for (var i=0; i<g.cards.length; i++) {
                        if (g.cards[i].word.toLowerCase() === guess.toLowerCase().replace('_', ' ')) {
                            cardTeam = g.cards[i].team;
                            wordIdx = g.cards[i].index;
                        }
                        if (g.cards[i].guessed === false) {
                            cardsLeft.push(g.cards[i]);
                        }
                    }
                    if (wordIdx === -1) {
                        var c = cardsLeft[Math.floor(Math.random() * cardsLeft.length)];
                        wordIdx = c.index;
                        guess = c.word;
                        cardTeam = c.team;
                    }

                    if (cardTeam === 'R') {
                        g.redRemaining--;
                    } else if (cardTeam === 'B') {
                        g.blueRemaining--;
                    }
                    g.guessCount++;
                    var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
                    //var cardTeam = g.cards[wordIdx].team;
                    g.cards[wordIdx].guessed = true;
                    //console.log('Guess '+g.guessCount+' of '+clue.split(' ')[1]+': '+guess);
                    if (clue.split(' ')[1]*1 === g.guessCount || role[0] !== cardTeam) {
                        g.turn = nextRole;
                        if (cardTeam === 'assassin') {
                            g.gameStatus = 'gameOver';
                        }
                        io.sockets.in(gameID).emit('lastGuess', wordIdx, cardTeam, role, nextRole, g.clueTimer);
                        keepGuessing = false;
                        checkComputerTurn(g, nextRole, null);
                    } else {
                        io.sockets.in(gameID).emit('newGuess', wordIdx, cardTeam);
                    }
                    index++;
                }
            });
        }

        // Send a clue for the given team
        function computerClue(g, role) {
            var gameID = g.gameID;
            //console.log('COMPUTER CLUE');
            // It's the computer's time to shine! Let's give a clue...
            var team = role[0]; // 'R' or 'B' team

            giveClue(g.cards, team, function(clueWord, posWords) {
                guessClue(clueWord.toLowerCase(), posWords, function(guesses, words) {

                    // Calculate the numeric part of the clue
                    var count = 0;
                    for (var j=0; j<guesses.length; j++) {
                        // Count all the team's words whose association score is above a threshold
                        if (guesses[j].prob >= 0.075) {
                            count++;
                        }
                    }
                    count = Math.max(count, 1);
                    var word = clueWord[0].toUpperCase()+clueWord.substring(1, clueWord.length).toLowerCase();
                    var clue = word + ' ' + count;

                    // Prepare to send the clue to the game clients
                    var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
                    g.guessCount = 0;
                    io.sockets.in(gameID).emit('newClue', clue, role, nextRole, g.guessTimer);
                    checkComputerTurn(g, nextRole, clue);
                    //console.log('Computer clue: ' + clue);
                });
            });
        }

        socket.on('clue', function(clue, role) {
            //console.log(clue);
            var gameID = socket.gameID;
            var g = gameData[gameID];
            var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
            g.guessCount = 0;
            g.turn = nextRole;
            
            //giveClue(g.cards, role[0]);
            //guessClue(clue.split(" ")[0], unguessedWords, submitGuess);
            io.sockets.in(gameID).emit('newClue', clue, role, nextRole, g.guessTimer);
            //console.log(nextRole);
            checkComputerTurn(g, nextRole, clue);

        });

        function sleep(milliseconds) {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > milliseconds){
                    break;
                }
            }
        }

        socket.on('guessWord', function(wordIdx, clue, role) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            
            if (!g.cards[wordIdx].guessed) {
                g.guessCount++;
                var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
                var cardTeam = g.cards[wordIdx].team;
                if (cardTeam === 'R') {
                    g.redRemaining--;
                } else if (cardTeam === 'B') {
                    g.blueRemaining--;
                }

                g.cards[wordIdx].guessed = true;
                //console.log('Guess '+g.guessCount+' of '+clue.split(' ')[1]);
                if (clue.split(' ')[1]*1 === (g.guessCount-1) || role[0] !== cardTeam) {
                    g.turn = nextRole;
                    if (cardTeam === 'assassin') {
                        g.gameStatus = 'gameOver';
                    }
                    io.sockets.in(gameID).emit('lastGuess', wordIdx, cardTeam, role, nextRole, g.clueTimer);
                    checkComputerTurn(g, nextRole, null);
                } else {
                    io.sockets.in(gameID).emit('newGuess', wordIdx, cardTeam);
                }
            }
        });

        socket.on('doneGuessing', function(role) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
            g.turn = nextRole;
            io.sockets.in(gameID).emit('newClue', '&mdash;', role, nextRole, g.clueTimer);
            checkComputerTurn(g, nextRole, null);
        });

        socket.on('revealUnguessedCards', function(callback) {
            var g = gameData[socket.gameID];
            var unguessedCards = [];
            for (var i=0; i<g.cards.length; i++) {
                if (!g.cards[i].guessed) {
                    unguessedCards.push({ team: g.cards[i].team, index: g.cards[i].index });
                }
            }
            callback(unguessedCards);
        });

        socket.on('newGame', function(swap) {

            var gameID = socket.gameID;
            var g = gameData[gameID];

            var num = parseInt(gameID[gameID.length-1]);
            var newID = gameID+'1';

            if (!isNaN(num)) {
                append = (num+1)+'';
                newID = gameID.substr(0, gameID.length-1)+append;
            }
            while (gameData[newID] !== undefined) {
                newID = newID.substr(0, newID.length-1)+(parseInt(newID[newID.length-1])+1);
            }

            createGame(newID, 'BSM', 4, '2:30', '2:30', function(valid) {
                io.sockets.in(gameID).emit('reroute', newID, swap);
                //console.log(newID);
            });  
        });

        socket.on('message', function(user, message) {
            var cleanMessage = sanitizeHtml(message, {
                allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
                allowedAttributes: {
                    'a': [ 'href' ]
                }
            });
            if (cleanMessage.split(" ").join("") !== "") {
                io.sockets.in(socket.gameID).emit('newMessage', user, cleanMessage);
            }
        });

        // the client disconnected/closed their browser window
        socket.on('disconnect', function(){
            // Leave the room!
            var gameID = socket.gameID;
            var g = gameData[gameID];
            console.log(socket.username+" has left "+gameID);
            
            if (g !== undefined && socket.role !== null){
                //console.log('Socket Disconnected');
                g.roles.push(socket.role);
                var i = 0;
                while (i<g.players.length && g.players[i].username !== socket.username) { i++; }
                if (i<g.players.length) { g.players.splice(i,1); }
                var clients = io.sockets.adapter.rooms[gameID];
                if (g.roles.length === g.numPlayers*1 || clients === undefined || clients.length === 0) {
                    delete gameData[gameID];
                    console.log('Deleted game: '+gameID);
                } else {
                    io.sockets.in('Home').emit('roleUpdate', g.gameID, g.roles);
                    io.sockets.in(gameID).emit('newPlayer', socket.role, '-');
                }
            } else if (g !== undefined && g.roles.length === g.numPlayers*1) {
                // Check for spammers
                delete gameData[gameID];
                console.log('Deleted game: '+gameID);
                return;
            }

        });

    });

    /* ========================================================
     * ==================  Go to a Game Page  =================
     * ======================================================== */

    // URL to access a specified chatroom
    app.get('/:gameID/:role/:username', function(request, response){
        //console.log('Creating a game!');
        // Send the user to a game
        var gameID = request.params.gameID;
        var role = request.params.role;
        var username = request.params.username;

        //console.log('GET request for game: '+gameID);

        var g = gameData[gameID];
        if (g === null || g === undefined) {
            //console.log('This game has not been created!');
            createGame(gameID, role, 4, '2:30', '2:30', function(valid) {
                response.redirect('/'+gameID+'/'+role+'/'+username);
            });
        } else {
            console.log(username+" has entered "+gameID);
            var game_data = { gameID: gameID, role: role, username: username, cards: g['cards'] };
            if (role === 'BSM' || role === 'RSM') {
                response.render('spyMaster.html', game_data);
            } else {
                response.render('fieldAgent.html', game_data);
            }
        }
    });

    app.get('/idle', function(request, response){
        response.render('idle.html');
    });
    // Catchall page - Home
    app.get('*', function(request, response){
        // Display the home screen
        response.render('home.html');
    });


    // changed from *app*.listen(8080);
    // to server.listen(8080);

    // Set up the listener and make the table of messages once done
    //server.listen(8080, function() {
    server.listen(app.get('port'), function() {
        console.log('Server is ready!');
    });


});

mongoose.connect('mongodb://cmoder:puddleglum@ds019940.mlab.com:19940/codenames');


/* ========================================================
 * ===================  Read Word Sets  ===================
 * ======================================================== */

function loadWords() {
    filename = "wordSets/codenames_words.txt";
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) throw err;
        return data.split('\n');
    });
}

function generateWords(callback) {
    filename = "wordSets/codenames_words.txt";

    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) throw err;

        var wordSet = data.split('\n');

        var total = wordSet.length;
        var chosenWords = [];

        while (chosenWords.length < 25) {
            var idx = Math.floor(Math.random() * total);
            var word = wordSet[idx];
            if (chosenWords.indexOf(word) == -1) {
                chosenWords.push(word);
            }
        }

        callback(chosenWords);
    });
}

function createGame(gameID, claimedRole, numPlayers, clueTime, guessTime, callback) {
    if (gameData[gameID] !== undefined) {
        //console.log('USED GAME');
        callback(false);
    } else {
        // Generate a set of words for the new game
        generateWords(function(words) {

            // Assemble all of the card data
            var teams = assignCards();
            var card_data = [];
            for (var i=0; i<words.length; i++) {
                card_data.push({ 'word': words[i], 'team': teams[i], 'guessed': false, 'index': i });
            }

            // Establish available roles and turn order
            var order = ['BSM', 'BFA', 'RSM', 'RFA'];
            var roles = ['BSM', 'BFA', 'RSM', 'RFA'];
            var human = [true, true, true, true];
            var turn = 'BSM';
            if (numPlayers === '2') {
                human = [true, true];
                if (claimedRole[0] === 'B') {
                    roles = ['BSM', 'BFA'];
                    order = ['BSM', 'BFA'];
                } else {
                    roles = ['RSM', 'RFA'];
                    order = ['RSM', 'RFA'];
                    turn = 'RSM';
                }
            }
            order.human = human;

            // Create a new game object with the given settings
            var g = {
                open: true,
                gameID: gameID,
                cards: card_data,
                numPlayers: numPlayers,
                players: [],
                roles: roles,
                order: order,
                turn: turn,
                clueTimer: clueTime,
                guessTimer: guessTime,
                guessCount: 0,
                gameStatus: 'pregame',
                blueRemaining: 9,
                redRemaining: 8
            };
            console.log("Created a new game: "+gameID);
            gameData[gameID] = g;
            callback(true);

        });
    }
}

/* ========================================================
 * =====================  Game Logic  =====================
 * ======================================================== */

// Shuffle an array with Fisher-Yates Shuffle
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Make card team assignemnts
function assignCards() {
    var reds = 8;
    var blues = 9;

    var assignments = ['B','R','B','neutral','R','B','neutral','R',
                        'B','neutral','R','B','neutral','R','B','neutral',
                        'R','B', 'assassin','neutral','R','B','neutral','R','B'];

    for (var i=0; i<7; i++) {
        shuffle(assignments);
    }

    return assignments;
}

function validClueWord(clue, cards) {
    if (clue.match('[A-Za-z]*')[0] !== clue) {
        return false;
    }
    for (var i=0; i<cards.length; i++) {
        if (!cards[i].guessed) {
            var w = cards[i].word.toLowerCase();
            var c = clue.toLowerCase();
            if (w.match('.*'+c+'.*') !== null || c.match('.*'+w+'.*') !== null) {
                return false;
            }
        }
    }
    return true;
}

function giveClue(cards, team, callback) {
    var posWords = [];
    var negWords = [];
    for (var i=0; i<cards.length; i++) {
        var c = cards[i];
        if (c.guessed === false) {
            if (c.team === team) {
                posWords.push(c.word.toLowerCase().replace(' ', '_'));
            } else if (c.team === 'assassin') {
                negWords.unshift(c.word.toLowerCase().replace(' ', '_'));
            } else if (c.team !== 'neutral') {
                negWords.push(c.word.toLowerCase().replace(' ', '_'));
            }
        }
    }
    // Don't overdo it with negative weighting
    negLimit = Math.max(0, posWords.length - 2);
    negWords = negWords.slice(0,negLimit);

    var pos = posWords.join(',');
    var neg = negWords.join('@-1,')+'@-1';
    var url = 'http://conceptnet5.media.mit.edu/data/5.4/assoc/list/en/'+pos+','+neg+'?limit=20&filter=/c/en';
    if (negWords.length === 0) {
        url = 'http://conceptnet5.media.mit.edu/data/5.4/assoc/list/en/'+pos+'?limit=20&filter=/c/en';
    }

    request(url, function(result) {
        //console.log(url);
        //console.log(result);
        if (result.similar.length !== 0) {
            //console.log('ROBOT CLUE');
            //console.log(result.similar);
            for (var i=0; i<result.similar.length; i++) {
                var clueWord = result.similar[i][0].substring(6, result.similar[i][0].length);
                if (validClueWord(clueWord, cards)) {
                    //console.log('ROBOT CLUE: '+clueWord.toUpperCase());
                    callback(clueWord, posWords);
                    return;
                }
            }
            callback('YOLO', posWords);
        } else {
            callback('YOLO', posWords);
        }
    });

}

function guessClue(clue, words, callback) {

    var guesses = [];

    for (var i=0; i<words.length; i++) {
        var word = words[i].toLowerCase();
        word = word.replace(' ', '_');
        // NOTE: the order of word, clue is surprisingly important
        var url = "http://conceptnet5.media.mit.edu/data/5.4/assoc/c/en/"+word+"?filter=/c/en/"+clue.toLowerCase()+"/.&limit=1";

        request(url, function(result) {
            if (result.similar.length !== 0) {
                guesses.push({ word: result.terms[0][0].substring(6, result.terms[0][0].length), prob: result.similar[0][1] });
                //console.log(guesses.length);
            } else {
                guesses.push({ word: 'NOTHING', prob: 0 });
            }
            if (guesses.length === words.length) {
                //submitGuess(guesses, words);
                callback(guesses, words);
            }
        });
    }
}

function submitGuess(guesses, words) {
    guesses.sort(function(a, b) {
        return b.prob - a.prob;
    });
    //console.log(guesses);
}

var findOpenGames = function(callback) {
    var games = [];
    var gameIDs = Object.keys(gameData);

    for (var i = 0; i<gameIDs.length; i++) {
        var gameID = gameIDs[i];
        //console.log(roomName);
        if (gameData[gameID].open && gameData[gameID].roles.length > 0) {
            games.push(gameID);
        }
    }
    callback(games);
}

// Send out a request to a given url, and call the callback with the received data
function request(theURL, callback) {
    // create a request object
    var request = new XMLHttpRequest();

    // specify the HTTP method, URL, and asynchronous flag
    request.open('GET', theURL, true); 

    // add an event handler
    request.addEventListener('load', function(e){
        if (request.status == 200) {
            // do something with the loaded content
            var content = request.responseText;
            data = JSON.parse(content);
            callback(data);
        } else {
            console.log('Something went wrong: ' + request.status);
            // something went wrong, check the request status
        }
    }, false);

    // Send the request
    request.send(null);  
}
