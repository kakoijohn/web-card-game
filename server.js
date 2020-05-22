// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

process.stdin.resume();
process.stdin.setEncoding('utf8');

//card game vars
var deck = {};
var numCards = 24;
var deckName = 'euchre';
const deckStartX = 32.92; //percentage of gameboard
const deckStartY = 102.83; //percentage of gameboard

const dealStartX = 0.5;
const dealStartY = 0.7;
const dealEndX = 80 - dealStartX;
const dealEndY = 76.5 - dealStartY;
const cardSeparationX = 2.1;
const playerSeparationX = 20;
const playerSeparationY = 25;

const nametagStartX = 1;
const nametagStartY = 118;

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

var uniqueChipIDcounter = 0;

//youtube stuff
var videoQueue = [];
var currVideoIndex = -1;


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

function loadNewDeck(numCards, deckName) {
  deck = {};

  for (var i = 0; i < numCards; i++) {
    deck[i] = {
      card: (i + 1),
      zIndex: (i + 1),
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
	var cardZIndex = 1;
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
		deck[i].zIndex = i + 1;
		deck[i].showCard = false;
		deck[i].peekCardCol = '';
	}
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

// Add the WebSocket handlers
io.on('connection', function(socket) {
});

var players = {};
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

  	var cleanID = username.replace(/[^a-zA-Z0-9]/g, '_');

  	if (players[cleanID] == undefined) {
  		//create a new player if that username doesn't exist 
  		players[cleanID] = {
  			cleanID: cleanID,
  			username: username,
  			pointerX: 0,
  			pointerY: 0,
  			nametagX: nametagStartX,
  			nametagY: nametagStartY,
  			color: color,

  			chips: {chip_1: 0, chip_5: 0, chip_25: 0, chip_50: 0, chip_100: 0}
  		};
  	}

  	players[cleanID].color = color;

  	//callback to client that we have put them into the system.
    socket.emit('new player confirmation', {username, cleanID, color, numCards, deckName});

    //tell all clients we have a new player and send a list of all the current players.
    io.sockets.emit('new player notification', players);

    console.log("Added new player with username: " + cleanID);
  });

  socket.on('broadcast player state', function(playerInfo) {
  	if (players[playerInfo.cleanID] != null) {
	  	players[playerInfo.cleanID].pointerX = playerInfo.pointerX;
	  	players[playerInfo.cleanID].pointerY = playerInfo.pointerY;	
  	}
  });

  socket.on('move card', function(card) {
  	deck[card.index].x = card.x;
  	deck[card.index].y = card.y;

  	// console.log('moving card: ' + card.index + ", to: " + card.x + ", " + card.y);
  	// console.log('moved  deck: ' + deck[card.index].card + ", to: " + deck[card.index].x + ", " + deck[card.index].y);
  });

  socket.on('pickup chip', function(targetChip) {
    if (chips[targetChip.index] != undefined) {
      var chip = chips[targetChip.index];
      if (chip.owner == 'table' || chip.owner == targetChip.targetUsername) {
        if (chip.moverUsername == '') {
          chip.moverUsername = targetChip.targetUsername;
          chip.moverColor = players[targetChip.targetUsername].color;
          socket.emit('pickup confirmation', targetChip);
        }
      }
    }
  });

  socket.on('move chip', function(targetChip) {
  	if (chips[targetChip.index] != undefined) {
  		chips[targetChip.index].x = targetChip.x;
  		chips[targetChip.index].y = targetChip.y;
  	}
  });

  socket.on('move nametag', function(targetNametag) {
  	if (targetNametag.nametagID != undefined) {
  		var playerID = targetNametag.nametagID.replace("_floating_nametag", '');

  		if (players[playerID] != undefined) {
  			players[playerID].nametagX = targetNametag.x;
  			players[playerID].nametagY = targetNametag.y;
  		}	
  	}
  });

  socket.on('release chip', function(targetChip) {
  	if (chips[targetChip.index] != undefined) {
      chips[targetChip.index].moverUsername = '';
      chips[targetChip.index].moverColor = '';

  		if (chips[targetChip.index].y > 100 && chips[targetChip.index].owner != targetChip.targetUsername) {
  			moveChipOwnership(chips[targetChip.index].owner, targetChip.targetUsername, targetChip.index);
  		} else if (chips[targetChip.index].y < 100 && chips[targetChip.index].owner != 'table') {
  			moveChipOwnership(chips[targetChip.index].owner, 'table', targetChip.index);
  		}

  		//chip splitter function
  		if (chips[targetChip.index].x > 67  && chips[targetChip.index].x < 75 &&
  			chips[targetChip.index].y > 123 && chips[targetChip.index].y < 138) {
  			var chipVal = chips[targetChip.index].value;
  			if (chipVal != 1) {
  				moveChipOwnership(chips[targetChip.index].owner, 'house', targetChip.index);
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
  					createNewChip(targetChip.targetUsername, '', '', newChipVals, chips[targetChip.index].x + ((Math.random() * 6) - 3), chips[targetChip.index].y + ((Math.random() * 6) - 3));
  			}
  		}

  		if (chips[targetChip.index].y > 100)
  			snapChipToPlayer(targetChip.index);
  	}
  });

  socket.on('target card to top', function(targetCardIndex) {
  	var currZIndex = deck[targetCardIndex].zIndex;
	// console.log("CURRZINDEX: " + currZIndex);
	for (var i = 0; i < numCards; i++) {
		if (deck[i].zIndex > currZIndex)
			deck[i].zIndex = deck[i].zIndex - 1;
	}
	deck[targetCardIndex].zIndex = numCards;
  });

  socket.on('flip card global', function(targetCardIndex) {
  	deck[targetCardIndex].showCard = !deck[targetCardIndex].showCard;

  	// console.log(deck[targetCardIndex].x + ", " + deck[targetCardIndex].y);
  });

  socket.on('card peek', function(data) {
  	deck[data.targetCardIndex].peekCardCol = data.playerColor;
  });

  //shuffle cards and reset the deck position.
  socket.on('shuffle cards', function() {
  	resetDeck();
  	shuffle(deck, 10);

  	//call all decks to be reset on client side
  	io.sockets.emit('reset deck');
  });

  socket.on('deal cards', function(data) {
	resetDeck();
  	shuffle(deck, 10);

  	io.sockets.emit('reset deck');

  	setTimeout(function() {
		dealCards(data.numPlayers, data.numCardsDealt);
		io.sockets.emit('reset deck');
	}, 1100);
  });

  socket.on('new draw line', function(data) {
  	io.sockets.emit('new draw line', data);
  });

  socket.on('clear draw area', function() {
  	io.sockets.emit('clear draw area');
  });


  // Youtube Player Stuff
  socket.on('queue youtube video', function(videoID) {
  	videoQueue.push(videoID);
  	if (videoQueue.length == 1) {
  		currVideoIndex++;
  		io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  	}
  });

  socket.on('pause youtube video', function() {
  	io.sockets.emit('pause youtube video');
  });

  socket.on('play youtube video', function() {
  	io.sockets.emit('play youtube video');
  });

  socket.on('play next video', function() {
  	currVideoIndex++;
  	if (currVideoIndex == videoQueue.length)
  		currVideoIndex = 0;

  	io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  });

  socket.on('play previous video', function() {
  	currVideoIndex--;
  	if (currVideoIndex == -1)
  		currVideoIndex = videoQueue.length - 1;

  	io.sockets.emit('load youtube video', videoQueue[currVideoIndex]);
  });

  socket.on('console command', function(command) {
    consolecmd(command);
  });
});

