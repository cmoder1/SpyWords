var socket = io.connect();
var translations = {
	'BSM': 'Blue Spy Master',
	'BFA': 'Blue Field Agent',
	'RSM': 'Red Spy Master',
	'RFA': 'Red Field Agent'
}
var idleTime = 0;

// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	//Increment the idle time counter every minute.
    var idleInterval = setInterval(timerIncrement, 60000); // 1/6 minute

    //Zero the idle timer on mouse movement.
    $(document).mousemove(function (e) {
        idleTime = 0;
    });
    $(document).keypress(function (e) {
        idleTime = 0;
    });

    $('#gamename').on('focus', function() {
    	if ($('#gamePlayers').css('display') === 'inline-block') {
    		return;
    	}
    	socket.emit('findGames', function(games) {
    		$('#gamesList ul').empty();
    		for (var i=0; i<games.length; i++) {
    			$('#gamesList ul').append('<li>'+games[i]+'</li>');
    		}
    		if (games.length === 0) {
    			$('#gamesList ul').append('<li>No Games Found</li>');
    		}
    	});
    	$('#gamesList').css('display', 'inline-block');
    });
    $('#gamename').on('blur', function() {
    	$('#gamesList').css('display', 'none');
    });
    $('#gamename').on('keyup', function() {
    	socket.emit('getPlayers', $('#gamename').val(), function(players) {
    		if (players !== null) {
    			$('#gamePlayers ul').empty();
    			$('#gamesList').css('display', 'none');

				for (var p=0; p<players.length; p++) {
					var pl = players[p];
		    		$('#gamePlayers ul').append('<li class="text'+pl.role[0]+'">'+translations[pl.role]+": "+pl.username+'</li>');
				}
				$('#gamePlayers').css('display', 'inline-block');
			} else {
				$('#gamePlayers').css('display', 'none');
				$('#gamesList').css('display', 'inline-block');
			}
		});
    });

	$('#rules').on('click', function(){ 
		$('#howToPlay').css('display', 'block');
	});

	/* Create Game button:
	 * ensure that the game name is unique before revealing game settings window
	 */ 
	$('#newGame').on('click', function(){
		var username = sanitize($('#username').val());
		var gamename = sanitize($('#gamename').val());
		if (username.split(' ').join('') !== '' && gamename.split(' ').join('') !== '') {
			socket.emit('validateName', gamename, function(valid, full) {
				if (valid) {
					$('#inputError').css('display', 'none');
					$('#newGameSetup').css('display', 'block');
				} else {
					$('#inputError').css('display', 'block');
					$('#inputError').html('That game name is already in use');
				}
			});
		} else {
			$('#inputError').css('display', 'block');
			$('#inputError').html('You must enter a nickname and game name');
		}
	});

	/*
	 * Filling out create game form 
	 */
	$('.secs').blur(function(e){
		var seconds = 1*e.target.value;//1*$('#clueSecs').val();
		if (seconds < 10) {
			e.target.value = ('0'+seconds);
		}
		if (seconds < 0 || seconds > 59) {
			e.target.value = ('00');
		}
	});
	$('.mins').blur(function(e){
		var minutes = e.target.value;//1*$('#clueSecs').val();
		if (minutes < 1 || minutes > 9) {
			e.target.value = ('1');
		}
	});

	/* Join Game button:
	 * ensure that the game name already exists before prompting to join
	 */
	$('#joinGame').on('click', function(){
		var username = sanitize($('#username').val());
		var gamename = sanitize($('#gamename').val());
		console.log(username);
		if (username.split(' ').join('') !== '' && gamename.split(' ').join('') !== '') {
			socket.emit('validateName', gamename, function(unique, full) {
				if (!unique) {
					if (full) {
						$('#inputError').css('display', 'block');
						$('#inputError').html('The selected game is already full');
					} else {
						$('#inputError').css('display', 'none');
						$('#joinGameSetup').css('display', 'block');
						socket.emit('getRoles', gamename, updateRoles);
					}
				} else {
					$('#inputError').css('display', 'block');
					$('#inputError').html('That game does not exist');
				}
			});
		} else {
			$('#inputError').css('display', 'block');
			$('#inputError').html('You must enter a nickname and game name');
		}
	});

	socket.on('roleUpdate', function(gameID, roles, players) {
		$('#gamePlayers ul').empty();
		for (var p=0; p<players.length; p++) {
			var pl = players[p];
    		$('#gamePlayers ul').append('<li class="text'+pl.role[0]+'">'+translations[pl.role]+": "+pl.username+'</li>');
		}
		if ($('#gamename').val() === gameID) {
			updateRoles(roles);
		}
	});


	$('#create').on('click', function(){
		var username = sanitize($('#username').val());
		var gamename = sanitize($('#gamename').val());
		socket.emit('createGame', gamename, username, $('#role').val(), $('#numPlayers').val(), 
			$('#clueMins').val()+':'+$('#clueSecs').val(), $('#guessMins').val()+':'+$('#guessSecs').val(), function(valid) {
				if (valid) {
					location.href='/'+gamename+'/'+$('#role').val()+'/'+username;
				} else {
					$('#newGameSetup').css('display', 'none');
					$('#inputError').css('display', 'block');
					$('#inputError').html('That game name is already in use');
				}
			});
	});

	$('#join').on('click', function(){
		var username = sanitize($('#username').val());
		var gamename = sanitize($('#gamename').val());
		socket.emit('joinGame', gamename, username, $('#role2').val(), function(valid){
			if (valid) {
				location.href='/'+gamename+'/'+$('#role2').val()+'/'+username;
			} else {
				$('.setup').css('display', 'none');
				$('#inputError').css('display', 'block');
				$('#inputError').html("That game either doesn't exist or is full");
			}
		});
	});

	$('.close').on('click', function(){
		$('.setup').css('display', 'none');
	});

	socket.emit('joinHome', function() {
		console.log('Visiting the home screen');
	});

}, false);


function sanitize(word) {
	return word.split('<').join('').split('>').join('').split('/').join('');
}

function updateRoles(roles) {
	console.log(roles);
	var translations = {
		'BSM': 'Blue Spy Master',
		'BFA': 'Blue Field Agent',
		'RSM': 'Red Spy Master',
		'RFA': 'Red Field Agent'
	}
	$('#role2').empty();
	for (var i=0; i<roles.length; i++) {
		$('#role2').html($('#role2').html()+
			'<option value="'+roles[i]+'">'+translations[roles[i]]+'</option>');
	}
}

function timerIncrement() {
	console.log('INACTIVE: ' + idleTime + ' minutes');
    idleTime++;
    if (idleTime > 10) { // 10 minutes
    	socket.disconnect();
        //window.location.href = '/idle';
    }
}
