var socket = io.connect();

// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	$('#rules').on('click', function(){ 
		$('#howToPlay').css('display', 'block');
	});

	/* Create Game button:
	 * ensure that the game name is unique before revealing game settings window
	 */ 
	$('#newGame').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
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
		var username = $('#username').val();
		var gamename = $('#gamename').val();
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

	socket.on('roleUpdate', function(gameID, roles) {
		if ($('#gamename').val() === gameID) {
			updateRoles(roles);
		}
	});


	$('#create').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
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
		var username = $('#username').val();
		var gamename = $('#gamename').val();
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
