// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
const { Collisions } = require('detect-collisions');

var app = express();
var server = http.Server(app);
var io = socketIO(server);
const collisionSystem = new Collisions();
const collisionResult = collisionSystem.createResult();

process.stdin.resume();
process.stdin.setEncoding('utf8');

var PORT = process.env.PORT || 5000;
app.set('port', PORT);
app.use('/static', express.static(__dirname + '/static'));
app.use(express.static('public'));

// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server.
server.listen(PORT, function() {
  console.log('Starting server on port ' + PORT);

  //assemble deck
  console.log('Assembling Deck');
  loadNewDeck(numCards, deckName);

  //shuffle deck
  console.log('Shuffling Deck');
  shuffle(deck, 10);
});

//card game vars
var deck = {};
var numCards = 52;
var deckName = 'standard';
const deckStartX = 32.92; //percentage of gameboard
const deckStartY = 102.83; //percentage of gameboard

const dealStartX = 0.5;
const dealStartY = 0.7;
const dealEndX = 80 - dealStartX;
const dealEndY = 76.5 - dealStartY;
const cardSeparationX = 2.1;
const playerSeparationX = 20;
const playerSeparationY = 25;

const nametagStartX = 11;
const nametagStartY = 118;

const tankStartX = 3;
const tankStartY = 118;
const tankStartRot = 0;
const tankSpeed = 1;
const tankRotDist = 5;
const cBallLifespan = 6000; // lifetime of cannonball in milliseconds
const cBallSpeed = 2;

var chips = {
  owner: '',
  moverUsername: '',
  moverColor: '',
  value: 0,
  x: 0,
  y: 0
};

const chipStartX = 43.12;
const chipStartY = 102.52;
const chipSeparationX = 6.75;
const chipRadius = 5;

var uniqueChipIDcounter = 0;

var deckStateChanged = false;
var chipStateChanged = false;
var playerStateChanged = false;
var playerVehStateChanged = false;

//youtube stuff
var videoQueue = [];
var currVideoIndex = -1;

function loadNewDeck(numCards, deckName) {
  deck = {};

  for (var i = 0; i < numCards; i++) {
    deck[i] = {
      card: i,
      zIndex: i,
      showCard: false,
      peekCardCol: '',
      x: deckStartX,
      y: deckStartY
    };
  }

  this.numCards = numCards;
  this.deckName = deckName;
}

function shuffle(sDeck, numTimes) {
	for (var iterations = 0; iterations < numTimes; iterations++) {
		for (var i = 0; i < numCards; i++) {
			var zIndexAtI = sDeck[i].zIndex;

			var randomIndex = Math.floor(Math.random() * Math.floor(numCards));
			var zIndexAtRandom = sDeck[randomIndex].zIndex;

			sDeck[i].zIndex = zIndexAtRandom;
			sDeck[randomIndex].zIndex = zIndexAtI;
		}
	}
}

function dealCards(numPlayers, numCardsDealt) {
	var cardZIndex = 0;
	for (var j = 0; j < numCardsDealt; j++) {
		for (var i = 0; i < numPlayers; i++) {
			var cardX;
			var cardY;

			var quadrant = i % 4;

			if (quadrant == 0) {
				cardX = dealStartX + (playerSeparationX * Math.floor(i / 4)) + (cardSeparationX * j);
				cardY = dealStartY;
			} else if (quadrant == 1) {
				cardX = dealStartX + dealEndX + (cardSeparationX * j);
				cardY = dealStartY + (playerSeparationY * Math.floor(i / 4));
			} else if (quadrant == 2) {
				cardX = dealStartX + dealEndX - (playerSeparationX * Math.floor(i / 4)) + (cardSeparationX * j);
				cardY = dealStartY + dealEndY;
			} else if (quadrant == 3) {
				cardX = dealStartX + (cardSeparationX * j);
				cardY = dealStartY + dealEndY - (playerSeparationY * Math.floor(i / 4));
			}

			var topCard = findCardAt(cardZIndex);

			deck[topCard].x = cardX;
			deck[topCard].y = cardY;

			cardZIndex++;
			if (cardZIndex > numCards)
				return;
		}
	}
}

