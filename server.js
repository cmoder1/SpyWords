// Required modules
var fs = require('fs');
var http = require('http'); 
var express = require('express');
var	bodyParser = require('body-parser');
//var anyDB = require('any-db');
var engines = require('consolidate');
var mongoose = require('mongoose');

// Prepare variables
//var conn = anyDB.createConnection('sqlite3://codenames.db');
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


// heroku code
app.set('port', (process.env.PORT || 8080));


/* ========================================================
 * ================ Connect to Database  ==================
 * ======================================================== */

var db = mongoose.connection;
var gameData = {}; // Small-scale data storage
db.on('error', console.error);
db.once('open', function() {
    // Create your schemas and models here
    console.log("Connected to DB!");

    /* ========================================================
     * ================  Build Schema/Model  ==================
     * ======================================================== */

    var gameSchema = new mongoose.Schema({
        gameID: String,
        cards: [{ word: String, team: String, guessed: Boolean }],
        numPlayers: Number,
        players: [{ name: String, team: String, role: String }],
        roles: [String],
        turn: String,
        clueTimer: String,
        guessTimer: String,
        gameOver: Boolean
    });

    var Game = mongoose.model('Game', gameSchema);

    /* ========================================================
     * ================  Socket Communications  ===============
     * ======================================================== */

    io.sockets.on('connection', function(socket){
        // clients emit this when they join new rooms
        socket.on('join', function(){
            console.log('TODO');
        });

        socket.on('joinHome', function(callback){
            socket.join('Home');
            callback();
        });

        // TODO
        // Check to see if the game is already full
        // ........
        socket.on('validateName', function(gameID, callback) {
            
            var g = gameData[gameID];
            if (g === null || g === undefined) {
                callback(true, false);
            } else {
                callback(false, g.roles.length === 0);
            }
            /*Game.find({ gameID: gameID }, function(err, g) {
                //console.log(g);
                if (g.length === 0) {
                    callback(true);
                } else {
                    callback(false);
                }
            });*/
        });

        socket.on('getRoles', function(gameID, callback) {
            
            var g = gameData[gameID];
            callback(g['roles']);
            /*Game.findOne({ gameID: gameID }, function(err, g) {
                //console.log(g);
                callback(g.roles);
            });*/
        });

        socket.on('createGame', function(gameID, username, claimedRole, numPlayers, clueTime, guessTime, callback) {
            generateWords(function(words) {

                var teams = assignCards();
                var card_data = { 'cards' : [] };

                for (var i=0; i<words.length; i++) {
                    card_data['cards'].push({ 'word': words[i], 'team': teams[i], 'guessed': false, 'index': i });
                }

                var order = ['BSM', 'BFA', 'RSM', 'RFA'];
                var roles = ['BSM', 'BFA', 'RSM', 'RFA'];
                var turn = 'BSM';
                if (numPlayers === '2') {
                    if (claimedRole[0] === 'B') {
                        roles = ['BSM', 'BFA'];
                        order = ['BSM', 'BFA'];
                    } else {
                        roles = ['RSM', 'RFA'];
                        order = ['RSM', 'RFA'];
                        turn = 'RSM';
                    }
                }
                roles.splice(roles.indexOf(claimedRole), 1);

                var g = {
                    gameID: gameID,
                    cards: card_data['cards'],
                    numPlayers: numPlayers,
                    players: [{ name: username, team: claimedRole[0], role: claimedRole }],
                    roles: roles,
                    order: order,
                    turn: turn,
                    clueTimer: clueTime,//'02:45',
                    guessTimer: guessTime,//'02:30',
                    guessCount: 0,
                    gameOver: false
                };
                gameData[gameID] = g;
                callback();
                /*var game = new Game({
                    gameID: gameID,
                    cards: card_data['cards'],
                    numPlayers: numPlayers,
                    players: [{ name: username, team: claimedRole[0], role: claimedRole }],
                    roles: roles,
                    turn: turn,
                    clueTimer: clueTime,//'02:45',
                    guessTimer: guessTime,//'02:30',
                    gameOver: false
                });

                game.save(callback);*/

                //response.render('mock_game.html', card_data);
            });
        });

        socket.on('joinGame', function(gameID, username, claimedRole, callback) {
            if (claimedRole === null) {
                callback(true);
                return;
            } 

            var g = gameData[gameID];
            callback(g.roles.length === 0, claimedRole);
            var p = { name: username, team: claimedRole[0], role: claimedRole };
            g.players.push(p);
            g.roles.splice(g.roles.indexOf(claimedRole), 1);
            //g.save();
            io.sockets.in('Home').emit('roleUpdate', g.gameID, g.roles);
            io.sockets.in(gameID).emit('newPlayer', claimedRole, username);
            /*Game.findOne({ gameID: gameID }, function(err, g) {
                callback(g.roles.length === 0, claimedRole);
                var p = { name: username, team: claimedRole[0], role: claimedRole };
                g.players.push(p);
                g.roles.splice(g.roles.indexOf(claimedRole), 1);
                g.save();
                io.sockets.in('Home').emit('roleUpdate', g.gameID, g.roles);
                io.sockets.in(gameID).emit('newPlayer', claimedRole, username);
            });*/
        });

        socket.on('getPlayers', function(gameID, callback) {
            /*Game.findOne({ gameID: gameID }, function(err, g) {
                callback(g.players);
            });*/
            var g = gameData[gameID];
            callback(g.players);
        });

        socket.on('waiting', function(gameID, role, callback) {
            socket.join(gameID);
            socket.gameID = gameID;
            socket.role = role;
            /*Game.findOne({ gameID: gameID }, function(err, g) {
                //var clients = io.sockets.adapter.rooms[gameID];
                if (g.players.length === g.numPlayers) {//clients.length === 4) {
                    io.sockets.in(gameID).emit('startGame', g.turn, g.clueTimer);
                }
            });*/
            var g = gameData[gameID];
            if (g.players !== undefined && g.players.length == g.numPlayers) {//clients.length === 4) {
                io.sockets.in(gameID).emit('startGame', g.turn, g.clueTimer);
            }
        });

        socket.on('clue', function(clue, role) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
            g.guessCount = 0;
            io.sockets.in(gameID).emit('newClue', clue, role, nextRole, g.guessTimer);
        });

        socket.on('guessWord', function(wordIdx, clue, role) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            
            if (!g.cards[wordIdx].guessed) {
                g.guessCount++;
                var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
                var cardTeam = g.cards[wordIdx].team;
                g.cards[wordIdx].guessed = true;
                console.log('Guess '+g.guessCount+' of '+clue.split(' ')[1]);
                if (clue.split(' ')[1]*1 === g.guessCount || role[0] !== cardTeam) {
                    io.sockets.in(gameID).emit('lastGuess', wordIdx, cardTeam, role, nextRole, g.clueTimer);
                } else {
                    io.sockets.in(gameID).emit('newGuess', wordIdx, cardTeam);
                }
            }
        });

        socket.on('doneGuessing', function(role) {
            var gameID = socket.gameID;
            var g = gameData[gameID];
            var nextRole = g.order[(g.order.indexOf(role)+1) % g.order.length];
            io.sockets.in(gameID).emit('newClue', '&mdash;', role, nextRole, g.clueTimer);
        });

        // the client disconnected/closed their browser window
        socket.on('disconnect', function(){
            // Leave the room!
            var gameID = socket.gameID;
            if (gameID !== undefined){
                var clients = io.sockets.adapter.rooms[gameID];
                if (clients === undefined || clients.length === 0) {
                    delete gameData[gameID];
                }
            }
            console.log('TODO');
        });

    });

    /* ========================================================
     * ==================  Go to a Game Page  =================
     * ======================================================== */

    // URL to access a specified chatroom
    app.get('/:gameID/:role', function(request, response){
        //console.log('Creating a game!');
        // Send the user to a game
        var gameID = request.params.gameID;
        var role = request.params.role;

        /*Game.findOne({ gameID: gameID }, function(err, g) {
            //console.log('Found!');
            //console.log(g['gameID']);

            if (g === null) {
                console.log('This game has not been created!');
                response.redirect('/');
            } else {
                var game_data = { gameID: gameID, role: role, cards: g['cards'] };
                if (role === 'BSM' || role === 'RSM') {
                    response.render('spyMaster.html', game_data);
                } else {
                    response.render('fieldAgent.html', game_data);
                }
                //temp = g.roles;
                //temp.splice(temp.indexOf('RSM'),1);
                // TODO: Actually update the game object
                //g.roles = temp;
                //g.save();
                //io.sockets.in('Home').emit('roleUpdate', g.gameID, temp);
            }
        });*/
        var g = gameData[gameID];
        if (g === null) {
            console.log('This game has not been created!');
            response.redirect('/');
        } else {
            var game_data = { gameID: gameID, role: role, cards: g['cards'] };
            if (role === 'BSM' || role === 'RSM') {
                response.render('spyMaster.html', game_data);
            } else {
                response.render('fieldAgent.html', game_data);
            }
            //temp = g.roles;
            //temp.splice(temp.indexOf('RSM'),1);
            // TODO: Actually update the game object
            //g.roles = temp;
            //g.save();
            //io.sockets.in('Home').emit('roleUpdate', g.gameID, temp);
        }
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

