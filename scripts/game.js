var socket = io.connect();
var idleTime = 0;
var refreshOverride = true;
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

	$('#cards').css('opacity', '0.5');
	$('#controls').css('opacity', '0.5');

	socket.on('startGame', function(turn, timer) { 
		startGameDisplay(interv, turn, timer);
	});

	socket.on('rejoin', function(turn, timer, guessedCards) {
		startGameDisplay(interv, turn, timer);

		for (var i=0; i<guessedCards.length; i++) {
			var c = guessedCards[i];
			revealCard(c['index'], c['team']);
		}
	});

	socket.on('restart', function(turn, timer, newCards) {
		//clearInterval(interv);
		setMeta('currentTurn', turn);
		//$('#blueScore').html('9');
		//$('#redScore').html('8');
		$('#gameOver').css('display', 'none');
		$('#cards').empty();
		for (var i=0; i<newCards.length; i++) {
			var c = newCards[i];
			if (meta('role')[1] == 'S') {
				$('#cards').append("<div class='card "+c.team+" "+c.index+"'><p>"+c.word+"</p></div>");
			} else {
				$('#cards').append("<div class='card "+c.index+"'><p>"+c.word+"</p></div>");
			}
		}

		$('.card').on('click', function(e) {
			var myRole = meta('role');
			if ((myRole === 'BFA' || myRole === 'RFA') && myRole === meta('currentTurn')) {
				var card = e.target;

				var index = -1;
				var word = '';
				if (card.tagName === 'DIV') {
					word = $($(card).children()[0]).html();
					index = $(card).attr('class').split(' ')[1];
				} else {
					word = $(card).html();
					index = $($(card).parent()).attr('class').split(' ')[1];
				}
				console.log(word);
				console.log(index);
				socket.emit('guessWord', index, $('#clue').html(), myRole);
				//socket.emit('cardClick', ...) // Perhaps give each card an ID to pass along
			}
		});

		startGameDisplay(null, turn, timer);
	});
	
	/* ========================================================
     * ===================  Game-Play Events  =================
     * ======================================================== */

	$('.card').on('click', function(e) {
		var myRole = meta('role');
		if ((myRole === 'BFA' || myRole === 'RFA') && myRole === meta('currentTurn')) {
			var card = e.target;

			var index = -1;
			var word = '';
			if (card.tagName === 'DIV') {
				word = $($(card).children()[0]).html();
				index = $(card).attr('class').split(' ')[1];
			} else {
				word = $(card).html();
				index = $($(card).parent()).attr('class').split(' ')[1];
			}
			console.log(word);
			console.log(index);
			socket.emit('guessWord', index, $('#clue').html(), myRole);
			//socket.emit('cardClick', ...) // Perhaps give each card an ID to pass along
		}
	});

	socket.on('lastGuess', function(wordIdx, cardTeam, prev, next, time) {
		console.log('LAST GUESS');
		revealCard(wordIdx, cardTeam);
		$('#clue').html('&mdash;');
		nextTurn(prev, next, time);
	});

	socket.on('newGuess', function(wordIdx, cardTeam) {
		revealCard(wordIdx, cardTeam);
	});

	$('#doneGuessing').on('click', function() {
		if (meta('role') === meta('currentTurn')) {
			socket.emit('doneGuessing', meta('role'));
		}
	});

	$('#submitClue').on('click', function() {
		var clue = $('#clueWord').val();
		var num = $('#clueNum').val();
		if (meta('role') === meta('currentTurn')) {
			console.log(clue + ' ' + num);
			socket.emit('validateClue', clue, num*1, function(valid) {
				if (valid === 'valid') {
					socket.emit('clue', clue+' '+num, meta('role'));
					$('#clueWord').css('box-shadow', 'none');
					$('#clueNum').css('box-shadow', 'none');
					$('#clueNum').css('border', 'solid 1px #bababa');
					$('#clueWord').css('border', 'solid 1px #bababa');
					$('#clueWord').val('');
					$('#clueNum').val('0');
				} else if (valid === 'number') {
					$('#clueNum').css('box-shadow', 'inset 0 0 2px 2px red');
					$('#clueWord').css('box-shadow', 'none');
					$('#clueNum').css('border', '1px solid red');
					$('#clueWord').css('border', 'solid 1px #bababa');
					alert('Your clue number must be greater than zero');
				} else {
					$('#clueWord').css('border', '1px solid red');
					$('#clueNum').css('border', 'solid 1px #bababa');
					$('#clueWord').css('box-shadow', 'inset 0 0 2px 2px red');
					$('#clueNum').css('box-shadow', 'none');
					alert(valid);
				}
			});
		}
	});

	socket.on('newClue', function(clue, prev, next, time) {
		$('#clue').html(clue);
		if (clue != '&mdash;') {
			$('#history ul').append('<li class="message">'+clue+'</li>');
			$('#history').scrollTop($('#history')[0].scrollHeight);
		}
		nextTurn(prev, next, time);
	});

	/* ========================================================
     * ===================  Pre-Game Setup  ===================
     * ======================================================== */

     // Set this once and then don't alter it... only alter the time displayed in the clock
	var interv = window.setInterval(function(){}, 1000);

	socket.emit('waiting', meta('gameID'), meta('role'), meta('username'));
	socket.on('roleTaken', function() {
		location.href = '/';
	});
	// HANDLE THE USER REFRESHING OR SNEAKING INTO THE GAME
	//socket.emit('reloadGame', meta('gameID'), meta('role'), meta('username'));

	socket.emit('getPlayers', meta('gameID'), function(players) {
		console.log('getPlayers: '+players);
		if (players === null) {
			//$(window).unbind('beforeunload');
			refreshOverride = false;
			location.href = '/';
		} else {
			for (var i=0; i<players.length; i++) {
				$('#'+players[i].role).html('<p>'+players[i].username+'</p>');
			}
		}
	});

	socket.on('newPlayer', function(role, name) {
		$('#'+role).html('<p>'+name+'</p>');
	});

	$('.role').on('click', function(e) {
		console.log($('#'+$(e.target).attr('id')+' p').html() + ': '+$(e.target).attr('id'));
		if ($('#'+$(e.target).attr('id')+' p').html() === '-') {
			console.log('REPLACE WITH ROBOT');
			socket.emit('setRobotPlayer', $(e.target).attr('id'), function() {
				$('#'+$(e.target).attr('id')+' p').html('Computer');
			});
		}
	});

	$('#chat p').on('click', function() {
		if ($('#chat').css('bottom') === '0px') {
			//$('#chat').css('bottom', '-360px');
			$('#chat').animate({ 'bottom': '-360px' }, 300);
		} else {
			//$('#chat').css('bottom', '0px');
			$('#chat').animate({ 'bottom': '0px' }, 300);
		}
	});
	$('#pastClues p').on('click', function() {
		if ($('#pastClues').css('bottom') === '0px') {
			//$('#pastClues').css('bottom', '-320px');
			$('#pastClues').animate({ 'bottom': '-320px' }, 300);
		} else {
			//$('#pastClues').css('bottom', '0px');
			$('#pastClues').animate({ 'bottom': '0px' }, 300);
		}
	});

	$('#messageForm').on('submit', function(e) {
		e.preventDefault();
		//alert('MESSAGE SENT!');
		socket.emit('message', $('#'+meta('role')+' p').html(), $('#messageField').val());
		$('#messageField').val('');
	});

	socket.on('newMessage', function(user, message) {
		//alert('Message:' + user + message);
		if ($('#chat').css('bottom') === '-360px') {
			for (var i=0; i<1; i++) {
				$('#chat').animate({ opacity: 0.5 }, 300);
				$('#chat').animate({ opacity: 1 }, 300);
			}
		}
		$('#messages ul').append('<li class="message"><span class="chatName">'+user+':</span> '+message+'</li><br>');
		$('#messages').scrollTop($('#messages')[0].scrollHeight);
	});

	$('#newGame').on('click', function(e) {
		e.preventDefault();
		socket.emit('newGame');
	})
	
	/*window.onunload = window.onbeforeunload = function() {
		return "Are you really sure?\nRefreshing the page may make you lose game data!";
	};*/
	window.addEventListener("beforeunload", function (e) {
		if (refreshOverride) {
			console.log('REFRESH');
			var confirmationMessage = "Are you really sure?\nRefreshing the page may make you lose game data!";
			e.preventDefault();
			e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
			return confirmationMessage;              // Gecko, WebKit, Chrome <34
		}
	});
	/*$(window).on('beforeunload', function) {
		return "Are you really sure?\nRefreshing the page may disconnect you from the game!";
	});*/

}, false);


