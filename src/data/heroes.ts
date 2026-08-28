import type { TraitName } from './traits';

export interface HeroDef {
  id: string;
  name: string;
  origin: string;
  creature: string;
  cost: number;
  glyph: string;
  traits: TraitName[];
  hp: number;
  dmg: number;
  as: number;
  range: number;
  crit: number;
  ability: string;
  abilityText: string;
  quirk: string;
}

export const HEROES: HeroDef[] = [
  {
    id: 'jorm',
    name: 'Jörmungandr',
    origin: 'Norse',
    creature: 'World Serpent',
    cost: 4,
    glyph: '⌇',
    traits: ['Serpent', 'Colossal'],
    hp: 450,
    dmg: 62,
    as: 0.65,
    range: 1,
    crit: 0.1,
    ability: 'Ouroboros Coil',
    abilityText:
      'Coils the field: deals 220 magic damage to all adjacent enemies and heals for half the damage dealt.',
    quirk: 'Anchor unit. Enormous HP pool, slow swings, heals off its own AOE.',
  },
  {
    id: 'quetz',
    name: 'Quetzalcóatl',
    origin: 'Mexica',
    creature: 'Feathered Serpent',
    cost: 5,
    glyph: '≋',
    traits: ['Serpent', 'Sky'],
    hp: 325,
    dmg: 55,
    as: 0.85,
    range: 3,
    crit: 0.15,
    ability: 'Dawn Wind',
    abilityText:
      'Sends a gale down the row: 300 magic damage split among all enemies hit, and allies gain +25% attack speed for 4s.',
    quirk: 'Backline carry with a board-wide attack speed buff.',
  },
  {
    id: 'thund',
    name: 'Thunderbird',
    origin: 'Lakota',
    creature: 'Wakíŋyaŋ',
    cost: 3,
    glyph: '⌃',
    traits: ['Sky', 'Ancestor'],
    hp: 300,
    dmg: 48,
    as: 0.95,
    range: 3,
    crit: 0.2,
    ability: 'Split Sky',
    abilityText:
      'Chain lightning arcs to 3 enemies for 180 each; every arc after the first crits automatically.',
    quirk: 'High crit, multi-target burst. Rewards Trickster stacking.',
  },
  {
    id: 'anans',
    name: 'Anansi',
    origin: 'Akan',
    creature: 'Trickster Spider',
    cost: 2,
    glyph: '✻',
    traits: ['Trickster', 'Ancestor'],
    hp: 260,
    dmg: 40,
    as: 1.1,
    range: 2,
    crit: 0.35,
    ability: 'Web of Tales',
    abilityText:
      'Snares the two nearest enemies for 2s and marks them: marked foes take +20% damage from everyone.',
    quirk: 'Cheapest crit engine. 35% base crit rate, damage amplifier.',
  },
  {
    id: 'bunyi',
    name: 'Bunyip',
    origin: 'Aboriginal',
    creature: 'Billabong Horror',
    cost: 2,
    glyph: '◐',
    traits: ['Guardian', 'Serpent'],
    hp: 400,
    dmg: 38,
    as: 0.7,
    range: 1,
    crit: 0.05,
    ability: 'Drowning Grasp',
    abilityText:
      'Drags the highest-attack enemy into the water: 160 damage and that unit is silenced for 3s.',
    quirk: 'Frontline disruptor. Cheap, tanky, shuts down enemy carries.',
  },
  {
    id: 'garud',
    name: 'Garuda',
    origin: 'Hindu',
    creature: 'Sun Eagle',
    cost: 4,
    glyph: '⩕',
    traits: ['Sky', 'Guardian'],
    hp: 390,
    dmg: 58,
    as: 0.9,
    range: 1,
    crit: 0.12,
    ability: 'Sunward Dive',
    abilityText:
      'Leaps to the enemy backline for 260 physical damage and gains a 300-point shield for 5s.',
    quirk: 'Dive bruiser that reaches past the enemy frontline.',
  },
  {
    id: 'kitsu',
    name: 'Kitsune',
    origin: 'Japanese',
    creature: 'Nine-Tailed Fox',
    cost: 3,
    glyph: '✧',
    traits: ['Trickster', 'Infernal'],
    hp: 270,
    dmg: 44,
    as: 1.0,
    range: 2,
    crit: 0.28,
    ability: 'Foxfire Nine',
    abilityText:
      'Nine wisps seek random enemies, 70 magic damage each. Every wisp can crit independently.',
    quirk: 'Spray damage that scales absurdly with crit sources.',
  },
  {
    id: 'ifrit',
    name: 'Ifrit',
    origin: 'Arabian',
    creature: 'Fire Jinn',
    cost: 4,
    glyph: '✷',
    traits: ['Infernal', 'Trickster'],
    hp: 310,
    dmg: 52,
    as: 0.8,
    range: 2,
    crit: 0.18,
    ability: 'Pillar of Smokeless Fire',
    abilityText:
      'Erupts a 2×2 pillar for 280 magic damage and leaves burning ground dealing 40/s for 4s.',
    quirk: "The board's best AOE zone control.",
  },
  {
    id: 'zirni',
    name: 'Zmey Gorynych',
    origin: 'Slavic',
    creature: 'Three-Headed Dragon',
    cost: 5,
    glyph: '⁂',
    traits: ['Infernal', 'Colossal'],
    hp: 475,
    dmg: 70,
    as: 0.6,
    range: 2,
    crit: 0.1,
    ability: 'Three Throats',
    abilityText:
      'Breathes three cones in sequence, 200 magic damage each. Heads regrow: casts a second time at 30% HP for free.',
    quirk: 'Late-game monster. Enormous double-cast damage ceiling.',
  },
  {
    id: 'taniw',
    name: 'Taniwha',
    origin: 'Māori',
    creature: 'River Guardian',
    cost: 3,
    glyph: '⏄',
    traits: ['Guardian', 'Ancestor'],
    hp: 430,
    dmg: 42,
    as: 0.75,
    range: 1,
    crit: 0.05,
    ability: 'Tide Ward',
    abilityText:
      'Grants every ally a 220-point shield and cleanses slows. Allies under shield deal +15% damage.',
    quirk: 'Pure enabler. Best board-wide defensive buff in the pool.',
  },
  {
    id: 'anzuu',
    name: 'Anzû',
    origin: 'Mesopotamian',
    creature: 'Storm Lion-Eagle',
    cost: 2,
    glyph: '⋔',
    traits: ['Sky', 'Colossal'],
    hp: 350,
    dmg: 46,
    as: 0.85,
    range: 1,
    crit: 0.1,
    ability: 'Tablet Thief',
    abilityText:
      'Steals 25 spell power from the enemy with the most mana and keeps it for the round.',
    quirk: 'Cheap scaling frontline that gets stronger every cast.',
  },
  {
    id: 'sphin',
    name: 'Sphinx',
    origin: 'Egyptian',
    creature: 'Riddle Keeper',
    cost: 5,
    glyph: '☖',
    traits: ['Ancestor', 'Guardian'],
    hp: 410,
    dmg: 50,
    as: 0.7,
    range: 2,
    crit: 0.1,
    ability: 'Unanswerable Riddle',
    abilityText:
      'Poses a riddle: the two lowest-HP enemies are stunned for 2.5s and take 240 true damage.',
    quirk: 'Execution and lockdown. True damage ignores all armor.',
  },
];

export const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h])) as Record<
  string,
  HeroDef
>;
