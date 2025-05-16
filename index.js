/* eslint-disable no-undef */
'use strict';
import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import cors from 'cors';

import { getSession, ExpressAuth } from '@auth/express';
import GitHub from '@auth/express/providers/github';

import { getGamesArray, validateGame } from './helpers.js';

const app = express();
// const port = process.env.PORT || 3000 // TODO add env variables
const port = 3000;

// Middleware to parse JSON request body
app.use(express.json());
// Middleware to enable CORS
app.use(cors());

const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
};

app.use('/auth', ExpressAuth(authConfig));

app.get('/games', async (req, res) => {
  const session = await getSession(req, authConfig);

  if (!session) {
    return res.status(401).send({ error: 'Not authenticated' });
  }

  console.log('Authenticated user:', session);

  try {
    const games = await getGamesArray();
    res.send({ user: session, games });
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

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
