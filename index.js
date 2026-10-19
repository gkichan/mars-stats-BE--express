/* eslint-disable no-undef */
'use strict';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import basicAuth from 'express-basic-auth';

import { validateGame, mongodbResponseMapper } from './helpers.js';

const client = new MongoClient(process.env.MONGODB_URI);
let db;
 
async function connectToMongo() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
  }
  return db;
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

const authMiddleware = basicAuth({
  users: { [process.env.AUTH_LOGIN]: process.env.AUTH_PASSWORD },
  challenge: true,
  realm: 'Test Area',
});

app.get('/sign-in', authMiddleware, (req, res) => {
  res.redirect(process.env.FULL_FRONTEND_URL);
});

app.get('/games', async (req, res) => {
  try {
    const db = await connectToMongo();
    const games = await db.collection('games').find().toArray();
    res.send(mongodbResponseMapper(games));
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Failed to fetch games' });
  }
});

app.post('/games', authMiddleware, async (req, res) => {
  try {
    const db = await connectToMongo();
    const gameValidation = validateGame(req.body);

    if (!gameValidation.isValid) {
      return res.status(400).send({ error: gameValidation.error });
    }

    // Insert as a single document
    await db.collection('games').insertOne({ game: req.body });
    const games = await db.collection('games').find().toArray();
    res.status(201).send(mongodbResponseMapper(games));
  } catch (error) {
    res.status(500).send({ error: `Failed to save the game due to ${error}` });
  }
});

// app.get('/is-authenticated', async (req, res) => {
//   const session = await getSession(req, authConfig);
//   res.send({ authenticated: !!session });
// });

app.get('/admin/download-data', authMiddleware, async (req, res) => {
  try {
    const db = await connectToMongo();
    const games = await db.collection('games').find().toArray();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(games));
  } catch {
    res.status(404).send({ error: 'Data not found' });
  }
});

app.post('/admin/upload-data', authMiddleware, async (req, res) => {
  try {
    const db = await connectToMongo();

    await db.collection('games').deleteMany({});
    // Insert each game as a document
    await db
      .collection('games')
      .insertMany(req.body.map((game) => ({ game: game })));
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ error: `Failed to upload data: ${error}` });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
