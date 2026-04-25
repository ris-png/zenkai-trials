import type { Boss } from "../../types/boss";
import { createBossCombatProfile, DEFAULT_BOSS_MANA_PROFILE } from "./shared";

export const adventureBosses: Boss[] = [
  {
    id: "kisame-abyssal-gatekeeper",
    name: "Kisame Hoshigaki, Abyssal Gatekeeper",
    anime: "Naruto Shippuden",
    element: "Water",
    difficulty: "Floor Boss",
    role: "Tank",
    assetPath: "assets/bosses/kisame.png",
    gameModeAssignments: [
      {
        mode: "adventure",
        difficulty: "Floor Boss",
        floor: 50,
        stageId: "floor-50",
        stageLabel: "Adventure Floor 50",
      },
    ],
    combat: createBossCombatProfile({
      level: 65,
      stats: {
        hp: 9200,
        atk: 610,
        def: 470,
        speed: 450,
      },
      mana: DEFAULT_BOSS_MANA_PROFILE,
      passiveAbility: {
        id: "kisame-deepwater-shell",
        name: "Deepwater Shell",
        category: "battle",
        target: "self",
        effect: "Increases own DEF by 10%.",
        effects: [
          {
            kind: "statModifier",
            trigger: "always-on",
            targetStat: "def",
            valuePercent: 10,
            description: "The floor boss enters battle with enhanced defense.",
          },
        ],
      },
      skills: {
        basicAttack: {
          id: "kisame-floor-sharkskin-drive",
          slot: "basic",
          name: "Sharkskin Drive",
          manaCost: 0,
          target: "single-enemy",
          damage: {
            baseDamage: 760,
          },
          effects: [],
        },
        skill1: {
          id: "kisame-floor-flood-prison",
          slot: "skill1",
          name: "Flood Prison",
          manaCost: 240,
          target: "single-enemy",
          damage: {
            baseDamage: 1400,
          },
          effects: [
            {
              id: "kisame-floor-flood-prison-def-down",
              type: "defDown",
              name: "DEF Down",
              category: "debuff",
              durationTurns: 2,
              modifiesStat: "def",
              valuePercent: 15,
              description: "The target's defense is reduced by 15% for 2 turns.",
            },
          ],
        },
        skill2: {
          id: "kisame-floor-tidal-devourer",
          slot: "skill2",
          name: "Tidal Devourer",
          manaCost: 540,
          target: "all-enemies",
          damage: {
            baseDamage: 2200,
            isAreaOfEffect: true,
          },
          effects: [
            {
              id: "kisame-floor-tidal-devourer-energy-drain",
              type: "energyDrain",
              name: "Tidal Drain",
              category: "utility",
              valueFlat: 150,
              description: "Each target loses 150 mana to the engulfing tide.",
            },
          ],
          description: "A floor-clearing wave that also strips mana from the whole team.",
        },
      },
    }),
    encounterEffect: {
      id: "kisame-floor-shield-tide",
      name: "Shield Tide",
      effect: "Boss gains a 900 shield every 3 rounds.",
      triggerCondition: "Every 3 rounds.",
      description: "The arena tide hardens around Kisame at regular intervals.",
      effects: [
        {
          id: "kisame-floor-shield-tide-effect",
          type: "shield",
          name: "Tide Shield",
          category: "utility",
          target: "self",
          valueFlat: 900,
          description: "Adds a 900-point shield to the boss.",
        },
      ],
    },
    description:
      "A floor boss built around long fights, mana pressure, and periodic defensive resets.",
  },
  {
    id: "mahoraga-final-adaptation",
    name: "Mahoraga, Final Adaptation",
    anime: "Jujutsu Kaisen",
    element: "Light",
    difficulty: "Final Boss",
    role: "Balanced",
    assetPath: "assets/bosses/mahoraga.png",
    gameModeAssignments: [
      {
        mode: "adventure",
        difficulty: "Final Boss",
        floor: 100,
        stageId: "floor-100",
        stageLabel: "Adventure Floor 100",
      },
    ],
    combat: createBossCombatProfile({
      level: 80,
      stats: {
        hp: 13200,
        atk: 720,
        def: 540,
        speed: 480,
      },
      mana: DEFAULT_BOSS_MANA_PROFILE,
      passiveAbility: {
        id: "mahoraga-final-adaptation-shell",
        name: "Adaptation Shell",
        category: "battle",
        target: "self",
        effect: "Reduces incoming damage by 10%.",
        effects: [
          {
            kind: "damageTakenModifier",
            trigger: "always-on",
            valuePercent: 10,
            description: "The final form of Mahoraga passively resists incoming damage.",
          },
        ],
      },
      skills: {
        basicAttack: {
          id: "mahoraga-final-ruin-slash",
          slot: "basic",
          name: "Ruin Slash",
          manaCost: 0,
          target: "single-enemy",
          damage: {
            baseDamage: 840,
          },
          effects: [],
        },
        skill1: {
          id: "mahoraga-final-adaptation-cleave",
          slot: "skill1",
          name: "Adaptation Cleave",
          manaCost: 260,
          target: "single-enemy",
          damage: {
            baseDamage: 1580,
          },
          effects: [
            {
              id: "mahoraga-final-adaptation-cleave-def-down",
              type: "defDown",
              name: "DEF Down",
              category: "debuff",
              durationTurns: 2,
              modifiesStat: "def",
              valuePercent: 15,
              description: "The target's defense is reduced by 15% for 2 turns.",
            },
          ],
        },
        skill2: {
          id: "mahoraga-final-eight-handled-ruin",
          slot: "skill2",
          name: "Eight-Handled Ruin",
          manaCost: 600,
          target: "all-enemies",
          damage: {
            baseDamage: 2600,
            isAreaOfEffect: true,
          },
          effects: [
            {
              id: "mahoraga-final-eight-handled-ruin-atk-down",
              type: "atkDown",
              name: "ATK Down",
              category: "debuff",
              durationTurns: 2,
              modifiesStat: "atk",
              valuePercent: 18,
              description: "All enemies lose 18% ATK for 2 turns.",
            },
          ],
          description: "A final sweeping ultimate that hits the whole party and weakens retaliation.",
        },
      },
    }),
    encounterEffect: {
      id: "mahoraga-final-fury-threshold",
      name: "Adaptive Fury",
      effect: "Below 30% HP, boss gains ATK Up 20% for 2 turns.",
      triggerCondition: "When boss HP drops below 30%.",
      description: "The final boss enters a lethal phase once heavily damaged.",
      effects: [
        {
          id: "mahoraga-final-fury-threshold-effect",
          type: "atkUp",
          name: "ATK Up",
          category: "buff",
          target: "self",
          durationTurns: 2,
          modifiesStat: "atk",
          valuePercent: 20,
          description: "Boosts boss ATK by 20% for 2 turns.",
        },
      ],
    },
    description:
      "A final boss encounter with heavy durability, teamwide punishment, and a dangerous low-health phase.",
  },
];
