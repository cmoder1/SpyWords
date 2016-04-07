// Required modules
var fs = require('fs');
var http = require('http'); 
var express = require('express');
var	bodyParser = require('body-parser');
var anyDB = require('any-db');
var engines = require('consolidate');

// Prepare variables
var conn = anyDB.createConnection('sqlite3://codenames.db');
var app = express(); 
var server = http.createServer(app);
var io = require('socket.io').listen(server);
// =================

app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', __dirname + '/templates'); // tell Express where to find templates

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// allow access to the scipts and styles for the webpages
app.use('/scripts', express.static('scripts'));
app.use('/styles', express.static('styles'));


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

    var assignments = ['blue','red','blue','neutral','red','blue','neutral','red',
                        'blue','neutral','red','blue','neutral','red','blue','neutral',
                        'red','blue', 'assassin','neutral','red','blue','neutral','red','blue'];

    for (var i=0; i<7; i++) {
        shuffle(assignments);
    }

    return assignments;
}

/* ========================================================
 * ================  Socket Communications  ===============
 * ======================================================== */

io.sockets.on('connection', function(socket){
    // clients emit this when they join new rooms
    socket.on('join', function(){
        console.log('TODO');
    });

    // the client disconnected/closed their browser window
    socket.on('disconnect', function(){
        // Leave the room!
        console.log('TODO');
    });

});

/* ========================================================
 * ================  Access Home/Chatroom  ================
 * ======================================================== */

// URL to access a specified chatroom
app.get('/game', function(request, response){
    // Send the user to a game
    generateWords(function(words) {

        var teams = assignCards();
        var card_data = { 'cards' : [] };

        for (var i=0; i<words.length; i++) {
            card_data['cards'].push({ 'word' : words[i], 'team' : teams[i] });
        }
        response.render('mock_game.html', card_data);
    });
});

// Catchall page - Home
app.get('*', function(request, response){
    // Display the home screen
    response.render('mock_home.html');
});


// changed from *app*.listen(8080);
// to server.listen(8080);

// Set up the listener and make the table of messages once done
server.listen(8080, function() {
	/*conn.query('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,'+
		' room TEXT, nickname TEXT, body TEXT, time INTEGER);')
	.on('end', function(){
		console.log('Messages table set');
	});

	conn.query('CREATE TABLE IF NOT EXISTS rooms (roomID TEXT PRIMARY KEY, roomName TEXT);')
		.on('end', function(){
			console.log('Rooms table set');
		});
    */
});