function resetDeck() {
	for (var i = 0; i < numCards; i++) {
		deck[i].x = deckStartX;
		deck[i].y = deckStartY;
		deck[i].zIndex = i;
		deck[i].showCard = false;
		deck[i].peekCardCol = '';
	}
}

function resetTankPos(playerID) {
  playerVehicles[playerID].tankX = tankStartX; // since the table is half as tall as it is wide
  playerVehicles[playerID].tankY = tankStartY;
  
  playerVehicles[playerID].tankRot = tankStartRot;
  playerVehicles[playerID].gunRot  = tankStartRot;
  
  // update colliders
  playerColliders[playerID].tankCollider.x = tankStartX;
  playerColliders[playerID].tankCollider.y = tankStartY;
  playerColliders[playerID].tankCollider.angle = 0;
  
  playerVehStateChanged = true;
}

function resetCBall(id) {
  playerVehicles[id].cBall.exists = false;
}

function findCardAt(zIndex) {
	for (var i = 0; i < numCards; i++)
		if (deck[i].zIndex == zIndex)
			return i;

	return 0;
}

//create a new poker chip with a unique id.
function createNewChip(owner, moverUsername, moverColor, value, x, y) {
	chips["chip_" + uniqueChipIDcounter] = {owner, moverUsername, moverColor, value, x, y};

	if (players[owner] != undefined)
		players[owner].chips["chip_" + value]++;

	uniqueChipIDcounter++;

	return 'chip_' + (uniqueChipIDcounter - 1);
}

function moveChipOwnership(fromOwner, toNewOwner, uniqueChipID) {
	//first make sure the chip actually exists
	if (chips[uniqueChipID] != undefined) {
		//then make sure the from and to owners are valid
		if ((players[fromOwner] != undefined || fromOwner == "house" || fromOwner == "table")
			&& (players[toNewOwner] != undefined || toNewOwner == "house" || toNewOwner == "table")) {
			//verify first that the fromOwner is actually the owner of this chip
			if (chips[uniqueChipID].owner == fromOwner) {
				chips[uniqueChipID].owner = toNewOwner;

				if (players[fromOwner] != undefined)
					players[fromOwner].chips["chip_" + chips[uniqueChipID].value]--;
				if (players[toNewOwner] != undefined)
					players[toNewOwner].chips["chip_" + chips[uniqueChipID].value]++;
			}
		}
	}
}

function snapChipToPlayer(uniqueChipID) {
	if (chips[uniqueChipID] != undefined) {
		io.sockets.emit('reset chip', uniqueChipID);

		var multiplier = 0;

		if (chips[uniqueChipID].value == 5)
			multiplier = 1;
		else if (chips[uniqueChipID].value == 25)
			multiplier = 2;
		else if (chips[uniqueChipID].value == 50)
			multiplier = 3;
		else if (chips[uniqueChipID].value == 100)
			multiplier = 4;

		chips[uniqueChipID].x = chipStartX + (chipSeparationX * multiplier);
		chips[uniqueChipID].y = chipStartY;
	}
}


