// This code will be executed when the page finishes loading
window.addEventListener('load', function(){
	
	var interv = window.setInterval(timeTick, 1000);

	$('h1').on('click', function(){ 
		console.log('Click!');
		if ($('#redTurn').css('display') === 'block') {
			console.log('Blue');
			$('#blueTurn').css('display', 'block');
			$('#redTurn').css('display', 'none');
		} else {
			console.log('Red');
			$('#blueTurn').css('display', 'none');
			$('#redTurn').css('display', 'block');
		}
	});

	/* BORDER STYLE
	$('.red').css('border', '3px solid rgb(202,0,32)');
	$('.blue').css('border', '3px solid rgb(5,113,176)');
	*/

	/* BACKGROUND STYLE
	$('.red').css('background-color', 'rgba(222,20,52,1)');
	$('.blue').css('background-color', 'rgba(25,133,196,1)');
	*/

	var spymasterView = true;

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

}, false);

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
