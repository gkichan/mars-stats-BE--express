/* eslint-disable no-undef */
'use strict';
import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import { getGamesArray, validateGame } from './helpers.js';
import cors from 'cors';

import { ExpressAuth } from '@auth/express';
import GitHub from '@auth/express/providers/github';

const app = express();
// const port = process.env.PORT || 3000 // TODO add env variables
const port = 3000;

// Middleware to parse JSON request body
app.use(express.json());
// Middleware to enable CORS
app.use(cors());

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
    const initialGames = await getGamesArray();
    const gameValidation = validateGame(newGame);

    if (!gameValidation.isValid) {
      return res.status(400).send({ error: gameValidation.error });
    }

    const updatedGames = [...initialGames, newGame];

    await fs.writeFile(
      './data/games.json',
      JSON.stringify(updatedGames),
      'utf-8'
    );
    res.status(201).send(updatedGames);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: `Failed to save the game due to ${error}` });
  }
});

app.set('trust proxy', true);
app.use(
  '/auth',
  ExpressAuth({
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
    ],
    secret: process.env.AUTH_SECRET,
  })
);

app.use('/auth/callback/github', (req, res) => {
  const { provider, user } = req.auth;
  console.log(req);
  console.log('User authenticated:', user);
  res.send(`Hello ${user.name}, you are authenticated with ${provider}`);
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