var players = {};
var playerVehicles = {};
var playerColliders = {};
io.on('connection', function(socket) {

  socket.on('new player', function(user) {
  	var username = user.username;
  	var color = user.color;

  	if (username == null || username == "" || username == "house" || username == "table")
  		username = socket.id;

  	if (color == null || color == "" || colorNameToHex(color) == false)
  		color = 'rgb(' + (Math.floor(Math.random() * 256)) + ','
                     + (Math.floor(Math.random() * 256)) + ','
                     + (Math.floor(Math.random() * 256)) + ')';

  	var id = username.replace(/[^a-zA-Z0-9]/g, '_');

  	if (players[id] == undefined) {
  		//create a new player if that username doesn't exist
  		players[id] = {
  			id: id,
  			username: username,
  			pointerX: 0,
  			pointerY: 0,
  			nametagX: nametagStartX,
  			nametagY: nametagStartY,
        
  			color: color,

  			chips: {chip_1: 0, chip_5: 0, chip_25: 0, chip_50: 0, chip_100: 0}
  		};
      
      playerVehicles[id] = {
        id: id,
        tankX: tankStartX,
        tankY: tankStartY,
        tankRot: tankStartRot,
        gunRot: tankStartRot,
        
        cBall: { // cannon ball properties
          x: 0,
          y: 0,
          xComp: 0,
          yComp: 0,
          spawnTimer: 0,
          exists: false,
        },
      };
      
      playerColliders[id] = {
        id: id,
        tankCollider: collisionSystem.createPolygon(tankStartX, tankStartY, [[0, 0], [1.8, 0], [1.8, 3], [0, 3]]),
        cBallCollider: collisionSystem.createCircle(0, 0, 1)
      };
      
      playerColliders[id].tankCollider.info = {
        id: id,
        type: 'tankCollider'
      };
      playerColliders[id].cBallCollider.info = {
        id: id,
        type: 'cBallCollider'
      };
  	}

  	players[id].color = color;

  	//callback to client that we have put them into the system.
    socket.emit('new player confirmation', {username, id, color, numCards, deckName});

    //tell all clients we have a new player and send a list of all the current players.
    io.sockets.emit('new player notification', {players, playerVehicles});

    console.log("Added new player with username: " + id);

    deckStateChanged = true;
    chipStateChanged = true;
    playerStateChanged = true;
    playerVehStateChanged = true;
  });

  socket.on('broadcast player state', function(playerInfo) {
  	if (players[playerInfo.id] != null) {
	  	players[playerInfo.id].pointerX = playerInfo.pointerX;
	  	players[playerInfo.id].pointerY = playerInfo.pointerY;

      playerStateChanged = true;
  	}
  });

  socket.on('move card', function(card) {
  	deck[card.index].x = card.x;
  	deck[card.index].y = card.y;

  	// console.log('moving card: ' + card.index + ", to: " + card.x + ", " + card.y);
  	// console.log('moved  deck: ' + deck[card.index].card + ", to: " + deck[card.index].x + ", " + deck[card.index].y);

    deckStateChanged = true;
  });

  socket.on('pickup chip', function(targetChip) {
    if (chips[targetChip.id] != undefined) {
      var chip = chips[targetChip.id];
      if (chip.owner == 'table' || chip.owner == targetChip.targetUsername) {
        if (chip.moverUsername == '') {
          chip.moverUsername = targetChip.targetUsername;
          chip.moverColor = players[targetChip.targetUsername].color;
          socket.emit('pickup confirmation', targetChip);
        }
      }

      chipStateChanged = true;
    }
  });

  socket.on('move chip', function(targetChip) {
  	if (chips[targetChip.id] != undefined) {
  		chips[targetChip.id].x = targetChip.x;
  		chips[targetChip.id].y = targetChip.y;

      chipStateChanged = true;
  	}
  });

  socket.on('move nametag', function(targetNametag) {
  	if (targetNametag.nametagID != undefined) {
  		var playerID = targetNametag.nametagID.replace("_floating_nametag", '');

  		if (players[playerID] != undefined) {
  			players[playerID].nametagX = targetNametag.x;
  			players[playerID].nametagY = targetNametag.y;

        playerStateChanged = true;
  		}
  	}
  });
  
  socket.on('drag tank', function(targetTank) {
  	if (targetTank.playerID != undefined) {
  		var playerID = targetTank.playerID;
      
  		if (playerVehicles[playerID] != undefined) {
  			playerVehicles[playerID].tankX = targetTank.x;
  			playerVehicles[playerID].tankY = targetTank.y;
        
        // update colliders
        playerColliders[playerID].tankCollider.x = players[playerID].tankX;
        playerColliders[playerID].tankCollider.y = players[playerID].tankY;

        playerVehStateChanged = true;
  		}
  	}
  });
  
  socket.on('steer tank', function(targetTank) {
    if (targetTank.playerID != undefined) {
  		var playerID = targetTank.playerID;
      
  		if (playerVehicles[playerID] != undefined) {
  			playerVehicles[playerID].tankX += targetTank.x * tankSpeed * 0.5; // since the table is half as tall as it is wide
        playerVehicles[playerID].tankY += targetTank.y * tankSpeed;
        
        playerVehicles[playerID].tankRot += targetTank.rot * tankRotDist;
        playerVehicles[playerID].gunRot  += targetTank.gunRot * tankRotDist;
        
        // update colliders
        playerColliders[playerID].tankCollider.x = playerVehicles[playerID].tankX - 0.9;
        playerColliders[playerID].tankCollider.y = playerVehicles[playerID].tankY - 1.5;
        playerColliders[playerID].tankCollider.angle = (Math.PI / 180) * playerVehicles[playerID].tankRot;
        playerColliders[playerID].tankCollider.x += 0.9;
        playerColliders[playerID].tankCollider.y += 1.5;
        
        // if (players[playerID].tankRot > 360 || players[playerID].tankRot < 0)
        //   players[playerID].tankRot = players[playerID].tankRot % 360;

        playerVehStateChanged = true;
  		}
  	}
  });
  
  socket.on('spawn cannonball', function(targetTank) {
    if (targetTank.playerID != undefined) {
      var playerID = targetTank.playerID;
      
      if (playerVehicles[playerID] != undefined) {
        var x = playerVehicles[playerID].tankX;
        var y = playerVehicles[playerID].tankY;
        var xComp = targetTank.x;
        var yComp = targetTank.y;
        
        playerVehicles[playerID].cBall.x = x + 0.9;
        playerVehicles[playerID].cBall.y = y + 1.5;
        playerVehicles[playerID].cBall.xComp = xComp;
        playerVehicles[playerID].cBall.yComp = yComp;
        playerVehicles[playerID].cBall.spawnTimer = Date.now();
        playerVehicles[playerID].cBall.exists = true;
        
        // update colliders
        playerColliders[playerID].cBallCollider.x = playerVehicles[playerID].cBall.x;
        playerColliders[playerID].cBallCollider.y = playerVehicles[playerID].cBall.y;
        
        playerVehStateChanged = true;
      }
    }
  });

  socket.on('release chip', function(targetChip) {
  	if (chips[targetChip.id] != undefined) {
      chips[targetChip.id].moverUsername = '';
      var chipX = chips[targetChip.id].x + chipRadius;
      var chipY = chips[targetChip.id].y + chipRadius;

  		if (chipY > 100 && chips[targetChip.id].owner != targetChip.targetUsername) {
  			moveChipOwnership(chips[targetChip.id].owner, targetChip.targetUsername, targetChip.id);
  		} else if (chipY < 100 && chips[targetChip.id].owner != 'table') {
  			moveChipOwnership(chips[targetChip.id].owner, 'table', targetChip.id);
  		}

  		//chip splitter function
  		if (chipX > 80  && chipX < 88 && chipY > 103 && chipY < 118) {
  			var chipVal = chips[targetChip.id].value;
  			if (chipVal != 1) {
  				moveChipOwnership(chips[targetChip.id].owner, 'house', targetChip.id);
  				var numNewChips = 0;
  				var newChipVals = 0;
  				switch (chipVal) {
  					case 100:
  						numNewChips = 2;
  						newChipVals = 50;
  						break;
  					case 50:
  						numNewChips = 2;
  						newChipVals = 25;
  						break;
  					case 25:
  						numNewChips = 5;
  						newChipVals = 5;
  						break;
  					case 5:
  						numNewChips = 5;
  						newChipVals = 1;
  						break;
  				}
  				for (var i = 0; i < numNewChips; i++)
  					createNewChip(targetChip.targetUsername, '', '', newChipVals, chips[targetChip.id].x + ((Math.random() * 6) - 3), chips[targetChip.id].y + ((Math.random() * 6) - 3));
  			}
  		}

  		if (chipY > 100) {
  			snapChipToPlayer(targetChip.id);
        chips[targetChip.id].moverColor = '';
      }

      chipStateChanged = true;
  	}
  });

  socket.on('target card to top', function(targetCardIndex) {
  	var currZIndex = deck[targetCardIndex].zIndex;
	  // console.log("CURRZINDEX: " + currZIndex);
  	for (var i = 0; i < numCards; i++) {
		  if (deck[i].zIndex > currZIndex)
		  	deck[i].zIndex = deck[i].zIndex - 1;
  	}
  	deck[targetCardIndex].zIndex = numCards - 1;

    deckStateChanged = true;
  });

  socket.on('flip card global', function(targetCardIndex) {
  	deck[targetCardIndex].showCard = !deck[targetCardIndex].showCard;

  	// console.log(deck[targetCardIndex].x + ", " + deck[targetCardIndex].y);
    deckStateChanged = true;
  });

  socket.on('card peek', function(data) {
  	deck[data.targetCardIndex].peekCardCol = data.playerColor;

    deckStateChanged = true;
  });

  //shuffle cards and reset the deck position.
  socket.on('shuffle cards', function() {
  	resetDeck();
  	shuffle(deck, 10);

  	//call all decks to be reset on client side
  	io.sockets.emit('reset deck');

    deckStateChanged = true;
  });

  socket.on('deal cards', function(data) {
	  resetDeck();
  	shuffle(deck, 10);

  	io.sockets.emit('reset deck');

    deckStateChanged = true;

  	setTimeout(function() {
		  dealCards(data.numPlayers, data.numCardsDealt);
		  io.sockets.emit('reset deck');
      deckStateChanged = true;
	  }, 1100);
  });

  socket.on('new draw line', function(data) {
  	io.sockets.emit('new draw line', data);
  });

  socket.on('clear draw area', function() {
  	io.sockets.emit('clear draw area');
  });
  
  // console commands
  socket.on('console command', function(command) {
    var response = consolecmd(command);
    socket.emit('console response', response);
  });

/**
  // // Youtube Player Stuff
  // socket.on('queue youtube video', function(videoID) {
  // 	videoQueue.push(videoID);
  // 	if (videoQueue.length == 1) {
  // 		currVideoIndex++;
  // 		io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  // 	}
  // });
  //
  // socket.on('pause youtube video', function() {
  // 	io.sockets.emit('pause youtube video');
  // });
  //
  // socket.on('play youtube video', function() {
  // 	io.sockets.emit('play youtube video');
  // });
  //
  // socket.on('play next video', function() {
  // 	currVideoIndex++;
  // 	if (currVideoIndex == videoQueue.length)
  // 		currVideoIndex = 0;
  //
  // 	io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  // });
  //
  // socket.on('play previous video', function() {
  // 	currVideoIndex--;
  // 	if (currVideoIndex == -1)
  // 		currVideoIndex = videoQueue.length - 1;
  //
  // 	io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  // });
**/

});

