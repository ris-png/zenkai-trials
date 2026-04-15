import type { Character } from "../../types/character";
import { bleachCharacters } from "./bleach";
import { jujutsuKaisenCharacters } from "./jujutsu-kaisen";
import { reincarnatedAsASlimeCharacters } from "./reincarnated-as-a-slime";

export * from "./bleach";
export * from "./jujutsu-kaisen";
export * from "./reincarnated-as-a-slime";

export const allCharacters: Character[] = [
  ...jujutsuKaisenCharacters,
  ...bleachCharacters,
  ...reincarnatedAsASlimeCharacters,
];

export const charactersById: Record<string, Character> = Object.fromEntries(
  allCharacters.map((character) => [character.id, character]),
);
