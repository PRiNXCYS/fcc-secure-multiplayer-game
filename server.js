require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.noCache());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

const io = socketIo(server);
const GAME_WIDTH = 640;
const GAME_HEIGHT = 480;
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 5;
const COLLECTIBLE_COUNT = 8;
const directions = ['up', 'down', 'left', 'right'];
const players = new Map();
const collectibles = new Map();
let nextCollectibleId = 0;

function createCollectible() {
  let x;
  let y;
  let attempts = 0;
  do {
    x = Math.floor(Math.random() * (GAME_WIDTH - PLAYER_SIZE * 2)) + PLAYER_SIZE;
    y = Math.floor(Math.random() * (GAME_HEIGHT - PLAYER_SIZE * 2)) + PLAYER_SIZE;
    attempts++;
  } while (
    attempts < 50 &&
    Array.from(players.values()).some(player =>
      Math.abs(player.x - x) < PLAYER_SIZE * 2 &&
      Math.abs(player.y - y) < PLAYER_SIZE * 2
    )
  );

  const collectible = { x, y, value: 1, id: `collectible-${nextCollectibleId++}` };
  collectibles.set(collectible.id, collectible);
}

function getGameState() {
  return {
    players: Array.from(players.values(), player => ({
      x: player.x,
      y: player.y,
      score: player.score,
      id: player.id
    })),
    collectibles: Array.from(collectibles.values())
  };
}

for (let index = 0; index < COLLECTIBLE_COUNT; index++) {
  createCollectible();
}

io.on('connection', client => {
  players.set(client.id, {
    x: Math.floor(Math.random() * (GAME_WIDTH - PLAYER_SIZE * 2)) + PLAYER_SIZE,
    y: Math.floor(Math.random() * (GAME_HEIGHT - PLAYER_SIZE * 2)) + PLAYER_SIZE,
    score: 0,
    id: client.id,
    direction: null
  });

  client.on('player:input', direction => {
    if (direction === null || directions.includes(direction)) {
      players.get(client.id).direction = direction;
    }
  });

  client.on('disconnect', () => {
    players.delete(client.id);
  });
});

setInterval(() => {
  players.forEach(player => {
    switch (player.direction) {
      case 'up':
        player.y = Math.max(PLAYER_SIZE / 2, player.y - PLAYER_SPEED);
        break;
      case 'down':
        player.y = Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, player.y + PLAYER_SPEED);
        break;
      case 'left':
        player.x = Math.max(PLAYER_SIZE / 2, player.x - PLAYER_SPEED);
        break;
      case 'right':
        player.x = Math.min(GAME_WIDTH - PLAYER_SIZE / 2, player.x + PLAYER_SPEED);
        break;
    }

    const collected = [];
    Array.from(collectibles.entries()).forEach(([id, item]) => {
      if (Math.abs(player.x - item.x) < PLAYER_SIZE &&
          Math.abs(player.y - item.y) < PLAYER_SIZE) {
        player.score += item.value;
        collectibles.delete(id);
        collected.push(id);
      }
    });
    collected.forEach(() => createCollectible());
  });

  io.emit('game:state', getGameState());
}, 50);

module.exports = app; // For testing
