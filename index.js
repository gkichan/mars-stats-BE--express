import express from 'express';
import fs from 'fs/promises';
import { getGamesArray } from './helpers.js';
// test comit
const app = express()
const port = process.env.PORT || 3000

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
