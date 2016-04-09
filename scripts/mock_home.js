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
			socket.emit('validateName', gamename, function(valid) {
				if (valid) {
					//console.log('valid');
					$('#uniquePrompt').css('display', 'none');
					$('#newGameSetup').css('display', 'block');
				} else {
					//console.log('invalid');
					$('#uniquePrompt').css('display', 'block');
				}
				$('#formPrompt').css('display', 'none');
				$('#existsPrompt').css('display', 'none');
			});
		} else {
			$('#formPrompt').css('display', 'block');
			$('#uniquePrompt').css('display', 'none');
			$('#existsPrompt').css('display', 'none');
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
			socket.emit('validateName', gamename, function(unique) {
				if (!unique) {
					$('#existsPrompt').css('display', 'none');
					$('#joinGameSetup').css('display', 'block');
					socket.emit('getRoles', gamename, updateRoles);
				} else {
					$('#existsPrompt').css('display', 'block');
				}
				$('#formPrompt').css('display', 'none');
				$('#uniquePrompt').css('display', 'none');
			});
		} else {
			$('#formPrompt').css('display', 'block');
			$('#existsPrompt').css('display', 'none');
			$('#uniquePrompt').css('display', 'none');
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
		socket.emit('createGame', gamename, username, $('#role').val(), $('#clueMins').val()+':'+$('#clueSecs').val(),
			$('#guessMins').val()+':'+$('#guessSecs').val(), function() {
				location.href='/'+gamename;
			});
	});

	$('#join').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
		socket.emit('joinGame', gamename, username, $('#role2').val(), function(){
			location.href='/'+gamename;
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