/* ========================================================
 * ==================  Helper Functions  ==================
 * ======================================================== */

function startGameDisplay(interv, turn, timer) {
	$('#blueScore').html('9');
	$('#redScore').html('8');
	console.log('Game Started');
	colorPlayer(meta('currentTurn'), true);

	$('#waiting').css('display', 'none');
	$('#cards').css('opacity', '1');
	$('#controls').css('opacity', '1');

	nextTurn(null, turn, timer);
	if (interv !== null) {
		clearInterval(interv);
		interv = window.setInterval(timeTick, 1000);
	}

	var spymasterView = true;
	var role = meta('role');
	if (role === 'BFA' || role === 'RFA') {
		spymasterView = false;
	}

	if (spymasterView) {
		$('.card').css('cursor', 'default');
		// BOX SHADOW STYLE
		$('.R').css('box-shadow', '0 0 5px 3px rgb(202,0,32)');
		$('.B').css('box-shadow', '0 0 5px 3px rgb(5,113,176)');
		$('.assassin').css('box-shadow', '0 0 5px 3px #222');

		$('.R').css('background-color', 'rgb(255,204,139)');
		$('.B').css('background-color', 'rgb(185,204,189)');
		$('.assassin').css('background-color', 'rgb(215,204,149)');

	} else {
		$('.card').css('box-shadow', '0 0 5px 2px #ffea9f');
	}

}

