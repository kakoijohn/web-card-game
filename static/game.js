/** 

Setup sockets and event listeners

**/

var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

//disable right click default function
if (document.addEventListener) {
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  }, false);
} else {
  document.attachEvent('oncontextmenu', function() {
    window.event.returnValue = false;
  });
}

function touchHandler(event) {
    var touch = event.changedTouches[0];

    var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent({
        touchstart: "mousedown",
        touchmove: "mousemove",
        touchend: "mouseup"
    }[event.type], true, true, window, 1,
        touch.screenX, touch.screenY,
        touch.clientX, touch.clientY, false,
        false, false, false, 0, null);

    touch.target.dispatchEvent(simulatedEvent);
}

function initTouchHandler() {
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, true);
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);
}

var poker_tableWidth;
var poker_tableHeight;

var numCards = 24;

//set up our drawing canvas
var canvas = document.getElementById('drawing_area');
var ctx = canvas.getContext('2d');

var inMemCanvas = document.createElement('canvas');
var inMemCtx = inMemCanvas.getContext('2d');

/** 

Construct the deck and the draw area

**/

$(document).ready(function() {
	initTouchHandler();

	//setup game board with numCards cards	
	for (var i = 1; i <= numCards; i++) {
		$('.poker_table').append(
			"<div id=\"card_" + i + "\" class=\"card\">" +
				"<div class=\"card_inner\" id=\"card_" + i + "_inner\">" +
					"<div id=\"card_" + i + "\" class=\"card_back\"></div>" +
					"<div id=\"card_" + i + "\" class=\"card_front\" style=\"background: url('/resources/euchre_cards/card_" + i + ".svg');\">" +
			"</div></div></div>"
		);
	}
	
	poker_tableWidth = $('.poker_table').width();
	poker_tableHeight = $('.poker_table').height();

	canvas.width = poker_tableWidth;
	canvas.height = poker_tableHeight;
});

$( window ).resize(function() {
	poker_tableWidth = $('.poker_table').width();
	poker_tableHeight = $('.poker_table').height();

	inMemCanvas.width = poker_tableWidth;
	inMemCanvas.height = poker_tableHeight;
	inMemCtx.drawImage(canvas, 0, 0, poker_tableWidth, poker_tableHeight);

	canvas.width = poker_tableWidth;
	canvas.height = poker_tableHeight;

	ctx.drawImage(inMemCanvas, 0, 0);
});


/** 

Set up our player variables and send the data to the server.

**/

var playerInfo = {
	username: 'null',
	cleanID: 'null',
	pointerX: 0,
	pointerY: 0,
	nametagX: 0,
	nametagY: 0,
	color: 'null',

	chips: {chip_1: 0, chip_5: 0, chip_25: 0, chip_50: 0, chip_100: 0}
}

//setup the user on the server
var newPlayerCall;
$(document).on('click', '.name_submit_btn', function(evt) {
	var username = $('#dname').val();
	var color = $('#dcolor').val();

	//let the server know we have a new player every 5 seconds until we receive a response.
	socket.emit('new player', {username, color});
	newPlayerCall = setInterval(function() {
		socket.emit('new player', {username, color});
	}, 5000);

	//hide the form once we have submitted the info to the server
	$('.display_name_form').css('display', 'none');
});

socket.on('new player confirmation', function(newPlayer) {
	playerInfo.username = newPlayer.username;
	playerInfo.cleanID = newPlayer.cleanID;
	playerInfo.color = newPlayer.color;

	$('#pointer_icon').css('box-shadow', '0px 0px 0px 0.2vw ' + playerInfo.color);
	cursorMode =  'pointer';

	clearInterval(newPlayerCall);

	//hide the loading bar once we have submitted the info to the server
	$('.loading_area').css('display', 'none');
});

socket.on('new player notification', function(players) {
	for (var id in players) {
		var player = players[id];

		if ($('#' + player.cleanID).length == 0) {
			//we don't have a player by that id yet, create them on our game board.
			$('body').append("<div class=\"player player_anim\" id=\"" + player.cleanID + "\"><div class=\"nametag\">" + player.username + "</div></div>");

			$('.poker_table').append("<div class=\"floating_nametag\" id=\"" + player.cleanID + "_floating_nametag\">" + player.username + 
									 "<div class=\"player_cash\"></div></div>");

			$('#' + player.cleanID + "_floating_nametag").css('left', player.nametagX + '%');
			$('#' + player.cleanID + "_floating_nametag").css('top', player.nametagY + '%');
		}

		//toggle animation off for our cursor.
		if (id == playerInfo.cleanID)
			$('#' + player.cleanID).toggleClass('player_anim', false);

		$('#' + player.cleanID).css('background-color', player.color);
		$('#' + player.cleanID + "_floating_nametag .player_cash").css('border-color', player.color);
	}
});