//emit the state of the deck every 60ms
setInterval(function() {
  io.sockets.emit('deck state', deck);
  io.sockets.emit('chips state', chips);
}, 1000 / 24);

//emit the state of all players every 10ms
setInterval(function() {
  io.sockets.emit('player state', players);
}, 1000 / 10);


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

      console.log("Gave " + username + ": " + num100Chips + "x $100, " + num50Chips + "x $50, " + num25Chips + "x $25, " + num5Chips + "x $5, " + num1Chips + "x $1");
    } else {
      console.log("Error: Invalid give command. Username not found.");
    }
  } else if (command[0] == 'change' && command[1] != undefined && command[2] != undefined && command[3] != undefined) {
    /* Currently doesnt work */

    var username = command[1];
    var amount = command[2];
    var divisor = command[3];

    if (players[username] != undefined) {
      var player = players[username];
      var playerChipTotal = (player.chips['chip_1']) +
                (player.chips['chip_5'] * 5) +
                (player.chips['chip_25'] * 25) +
                (player.chips['chip_50'] * 50) +
                (player.chips['chip_100'] * 100);

      if (amount > playerChipTotal) {
        console.log("Error: " + username + " does not have enough money to change: " + amount + " (amount requested), " + playerChipTotal + " (amount in player's bank)");
      } else if (divisor > amount) {
        console.log("Error: Divisor cannot be greater than the amount.");
      } else {
        var numChipsCreated = Math.floor(amount / divisor);
        if (divisor == 100 || divisor == 50 || divisor == 25 || divisor == 5 || divisor == 1) {
          //first take out the chips we will be changing.

          var chipIndex = 0;
          switch (divisor) {
            case 100:
              chipIndex = 4;
              break;
            case 50:
              chipIndex = 3;
              break;
            case 25:
              chipIndex = 2;
              break;
            case 5:
              chipIndex = 1;
              break;
          }

          //create the new changed chips for the player
          // for (var i = 0; i < numChipsCreated; i++)
            // createNewChip(username, '', '', divisor, chipStartX + (chipSeparationX * chipIndex), chipStartY);
        } else {
          console.log("Error: Chip divisor must be a standard chip denomination (100, 50, 25, 5, or 1).");
        }
      }
    } else {
      console.log("Error: Invalid command. Username not found."); 
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

      console.log("Paying out " + username);
    } else {
      console.log("Error: Invalid payout command. Username not found.");
    }
  } else if (command[0] == 'loaddeck' && command[1] != undefined) {
    var deckName = command[1];
    if (deckName == 'default' && this.deckName != deckName) {
      this.deckName = deckName;
      this.numCards = 52;
      loadNewDeck(numCards, deckName);
      shuffle(deck, 10);
      io.sockets.emit('load new deck', {numCards, deckName});

      console.log('Loading Default deck with 52 cards.');
    } else if (deckName == 'euchre' && this.deckName != deckName) {
      this.deckName = deckName;
      this.numCards = 24;
      loadNewDeck(numCards, deckName);
      shuffle(deck, 10);
      io.sockets.emit('load new deck', {numCards, deckName});

      console.log('Loading Euchre deck with 24 cards.');
    } else {
      console.log('Error: Invalid deck name, or that deck is already loaded.');
    }
  } else if (command[0] == 'removeuser' && command[1] != undefined) {
    var username = command[1];
    if (players[username] != undefined) {
      delete players[username];
      io.sockets.emit('remove user', username);
    } else {
      console.log("Error: Invalid payout command. Username not found.");
    }
  } else if (command[0] == 'resetserver') {
    io.sockets.emit('reload page');
    players = null;
    chips = null;
    resetDeck();
    shuffle(deck, 10);
    console.log("Cleared all players from server and sent out refresh call to all clients.");
  } else if (command[0] == 'help') {
    console.log("List of Commands:");
    console.log("give [username] [amount]");
    console.log("-- gives the specified user the amount of chips (divided to the largest chip denominator");
    console.log("payout [username]");
    console.log("-- pays all the chips currently on the table to the specified player");
    console.log("loaddeck [deck name]");
    console.log("-- loads a specified deck to the server (available: default, euchre)");
    console.log("removeuser [username]");
    console.log("-- removes the specified user from the server.");
    console.log("resetserver");
    console.log("-- removes all users and resets the server to the original state.");
    // console.log("change [username] [amount] [divisor]");
    // console.log("-- changes the user's specified amount of chips into the divisor");
  }

  else {
    console.log("Error: Invalid command. type help for a list of commands.");
  }
}