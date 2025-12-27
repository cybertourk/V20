// DATA CONSTANTS (Converted to ES6 Exports)

export const APP_VERSION = "v1.1.0";

export const CLANS = [
    "Assamite", "Brujah", "Followers of Set", "Gangrel", "Giovanni", 
    "Lasombra", "Malkavian", "Nosferatu", "Ravnos", "Toreador", 
    "Tremere", "Tzimisce", "Ventrue", "Caitiff"
];

export const ARCHETYPES = [
    "Architect", "Autocrat", "Bon Vivant", "Bravo", "Capitalist", 
    "Caregiver", "Celebrant", "Chameleon", "Child", "Competitor", 
    "Conformist", "Conniver", "Creep Show", "Critic", "Curmudgeon", 
    "Daviant", "Director", "Enigma", "Eye of the Storm", "Fanatic", 
    "Gallant", "Guru", "Idealist", "Judge", "Loner", "Martyr", 
    "Masochist", "Monster", "Pedagogue", "Penitent", "Perfectionist", 
    "Rebel", "Rogue", "Survivor", "Thrill-Seeker", "Traditionalist", 
    "Trickster", "Visionary"
];

export const PATHS = [
    "Humanity", "Path of Blood", "Path of Caine", "Path of Cathari", 
    "Path of Death and the Soul", "Path of Ecstasy", "Path of Entelechy", 
    "Path of Feral Heart", "Path of Harmony", "Path of Honorable Accord", 
    "Path of Lilith", "Path of Metamorphosis", "Path of Night", 
    "Path of Paradox", "Path of Power and the Inner Voice", 
    "Path of the Scorched Heart", "Path of Self-Focus", "Path of Typhon"
];

export const ATTRIBUTES = {
    Physical: ["Strength", "Dexterity", "Stamina"],
    Social: ["Charisma", "Manipulation", "Appearance"],
    Mental: ["Perception", "Intelligence", "Wits"]
};

export const ABILITIES = {
    Talents: ["Alertness", "Athletics", "Brawl", "Dodge", "Empathy", "Expression", "Intimidation", "Leadership", "Streetwise", "Subterfuge"],
    Skills: ["Animal Ken", "Crafts", "Drive", "Etiquette", "Firearms", "Larceny", "Melee", "Performance", "Stealth", "Survival"],
    Knowledges: ["Academics", "Computer", "Finance", "Investigation", "Law", "Medicine", "Occult", "Politics", "Science", "Technology"]
};

export const DISCIPLINES = [
    "Animalism", "Auspex", "Celerity", "Chimerstry", "Dementation", 
    "Dominate", "Fortitude", "Necromancy", "Obfuscate", "Obtenebration", 
    "Potence", "Presence", "Protean", "Quietus", "Serpentis", 
    "Thaumaturgy", "Vicissitude"
];

export const BACKGROUNDS = [
    "Allies", "Alternate Identity", "Black Hand Membership", "Contacts", 
    "Domain", "Fame", "Generation", "Herd", "Influence", "Mentor", 
    "Resources", "Retainers", "Rituals", "Status"
];

export const VIRTUES = ["Conscience", "Self-Control", "Courage"];

export const VIT = ["Age", "Hair", "Eyes", "Height", "Weight", "Sex"];

export const DERANGEMENTS = [
    "Megalomaniac", "Sanguinary Animism", "Multiple Personalities", 
    "Schizophrenia", "Paranoia", "Bulimia", "Hysteria", "Manic-Depressive", 
    "Fugue", "Obsessive-Compulsive"
];

export const STEPS_CONFIG = [
    { id: 1, label: "Concept", icon: "fa-user", msg: "Define Name & Clan" },
    { id: 2, label: "Attributes", icon: "fa-child", msg: "Assign Attributes (7/5/3)" },
    { id: 3, label: "Abilities", icon: "fa-fist-raised", msg: "Assign Abilities (13/9/5)" },
    { id: 4, label: "Advantages", icon: "fa-star", msg: "Discs (3), Backs (5), Virt (7)" },
    { id: 5, label: "Possessions", icon: "fa-gem", msg: "Inventory & Havens" },
    { id: 6, label: "Merits", icon: "fa-balance-scale", msg: "Merits & Flaws" },
    { id: 7, label: "Bio", icon: "fa-address-card", msg: "Appearance & Goals" },
    { id: 8, label: "Finalize", icon: "fa-check-circle", msg: "Review & Confirm" }
];