socket.on('reload page', function() {
	location.reload();
});

/** 

Game Logic

**/

var targetCard = {
	index: 0,
  	x: 0,
  	y: 0
}

var targetChip = {
	index: 0,
	x: 0,
	y: 0,
	targetUsername: ''
}

var targetNametag = {
	nametagID: '',
	x: 0,
	y: 0,
}

var draggingCard;
var cardClick;
var draggingChip;
var draggingNametag;
var drawing;
var cursorMode;
var prevDrawPointX;
var prevDrawPointY;
var offsetX;
var offsetY;

/** 

Player Mouse Events

**/

//when card is single clicked
$(document).on('mousedown', '.card', function(evt) {
	if (evt.which == 1 && !evt.metaKey && !evt.ctrlKey) {
		//left click event
		draggingCard = true;
		cardClick = true;
		drawing = false;
		draggingChip = false;
		draggingNametag = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetCardID = $(evt.target).attr('id');
		var targetCardIndex = parseInt(targetCardID.replace("card_", '')) - 1;

		targetCard.index = targetCardIndex;
	} else if (evt.which == 3 || (evt.which == 1 && evt.metaKey) || (evt.which == 1 && evt.ctrlKey)) {
		//right click event
		peekCard(evt);
	}
});

$(document).on('click', '.card', function(evt) {
	if (cardClick == true && draggingCard == false) {
		peekCard(evt);
		cardClick = false;			
	}
});

function peekCard(evt) {
	var targetCardID = $(evt.target).attr('id');
	var targetCardIndex = parseInt(targetCardID.replace("card_", '')) - 1;
	
	//check to see if card is already face up, 
	//if not we reveal it to the player then send a message to the server saying we flipped it.
	if (! $('#' + targetCardID + '_inner').hasClass('card_rotate_global')) {
		$('#' + targetCardID + '_inner').toggleClass('card_rotate_local');
		
		//if we are peeking that card, tell the server that we are peeking the card, else clear that value
		if ($('#' + targetCardID + '_inner').hasClass('card_rotate_local'))
			socket.emit('card peek', {targetCardIndex, playerColor: playerInfo.color});
		else
			socket.emit('card peek', {targetCardIndex, playerColor: ''});
	}
}

$(document).on('mousedown', '.chip', function(evt) {
	if (evt.which == 1) {
		//left click event
		draggingChip = true;
		draggingCard = false;
		draggingNametag = false;
		drawing = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetChipID = $(evt.target).attr('id');

		targetChip.index = targetChipID;
		targetChip.targetUsername = playerInfo.cleanID;

		// console.log(((evt.pageX - offsetX) / poker_tableWidth * 100) + ", " + ((evt.pageY - offsetY) / poker_tableHeight * 100));	
	}
});

$(document).on('mousedown', '.floating_nametag', function(evt) {
	if (evt.which == 1) {
		//left click event
		draggingNametag = true;
		draggingChip = false;
		draggingCard = false;
		drawing = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetNametagID = $(evt.target).attr('id');
		if (targetNametagID == undefined)
			targetNametagID = $(evt.target).parent().attr('id');

		targetNametag.nametagID = targetNametagID;
	}
});

$(document).on('mousedown', '#drawing_area', function(evt) {
	if (evt.which == 1 && (cursorMode == 'pencil' || cursorMode == 'eraser')) {
		drawing = true;
		draggingCard = false;
		draggingChip = false;
		draggingNametag = false;

		prevDrawPointX = evt.pageX / canvas.width;
		prevDrawPointY = evt.pageY / canvas.height;	
	}
});

$(window).mousemove(function (evt) {
	if (draggingCard) {
		targetCard.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetCard.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		socket.emit('move card', targetCard);

		if (cardClick) {
			//bring the clicked card to the front.
			socket.emit('target card to top', targetCardIndex);	
		}

		cardClick = false;
	} else if (drawing) {
		var data = {fromX: prevDrawPointX, fromY: prevDrawPointY, 
			toX: evt.pageX / canvas.width, toY: evt.pageY / canvas.height, 
			playerID: playerInfo.cleanID, color: playerInfo.color, mode: cursorMode}
		
		//draw on our own cavas first
		drawOnCanvas(data);
		//next send that info over to the server.
		socket.emit('new draw line', data);

		prevDrawPointX = evt.pageX / canvas.width;
		prevDrawPointY = evt.pageY / canvas.height;
	} else if (draggingChip) {
		targetChip.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetChip.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		socket.emit('move chip', targetChip);
	} else if (draggingNametag) {
		targetNametag.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetNametag.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		socket.emit('move nametag', targetNametag);
	}

	//move player cursor indicator
	playerInfo.pointerX = evt.pageX / poker_tableWidth;
	playerInfo.pointerY = evt.pageY / poker_tableHeight;
	
	$('#' + playerInfo.cleanID).css('left', evt.pageX);
	$('#' + playerInfo.cleanID).css('top', evt.pageY);
	$('#' + playerInfo.cleanID).css('-webkit-transform', 'translate3d(0,0,0)');
});

