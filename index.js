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
  const session = await getSession(req, authConfig);

  if (!session) {
    return res.status(401).send({ error: 'Not authenticated' });
  }

  if (session.user.githubId !== Number(process.env.MY_GITHUB_ID)) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  try {
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

app.set('trust proxy', true);

app.get('/is-authenticated', async (req, res) => {
  const session = await getSession(req, authConfig);
  res.send({ authenticated: !!session });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