export const GEN_LIMITS = {
    15: { m: 10, pt: 1 },
    14: { m: 10, pt: 1 },
    13: { m: 10, pt: 1 },
    12: { m: 11, pt: 1 },
    11: { m: 12, pt: 1 },
    10: { m: 13, pt: 1 },
    9: { m: 14, pt: 2 },
    8: { m: 15, pt: 3 },
    7: { m: 20, pt: 4 },
    6: { m: 30, pt: 6 },
    5: { m: 40, pt: 8 },
    4: { m: 50, pt: 10 }
};

export const HEALTH_STATES = ["Bruised", "Hurt", "Injured", "Wounded", "Mauled", "Crippled", "Incapacitated"];

export const SPECIALTY_EXAMPLES = {
    "Athletics": ["Running", "Climbing", "Swimming", "Parkour", "Throwing"],
    "Brawl": ["Boxing", "Grappling", "Dirty Fighting", "Throws", "Kicks"],
    "Dodge": ["Cover", "Dive", "Leap", "Sidestep", "Duck"],
    "Empathy": ["Emotions", "Personalities", "Motives", "Truths"],
    "Expression": ["Acting", "Poetry", "Prose", "Public Speaking"],
    "Intimidation": ["Physical", "Social", "Veiled Threats", "Stare Down"],
    "Leadership": ["Command", "Oratory", "Tactics", "Morale"],
    "Streetwise": ["Gangs", "Drugs", "Fencing", "Rumors", "Turf"],
    "Subterfuge": ["Lying", "Seduction", "Misdirection", "Impeccable Manners"],
    "Animal Ken": ["Training", "Falconry", "Dogs", "Horses", "Stray Cats"],
    "Crafts": ["Mechanics", "Sewing", "Carpentry", "Blacksmithing"],
    "Drive": ["High Speed", "Stunts", "Tailgating", "Evasion"],
    "Etiquette": ["High Society", "Business", "Street", "Kindred"],
    "Firearms": ["Pistols", "Rifles", "Shotguns", "Fast Draw", "Sniping"],
    "Larceny": ["Lockpicking", "Pickpocketing", "Safecracking", "Security"],
    "Melee": ["Knives", "Swords", "Clubs", "Axes", "Improvised"],
    "Performance": ["Singing", "Dancing", "Music", "Comedy"],
    "Stealth": ["Hiding", "Silent Movement", "Shadowing", "Crowds"],
    "Survival": ["Urban", "Forest", "Desert", "Tracking", "Scrounging"],
    "Academics": ["History", "Literature", "Philosophy", "Art", "Theology"],
    "Computer": ["Hacking", "Programming", "Hardware", "Data Retrieval"],
    "Finance": ["Stocks", "Laundering", "Accounting", "Appraisal"],
    "Investigation": ["Search", "Forensics", "Research", "Analysis"],
    "Law": ["Criminal", "Civil", "Kindred", "Police Procedure"],
    "Medicine": ["First Aid", "Surgery", "Pharmacy", "Pathology"],
    "Occult": ["Kindred Lore", "Rituals", "Ghosts", "Demons", "Magic"],
    "Politics": ["City", "State", "Federal", "Kindred", "Bribery"],
    "Science": ["Biology", "Chemistry", "Physics", "Geology"],
    "Technology": ["Electronics", "Security Systems", "Communications"]
};

export const V20_MERITS_LIST = [
    { n: "Acute Sense (Auditory)", v: 1, variable: false },
    { n: "Acute Sense (Olfactory)", v: 1, variable: false },
    { n: "Acute Sense (Taste)", v: 1, variable: false },
    { n: "Acute Sense (Tactile)", v: 1, variable: false },
    { n: "Acute Sense (Visual)", v: 1, variable: false },
    { n: "Common Sense", v: 1, variable: false },
    { n: "Concentration", v: 1, variable: false },
    { n: "Time Sense", v: 1, variable: false },
    { n: "Code of Honor", v: 1, variable: false },
    { n: "Computer Aptitude", v: 1, variable: false },
    { n: "Higher Purpose", v: 1, variable: false },
    { n: "Language", v: 1, variable: false },
    { n: "Ambidextrous", v: 1, variable: false },
    { n: "Eat Food", v: 1, variable: false },
    { n: "Catlike Balance", v: 1, variable: false },
    { n: "Blush of Health", v: 2, variable: false },
    { n: "Enchanting Voice", v: 2, variable: false },
    { n: "Daredevil", v: 3, variable: false },
    { n: "Efficient Digestion", v: 3, variable: false },
    { n: "Fast Learner", v: 3, variable: false },
    { n: "Iron Will", v: 3, variable: false },
    { n: "Huge Size", v: 4, variable: false },
    { n: "Unbondable", v: 5, variable: false },
    { n: "Lucky", v: 3, variable: false }
];

