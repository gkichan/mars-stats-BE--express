/* eslint-disable no-undef */
'use strict';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

import { getSession, ExpressAuth } from '@auth/express';
import GitHub from '@auth/express/providers/github';

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

app.set('trust proxy', true);

const authConfig = {
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: 'read:user' } },
      profile(profile) {
        return {
          githubId: profile.id,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.githubId = user.githubId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && session.user.user) {
        session.user = session.user.user;
      }
      session.user.githubId = token.githubId;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(process.env.FRONTEND_URL)) {
        return url;
      }
      return baseUrl;
    },
  },
  cookies: {
    sessionToken: {
      name: `__Secure-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },
};

app.use('/auth', ExpressAuth(authConfig));

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

app.post('/games', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) return res.status(403).send('Forbidden');

  try {
    const db = await connectToMongo();
    const gameValidation = validateGame(req.body);

    if (!gameValidation.isValid) {
      return res.status(400).send({ error: gameValidation.error });
    }

    // Insert as a single document
    await db.collection('games').insertOne({ games: req.body });
    const games = await db.collection('games').find().toArray();
    console.log('games', games);
    console.log('mongodbResponseMapper(games)', mongodbResponseMapper(games));
    res.status(201).send(mongodbResponseMapper(games));
  } catch (error) {
    res.status(500).send({ error: `Failed to save the game due to ${error}` });
  }
});

app.get('/is-authenticated', async (req, res) => {
  const session = await getSession(req, authConfig);
  res.send({ authenticated: !!session });
});

function isAuthorized(req, authConfig) {
  return getSession(req, authConfig).then((session) => {
    if (
      // TODO would be nice to return object with error (403 if session but different ID or 401 if no session)
      !session ||
      session.user.githubId !== Number(process.env.MY_GITHUB_ID)
    ) {
      return null;
    }
    return session;
  });
}

app.get('/admin/download-data', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) return res.status(403).send('Forbidden');
  try {
    const db = await connectToMongo();
    const games = await db.collection('games').find().toArray();
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(games));
  } catch {
    res.status(404).send({ error: 'Data not found' });
  }
});

app.post('/admin/upload-data', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) return res.status(403).send('Forbidden');
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
