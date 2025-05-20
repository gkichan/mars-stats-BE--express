'use strict';
import { PlayerName, Corporation } from './models.js';

const gameValidationErrors = {
  arrayEmpty: 'Game array is empty or not an array',
  incorrectStructure: (player) =>
    `Player entry ${JSON.stringify(player)} has incorrect structure`,
  incorrectValueType: (player) =>
    `Player entry ${JSON.stringify(player)} has incorrect value type`,
  nameIsInvalid: (name) => `Player name ${name} is not valid`,
  corporationIsInvalid: (corporation) =>
    `Corporation ${corporation} is not valid`, // TODO handle empty string separately to avoid 'Corporation  is not valid' case
  nameHasDuplicates: 'Game contains player name duplicates',
};

export function validateGame(game) {
  if (isArrayEmpty(game)) {
    return {
      isValid: false,
      error: gameValidationErrors.arrayEmpty,
    };
  }

  for (const player of game) {
    if (isInvalidPlayerEntryStructure(player)) {
      return {
        isValid: false,
        error: gameValidationErrors.incorrectStructure(player),
      };
    }
  }

  for (const player of game) {
    if (isInvalidPlayerEntryValueType(player)) {
      return {
        isValid: false,
        error: gameValidationErrors.incorrectValueType(player),
      };
    }
  }

  for (const player of game) {
    if (isInvalidPlayerName(player.name)) {
      return {
        isValid: false,
        error: gameValidationErrors.nameIsInvalid(player.name),
      };
    }
  }

  for (const player of game) {
    if (isInvalidCorporation(player.corporation)) {
      return {
        isValid: false,
        error: gameValidationErrors.corporationIsInvalid(player.corporation),
      };
    }
  }

  if (nameHasDuplicates(game)) {
    return {
      isValid: false,
      error: gameValidationErrors.nameHasDuplicates,
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

// Validator should return 'true' if validation fails. It means validation rule is not met.
// Example: isEmpty = true, isInvalid = true.
function isArrayEmpty(array) {
  return !Array.isArray(array) || array.length === 0;
}

function isInvalidPlayerEntryStructure(player) {
  return !(
    Object.hasOwn(player, 'name') &&
    Object.hasOwn(player, 'corporation') &&
    Object.hasOwn(player, 'VP')
  );
}

function isInvalidPlayerEntryValueType(player) {
  return !(
    typeof player.name === 'string' &&
    typeof player.corporation === 'string' &&
    typeof player.VP === 'number' &&
    player.VP > 0
  );
}

function isInvalidPlayerName(name) {
  return !Object.values(PlayerName).includes(name);
}

function isInvalidCorporation(corporation) {
  return !Object.values(Corporation).includes(corporation);
}

function nameHasDuplicates(game) {
  const names = game.map((player) => player.name);
  const uniqueNames = new Set(names);
  return names.length > uniqueNames.size;
}
