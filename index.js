const express = require('express')
const fs = require('node:fs/promises');
const { games } = require('./data/games.json')
const app = express()
const port = process.env.PORT || 3000
const gamesFilePath = './data/games.json';

async function getGamesArray() {
  try {
    const data = await fs.readFile(gamesFilePath, 'utf-8');
    const games = JSON.parse(data);
    return games;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Middleware to parse JSON request body
app.use(express.json())

app.get('/games', async (req, res) => {
  try {
    const games = await getGamesArray();
    res.send(games);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch games' });
  }
});

app.post('/games', async (req, res) => {
  try {
    const newGame = req.body;
    const games = await getGamesArray();

    // Validate the new game object. Use model.js to ensure proper values.
    // if (!newGame.name || !newGame.genre || !newGame.releaseYear) {
    //   return res.status(400).send({ error: 'Invalid game data' });
    // }

    games.push(newGame);
    await fs.writeFile('./data/games.json', JSON.stringify(games), 'utf-8');
    res.status(201).send(games);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to save the game' });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