$(window).mouseup(function() {
	if (draggingCard) {
		draggingCard = false;
	}

	if (drawing)
		drawing = false;

	if (draggingChip) {
		draggingChip = false;

		socket.emit('release chip', targetChip);
	}

	if (draggingNametag) {
		draggingNametag = false;
	}
});

//when card is double clicked
$(document).on('dblclick', '.card', function(evt) {
	var targetCardID = $(evt.target).attr('id');
	var targetCardIndex = parseInt(targetCardID.replace("card_", '')) - 1;

	socket.emit('flip card global', targetCardIndex);
	socket.emit('card peek', {targetCardIndex, playerColor: ''});
});

/** 

Player Button Events

**/

$(document).on('click', '.shuffle_btn', function(evt) {
	socket.emit('shuffle cards');
});
$(document).on('click', '.deal_submit_btn', function(evt) {
	var numPlayers = $('#numplayers').val();
	var numCardsDealt = $('#numcards').val();
	
	if (isNaN(numPlayers))
		numPlayers = 0;
	if (isNaN(numCardsDealt))
		numCardsDealt = 0;

	socket.emit('deal cards', {numPlayers, numCardsDealt});
});

$(document).on('click', '#pointer_icon', function(evt) {
	$('#pointer_icon').css('box-shadow', '0px 0px 0px 0.2vw ' + playerInfo.color);
	$('#pencil_icon').css('box-shadow', '');
	$('#eraser_icon').css('box-shadow', '');

	cursorMode = 'pointer';
	$('#drawing_area').css('cursor', 'default');
	$('.poker_table').css('touch-action', 'auto');
	$('.clear_scroll_bar').css('display', 'none');
});
$(document).on('click', '#pencil_icon', function(evt) {
	$('#pencil_icon').css('box-shadow', '0px 0px 0px 0.2vw ' + playerInfo.color);
	$('#pointer_icon').css('box-shadow', '');
	$('#eraser_icon').css('box-shadow', '');

	cursorMode = 'pencil';
	$('#drawing_area').css('cursor', 'url(\'/resources/icons/pencil.png\'), crosshair');
	$('.poker_table').css('touch-action', 'none');
	$('.clear_scroll_bar').css('display', 'block');
});
$(document).on('click', '#eraser_icon', function(evt) {
	$('#eraser_icon').css('box-shadow', '0px 0px 0px 0.2vw ' + playerInfo.color);
	$('#pointer_icon').css('box-shadow', '');
	$('#pencil_icon').css('box-shadow', '');

	cursorMode = 'eraser';
	$('#drawing_area').css('cursor', 'url(\'/resources/icons/eraser.png\'), cell');
	$('.poker_table').css('touch-action', 'none');
	$('.clear_scroll_bar').css('display', 'block');
});
$(document).on('dblclick', '#eraser_icon', function(evt) {
	socket.emit('clear draw area');
});


/** 

send our player state to the server

**/

//emit the player position 24 times per second
setInterval(function() {
	//only emit the player state if we have received an id from the server.
	if (playerInfo.username != 'null')
		socket.emit('broadcast player state', playerInfo);
}, 1000 / 24);

/** 

Listen for the sever for states of the deck, chips, and other players.

**/

//listen for the state of the deck from server
socket.on('deck state', function(deck) {
  	for (var i = 0; i < numCards; i++) {
    	$('#card_' + (i + 1)).css('left', deck[i].x + "%");
    	$('#card_' + (i + 1)).css('top', deck[i].y + "%");
    	$('#card_' + (i + 1)).css('z-index', deck[i].zIndex);

    	if (deck[i].showCard) {
			$('#card_' + (i + 1) + '_inner').toggleClass('card_rotate_global', true);
			$('#card_' + (i + 1) + '_inner').toggleClass('card_rotate_local', false);

			$('#card_' + (i + 1) + '_inner').css('box-shadow', '');
    	} else {
			$('#card_' + (i + 1) + '_inner').toggleClass('card_rotate_global', false);

			if (deck[i].peekCardCol != '') {
				$('#card_' + (i + 1) + '_inner').css('box-shadow', '0px 0px 0px 3px ' + deck[i].peekCardCol);
			} else {
				$('#card_' + (i + 1) + '_inner').css('box-shadow', '');
			}
		}

  	}
});