//emit the state of the deck every 24ms if something changed.
setInterval(function() {
  updateCannonballs();
  
  if (deckStateChanged) {
    io.sockets.emit('deck state', deck);
    deckStateChanged = false;
  }
  if (chipStateChanged) {
    io.sockets.emit('chips state', chips);
    chipStateChanged = false;
  }
  if (playerStateChanged) {
    io.sockets.emit('player state', players);
    playerStateChanged = false;
  }
  if (playerVehStateChanged) {
    io.sockets.emit('player vehicle state', playerVehicles);
    playerVehStateChanged = false;
  }
}, 1000 / 24);

function updateCannonballs() {
  for (var id in playerVehicles) {
    if (playerVehicles[id].cBall.exists) {
      var cBallAge = Date.now() - playerVehicles[id].cBall.spawnTimer;
      if (cBallAge > cBallLifespan) {
        // if the cannonball has reached the end of its life, remove it
        playerVehicles[id].cBall.exists = false;
      } else {
        playerVehicles[id].cBall.x += playerVehicles[id].cBall.xComp * cBallSpeed * 0.5; // since the table is half as tall as it is wide
        playerVehicles[id].cBall.y += playerVehicles[id].cBall.yComp * cBallSpeed;
        
        playerColliders[id].cBallCollider.x = playerVehicles[id].cBall.x;
        playerColliders[id].cBallCollider.y = playerVehicles[id].cBall.y;
        
        var collisions = checkCBallCollisions(id);
        
        if (collisions.length > 0) {
          //first remove the current cannon ball
          resetCBall(id);
          
          // then go through all the collisions and decide what to do next
          for (var index in collisions) {
            if (collisions[index].type == 'tankCollider') {
              destroyTank(collisions[index].id);
            } else if (collisions[index].type == 'cBallCollider') {
              destroyCBall(collisions[index].id);
            }
          }
        }
      }
      playerVehStateChanged = true;
    }
  }
}

