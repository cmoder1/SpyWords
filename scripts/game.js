var socket = io.connect();

// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	socket.on('startGame', function(turn, timer) { 
		var interv = window.setInterval(timeTick, 1000);

		displayTurn(turn);
		setMeta('currentTurn', turn);
		/* BORDER STYLE
		$('.red').css('border', '3px solid rgb(202,0,32)');
		$('.blue').css('border', '3px solid rgb(5,113,176)');
		*/

		/* BACKGROUND STYLE
		$('.red').css('background-color', 'rgba(222,20,52,1)');
		$('.blue').css('background-color', 'rgba(25,133,196,1)');
		*/

		var spymasterView = true;
		var role = meta('role');
		if (role === 'BFA' || role === 'RFA') {
			spymasterView = false;
		}

		if (spymasterView) {
			// BOX SHADOW STYLE
			$('.red').css('box-shadow', '0 0 5px 3px rgb(202,0,32)');
			$('.blue').css('box-shadow', '0 0 5px 3px rgb(5,113,176)');
			$('.assassin').css('box-shadow', '0 0 5px 3px #222');

			$('.red').css('background-color', 'rgb(255,204,139)');
			$('.blue').css('background-color', 'rgb(185,204,189)');
			$('.assassin').css('background-color', 'rgb(215,204,149)');
		} else {
			$('.card').css('box-shadow', '0 0 5px 2px #ffea9f');
		}

		// CLICKING CARDS:
		$('.red').on('click', function(e){
			$('#redScore').html($('#redScore').html()*1 - 1);

			var card = e.target;
			if (card.tagName === 'DIV') {
				$(card).css('background-color', 'rgba(202,0,32,1)');
				$(card).css('box-shadow', 'none');
				$($(card).children()).css('background-color', 'rgb(244,165,130)');
				$($(card).children()).css('opacity', '0.2');
			} else {
				$(card).css('background-color', 'rgb(244,165,130)');
				$(card).css('opacity', '0.2');
				$($(card).parent()).css('background-color', 'rgba(202,0,32,1)');
				$($(card).parent()).css('box-shadow', 'none');
			}
		});

		$('.blue').on('click', function(e){
			$('#blueScore').html($('#blueScore').html()*1 - 1);

			var card = e.target;
			if (card.tagName === 'DIV') {
				$(card).css('background-color', 'rgb(5,113,176)');
				$(card).css('box-shadow', 'none');
				$($(card).children()).css('background-color', 'rgb(146,197,222)');
				$($(card).children()).css('opacity', '0.2');
			} else {
				$(card).css('background-color', 'rgb(146,197,222)');
				$(card).css('opacity', '0.2');
				$($(card).parent()).css('background-color', 'rgb(5,113,176)');
				$($(card).parent()).css('box-shadow', 'none');
			}
		});

		$('.neutral').on('click', function(e){
			var card = e.target;
			if (card.tagName === 'DIV') {
				$(card).css('background-color', 'rgb(215,184,119)');
				$(card).css('box-shadow', 'none');
				$($(card).children()).css('background-color', 'rgb(235,235,192)');
				$($(card).children()).css('opacity', '0.2');
			} else {
				$(card).css('background-color', 'rgb(235,235,192)');
				$(card).css('opacity', '0.2');
				$($(card).parent()).css('background-color', 'rgb(215,184,119)');
				$($(card).parent()).css('box-shadow', 'none');
			}
		});

		$('.assassin').on('click', function() { alert('Game Over!') });
	});

	socket.emit('waiting', meta('gameID'), meta('role'), function() {
		console.log('Entered the game');
	});

	socket.emit('getPlayers', meta('gameID'), function(players) {
		for (var i=0; i<players.length; i++) {
			$('#'+players[i].role).html('<p>'+players[i].name+'</p>');
		}
	});

	socket.on('newPlayer', function(role, name) {
		$('#'+role).html('<p>'+name+'</p>');
	});

	$('#chat p').on('click', function() {
		if ($('#chat').css('bottom') === '0px') {
			$('#chat').css('bottom', '-360px');
		} else {
			$('#chat').css('bottom', '0px');
		}
	});
	$('#pastClues p').on('click', function() {
		if ($('#pastClues').css('bottom') === '0px') {
			$('#pastClues').css('bottom', '-320px');
		} else {
			$('#pastClues').css('bottom', '0px');
		}
	});

}, false);



function displayTurn(role) {
	if (role[0] === 'B') {
		$('#blueTurn').css('display', 'block');
		$('#redTurn').css('display', 'none');
		$('#'+role).css('background-color', 'rgba(5,113,176,1)');
		$('#'+role).css('box-shadow', '0 0 7px 3px white');
	} else {
		$('#blueTurn').css('display', 'none');
		$('#redTurn').css('display', 'block');
		$('#'+role).css('background-color', 'rgba(202,0,32,1)');
		$('#'+role).css('box-shadow', '0 0 7px 3px white');
	}
}


// Helper to retrieve page meta data
function meta(name) {
    var tag = document.querySelector('meta[name=' + name + ']');
    if (tag != null)
        return tag.content;
    return '';
}

function setMeta(name, newValue) {
	var tag = document.querySelector('meta[name=' + name + ']');
    if (tag != null)
        tag.content = newValue;
    return;
}

function timeTick() {
	var seconds = $('#seconds').html()*1;
	var minutes = $('#minutes').html()*1;
	if (seconds === 0) {
		if (minutes === 0) {
			$('#timer p').css('color', 'red');
		} else {
			minutes -= 1;
			seconds = 59;
		}
	} else {
		seconds -= 1;
	}

	var secondText = seconds+'';
	if (seconds < 10) {
		secondText = '0'+secondText;
	}
	var minuteText = minutes+'';
	$('#seconds').html(secondText);
	$('#minutes').html(minuteText);
}
