// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	$('#rules').on('click', function(){ 
		$('#howToPlay').css('display', 'block');
	});
	$('#newGame').on('click', function(){
		var username = $('#username').val();
		var gamename = $('#gamename').val();
		if (username.split(' ').join('') !== '' && gamename.split(' ').join('') !== '') {
			$('#newGameSetup').css('display', 'block');
		}
	});
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

}, false);