function checkCBallCollisions(id) {
  var collisions = [];
  collisionSystem.update();
  
  const potentials = playerColliders[id].cBallCollider.potentials();
  
  for (const wall of potentials) {
    if (playerColliders[id].cBallCollider.collides(wall, collisionResult)) {
      if (collisionResult.b.info.id != id) {
        // if the resulting collision isnt the tank that shot the cannon ball
        collisions.push(collisionResult.b.info);
      }
    }
  }
  
  return collisions;
}
                
function destroyTank(id) {
  var data = {
    x: 0,
    y: 0
  };
  
  var tankX = playerVehicles[id].tankX;
  var tankY = playerVehicles[id].tankY;
  
  data.x = tankX;
  data.y = tankY;
  
  resetTankPos(id);
  
  io.sockets.emit('draw new explosion', data);
}

function destroyCBall(id) {
  
}

//emit the state every ten seconds regardless of change.
setInterval(function() {
  io.sockets.emit('deck state', deck);
  io.sockets.emit('chips state', chips);
  io.sockets.emit('player state', players);
  io.sockets.emit('player vehicle state', playerVehicles);
}, 5000);


function colorNameToHex(color) {
    var colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
    "honeydew":"#f0fff0","hotpink":"#ff69b4",
    "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
    "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
    "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
    "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
    "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
    "navajowhite":"#ffdead","navy":"#000080",
    "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
    "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
    "yellow":"#ffff00","yellowgreen":"#9acd32"};

    if (typeof colors[color.toLowerCase()] != 'undefined')
        return colors[color.toLowerCase()];

    return false;
}


