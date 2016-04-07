// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	$('#rules').on('click', function(){ 
		$('#howToPlay').css('display', 'block');
	});
	$('#newGame').on('click', function(){
		$('#newGameSetup').css('display', 'block');
	});
	$('#joinGame').on('click', function(){
		$('#joinGameSetup').css('display', 'block');
	});
	$('#create').on('click', function(){
		location.href='mock_game.html';
	});
	$('#join').on('click', function(){
		location.href='mock_game.html';
	});

	$('.close').on('click', function(){
		$('.setup').css('display', 'none');
	});

}, false);
