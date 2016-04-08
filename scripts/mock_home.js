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
					console.log('valid');
					$('#uniquePrompt').css('display', 'none');
					$('#newGameSetup').css('display', 'block');
				} else {
					console.log('invalid');
					$('#uniquePrompt').css('display', 'block');
				}
				$('#formPrompt').css('display', 'none');
			});
		} else {
			$('#formPrompt').css('display', 'block');
			$('#uniquePrompt').css('display', 'none');
		}
	});

	/* Join Game button:
	 * ensure that the game name already exists before prompting to join
	 */
	$('#joinGame').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
		if (username.split(' ').join('') !== '' && gamename.split(' ').join('') !== '') {
			$('#joinGameSetup').css('display', 'block');
		}
	});
	$('#create').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
		location.href='/'+gamename;
	});
	$('#join').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
		location.href='/'+gamename;
	});

	$('.close').on('click', function(){
		$('.setup').css('display', 'none');
	});

	socket.emit('joinHome', function() {
		console.log('Visiting the home screen');
	});

}, false);
