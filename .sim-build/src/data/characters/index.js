"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.charactersById = exports.allCharacters = void 0;
const bleach_1 = require("./bleach");
const jujutsu_kaisen_1 = require("./jujutsu-kaisen");
const reincarnated_as_a_slime_1 = require("./reincarnated-as-a-slime");
__exportStar(require("./bleach"), exports);
__exportStar(require("./jujutsu-kaisen"), exports);
__exportStar(require("./reincarnated-as-a-slime"), exports);
exports.allCharacters = [
    ...jujutsu_kaisen_1.jujutsuKaisenCharacters,
    ...bleach_1.bleachCharacters,
    ...reincarnated_as_a_slime_1.reincarnatedAsASlimeCharacters,
];
exports.charactersById = Object.fromEntries(exports.allCharacters.map((character) => [character.id, character]));