function revealCard(wordIdx, cardTeam) {
	console.log(wordIdx + ' ' + cardTeam);
	$('#history ul').append('<li class="guess">  &ndash; '+$('.'+wordIdx).children().html()+'</li>');
	if (cardTeam === 'B') {
		$('#blueScore').html($('#blueScore').html()*1 - 1);
		$('.'+wordIdx).css('background-color', 'rgb(5,113,176)');
		$('.'+wordIdx).css('box-shadow', 'none');
		$($('.'+wordIdx).children()).css('background-color', 'rgb(146,197,222)');
		$($('.'+wordIdx).children()).css('opacity', '0.2');
		if ($('#blueScore').html() === '0') {
			gameOver('B');
		}
	} else if (cardTeam === 'R') {
		$('#redScore').html($('#redScore').html()*1 - 1);
		$('.'+wordIdx).css('background-color', 'rgba(202,0,32,1)');
		$('.'+wordIdx).css('box-shadow', 'none');
		$($('.'+wordIdx).children()).css('background-color', 'rgb(244,165,130)');
		$($('.'+wordIdx).children()).css('opacity', '0.2');
		if ($('#redScore').html() === '0') {
			gameOver('R');
		}
	} else if (cardTeam === 'neutral') {
		$('.'+wordIdx).css('background-color', 'rgb(215,184,119)');
		$('.'+wordIdx).css('box-shadow', 'none');
		$($('.'+wordIdx).children()).css('background-color', 'rgb(235,235,192)');
		$($('.'+wordIdx).children()).css('opacity', '0.2');
	} else {
		//alert('Game Over!');
		$('.'+wordIdx).css('background-color', 'rgb(69,64,59)');
		$('.'+wordIdx).css('box-shadow', 'none');
		$($('.'+wordIdx).children()).css('background-color', 'rgb(235,235,235)');
		$($('.'+wordIdx).children()).css('opacity', '0.2');
		if (meta('currentTurn')[0] === 'B') {
			gameOver('R');
		} else {
			gameOver('B');
		}
	}
	/*
	for (var i=0; i<2; i++) {
		$('.'+wordIdx).animate({opacity: 0.5}, 500);
		$('.'+wordIdx).animate({opacity: 1}, 500);
	}
	*/
}