socket.on('chips state', function(chips) {
	//first remove any chips that aren't ours anymore.
	$('.chip').each(function() {
	    var chipID = this.id;

	    if (chips[chipID] != undefined) {
	    	if (chips[chipID].owner != "table" && chips[chipID].owner != playerInfo.cleanID) {
	    		$('#' + chipID).remove();
	    	}
	    } else {
	    	$('#' + chipID).remove();
	    }
	});

	var tableChipTotal = 0;
	for (var id in chips) {
		var chip = chips[id];

		if (chip.owner == playerInfo.cleanID || chip.owner == "table") {
			if ($('#' + id).length == 0)
				$('.poker_table').append("<div id=\"" + id + "\" class=\"chip chip_" + chip.value + "\"></div>");

			$('#' + id).css('left', chip.x + "%");
			$('#' + id).css('top', chip.y + "%");
			$('#' + id).css('-webkit-transform', 'translate3d(0,0,0)');
		}

		if (chip.owner == 'table') {
			tableChipTotal += chip.value;
		}
	}

	if ($('#table_floating_nametag .player_cash').text() != ('$ ' + tableChipTotal))
		$('#table_floating_nametag .player_cash').text('$ ' + tableChipTotal);
});

//listen for player state information from server
socket.on('player state', function(players) {
	for (var id in players) {
		var player = players[id];

		if (id != playerInfo.cleanID) {
			//if not us we update everyone else's cursor on our screen
			$('#' + player.cleanID).css('left', player.pointerX * poker_tableWidth);
			$('#' + player.cleanID).css('top', player.pointerY * poker_tableHeight);
			$('#' + player.cleanID).css('-webkit-transform', 'translate3d(0,0,0)');

			if (player.nametagY > 100)
				$('#' + player.cleanID + "_floating_nametag").css('display', 'none');
			else
				$('#' + player.cleanID + "_floating_nametag").css('display', '');
		} else {
			//update our chip count.
			if ($('#chip_1_holder h4').text() != player.chips['chip_1'])
				$('#chip_1_holder h4').text(player.chips['chip_1']);
			if ($('#chip_5_holder h4').text() != player.chips['chip_5'])
				$('#chip_5_holder h4').text(player.chips['chip_5']);
			if ($('#chip_25_holder h4').text() != player.chips['chip_25'])
				$('#chip_25_holder h4').text(player.chips['chip_25']);
			if ($('#chip_50_holder h4').text() != player.chips['chip_50'])
				$('#chip_50_holder h4').text(player.chips['chip_50']);
			if ($('#chip_100_holder h4').text() != player.chips['chip_100'])
				$('#chip_100_holder h4').text(player.chips['chip_100']);
		}

		$('#' + player.cleanID + '_floating_nametag').css('left', player.nametagX + '%');
		$('#' + player.cleanID + '_floating_nametag').css('top', player.nametagY + '%');
		$('#' + player.cleanID + '_floating_nametag').css('-webkit-transform', 'translate3d(0,0,0)');
		var playerChipTotal = (player.chips['chip_1']) +
							  (player.chips['chip_5'] * 5) +
							  (player.chips['chip_25'] * 25) +
							  (player.chips['chip_50'] * 50) +
							  (player.chips['chip_100'] * 100);
		if ($('#' + player.cleanID + '_floating_nametag .player_cash').text() != ('$ ' + playerChipTotal))
			$('#' + player.cleanID + '_floating_nametag .player_cash').text('$ ' + playerChipTotal);
	}
});

//listen for reset deck call from server
socket.on('reset deck', function() {
	//animate the cards returning to the deck
	$('.card').toggleClass('card_return_to_deck_anim', true);
	setTimeout(function() {
		$('.card').toggleClass('card_return_to_deck_anim', false);
	}, 1000);

	//reset the peek state of all cards in deck
	for (var i = 1; i <= numCards; i++)
		$('#card_' + i + '_inner').toggleClass('card_rotate_local', false);
});

//listen for reset chip call from server
socket.on('reset chip', function(chipIndex) {
	//animate the cards returning to the deck
	$('#' + chipIndex).toggleClass('card_return_to_deck_anim', true);
	setTimeout(function() {
		$('#' + chipIndex).toggleClass('card_return_to_deck_anim', false);
	}, 1000);
});


/** 

canvas line drawing events

**/

