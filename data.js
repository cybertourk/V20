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
