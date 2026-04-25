import type { Boss } from "../../types/boss";
import { createBossCombatProfile, DEFAULT_BOSS_MANA_PROFILE } from "./shared";

export const dailyBosses: Boss[] = [
  {
    id: "dabi-cinder-warden",
    name: "Dabi",
    anime: "My Hero Academia",
    element: "Fire",
    difficulty: "Easy",
    role: "Mage",
    assetPath: "assets/bosses/dabi.png",
    gameModeAssignments: [
      {
        mode: "daily",
        difficulty: "Easy",
        stageId: "daily-easy",
        stageLabel: "Daily Rift Easy",
      },
    ],
    combat: createBossCombatProfile({
      level: 28,
      stats: {
        hp: 4400,
        atk: 390,
        def: 300,
        speed: 430,
      },
      mana: DEFAULT_BOSS_MANA_PROFILE,
      passiveAbility: {
        id: "dabi-blueflame-fervor",
        name: "Blueflame Fervor",
        category: "battle",
        target: "self",
        effect: "Increases own ATK by 6%.",
        effects: [
          {
            kind: "statModifier",
            trigger: "always-on",
            targetStat: "atk",
            valuePercent: 6,
            description: "Dabi's blue flames sharpen his offensive pressure.",
          },
        ],
      },
      skills: {
        basicAttack: {
          id: "dabi-ember-lance",
          slot: "basic",
          name: "Ember Lance",
          manaCost: 0,
          target: "single-enemy",
          damage: {
            baseDamage: 540,
          },
          effects: [],
        },
        skill1: {
          id: "dabi-cinder-spear",
          slot: "skill1",
          name: "Cinder Spear",
          manaCost: 210,
          target: "single-enemy",
          damage: {
            baseDamage: 980,
          },
          effects: [
            {
              id: "dabi-cinder-spear-burn",
              type: "burn",
              name: "Burn",
              category: "damage-over-time",
              durationTurns: 2,
              damagePerTurnFlat: 180,
              refreshesDurationOnReapply: true,
              description: "Applies a short burn after the strike lands.",
            },
          ],
        },
        skill2: {
          id: "dabi-cremation-wave",
          slot: "skill2",
          name: "Cremation Wave",
          manaCost: 470,
          target: "all-enemies",
          damage: {
            baseDamage: 1750,
            isAreaOfEffect: true,
          },
          effects: [],
          description: "Detonates a blue-flame sweep across the whole team.",
        },
      },
    }),
    description:
      "An easy fire boss who pressures the frontline with steady burn damage and clean AoE threat.",
  },
  {
    id: "kisame-tidal-hunter",
    name: "Kisame Hoshigaki",
    anime: "Naruto Shippuden",
    element: "Water",
    difficulty: "Normal",
    role: "Balanced",
    assetPath: "assets/bosses/kisame.png",
    gameModeAssignments: [
      {
        mode: "daily",
        difficulty: "Normal",
        stageId: "daily-normal",
        stageLabel: "Daily Rift Normal",
      },
      {
        mode: "endless",
        difficulty: "Normal",
        stageId: "endless-water-hunt",
        stageLabel: "Endless Water Hunt",
      },
    ],
    combat: createBossCombatProfile({
      level: 40,
      stats: {
        hp: 5600,
        atk: 470,
        def: 380,
        speed: 420,
      },
      mana: DEFAULT_BOSS_MANA_PROFILE,
      passiveAbility: {
        id: "kisame-sharkskin-guard",
        name: "Sharkskin Guard",
        category: "battle",
        target: "self",
        effect: "Reduces incoming damage by 8%.",
        effects: [
          {
            kind: "damageTakenModifier",
            trigger: "always-on",
            valuePercent: 8,
            description: "Kisame shrugs off a portion of incoming damage.",
          },
        ],
      },
      skills: {
        basicAttack: {
          id: "kisame-sharkskin-slash",
          slot: "basic",
          name: "Sharkskin Slash",
          manaCost: 0,
          target: "single-enemy",
          damage: {
            baseDamage: 620,
          },
          effects: [],
        },
        skill1: {
          id: "kisame-sharkskin-rush",
          slot: "skill1",
          name: "Sharkskin Rush",
          manaCost: 220,
          target: "single-enemy",
          damage: {
            baseDamage: 1180,
          },
          effects: [
            {
              id: "kisame-sharkskin-rush-energy-drain",
              type: "energyDrain",
              name: "Mana Drain",
              category: "utility",
              valueFlat: 120,
              description: "Drains 120 mana from the struck target.",
            },
          ],
        },
        skill2: {
          id: "kisame-great-shark-bomb",
          slot: "skill2",
          name: "Great Shark Bomb",
          manaCost: 500,
          target: "all-enemies",
          damage: {
            baseDamage: 1820,
            isAreaOfEffect: true,
          },
          effects: [
            {
              id: "kisame-great-shark-bomb-barrier",
              type: "shield",
              name: "Water Barrier",
              category: "utility",
              target: "self",
              valueFlat: 900,
              description: "Kisame forms a barrier after unleashing the wave.",
            },
          ],
          description: "A surging bomb of water that hits every opponent.",
        },
      },
    }),
    description:
      "A normal-difficulty water boss with durable stats, mana pressure, and a self-protecting ultimate.",
  },
  {
    id: "mahoraga-adaptive-juggernaut",
    name: "Mahoraga",
    anime: "Jujutsu Kaisen",
    element: "Light",
    difficulty: "Hard",
    role: "Controller",
    assetPath: "assets/bosses/mahoraga.png",
    gameModeAssignments: [
      {
        mode: "daily",
        difficulty: "Hard",
        stageId: "daily-hard",
        stageLabel: "Daily Rift Hard",
      },
      {
        mode: "endless",
        difficulty: "Hard",
        stageId: "endless-adaptation",
        stageLabel: "Endless Adaptation",
      },
    ],
    combat: createBossCombatProfile({
      level: 55,
      stats: {
        hp: 7800,
        atk: 560,
        def: 420,
        speed: 410,
      },
      mana: DEFAULT_BOSS_MANA_PROFILE,
      passiveAbility: {
        id: "mahoraga-wheel-pressure",
        name: "Wheel Pressure",
        category: "battle",
        target: "enemy",
        effect: "Reduces all player SPEED by 8%.",
        effects: [
          {
            kind: "statModifier",
            trigger: "always-on",
            targetStat: "speed",
            valuePercent: 8,
            description: "The adaptation wheel slows the opposing team.",
          },
        ],
      },
      skills: {
        basicAttack: {
          id: "mahoraga-adaptive-cleave",
          slot: "basic",
          name: "Adaptive Cleave",
          manaCost: 0,
          target: "single-enemy",
          damage: {
            baseDamage: 710,
          },
          effects: [],
        },
        skill1: {
          id: "mahoraga-wheel-crash",
          slot: "skill1",
          name: "Wheel Crash",
          manaCost: 250,
          target: "single-enemy",
          damage: {
            baseDamage: 1350,
          },
          effects: [
            {
              id: "mahoraga-wheel-crash-speed-down",
              type: "speedDown",
              name: "Speed Down",
              category: "debuff",
              durationTurns: 2,
              modifiesStat: "speed",
              valuePercent: 20,
              description: "Slows the target for 2 turns.",
            },
          ],
        },
        skill2: {
          id: "mahoraga-wheel-of-exorcism",
          slot: "skill2",
          name: "Wheel of Exorcism",
          manaCost: 520,
          target: "all-enemies",
          damage: {
            baseDamage: 2100,
            isAreaOfEffect: true,
          },
          effects: [
            {
              id: "mahoraga-wheel-of-exorcism-shock",
              type: "shock",
              name: "Shock",
              category: "debuff",
              durationTurns: 2,
              valuePercent: 30,
              modifiesStat: "speed",
              description: "Cuts speed by 30% for 2 turns.",
            },
          ],
          description: "A hard-hitting adaptation burst that also impairs movement.",
        },
      },
    }),
    description:
      "A hard boss tuned for control pressure, with teamwide speed suppression and strong burst damage.",
  },
];