//console commands
process.stdin.on('data', function (text) {
  consolecmd(text);
});

function consolecmd(text) {
  var command = text.replace('\n', '').split(' ');
  var response = '';

  if (command[0] == 'give' && command[1] != undefined && command[2] != undefined) {
    var username = command[1];
    var amount = command[2];

    if (players[username] != undefined || username == "house" || username == "table") {
      var num100Chips = Math.floor(amount / 100);
      amount = amount % 100;
      var num50Chips = Math.floor(amount / 50);
      amount = amount % 50;
      var num25Chips = Math.floor(amount / 25);
      amount = amount % 25;
      var num5Chips = Math.floor(amount / 5);
      amount = amount % 5;
      var num1Chips = Math.floor(amount / 1);

      for (var i = 0; i < num100Chips; i++)
        createNewChip(username, '', '', 100, chipStartX + (chipSeparationX * 4), chipStartY);
      for (var i = 0; i < num50Chips; i++)
        createNewChip(username, '', '', 50, chipStartX + (chipSeparationX * 3), chipStartY);
      for (var i = 0; i < num25Chips; i++)
        createNewChip(username, '', '', 25, chipStartX + (chipSeparationX * 2), chipStartY);
      for (var i = 0; i < num5Chips; i++)
        createNewChip(username, '', '', 5, chipStartX + (chipSeparationX), chipStartY);
      for (var i = 0; i < num1Chips; i++)
        createNewChip(username, '', '', 1, chipStartX, chipStartY);

      chipStateChanged = true;
      response = "Gave " + username + ": " + num100Chips + "x $100, " + num50Chips + "x $50, " + num25Chips + "x $25, " + num5Chips + "x $5, " + num1Chips + "x $1";
    } else {
      response = "Error: Invalid give command. Username not found.";
    }
  } else if (command[0] == 'payout' && command[1] != undefined) {
    var username = command[1];
    if (players[username] != undefined) {
      var player = players[username];

      for (var id in chips) {
        var chip = chips[id];

        if (chip.owner == "table") {
          chip.moverUsername = '';
          chip.moverColor = '';
          moveChipOwnership('table', username, id);
          snapChipToPlayer(id);
        }
      }

      chipStateChanged = true;
      response = "Paying out " + username;
    } else {
      response = "Error: Invalid payout command. Username not found.";
    }
  } else if (command[0] == 'loaddeck' && command[1] != undefined) {
    var deckNameInput = command[1];
    if (deckNameInput == 'standard' && deckName != deckNameInput) {
      deckName = deckNameInput;
      numCards = 52;
      loadNewDeck(numCards, deckName);
      shuffle(deck, 10);
      io.sockets.emit('load new deck', {numCards, deckName});

      deckStateChanged = true;
      response = 'Loading Standard deck with 52 cards.';
    } else if (deckNameInput == 'euchre' && deckName != deckNameInput) {
      deckName = deckNameInput;
      numCards = 24;
      loadNewDeck(numCards, deckName);
      shuffle(deck, 10);
      io.sockets.emit('load new deck', {numCards, deckName});

      deckStateChanged = true;
      response = 'Loading Euchre deck with 24 cards.';
    } else {
      response = 'Error: Invalid deck name, or that deck is already loaded.';
    }
  } else if (command[0] == 'listusers') {
    for (var id in players) {
      var player = players[id];
      response += 'id: ' + id + ', username: ' + player.username + ', color: ' + player.color + '\n';
    }
  } else if (command[0] == 'removeuser' && command[1] != undefined) {
    var username = command[1];
    if (players[username] != undefined) {
      delete players[username];
      io.sockets.emit('remove user', username);
      playerStateChanged = true;
      response = "Removing user: " + username;
    } else {
      response = "Error: Invalid payout command. Username not found.";
    }
  } else if (command[0] == 'resetserver') {
    io.sockets.emit('reload page');
    players = null;
    playerVehicles = null;
    playerColliders = null;
    chips = null;
    resetDeck();
    shuffle(deck, 10);
    deckStateChanged = true;
    playerStateChanged = true;
    playerVehStateChanged = true;
    chipStateChanged = true;
    response = "Cleared all players from server and sent out refresh call to all clients.";
  } else if (command[0] == 'help') {
    response = "List of Commands:" + '\n' +
    "give [username] [amount]" + '\n' +
    "-- gives the specified user the amount of chips (divided to the largest chip denominator" + '\n' +
    "payout [username]" + '\n' +
    "-- pays all the chips currently on the table to the specified player" + '\n' +
    "loaddeck [deck name]" + '\n' +
    "-- loads a specified deck to the server (available: standard, euchre)" + '\n' +
    "listusers" + '\n' +
    "-- lists all the players currently on the server." + '\n' +
    "removeuser [username]" + '\n' +
    "-- removes the specified user from the server." + '\n' +
    "resetserver" + '\n' +
    "-- removes all users and resets the server to the original state.";
    // console.log("change [username] [amount] [divisor]");
    // console.log("-- changes the user's specified amount of chips into the divisor");
  }

  else {
    response = "Error: Invalid command. type help for a list of commands.";
  }

  console.log(response);
  return response;
}
