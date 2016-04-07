// Required modules
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
    response.render('mock_game.html');
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

