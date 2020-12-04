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
var currentWallpaper = 0; // 0 for default wallpaper, 1 for texas holdem table
const numWallpapers = 2;
const deckStartX = 32.92; //percentage of gameboard
const deckStartY = 102.83; //percentage of gameboard

const dealStartX = 0.5;
const dealStartY = 0.7;
const dealerChipStartX = 25.2;
const dealerChipStartY = 121;
const dealEndX = 80 - dealStartX;
const dealEndY = 76.5 - dealStartY;
const cardSeparationX = 2.1;
const playerSeparationX = 20;
const playerSeparationY = 25;

const nametagStartX = 11;
const nametagStartY = 114;

const tankStartX = 3;
const tankStartY = 114;
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

var dealerChip = {
  x: dealerChipStartX,
  y: dealerChipStartY
}

const chipStartX = 43.12;
const chipStartY = 102.52;
const chipSeparationX = 6.75;
const chipRadius = 5;

var uniqueChipIDcounter = 0;

var deckStateChanged = false;
var chipStateChanged = false;
var dealerChipStateChanged = false;
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

function giveChipsToPlayer(amount, playerID) {
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
    createNewChip(playerID, '', '', 100, chipStartX + (chipSeparationX * 4), chipStartY);
  for (var i = 0; i < num50Chips; i++)
    createNewChip(playerID, '', '', 50, chipStartX + (chipSeparationX * 3), chipStartY);
  for (var i = 0; i < num25Chips; i++)
    createNewChip(playerID, '', '', 25, chipStartX + (chipSeparationX * 2), chipStartY);
  for (var i = 0; i < num5Chips; i++)
    createNewChip(playerID, '', '', 5, chipStartX + (chipSeparationX), chipStartY);
  for (var i = 0; i < num1Chips; i++)
    createNewChip(playerID, '', '', 1, chipStartX, chipStartY);
    
  return ("Gave " + playerID + ": " + num100Chips + "x $100, " + num50Chips + "x $50, " + num25Chips + "x $25, " + num5Chips + "x $5, " + num1Chips + "x $1");
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

  	if (color == null || color == "")
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
        tankCollider: collisionSystem.createCircle(tankStartX, tankStartY, 1.5),
        cBallCollider: collisionSystem.createCircle(0, 0, 0.5)
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
    socket.emit('new player confirmation', {username, id, color, numCards, deckName, currentWallpaper});

    //tell all clients we have a new player and send a list of all the current players.
    io.sockets.emit('new player notification', {players, playerVehicles});

    console.log("Added new player with username: " + id);

    deckStateChanged = true;
    chipStateChanged = true;
    dealerChipStateChanged = true;
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
  
  socket.on('move dealer chip', function(chipInfo) {
    dealerChip.x = chipInfo.x;
    dealerChip.y = chipInfo.y;
    
    dealerChipStateChanged = true;
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
        playerColliders[playerID].tankCollider.x = playerVehicles[playerID].tankX;
        playerColliders[playerID].tankCollider.y = playerVehicles[playerID].tankY;

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
        playerColliders[playerID].tankCollider.x = playerVehicles[playerID].tankX;
        playerColliders[playerID].tankCollider.y = playerVehicles[playerID].tankY;
        
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

  		if (chipY > 100 && !(chipX > 80  && chipX < 88 && chipY > 103 && chipY < 118)) {
        // if the chips are in the players hand and not in the splitter area,
        // snap the chip to the area
  			snapChipToPlayer(targetChip.id);
        chips[targetChip.id].moverColor = '';
      }

      chipStateChanged = true;
  	}
  });
  
  socket.on('split chips', function(playerID) {
    for (let id in chips) {
      let chip = chips[id];
      var chipX = chip.x + chipRadius;
      var chipY = chip.y + chipRadius;
      if (chip.owner == playerID && (chipX > 80  && chipX < 88 && chipY > 103 && chipY < 118)) {
        // if the player is the owner and the chip is in the chip split area.
        var chipVal = chip.value;
        if (chipVal != 1) {
          moveChipOwnership(playerID, 'house', id);
          var numNewChips = 0;
          var newChipVals = 0;
          let multiplier = 0;
          switch (chipVal) {
            case 100:
              numNewChips = 2;
              newChipVals = 50;
              multiplier = 3;
              break;
            case 50:
              numNewChips = 2;
              newChipVals = 25;
              multiplier = 2;
              break;
            case 25:
              numNewChips = 5;
              newChipVals = 5;
              multiplier = 1;
              break;
            case 5:
              numNewChips = 5;
              newChipVals = 1;
              multiplier = 0;
              break;
          }
          let newChipX = chipStartX + (chipSeparationX * multiplier);
      		let newChipY = chipStartY;
          for (var i = 0; i < numNewChips; i++) {
            // create new chips with the same total value
            createNewChip(playerID, '', '', newChipVals, newChipX, newChipY);
          }
          chipStateChanged = true;
        }
      }
    }
  });
  
  socket.on('combine chips', function(playerID) {
    let totalChipValue = 0;
    
    for (let id in chips) {
      let chip = chips[id];
      var chipX = chip.x + chipRadius;
      var chipY = chip.y + chipRadius;
      if (chip.owner == playerID && (chipX > 80  && chipX < 88 && chipY > 103 && chipY < 118)) {
        // if the player is the owner and the chip is in the chip split area.
        totalChipValue += chip.value;
        moveChipOwnership(playerID, 'house', id);
        chipStateChanged = true;
      }
    }
    
    if (totalChipValue != 0)
      giveChipsToPlayer(totalChipValue, playerID);
  });

  socket.on('target card to top', function(targetCardIndex) {
  	var currZIndex = deck[targetCardIndex].zIndex;
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
  socket.on('console command', function(cmdInfo) {
    var response = consolecmd(cmdInfo.command, 'client', cmdInfo.id);
    socket.emit('console response', response);
  });
  
  socket.on('cycle wallpaper', function() {
    let prevWallpaper = currentWallpaper;
    currentWallpaper++;
    if (currentWallpaper >= numWallpapers)
      currentWallpaper = 0;
    
    io.sockets.emit('load new wallpaper', {previous: prevWallpaper, current: currentWallpaper});
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
  if (dealerChipStateChanged) {
    io.sockets.emit('dealer chip state', dealerChip);
    dealerChipStateChanged = false;
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

//console commands
var adminList = {
  playerID: ''
};
const serverPassword = 'hackermikecarns';

process.stdin.on('data', function (text) {
  consolecmd(text, 'server', '');
});

function consolecmd(text, source, id) {
  var command = text.replace('\n', '').split(' ');
  var response = '';

  if (source == 'server' || (source == 'client' && adminList[id] != undefined)) {
    if (command[0] == 'give' && command[1] != undefined && command[2] != undefined) {
      var playerID = command[1];
      var amount = command[2];
  
      if (players[playerID] != undefined || playerID == "house" || playerID == "table") {
        response = giveChipsToPlayer(amount, playerID);
  
        chipStateChanged = true;
      } else {
        response = "Error: Invalid give command. playerID not found.";
      }
    } else if (command[0] == 'payout' && command[1] != undefined) {
      var playerID = command[1];
      if (players[playerID] != undefined) {
        var player = players[playerID];
  
        for (var id in chips) {
          var chip = chips[id];
  
          if (chip.owner == "table") {
            chip.moverplayerID = '';
            chip.moverColor = '';
            moveChipOwnership('table', playerID, id);
            snapChipToPlayer(id);
          }
        }
  
        chipStateChanged = true;
        response = "Paying out " + playerID;
      } else {
        response = "Error: Invalid payout command. playerID not found.";
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
        let player = players[id];
        let opStatus = false;
        if (adminList[id] != undefined)
          opStatus = true;
        response += 'id: ' + id + ', display name: ' + player.username + ', color: ' + player.color + 'is admin: ' + opStatus + '\n';
      }
    } else if (command[0] == 'removeuser' && command[1] != undefined) {
      var playerID = command[1];
      if (players[playerID] != undefined) {
        delete players[playerID];
        io.sockets.emit('remove user', playerID);
        playerStateChanged = true;
        response = "Removing user: " + playerID;
      } else {
        response = "Error: Invalid payout command. playerID not found.";
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
    } else if (command[0] == 'op' && command[1] != undefined) {
      // op command when the player initiating is already an admin, doesnt require password
      var playerID = command[1];
  
      if (players[playerID] != undefined) {
        adminList[playerID] = {id: playerID};
        response = "Gave console command permissions to: " + playerID;
      } else if (players[playerID] == undefined) {
        response = "Error: Invalid OP command. playerID not found.";
      }
    } else if (command[0] == 'deop' && command[1] != undefined) {
      // op command when the player initiating is already an admin, doesnt require password
      var playerID = command[1];
  
      if (adminList[playerID] != undefined) {
        adminList[playerID] = null;
        response = "Removed console command permissions from: " + playerID;
      } else if (players[playerID] == undefined) {
        response = "Error: Invalid OP command. playerID is not an OP.";
      }
    } else if (command[0] == 'help') {
      response = "List of Commands:" + '\n' +
      "give [playerID] [amount]" + '\n' +
      "-- gives the specified user the amount of chips (divided to the largest chip denominator)" + '\n' +
      "payout [playerID]" + '\n' +
      "-- pays all the chips currently on the table to the specified player" + '\n' +
      "loaddeck [deck name]" + '\n' +
      "-- loads a specified deck to the server (available: standard, euchre)" + '\n' +
      "listusers" + '\n' +
      "-- lists all the players currently on the server." + '\n' +
      "removeuser [playerID]" + '\n' +
      "-- removes the specified user from the server." + '\n' +
      "resetserver" + '\n' +
      "-- removes all users and resets the server to the original state." + '\n' +
      "op [playerID]" + '\n' +
      "-- gives admin persmissions to the specified user to initiate console commands.";
      "deop [playerID]" + '\n' +
      "-- removes admin persmissions from the specified user.";
    } else {
      response = "Error: Invalid command. Type \"help\" for a list of commands.";
    }
  } else {
    // the user giving the console command does not have admin privileges
    if (command[0] == 'op' && command[1] != undefined && command[2] != undefined) {
      var playerID = command[1];
      var password = command[2];
  
      if (players[playerID] != undefined && password == serverPassword) {
        adminList[playerID] = {id: playerID};
        response = "Gave console command permissions to: " + playerID + '\n' +
                   "Type \"help\" for a new list of available commands.";
      } else if (players[playerID] == undefined) {
        response = "Error: Invalid OP command. playerID not found.";
      } else if (password != serverPassword) {
        response = "Error: Invalid OP command. Incorrect password.";
      }
    } else if (command[0] == 'listusers') {
      for (var id in players) {
        let player = players[id];
        let opStatus = false;
        if (adminList[id] != undefined)
          opStatus = true;
        response += 'id: ' + id + ', display name: ' + player.username + ', color: ' + player.color + 'is admin: ' + opStatus + '\n';
      }
    } else if (command[0] == 'help') {
      response = "List of Commands:" + '\n' +
      "listusers" + '\n' +
      "-- lists all the players currently on the server." + '\n' +
      "op [playerID] [password]" + '\n' +
      "-- gives admin persmissions to the specified user to initiate console commands.";
    } else {
      response = "Error: Invalid command OR you do not have permission to use console commands." + '\n' +
                 "Type \"help\" for a list of available commands.";
    }
  }

  console.log(response);
  return response;
}