function nextTurn(prevRole, currRole, time) {
	if (meta('currentTurn') === 'gameOver') {
		return;
	}
	displayTurn(prevRole, currRole);
	setMeta('currentTurn', currRole);
	$('#minutes').html(time.split(':')[0]);
	$('#seconds').html(time.split(':')[1]);

	$('#timer p').css('color', 'black');
}

function displayTurn(prev, role) {
	if (role[0] === 'B') {
		$('#blueTurn').css('display', 'block');
		$('#redTurn').css('display', 'none');
	} else {
		$('#blueTurn').css('display', 'none');
		$('#redTurn').css('display', 'block');
	}
	colorPlayer(role, true);
	if (role === meta('role')) {
		for (var i=0; i<2; i++) {
			$('#'+role).animate({ opacity: 0.5 }, 200);
			$('#'+role).animate({ opacity: 1 }, 200);
		}
	}
	if (prev !== null) {
		colorPlayer(prev, false);
	}
}

function colorPlayer(role, bold) {
	if (role[0] === 'B') {
		if (bold) {
			$('#'+role).css('background-color', 'rgba(5,113,176,1)');
			$('#'+role).css('box-shadow', '0 0 7px 3px white');
		} else {
			$('#'+role).css('background-color', 'rgba(5,113,176,0.5)');
			$('#'+role).css('box-shadow', 'none');
		}
	} else {
		if (bold) {
			$('#'+role).css('background-color', 'rgba(202,0,32,1)');
			$('#'+role).css('box-shadow', '0 0 7px 3px white');
		} else {
			$('#'+role).css('background-color', 'rgba(202,0,32,0.5)');
			$('#'+role).css('box-shadow', 'none');
		}
	}
}

function gameOver(winner) {
	colorPlayer(meta('currentTurn'), false);
	$('#clue').html('&mdash;');
	$('.card').css('cursor', 'default');
	$('#cards').css('opacity', '0.8');
	$('#controls').css('opacity', '0.3');
	$('#seconds').html('00');
	$('#minutes').html('0');
	setMeta('currentTurn', 'gameOver');
	//clearInterval(interv);

	var team = 'Red Team';
	if (winner === 'B') {
		team = 'Blue Team';
	}
	$('#gameOver p').html('The '+team+' wins!');
	$('#gameOver').css('display', 'block');
	socket.emit('revealUnguessedCards', function(cards) {
		for(var i=0; i<cards.length; i++) {
			if (cards[i].team === 'R') {
				$('.'+cards[i].index).css('box-shadow', '0 0 5px 3px rgb(202,0,32)');
				$('.'+cards[i].index).css('background-color', 'rgb(255,204,139)');
			} else if (cards[i].team === 'B') {
				$('.'+cards[i].index).css('box-shadow', '0 0 5px 3px rgb(5,113,176)');
				$('.'+cards[i].index).css('background-color', 'rgb(185,204,189)');
			} else if (cards[i].team === 'assassin') {
				$('.'+cards[i].index).css('box-shadow', '0 0 5px 3px #222');
				$('.'+cards[i].index).css('background-color', 'rgb(215,204,149)');
			}
		}
	});
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

function timerIncrement() {
	console.log('INACTIVE: ' + idleTime + ' minutes');
    idleTime++;
    if (idleTime > 10) { // 10 minutes
    	refreshOverride = false;
    	socket.disconnect();
        //window.location.href = '/idle';
    }
}
