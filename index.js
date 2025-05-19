/* eslint-disable no-undef */
'use strict';
import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import cors from 'cors';

import { getSession, ExpressAuth } from '@auth/express';
import GitHub from '@auth/express/providers/github';

import { getGamesArray, validateGame, gamesFilePath } from './helpers.js';

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
    const games = await getGamesArray();
    res.send(games);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch games' });
  }
});

app.post('/games', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) {
    return res.status(403).send('Forbidden');
  }

  try {
    // TODO move it to getGamesArray ?
    try {
      await fs.access(gamesFilePath);
    } catch {
      await fs.writeFile(gamesFilePath, '[]', 'utf-8');
    }

    const newGame = req.body;
    const initialGames = await getGamesArray();
    const gameValidation = validateGame(newGame);

    if (!gameValidation.isValid) {
      return res.status(400).send({ error: gameValidation.error });
    }

    const updatedGames = [...initialGames, newGame];

    await fs.writeFile(gamesFilePath, JSON.stringify(updatedGames), 'utf-8');
    res.status(201).send(updatedGames);
  } catch (error) {
    console.error(error);
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
      // TODO is it ok to mix 401 and 403 logic?
      !session ||
      session.user.githubId !== Number(process.env.MY_GITHUB_ID)
    ) {
      return null;
    }
    return session;
  });
}

// Download data
app.get('/admin/download-data', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) {
    return res.status(403).send('Forbidden');
  }
  try {
    // TODO use getGamesArray() helper insstead of reading the file directly OR keep it to provide 404 case - rethink it
    const data = await fs.readFile(gamesFilePath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch {
    res.status(404).send({ error: 'File not found' });
  }
});

// Upload data
app.post('/admin/upload-data', async (req, res) => {
  const session = await isAuthorized(req, authConfig);
  if (!session) {
    return res.status(403).send('Forbidden');
  }
  try {
    await fs.writeFile(gamesFilePath, JSON.stringify(req.body), 'utf-8');
    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ error: `Failed to upload data: ${error}` });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