function drawOnCanvas(data) {
	ctx.beginPath();

	if (data.mode == 'pencil') {
		ctx.globalCompositeOperation = 'source-over';
		ctx.strokeStyle = data.color;
		ctx.lineWidth = 3;	
	} else if (data.mode == 'eraser') {
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineWidth = 20;
	}
	
	ctx.moveTo(data.fromX * canvas.width, data.fromY * canvas.height);
	ctx.lineTo(data.toX * canvas.width, data.toY * canvas.height);
	ctx.lineJoin = ctx.lineCap = 'round';
	ctx.stroke();
	ctx.closePath();
}

socket.on('new draw line', function(data) {
	//if not us we draw the line from the other user.
	if (data.playerID != playerInfo.username)
		drawOnCanvas(data);
});

socket.on('clear draw area', function() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});



/** 

Youtube player stuff

**/


var youtubePlayerEnabled = true;
var youtubePlaying = false;
var youtubeVolume = 1;
var youtubeLink;
var youtubePlayer;

var ytScriptTag = document.createElement('script');

ytScriptTag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(ytScriptTag, firstScriptTag);

function onYouTubeIframeAPIReady() {
	youtubePlayer = new YT.Player('youtube_player_iframe', {
		height: '390',
        width: '640',
        playerVars: {
        	'playsinline': 1,
        	'showinfo': 0,
        	'rel': 0,
        	'modestbranding': 0,
        	'controls': 0,
        	'origin': 'https://www.youtube.com'
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
	youtubePlayer.setVolume(10);
	youtubePlayer.setLoop(true);
}

function onPlayerStateChange(event) {
	$('.youtube_currently_playing').text(youtubePlayer.getVideoData().title);

	if (youtubePlayer.getPlayerState() == YT.PlayerState.ENDED) {
		socket.emit('play next video');
	}
}

socket.on('load youtube video', function(videoId) {
	if (youtubePlayerEnabled) {
		youtubePlayer.loadVideoById(videoId);
		youtubePlayer.playVideo();

		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', true);
		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', false);
		youtubePlaying = true;
	}
});

socket.on('pause youtube video', function() {
	if (youtubePlayerEnabled) {
		youtubePlayer.pauseVideo();	

		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', true);
		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', false);
		youtubePlaying = false;
	}
});

socket.on('play youtube video', function() {
	if (youtubePlayerEnabled) {
		youtubePlayer.playVideo();

		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', true);
		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', false);
		youtubePlaying = true;
	}
});

$(document).on('click', '#enable_youtube_link_btn', function(evt) {
	if (!youtubePlayerEnabled) {
		$('.youtube_player').toggleClass('youtube_player__enabled', true);
		$('#enable_youtube_link_btn').text('Disable YT Player');
		youtubePlayerEnabled = true;
	} else {
		$('.youtube_player').toggleClass('youtube_player__enabled', false);
		$('#enable_youtube_link_btn').text('Enable Youtube Player');
		youtubePlayerEnabled = false;

		pauseVideo();
	}
});

$(document).on('click', '#submit_youtube_link_btn', function(evt) {
	if (youtubePlayerEnabled) {
		var url = $('#youtube_player_link').val();
		if (url != undefined && url != '') {
			var videoId = url.split('v=')[1];
			var ampersandPosition = videoId.indexOf('&');
			if(ampersandPosition != -1) {
			  videoId = videoId.substring(0, ampersandPosition);
			}

			socket.emit('queue youtube video', videoId);
			
			$('#youtube_player_link').val('');
		}
	}
});

$(document).on('click', '#youtube_pause_play_btn', function(evt) {
	if (youtubePlayerEnabled) {
		if (youtubePlaying) {
			socket.emit('pause youtube video');
		} else {
			socket.emit('play youtube video');
		}
	}
});

$(document).on('click', '#youtube_volume_btn', function(evt) {
	if (youtubePlayerEnabled) {
		switch (youtubeVolume) {
			case 1:
				youtubePlayer.setVolume(60);
				youtubeVolume = 2;
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', true);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', false);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', false);
				break;
			case 2:
				youtubePlayer.setVolume(100);
				youtubeVolume = 3;
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', true);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', false);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', false);
				break;
			case 3:
				youtubePlayer.setVolume(10);
				youtubeVolume = 1;
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', true);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', false);
				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', false);
				break;
		}
	}
});

$(document).on('click', '#youtube_next_btn', function(evt) {
	socket.emit('play next video');
});

$(document).on('click', '#youtube_previous_btn', function(evt) {
	socket.emit('play previous video');
});


function servercmd(command) {
	socket.emit('console command', command);
}