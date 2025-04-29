import fs from 'fs/promises';

export async function getGamesArray() {
  const gamesFilePath = './data/games.json';

  try {
    const data = await fs.readFile(gamesFilePath, 'utf-8');
    const games = JSON.parse(data);
    return games;
  } catch (error) {
    console.error(error);
    return []; // TODO its not OK to return an empty array here, we should handle the error properly
  }
}