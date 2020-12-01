/**

Setup sockets and event listeners

**/

var socket = io();
var socketWasConnected = false;

socket.on('message', function(data) {
  console.log(data);
});

socket.on('connect', function() {
  if (socketWasConnected) {
    $('.player').each(function(index) {
      $(this).remove();
    });
    $('.floating_nametag').each(function(index) {
      $(this).remove();
    });

    var username = $('#dname').val();
  	var color = $('#dcolor').val();

  	//let the server know we have a new player every 5 seconds until we receive a response.
  	socket.emit('new player', {username, color});
  	newPlayerCall = setInterval(function() {
  		socket.emit('new player', {username, color});
  	}, 5000);

    console.log("Re-established connection to server.");
    $('.disconnected_screen').css('display', 'none');
  }
});

socket.on('disconnect', function() {
  console.log("Disconnected from server... Waiting for reconnect...");
  $('.disconnected_screen').css('display', 'block');
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

window.addEventListener('keydown', function(e) {
  if(e.keyCode == 32 && e.target == document.body) {
    e.preventDefault();
  }
  if(e.keyCode == 37 && e.target == document.body) {
    e.preventDefault();
  }
  if(e.keyCode == 38 && e.target == document.body) {
    e.preventDefault();
  }
  if(e.keyCode == 39 && e.target == document.body) {
    e.preventDefault();
  }
  if(e.keyCode == 40 && e.target == document.body) {
    e.preventDefault();
  }
});

var poker_tableWidth;
var poker_tableHeight;

var numCards;
var deckName;

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

function loadDeck(numCardsVar, deckNameVar) {
	numCards = numCardsVar;
	deckName = deckNameVar;

	$('.deck_area h2').text(deckName.charAt(0).toUpperCase() + deckName.slice(1) + " Deck");

	//if we have existing cards on the table, remove them first.
	$('.card').each(function() {
	    var cardID = this.id;
	    $('#' + cardID).remove();
	});

	//setup game board with numCards cards
	for (var i = 0; i < numCards; i++) {
		$('.poker_table').append(
			"<div id=\"card_" + i + "\" class=\"card\">" +
				"<div class=\"card_inner\" id=\"card_" + i + "_inner\">" +
					"<div id=\"card_" + i + "\" class=\"card_back\"></div>" +
					"<div id=\"card_" + i + "\" class=\"card_front\" style=\"background: url('/resources/cards/" + deckName + "/card_" + (i + 1) + ".svg');\">" +
			"</div></div></div>"
		);
	}
}

/**

Set up our player variables and send the data to the server.

**/

var playerInfo = {
	username: 'null',
	id: 'null',
	pointerX: 0,
	pointerY: 0,
	nametagX: 0,
	nametagY: 0,
  tankX: 0,
  tankY: 0,
  tankRot: 0,
	color: 'null',
	stateChanged: false,

	chips: {chip_1: 0, chip_5: 0, chip_25: 0, chip_50: 0, chip_100: 0}
}

//setup the user on the server
var newPlayerCall;

function newPlayerSubmit() {
  var username = $('#dname').val();
  var color = $('#dcolor').val();

  //let the server know we have a new player every 5 seconds until we receive a response.
  socket.emit('new player', {username, color});
  newPlayerCall = setInterval(function() {
    socket.emit('new player', {username, color});
  }, 5000);

  //hide the form once we have submitted the info to the server
  $('.display_name_form').css('display', 'none');
}

$(document).on('click', '.name_submit_btn', function(evt) {
  newPlayerSubmit();
});

$('#dname').keypress(function(event) {
    if (event.keyCode == 13 || event.which == 13)
        newPlayerSubmit();
});
$('#dcolor').keypress(function(event) {
    if (event.keyCode == 13 || event.which == 13)
        newPlayerSubmit();
});

socket.on('new player confirmation', function(newPlayer) {
	playerInfo.username = newPlayer.username;
	playerInfo.id = newPlayer.id;
	playerInfo.color = newPlayer.color;

	loadDeck(newPlayer.numCards, newPlayer.deckName);

	$('#pointer_icon').css('box-shadow', '0px 0px 0px 0.2vw ' + playerInfo.color);
	cursorMode =  'pointer';

	clearInterval(newPlayerCall);
  socketWasConnected = true;

	//hide the loading bar once we have submitted the info to the server
	$('.loading_area').css('display', 'none');
});

socket.on('new player notification', function(info) {
	for (var id in info.players) {
		var player = info.players[id];

		if ($('#' + player.id).length == 0) {
			//we don't have a player by that id yet, create them on our game board.
			$('body').append("<div class=\"player player_anim\" id=\"" + player.id + "\"><div class=\"nametag\">" + player.username + "</div></div>");

			$('.poker_table').append("<div class=\"floating_nametag\" id=\"" + player.id + "_floating_nametag\">" + player.username +
									 "<div class=\"player_cash\"></div></div>");
      
      $('.poker_table').append("<div class=\"tank\" id=\"" + player.id + "_tank\">" +
                   $('#tank_base_svg_template').html().replace('user-fill-var', player.color + ' !important').replace(/st1/g, player.id + '_user_tank_color') +
                   "<div class=\"tank_gun\" id=\"" + player.id + "_tank_gun\">" + $('#tank_gun_svg_template').html() + "</div></div>");
                   
      $('.poker_table').append("<div class=\"cannonball\" id=\"" + player.id + "_cannonball\"></div>");

			$('#' + player.id + "_floating_nametag").css('left', player.nametagX + '%');
			$('#' + player.id + "_floating_nametag").css('top', player.nametagY + '%');
      
      $('#' + player.id + "_tank").css('left', info.playerVehicles[id].tankX + '%');
			$('#' + player.id + "_tank").css('top', info.playerVehicles[id].tankY + '%');
      
      $('#' + player.id + "_cannonball").css('left', info.playerVehicles[id].cBall.x + '%');
			$('#' + player.id + "_cannonball").css('top', info.playerVehicles[id].cBall.y + '%');
		}

		//toggle animation off for our cursor.
		if (id == playerInfo.id)
			$('#' + player.id).toggleClass('player_anim', false);

		$('#' + player.id).css('background-color', player.color);
		$('#' + player.id + "_floating_nametag .player_cash").css('border-color', player.color);
	}
});

socket.on('load new deck', function(deckInfo) {
	loadDeck(deckInfo.numCards, deckInfo.deckName);
});

socket.on('remove user', function(username) {
	if ($('#' + username).length != 0) {
		$('#' + username).remove();
		$('#' + username + '_floating_nametag').remove();
    $('#' + username + '_tank').remove();
    $('#' + username + "_cannonball").remove();
	}
});

socket.on('reload page', function() {
	location.reload();
});

/**

Game Logic

**/

var targetCard = {
	id: '',
	index: -1,
	x: 0,
	y: 0,
	released: true
}

var targetChip = {
	id: 0,
	x: 0,
	y: 0,
	targetUsername: '',
	released: true
}

var targetNametag = {
	nametagID: '',
	x: 0,
	y: 0,
	released: true
}

var targetTank = {
  playerID: '',
  x: 0,
  y: 0,
  rot: 0,
  gunRot: 0,
  released: true
}

var draggingCard;
var cardClick;
var draggingChip;
var draggingChipConfirm;
var draggingNametag;
var draggingTank;
var drawing;
var deckResetting;
var cursorMode;
var prevDrawPointX;
var prevDrawPointY;
var offsetX;
var offsetY;

var uArrow = false;
var dArrow = false;
var lArrow = false;
var rArrow = false;
var rGunMove = false;
var lGunMove = false;
var gunFire = false;

/**

Player Mouse Events

**/

//when card is single clicked
$(document).on('mousedown', '.card', function(evt) {
	targetCard.id = $(evt.target).attr('id');
	targetCard.index = parseInt(targetCard.id.replace("card_", ''));

	if (evt.which == 1 && !evt.metaKey && !evt.ctrlKey) {
		//left click event
		draggingCard = true;
		cardClick = true;
		drawing = false;
		draggingChip = false;
		draggingNametag = false;

		targetCard.released = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;
	} else if (evt.which == 3 || (evt.which == 1 && evt.metaKey) || (evt.which == 1 && evt.ctrlKey)) {
		//right click event
		peekCurCard();
	}
});

$(document).on('click', '.card', function() {
	if (cardClick) {
		peekCurCard();
		cardClick = false;
	}
});

function peekCurCard() {
	//check to see if card is already face up,
	//if not we reveal it to the player then send a message to the server saying we flipped it.
	if (! $('#' + targetCard.id + '_inner').hasClass('card_rotate_global')) {
		$('#' + targetCard.id + '_inner').toggleClass('card_rotate_local');

		//if we are peeking that card, tell the server that we are peeking the card, else clear that value
		if ($('#' + targetCard.id + '_inner').hasClass('card_rotate_local'))
			socket.emit('card peek', {targetCardIndex: targetCard.index, playerColor: playerInfo.color});
		else
			socket.emit('card peek', {targetCardIndex: targetCard.index, playerColor: ''});
	}
}

$(document).on('mousedown', '.chip', function(evt) {
	if (evt.which == 1) {
		//left click event
		draggingCard = false;
		draggingNametag = false;
		drawing = false;
		draggingChip = true;

		targetChip.released = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetChipID = $(evt.target).attr('id');

		targetChip.id = targetChipID;
		targetChip.targetUsername = playerInfo.id;

		socket.emit('pickup chip', targetChip);

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
    draggingTank = false;

		targetNametag.released = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetNametagID = $(evt.target).attr('id');
		if (targetNametagID == undefined)
			targetNametagID = $(evt.target).parent().attr('id');

		targetNametag.nametagID = targetNametagID;
	}
});

$(document).on('mousedown', '.tank', function(evt) {
	if (evt.which == 1) {
		//left click event
    draggingTank = true;
		draggingNametag = false;
		draggingChip = false;
		draggingCard = false;
		drawing = false;

		targetTank.released = false;

		offsetX = evt.pageX - $(evt.target).offset().left;
		offsetY = evt.pageY - $(evt.target).offset().top;

		var targetTankID = $(evt.target).attr('id');

		targetTank.playerID = targetTankID.replace('_tank', '');
	}
});

$(document).on('keydown', function(evt) {
	switch (evt.which) {
		case 38:
      // up arrow
      break;
    case 87:
      // w key
      uArrow = true;
			break;
		case 37:
      // left arrow
      lGunMove = true;
      break;
    case 65:
      // a key
			lArrow = true;
      break;
		case 39:
      // right arrow
      rGunMove = true;
      break;
    case 68:
      // d key
			rArrow = true;
      break;
    case 40:
      // down arrow
      break;
    case 83:
      // s key
      dArrow = true;
      break;
    case 32:
      // space bar
      gunFire = true;
      break;
	}
});

$(document).on('keyup', function(evt) {
  switch (evt.which) {
		case 38:
      // up arrow
      break;
    case 87:
      // w key
      uArrow = false;
			break;
		case 37:
      // left arrow
      lGunMove = false;
      break;
    case 65:
      // a key
			lArrow = false;
      break;
		case 39:
      // right arrow
      rGunMove = false;
      break;
    case 68:
      // d key
			rArrow = false;
      break;
    case 40:
      // down arrow
      break;
    case 83:
      // s key
      dArrow = false;
      break;
    case 32:
      // space bar
      gunFire = false;
      break;
	}
});

$(document).on('mousedown', '#drawing_area', function(evt) {
	if (evt.which == 1 && (cursorMode == 'pencil' || cursorMode == 'eraser')) {
		drawing = true;
		draggingCard = false;
		draggingChip = false;
		draggingNametag = false;
    draggingTank = false;

		prevDrawPointX = evt.pageX / canvas.width;
		prevDrawPointY = evt.pageY / canvas.height;
	}
});

$(document).on('touchstart', '#drawing_area', function(evt) {
	if (evt.touches.length > 1)
		drawing = false;
});

$(window).mousemove(function (evt) {
	if (draggingCard) {
		targetCard.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetCard.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		//move the card locally on our screen before sending the data to the server.
		$('#' + targetCard.id).css('left', targetCard.x + "%");
		$('#' + targetCard.id).css('top', targetCard.y + "%");
		//next send the card state to the server.
		socket.emit('move card', targetCard);

		if (cardClick) {
			//bring the clicked card to the front.
			socket.emit('target card to top', targetCard.index);
		}

		cardClick = false;
	} else if (drawing) {
		var data = {fromX: prevDrawPointX, fromY: prevDrawPointY,
			toX: evt.pageX / canvas.width, toY: evt.pageY / canvas.height,
			playerID: playerInfo.id, color: playerInfo.color, mode: cursorMode}

		//draw on our own cavas first
		drawOnCanvas(data);
		//next send that info over to the server.
		socket.emit('new draw line', data);

		prevDrawPointX = evt.pageX / canvas.width;
		prevDrawPointY = evt.pageY / canvas.height;
	} else if (draggingChip && draggingChipConfirm) {
		targetChip.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetChip.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		//move the chip locally on our screen before sending the data to the server.
		if (!targetChip.released) {
			$('#' + targetChip.id).css('left', targetChip.x + "%");
			$('#' + targetChip.id).css('top', targetChip.y + "%");
		}
		//next send the chip state to the server.
		socket.emit('move chip', targetChip);
	} else if (draggingNametag) {
		targetNametag.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetNametag.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);

		if (!targetNametag.released && targetNametag.nametagID != 'table_floating_nametag') {
			$('#' + targetNametag.nametagID).css('left', targetNametag.x + '%');
			$('#' + targetNametag.nametagID).css('top',  targetNametag.y + '%');
		}

		socket.emit('move nametag', targetNametag);
	} else if (draggingTank) {
    targetTank.x = ((evt.pageX - offsetX) / poker_tableWidth * 100);
		targetTank.y = ((evt.pageY - offsetY) / poker_tableHeight * 100);
    
    if (!targetTank.released) {
      $('#' + targetTank.playerID + '_tank').css('left', targetTank.x + '%');
      $('#' + targetTank.playerID + '_tank').css('top',  targetTank.y + '%');
    }

		socket.emit('drag tank', targetTank);
  }

	//move player cursor indicator
	playerInfo.pointerX = evt.pageX / poker_tableWidth;
	playerInfo.pointerY = evt.pageY / poker_tableHeight;

	$('#' + playerInfo.id).css('left', evt.pageX);
	$('#' + playerInfo.id).css('top', evt.pageY);

	playerInfo.stateChanged = true;
});

$(window).mouseup(function(evt) {
	if (draggingCard)
		draggingCard = false;

	if (!targetCard.released)
		targetCard.released = true;

	if (drawing) {
		var data = {fromX: prevDrawPointX, fromY: prevDrawPointY,
			toX: evt.pageX / canvas.width, toY: evt.pageY / canvas.height,
			playerID: playerInfo.id, color: playerInfo.color, mode: cursorMode}

		//draw on our own cavas first
		drawOnCanvas(data);
		//next send that info over to the server.
		socket.emit('new draw line', data);

		drawing = false;
	}

	if (draggingChip)
		draggingChip = false;

	if (draggingChipConfirm) {
		draggingChipConfirm = false;
		targetChip.released = true;
		socket.emit('release chip', targetChip);
	}

	if (draggingNametag)
		draggingNametag = false;
    
  if (draggingTank)
		draggingTank = false;

	if (!targetNametag.released)
		targetNametag.released = true;
});

//when card is double clicked
$(document).on('dblclick', '.card', function(evt) {
	var targetCardID = $(evt.target).attr('id');
	var targetCardIndex = parseInt(targetCardID.replace("card_", ''));

	socket.emit('flip card global', targetCardIndex);
	socket.emit('card peek', {targetCardIndex, playerColor: ''});
});

/**

Player Button Events

**/

$(document).on('click', '.shuffle_btn', function(evt) {
  if (!deckResetting)
	 socket.emit('shuffle cards');
});
$(document).on('click', '.deal_submit_btn', function(evt) {
  if (!deckResetting) {
    var numPlayers = $('#numplayers').val();
    var numCardsDealt = $('#numcards').val();

    if (isNaN(numPlayers))
      numPlayers = 0;
    if (isNaN(numCardsDealt))
      numCardsDealt = 0;

    socket.emit('deal cards', {numPlayers, numCardsDealt});
  }
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
	if (playerInfo.username != 'null') {
    // only send info to the server if the state has actually changed
		if (playerInfo.stateChanged) {
			socket.emit('broadcast player state', playerInfo);
			playerInfo.stateChanged = false;
		}
    
    // if any of the arrow keys are pressed, move the tank
    if (uArrow || lArrow || rArrow || dArrow || rGunMove || lGunMove)
      moveTank();
    if (gunFire)
      fireCannon();
	}
}, 1000 / 24);

function moveTank() {
  var moveDir = 0;
  var moveX = 0;
  var moveY = 0;
  var moveRot = 0;
  var gunRot = 0;
  
  if (uArrow)
    moveDir -= 1;
  if (dArrow)
    moveDir += 1;
  if (lArrow)
    moveRot -= 1;
  if (rArrow)
    moveRot += 1;
  if (rGunMove)
    gunRot += 1;
  if (lGunMove)
    gunRot -= 1;
  
  if (moveDir != 0) {
    var curTankRot = getRotationDegrees($('#' + playerInfo.id + '_tank'));
    var moveX = -1 * moveDir * Math.sin(curTankRot * (Math.PI / 180));
    var moveY = moveDir * Math.cos(curTankRot * (Math.PI / 180));
  }
  
  if (moveX != 0 || moveY != 0 || moveRot != 0 || gunRot != 0) {
    targetTank.playerID = playerInfo.id;
    targetTank.x = moveX;
		targetTank.y = moveY;
    targetTank.rot = moveRot;
    targetTank.gunRot = gunRot;
    socket.emit('steer tank', targetTank);
  }
}

function fireCannon() {
  targetTank.playerID = playerInfo.id;
  
  var curTankRot = getRotationDegrees($('#' + playerInfo.id + '_tank')) + getRotationDegrees($('#' + playerInfo.id + '_tank_gun'));
  targetTank.x = Math.sin(curTankRot * (Math.PI / 180));
  targetTank.y = -1 * Math.cos(curTankRot * (Math.PI / 180));
  
  socket.emit('spawn cannonball', targetTank);
}

function getRotationDegrees(obj) {
    var matrix = obj.css("-webkit-transform") ||
    obj.css("-moz-transform")    ||
    obj.css("-ms-transform")     ||
    obj.css("-o-transform")      ||
    obj.css("transform");
    if(matrix !== 'none') {
        var values = matrix.split('(')[1].split(')')[0].split(',');
        var a = values[0];
        var b = values[1];
        var angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
    } else { var angle = 0; }
    return (angle < 0) ? angle + 360 : angle;
}

/**

Listen for the sever for states of the deck, chips, and other players.

**/

//listen for the state of the deck from server
socket.on('deck state', function(deck) {
  	for (var i = 0; i < numCards; i++) {
  		if (targetCard.index != i || targetCard.released) {
  			$('#card_' + i).css('left', deck[i].x + "%");
  			$('#card_' + i).css('top', deck[i].y + "%");
  		}
    	$('#card_' + i).css('z-index', deck[i].zIndex);

    	if (deck[i].showCard) {
			$('#card_' + i + '_inner').toggleClass('card_rotate_global', true);
			$('#card_' + i + '_inner').toggleClass('card_rotate_local', false);

			$('#card_' + i + '_inner').css('box-shadow', '');
    	} else {
			$('#card_' + i + '_inner').toggleClass('card_rotate_global', false);

			if (deck[i].peekCardCol != '') {
				$('#card_' + i + '_inner').css('box-shadow', '0px 0px 0px 3px ' + deck[i].peekCardCol);
			} else {
				$('#card_' + i + '_inner').css('box-shadow', '');
			}
		}

  	}
});

socket.on('chips state', function(chips) {
	//first remove any chips that aren't ours anymore.
	$('.chip').each(function() {
	    var chipID = this.id;

	    if (chips[chipID] != undefined) {
	    	if (chips[chipID].owner != "table" && chips[chipID].owner != playerInfo.id) {
	    		$('#' + chipID).remove();
	    	}
	    } else {
	    	$('#' + chipID).remove();
	    }
	});

	var tableChipTotal = 0;
	for (var id in chips) {
		var chip = chips[id];

		if (chip.owner == playerInfo.id || chip.owner == "table") {
			if ($('#' + id).length == 0)
				$('.poker_table').append("<div id=\"" + id + "\" class=\"chip chip_" + chip.value + "\"></div>");

			if (targetChip.id != id || targetChip.released) {
				$('#' + id).css('left', chip.x + "%");
				$('#' + id).css('top', chip.y + "%");
			}

			if (chip.moverColor != '')
				$('#' + id).css('box-shadow', '0px 0px 0px 3px ' + chip.moverColor);
			else
				$('#' + id).css('box-shadow', '');
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

		if (id != playerInfo.id) {
			//if not us we update everyone else's cursor on our screen
			$('#' + player.id).css('left', player.pointerX * poker_tableWidth);
			$('#' + player.id).css('top', player.pointerY * poker_tableHeight);
      
      // if  the player's cursor is underneath the poker table, dont display it.
      if (player.pointerY > 1)
        $('#' + player.id).css('display', 'none');
      else
        $('#' + player.id).css('display', '');

			if (player.nametagY > 100)
				$('#' + player.id + "_floating_nametag").css('display', 'none');
			else
				$('#' + player.id + "_floating_nametag").css('display', '');
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

		if (targetNametag.nametagID != (player.id + '_floating_nametag') || targetNametag.released) {
			$('#' + player.id + '_floating_nametag').css('left', player.nametagX + '%');
			$('#' + player.id + '_floating_nametag').css('top', player.nametagY + '%');
		}
    
    if (targetNametag.nametagID != (player.id + '_floating_nametag') || targetNametag.released) {
			$('#' + player.id + '_floating_nametag').css('left', player.nametagX + '%');
			$('#' + player.id + '_floating_nametag').css('top', player.nametagY + '%');
		}

		var playerChipTotal = (player.chips['chip_1']) +
							  (player.chips['chip_5'] * 5) +
							  (player.chips['chip_25'] * 25) +
							  (player.chips['chip_50'] * 50) +
							  (player.chips['chip_100'] * 100);
    
		if ($('#' + player.id + '_floating_nametag .player_cash').text() != ('$ ' + playerChipTotal)) {
      if (playerChipTotal == 0)
        $('#' + player.id + '_floating_nametag .player_cash').text('');
      else
        $('#' + player.id + '_floating_nametag .player_cash').text('$ ' + playerChipTotal);
    }
	}
});

//listen for player state information from server
socket.on('player vehicle state', function(playerVehicles) {
	for (var id in playerVehicles) {
		var player = playerVehicles[id];

		if (id != playerInfo.id) {
      if (player.tankY > 100)
				$('#' + player.id + '_tank').css('display', 'none');
			else
				$('#' + player.id + '_tank').css('display', '');
		}

    // tank updates
		$('#' + player.id + '_tank').css('left', player.tankX + '%');
		$('#' + player.id + '_tank').css('top', player.tankY + '%');
    $('#' + player.id + '_tank').css('transform', 'rotate(' + player.tankRot + 'deg)');
    $('#' + player.id + '_tank_gun').css('transform', 'rotate(' + player.gunRot + 'deg)');
    
    //cannonball updates
    if (player.cBall.exists) {
      if (player.cBall.x > 100 || player.cBall.x < 0 || player.cBall.y > 100 || player.cBall.y < 0) {
        $('#' + player.id + "_cannonball").css('display', 'none');
      } else {
        // if not off the screen and cannoball exists
        $('#' + player.id + '_cannonball').css('display', '');
        $('#' + player.id + '_cannonball').css('left', player.cBall.x + '%');
        $('#' + player.id + '_cannonball').css('top', player.cBall.y + '%');
      }
    } else {
      $('#' + player.id + '_cannonball').css('display', 'none');
    }
	}
});

//if we recieve confirmation from the server that we can move the chip, set the state to dragging.
socket.on('pickup confirmation', function(targetPickupChip) {
	if (targetPickupChip.id == targetChip.id)
		draggingChipConfirm = true;
});

//listen for reset deck call from server
socket.on('reset deck', function() {
	//animate the cards returning to the deck
	$('.card').toggleClass('card_return_to_deck_anim', true);
  deckResetting = true;
	setTimeout(function() {
		$('.card').toggleClass('card_return_to_deck_anim', false);
    deckResetting = false;
	}, 1000);

	//reset the peek state of all cards in deck
	for (var i = 0; i < numCards; i++)
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

var craterSprite = new Image();
craterSprite.src = '/resources/images/sprites/crater.png';

function drawExplosionOnCanvas(data) {
  ctx.drawImage(craterSprite, (data.x / 100) * canvas.width, (data.y / 100) * canvas.height,
                              (2.5 / 100) * canvas.width, (5 / 100) * canvas.height);
                              
  console.log(data.x + ' ' + canvas.width + ' ' + data.y + ' ' + canvas.height);
}

socket.on('new draw line', function(data) {
	//if not us we draw the line from the other user.
	if (data.playerID != playerInfo.username)
		drawOnCanvas(data);
});

socket.on('draw new explosion', function(data) {
  drawExplosionOnCanvas(data);
});

socket.on('clear draw area', function() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});



/**

Youtube player stuff

**/

/**
// var youtubePlayerEnabled = true;
// var youtubePlaying = false;
// var youtubeVolume = 1;
// var youtubeLink;
// var youtubePlayer;

// var ytScriptTag = document.createElement('script');

// ytScriptTag.src = "https://www.youtube.com/iframe_api";
// var firstScriptTag = document.getElementsByTagName('script')[0];
// firstScriptTag.parentNode.insertBefore(ytScriptTag, firstScriptTag);

// function onYouTubeIframeAPIReady() {
// 	youtubePlayer = new YT.Player('youtube_player_iframe', {
// 		height: '390',
//         width: '640',
//         playerVars: {
//         	'playsinline': 1,
//         	'showinfo': 0,
//         	'rel': 0,
//         	'modestbranding': 0,
//         	'controls': 0,
//         	'origin': 'https://www.youtube.com'
//         },
//         events: {
//             'onReady': onPlayerReady,
//             'onStateChange': onPlayerStateChange
//         }
//     });
// }

// function onPlayerReady(event) {
// 	youtubePlayer.setVolume(10);
// 	youtubePlayer.setLoop(true);
// }

// function onPlayerStateChange(event) {
// 	$('.youtube_currently_playing').text(youtubePlayer.getVideoData().title);

// 	if (youtubePlayer.getPlayerState() == YT.PlayerState.ENDED) {
// 		socket.emit('play next video');
// 	}
// }

// socket.on('load youtube video', function(videoId) {
// 	if (youtubePlayerEnabled) {
// 		youtubePlayer.loadVideoById(videoId);
// 		youtubePlayer.playVideo();

// 		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', true);
// 		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', false);
// 		youtubePlaying = true;
// 	}
// });

// socket.on('pause youtube video', function() {
// 	if (youtubePlayerEnabled) {
// 		youtubePlayer.pauseVideo();

// 		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', true);
// 		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', false);
// 		youtubePlaying = false;
// 	}
// });

// socket.on('play youtube video', function() {
// 	if (youtubePlayerEnabled) {
// 		youtubePlayer.playVideo();

// 		$('#youtube_pause_play_btn').toggleClass('youtube_pause_state_icon', true);
// 		$('#youtube_pause_play_btn').toggleClass('youtube_play_state_icon', false);
// 		youtubePlaying = true;
// 	}
// });

// $(document).on('click', '#enable_youtube_link_btn', function(evt) {
// 	if (!youtubePlayerEnabled) {
// 		$('.youtube_player').toggleClass('youtube_player__enabled', true);
// 		$('#enable_youtube_link_btn').text('Disable YT Player');
// 		youtubePlayerEnabled = true;
// 	} else {
// 		$('.youtube_player').toggleClass('youtube_player__enabled', false);
// 		$('#enable_youtube_link_btn').text('Enable Youtube Player');
// 		youtubePlayerEnabled = false;

// 		pauseVideo();
// 	}
// });

// $(document).on('click', '#submit_youtube_link_btn', function(evt) {
// 	if (youtubePlayerEnabled) {
// 		var url = $('#youtube_player_link').val();
// 		if (url != undefined && url != '') {
// 			var videoId = url.split('v=')[1];
// 			var ampersandPosition = videoId.indexOf('&');
// 			if(ampersandPosition != -1) {
// 			  videoId = videoId.substring(0, ampersandPosition);
// 			}

// 			socket.emit('queue youtube video', videoId);

// 			$('#youtube_player_link').val('');
// 		}
// 	}
// });

// $(document).on('click', '#youtube_pause_play_btn', function(evt) {
// 	if (youtubePlayerEnabled) {
// 		if (youtubePlaying) {
// 			socket.emit('pause youtube video');
// 		} else {
// 			socket.emit('play youtube video');
// 		}
// 	}
// });

// $(document).on('click', '#youtube_volume_btn', function(evt) {
// 	if (youtubePlayerEnabled) {
// 		switch (youtubeVolume) {
// 			case 1:
// 				youtubePlayer.setVolume(60);
// 				youtubeVolume = 2;
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', true);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', false);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', false);
// 				break;
// 			case 2:
// 				youtubePlayer.setVolume(100);
// 				youtubeVolume = 3;
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', true);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', false);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', false);
// 				break;
// 			case 3:
// 				youtubePlayer.setVolume(10);
// 				youtubeVolume = 1;
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_1', true);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_2', false);
// 				$('#youtube_volume_btn').toggleClass('youtube_volume_icon_3', false);
// 				break;
// 		}
// 	}
// });

// $(document).on('click', '#youtube_next_btn', function(evt) {
// 	socket.emit('play next video');
// });

// $(document).on('click', '#youtube_previous_btn', function(evt) {
// 	socket.emit('play previous video');
// });
// **/


/**

Client Side server commands

*/

function servercmd(command) {
	socket.emit('console command', command);
}

function scmd(command) {
	socket.emit('console command', command);
}

socket.on('console response', function(response) {
	console.log(response);
});