export const V20_FLAWS_LIST = [
    { n: "Deep Sleeper", v: 1, variable: false },
    { n: "Nightmares", v: 1, variable: false },
    { n: "Phobia (Mild)", v: 1, variable: false },
    { n: "Shy", v: 1, variable: false },
    { n: "Soft-Hearted", v: 1, variable: false },
    { n: "Speech Impediment", v: 1, variable: false },
    { n: "Short", v: 1, variable: false },
    { n: "Smell of the Grave", v: 1, variable: false },
    { n: "Tic/Twitch", v: 1, variable: false },
    { n: "Vengeful", v: 2, variable: false },
    { n: "Amnesia", v: 2, variable: false },
    { n: "Lunacy", v: 2, variable: false },
    { n: "Phobia (Severe)", v: 3, variable: false },
    { n: "Short Fuse", v: 2, variable: false },
    { n: "Stereotype", v: 2, variable: false },
    { n: "Territorial", v: 2, variable: false },
    { n: "Thirst for Innocence", v: 2, variable: false },
    { n: "Vulnerability to Silver", v: 2, variable: false },
    { n: "Open Wound", v: 2, variable: false },
    { n: "Addiction", v: 3, variable: false },
    { n: "Conspicuous Consumption", v: 4, variable: false },
    { n: "Permanent Wound", v: 3, variable: false },
    { n: "Slow Healing", v: 3, variable: false },
    { n: "Deaf", v: 4, variable: false },
    { n: "Lame", v: 3, variable: false },
    { n: "Monstrous", v: 3, variable: false },
    { n: "One Eye", v: 2, variable: false },
    { n: "Mute", v: 4, variable: false },
    { n: "Thin-Blooded", v: 4, variable: false },
    { n: "Blind", v: 6, variable: false }
];

export const V20_WEAPONS_LIST = [
    { name: "Sap/Club", diff: 4, dmg: "Str+1(B)", range: "-", rate: "-", clip: "-" },
    { name: "Knife", diff: 4, dmg: "Str+1(L)", range: "-", rate: "-", clip: "-" },
    { name: "Sword", diff: 6, dmg: "Str+2(L)", range: "-", rate: "-", clip: "-" },
    { name: "Axe", diff: 7, dmg: "Str+3(L)", range: "-", rate: "-", clip: "-" },
    { name: "Stake", diff: 6, dmg: "Str(L)", range: "-", rate: "-", clip: "-" },
    { name: "Pistol, Lt.", diff: 6, dmg: "4(L)", range: "20", rate: "3", clip: "17+1" },
    { name: "Pistol, Hvy.", diff: 6, dmg: "5(L)", range: "35", rate: "2", clip: "7+1" },
    { name: "Rifle", diff: 8, dmg: "8(L)", range: "200", rate: "1", clip: "5+1" },
    { name: "SMG, Small", diff: 6, dmg: "4(L)", range: "25", rate: "3", clip: "30+1" },
    { name: "SMG, Large", diff: 6, dmg: "4(L)", range: "50", rate: "3", clip: "32+1" },
    { name: "Shotgun", diff: 6, dmg: "8(L)", range: "20", rate: "1", clip: "5+1" }
];

export const V20_ARMOR_LIST = [
    { name: "Heavy Clothing", rating: 1, penalty: 0 },
    { name: "Kevlar Vest", rating: 2, penalty: 0 },
    { name: "Flak Jacket", rating: 3, penalty: 1 },
    { name: "Full Riot Gear", rating: 5, penalty: 2 }
];

export const V20_VEHICLE_LIST = [
    { name: "Motorcycle", safe: "100", max: "180", man: "8" },
    { name: "Sedan", safe: "70", max: "120", man: "6" },
    { name: "Sports Car", safe: "110", max: "190", man: "8" },
    { name: "SUV/Truck", safe: "70", max: "110", man: "5" }
];
