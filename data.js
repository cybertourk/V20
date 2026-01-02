// --- V20 Core Rules Constants ---

export const ATTRIBUTES = {
    physical: ['Strength', 'Dexterity', 'Stamina'],
    social: ['Charisma', 'Manipulation', 'Appearance'],
    mental: ['Perception', 'Intelligence', 'Wits']
};

export const ABILITIES = {
    talents: ['Alertness', 'Athletics', 'Brawl', 'Dodge', 'Empathy', 'Expression', 'Intimidation', 'Leadership', 'Streetwise', 'Subterfuge'],
    skills: ['Animal Ken', 'Crafts', 'Drive', 'Etiquette', 'Firearms', 'Larceny', 'Melee', 'Performance', 'Stealth', 'Survival'],
    knowledges: ['Academics', 'Computer', 'Finance', 'Investigation', 'Law', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology']
};

export const CLANS = [
    'Assamite', 'Brujah', 'Caitiff', 'Follower of Set', 'Gangrel', 'Giovanni', 'Lasombra', 
    'Malkavian', 'Nosferatu', 'Ravnos', 'Toreador', 'Tremere', 'Tzimisce', 'Ventrue'
];

export const CLAN_WEAKNESSES = {
    'Assamite': 'Blood addiction: Must roll Self-Control when tasting vampire blood or fall into a hunger frenzy.',
    'Brujah': 'Prone to Frenzy: The difficulty of checks to resist frenzy is 2 higher than normal.',
    'Caitiff': 'Clanless: No inherent clan advantages; buying Disciplines costs 6x rating.',
    'Follower of Set': 'Light Sensitivity: Take double damage from sunlight. -1 die to all pools in bright light.',
    'Gangrel': 'Bestial Mark: Every frenzy leaves a permanent animal feature. For every 5 features, -1 Social attribute.',
    'Giovanni': 'The Kiss of Death: Their bite causes excruciating pain instead of pleasure; kills mortals easily.',
    'Lasombra': 'Cast No Reflection: They do not appear in mirrors or cameras. Take +1 damage from sunlight.',
    'Malkavian': 'Insanity: You have at least one permanent, incurable Derangement.',
    'Nosferatu': 'Hideous: Appearance is zero and cannot be raised. Automatic failure on Appearance rolls.',
    'Ravnos': 'Vice: addicted to a specific vice (gambling, theft, lying). Roll Self-Control to resist.',
    'Toreador': 'Fascination: Entranced by beauty. Roll Self-Control to break focus on beautiful things.',
    'Tremere': 'Blood Bond: Starts with 1 step bound to the Council of Seven. +1 difficulty to resist blood bonds.',
    'Tzimisce': 'Territorial: Must sleep in two handfuls of native soil or halve all dice pools.',
    'Ventrue': 'Rarefied Tastes: Can only feed from a specific type of mortal (e.g., blondes, soldiers).'
};

export const ARCHETYPES = [
    'Architect', 'Autocrat', 'Bon Vivant', 'Bravo', 'Caregiver', 'Celebrity', 'Child', 
    'Competitor', 'Conformist', 'Conniver', 'Creep Show', 'Curmudgeon', 'Dabbler', 'Deviant', 
    'Director', 'Enigma', 'Eye of the Storm', 'Fanatic', 'Gallant', 'Guru', 'Idealist', 
    'Judge', 'Loner', 'Martyr', 'Masochist', 'Monster', 'Pedagogue', 'Penitent', 
    'Perfectionist', 'Rebel', 'Rogue', 'Soldier', 'Survivor', 'Thrill-Seeker', 'Traditionalist', 
    'Trickster', 'Visionary'
];

export const DISCIPLINES = [
    'Animalism', 'Auspex', 'Celerity', 'Chimerstry', 'Dementation', 'Dominate', 'Fortitude', 
    'Necromancy', 'Obfuscate', 'Obtenebration', 'Potence', 'Presence', 'Protean', 'Quietus', 
    'Serpentis', 'Thaumaturgy', 'Vicissitude'
];

export const BACKGROUNDS = [
    'Allies', 'Alternate Identity', 'Black Hand Membership', 'Contacts', 'Domain', 'Fame', 
    'Generation', 'Herd', 'Influence', 'Mentor', 'Resources', 'Retainers', 'Rituals', 'Status'
];

export const PATHS = [
    'Humanity', 'Path of Blood', 'Path of Caine', 'Path of Cathari', 'Path of Death and the Soul',
    'Path of Ecstasy', 'Path of Entelechy', 'Path of Feral Heart', 'Path of Harmony', 
    'Path of Honorable Accord', 'Path of Lilith', 'Path of Metamorphosis', 'Path of Night', 
    'Path of Paradox', 'Path of Power and the Inner Voice', 'Path of the Bones', 'Path of Typhon'
];

export const V20_MERITS_LIST = [
    // Physical
    'Acute Sense', 'Ambidextrous', 'Bruiser', 'Catlike Balance', 'Early Riser', 'Eat Food', 
    'Friendly Face', 'Huge Size', 'Daredevil',
    // Mental
    'Common Sense', 'Concentration', 'Eidetic Memory', 'Iron Will', 'Light Sleeper', 
    'Natural Linguist', 'Time Sense', 'Unbondable',
    // Social
    'Prestigious Sire', 'Natural Leader', 'Boon', 'Holdings', 'Rising Star',
    // Supernatural
    'Medium', 'Magic Resistance', 'Oracular Ability', 'Spirit Mentor', 'True Love'
];

export const V20_FLAWS_LIST = [
    // Physical
    'Bad Sight', 'Deaf', 'Hard of Hearing', 'One Eye', 'Disfigured', 'Lame', 'Monstrous', 
    'Permanent Wound', 'Short', 'Slow Healing',
    // Mental
    'Amnesia', 'Confused', 'Deep Sleeper', 'Nightmares', 'Phobia', 'Shy', 'Soft-Hearted', 
    'Speech Impediment', 'Short Fuse', 'Vengeful', 'Weak-Willed',
    // Social
    'Dark Secret', 'Enemy', 'Hunted', 'Infamous Sire', 'Mistaken Identity', 'Probationary Sect Member',
    // Supernatural
    'Cast No Reflection', 'Cursed', 'Haunted', 'Repulsed by Garlic', 'Touch of Frost', 'Eerie Presence'
];

// V20 Core Page 270 (Generation Charts)
export const GEN_LIMITS = {
    13: { traitMax: 5, bloodPool: 10, bloodPerTurn: 1 },
    12: { traitMax: 5, bloodPool: 11, bloodPerTurn: 1 },
    11: { traitMax: 5, bloodPool: 12, bloodPerTurn: 1 },
    10: { traitMax: 5, bloodPool: 13, bloodPerTurn: 1 },
    9:  { traitMax: 5, bloodPool: 14, bloodPerTurn: 2 },
    8:  { traitMax: 5, bloodPool: 15, bloodPerTurn: 3 },
    7:  { traitMax: 6, bloodPool: 20, bloodPerTurn: 4 },
    6:  { traitMax: 7, bloodPool: 30, bloodPerTurn: 6 },
    5:  { traitMax: 8, bloodPool: 40, bloodPerTurn: 8 },
    4:  { traitMax: 9, bloodPool: 50, bloodPerTurn: 10 }
};

export const FREEBIE_COSTS = {
    attributes: 5,
    abilities: 2,
    disciplines: 7,
    backgrounds: 1,
    virtues: 2,
    humanity: 1, 
    willpower: 1
};

export const XP_COSTS = {
    newAbility: 3,
    newPath: 7,
    attribute: 4, 
    ability: 2,   
    clanDiscipline: 5, 
    otherDiscipline: 7, 
    virtue: 2,    
    humanity: 2,  
    willpower: 1  
};

// --- Blank Character Template (Default Export) ---
const blankTemplate = {
    name: "",
    player: "",
    chronicle: "",
    nature: "",
    demeanor: "",
    concept: "",
    clan: "",
    generation: 13,
    sire: "",
    
    // Attributes
    attributes: {
        Strength: 1, Dexterity: 1, Stamina: 1,
        Charisma: 1, Manipulation: 1, Appearance: 1,
        Perception: 1, Intelligence: 1, Wits: 1
    },
    
    // Abilities
    abilities: {
        Alertness: 0, Athletics: 0, Brawl: 0, Dodge: 0, Empathy: 0, Expression: 0, Intimidation: 0, Leadership: 0, Streetwise: 0, Subterfuge: 0,
        "Animal Ken": 0, Crafts: 0, Drive: 0, Etiquette: 0, Firearms: 0, Larceny: 0, Melee: 0, Performance: 0, Stealth: 0, Survival: 0,
        Academics: 0, Computer: 0, Finance: 0, Investigation: 0, Law: 0, Medicine: 0, Occult: 0, Politics: 0, Science: 0, Technology: 0
    },

    disciplines: [],
    backgrounds: [],
    virtues: {
        conscience: 1,
        self_control: 1,
        courage: 1
    },

    merits: [],
    flaws: [],

    path_name: "Humanity",
    bearing_name: "",
    bearing_value: 0,

    willpower: 1,
    willpower_pool: 1,
    blood_pool: 10,
    health: 0,
    experience: 0,
    
    inventory: [],
    vehicles: [],
    history: "",
    goals_short: "",
    goals_long: "",
    description: "",
    languages: "",
    derangements: []
};

export default blankTemplate;
