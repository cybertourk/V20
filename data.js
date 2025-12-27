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
    "Deviant", "Director", "Enigma", "Eye of the Storm", "Fanatic", 
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
    Talents: ["Alertness", "Athletics", "Awareness", "Brawl", "Empathy", "Expression", "Intimidation", "Leadership", "Streetwise", "Subterfuge"],
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

export const HEALTH_STATES = [
    { l: "Bruised", p: 0 },
    { l: "Hurt", p: -1 },
    { l: "Injured", p: -1 },
    { l: "Wounded", p: -2 },
    { l: "Mauled", p: -2 },
    { l: "Crippled", p: -5 },
    { l: "Incapacitated", p: 0 }
];

export const SPECIALTY_EXAMPLES = {
    "Strength": ["Never Lets Go", "Powerful Arms", "Reserves of Strength", "Vicious"],
    "Dexterity": ["Precise", "Swift", "Feline Grace", "Lightning Reflexes"],
    "Stamina": ["Tireless", "Determined", "Tough as Nails", "Vigorous"],
    "Charisma": ["Graceful", "Smooth Talker", "Forceful", "Urbane", "Witty", "Eloquent", "Hustler"],
    "Manipulation": ["Persuasive", "Seductive", "Well-Reasoned", "Misdirection", "Conjurer of 'Facts'"],
    "Appearance": ["Unconventional Looks", "Photogenic", "Fashion Sense", "Unforgettable Face", "Memorable Pose"],
    "Perception": ["Attentive", "Insightful", "Careful", "Discerning", "Tactical"],
    "Intelligence": ["Book Knowledge", "Creative", "Analytical", "Problem Solver", "Subject Authority"],
    "Wits": ["Getting the Jump on Others", "Witty Bon Mots", "Changes in Strategy", "Ambushes"],
    "Alertness": ["Noises", "Eavesdropping", "Fine Details", "Hidden Weapons", "Crowds", "Forests", "Animals"],
    "Athletics": ["Swimming", "Rock Climbing", "Acrobatics", "Dancing", "Parkour", "Specific Sports"], 
    "Awareness": ["Ghostly Activity", "Mystical Objects", "Someone's In My Head", "Debunking"],
    "Brawl": ["Dirty Fighting", "Strikes", "Throws", "Submission Holds", "Specific Martial Arts"],
    "Empathy": ["Emotions", "Insight", "Motives", "Gaining Trust"],
    "Expression": ["Acting", "Poetry", "Fiction", "Impromptu", "Conversation", "Social Media"],
    "Intimidation": ["Veiled Threats", "Pulling Rank", "Physical Coercion", "Blackmail", "Internet"],
    "Leadership": ["Oratory", "Compelling", "Friendly", "Open", "Noble", "Military", "Multimedia"],
    "Streetwise": ["Fencing", "Illegal Drugs", "Illegal Weapons", "Free Wifi", "Gangs", "Being On the Guest List", "Local Slang"],
    "Subterfuge": ["Seduction", "Impeccable Lies", "Feigning Mortality", "The Long Con"],
    "Animal Ken": ["Dogs", "Attack Training", "Big Cats", "Horses", "Farm Animals", "Falconry"],
    "Crafts": ["Pottery", "Sewing", "Home Repair", "Carpentry", "Appraisal", "Carburetors"],
    "Drive": ["Off-Road", "Motorcycles", "High Speed", "Heavy Traffic", "Avoiding Traffic Cops"],
    "Etiquette": ["At Elysium", "Business", "High Society", "Sabbat Protocol"],
    "Firearms": ["Fast-Draw", "Gunsmithing", "Pistols", "Marksmanship", "Revolvers", "Shotguns"],
    "Larceny": ["Safecracking", "Misdirection", "Lockpicking", "Hotwiring", "Pickpocketing"],
    "Melee": ["Knives", "Swords", "Improvised Weaponry", "Riposte", "Disarms"],
    "Performance": ["Dancing", "Singing", "Rock and Roll", "Acting", "Guitar Solos", "Drunken Karaoke"],
    "Stealth": ["Hiding", "Silent Movement", "Shadowing", "Crowds"],
    "Survival": ["Tracking", "Woodlands", "Jungle", "Street Life", "Hunting", "Urban Exploration"],
    "Academics": ["Poststructuralism", "Impressionist Painting", "Imperial Rome", "Color Theory", "Linguistics"],
    "Computer": ["The YouTubes", "Computer Languages", "Internet", "Database Administration", "HCI", "Viruses", "Specific Devices"],
    "Finance": ["Stock Market", "Laundering", "Appraisal", "Foreign Currencies", "Accounting", "Fencing", "Corporations", "Federal Bailouts"],
    "Investigation": ["Forensics", "Shadowing", "Search", "Discolorations", "Database Research"],
    "Law": ["Criminal", "Suits", "Courtroom Protocol", "Contracts", "Police Procedure", "The Traditions", "The Code of Milan"],
    "Medicine": ["Organ Transplants", "Emergency Care", "Poison Treatments", "Pathology", "Pharmaceuticals", "The Kindred Condition"],
    "Occult": ["Kindred Lore", "Rituals", "Infernalism", "Witches", "Noddist Lore"],
    "Politics": ["City", "State", "Federal", "Bureaucracy", "Dogma", "Radical", "Camarilla"],
    "Science": ["Chemistry", "Biology", "Geology", "Physics", "Astronomy"],
    "Technology": ["Telecom", "Computers", "Security", "Communications", "Improvised Solutions", "Industrial Espionage"]
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

export const CLAN_WEAKNESSES = {
    "Assamite": "Due to the Tremere blood-curse, consuming Kindred blood deals 1 unsoakable lethal damage per point. Diablerie deals automatic aggravated damage equal to victim's Willpower and provides no benefits.",
    "Brujah": "Frenzy difficulties are 2 higher than normal. Cannot spend Willpower to avoid frenzy (but can to end it).",
    "Followers of Set": "Suffer 2 additional health levels of damage from sunlight. -1 die to all rolls in bright light.",
    "Gangrel": "Gain a temporary animal feature after each frenzy. Features can become permanent over time.",
    "Giovanni": "The Kiss causes excruciating pain and deals double damage to mortals (2 health levels per blood point).",
    "Lasombra": "Cast no reflection in mirrors, water, or other surfaces.",
    "Malkavian": "Suffer from a permanent, incurable derangement chosen at character creation. Can spend Willpower to ignore it for a scene.",
    "Nosferatu": "Appearance is permanently 0 and cannot be raised. Automatic failure on Appearance rolls.",
    "Ravnos": "Must indulge in a specific vice when the opportunity arises unless a Self-Control/Instincts roll (diff 6) is succeeded.",
    "Toreador": "Must make a Self-Control/Instincts roll (diff 6) when encountering something beautiful or be enthralled/unable to act for the scene.",
    "Tremere": "It takes only 2 drinks of another vampire's blood to become blood bound (first drink counts as two).",
    "Tzimisce": "Must rest with at least two handfuls of native soil. Failure halves dice pools every 24 hours until reduced to 1 die.",
    "Ventrue": "Can only feed on a specific type of mortal blood (e.g. blue-eyed men). Other blood provides no nourishment and is vomited.",
    "Caitiff": "No inherent Clan weakness, but suffer social stigma. Cannot take Clan-specific Merits/Flaws."
};
