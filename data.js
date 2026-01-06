// DATA CONSTANTS

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
    "Rebel", "Rogue", "Soldier", "Survivor", "Thrill-Seeker", "Traditionalist", 
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

export const CLAN_DISCIPLINES = {
    "Assamite": ["Celerity", "Obfuscate", "Quietus"],
    "Brujah": ["Celerity", "Potence", "Presence"],
    "Followers of Set": ["Obfuscate", "Presence", "Serpentis"],
    "Gangrel": ["Animalism", "Fortitude", "Protean"],
    "Giovanni": ["Dominate", "Necromancy", "Potence"],
    "Lasombra": ["Dominate", "Obtenebration", "Potence"],
    "Malkavian": ["Auspex", "Dementation", "Obfuscate"],
    "Nosferatu": ["Animalism", "Obfuscate", "Potence"],
    "Ravnos": ["Animalism", "Chimerstry", "Fortitude"],
    "Toreador": ["Auspex", "Celerity", "Presence"],
    "Tremere": ["Auspex", "Dominate", "Thaumaturgy"],
    "Tzimisce": ["Animalism", "Auspex", "Vicissitude"],
    "Ventrue": ["Dominate", "Fortitude", "Presence"],
    "Caitiff": [] 
};

export const BACKGROUNDS = [
    "Allies", "Alternate Identity", "Black Hand Membership", "Contacts", 
    "Domain", "Fame", "Generation", "Herd", "Influence", "Mentor", 
    "Resources", "Retainers", "Rituals", "Status"
];

export const VIRTUES = ["Conscience", "Self-Control", "Courage"];

export const VIT = [
    "Age", "Apparent Age", "Date of Birth", "R.I.P.", 
    "Hair", "Eyes", "Race", "Nationality", 
    "Height", "Weight", "Sex"
];

export const DERANGEMENTS = [
    "Megalomania", "Sanguinary Animism", "Multiple Personalities", 
    "Schizophrenia", "Paranoia", "Bulimia", "Hysteria", "Manic-Depression", 
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

// --- EXPANDED MERITS & FLAWS (Merged from V20 Source) ---

export const V20_MERITS_LIST = [
    // Physical
    { n: "Acute Sense", v: 1 },
    { n: "Ambidextrous", v: 1 },
    { n: "Bruiser", v: 1 },
    { n: "Catlike Balance", v: 1 },
    { n: "Early Riser", v: 1 },
    { n: "Eat Food", v: 1 },
    { n: "Friendly Face", v: 1 },
    { n: "Blush of Health", v: 2 },
    { n: "Enchanting Voice", v: 2 },
    { n: "Daredevil", v: 3 },
    { n: "Efficient Digestion", v: 3 },
    { n: "Huge Size", v: 4 },
    // Mental
    { n: "Coldly Logical", v: 1 },
    { n: "Common Sense", v: 1 },
    { n: "Concentration", v: 1 },
    { n: "Introspection", v: 1 },
    { n: "Language", v: 1 },
    { n: "Time Sense", v: 1 },
    { n: "Useful Knowledge", v: 1 },
    { n: "Code of Honor", v: 2 },
    { n: "Computer Aptitude", v: 2 },
    { n: "Eidetic Memory", v: 2 },
    { n: "Light Sleeper", v: 2 },
    { n: "Natural Linguist", v: 2 },
    { n: "Calm Heart", v: 3 },
    { n: "Iron Will", v: 3 },
    { n: "Precocious", v: 3 },
    // Social
    { n: "Elysium Regular", v: 1 },
    { n: "Former Ghoul", v: 1 },
    { n: "Harmless", v: 1 },
    { n: "Natural Leader", v: 1 },
    { n: "Prestigious Sire", v: 1 },
    { n: "Protégé", v: 1 },
    { n: "Rep", v: 1 },
    { n: "Sabbat Survivor", v: 1 },
    { n: "Boon", v: 1, variable: true, range: "1-6" },
    { n: "Bullyboy", v: 2 },
    { n: "Lawman's Friend", v: 2 },
    { n: "Old Pal", v: 2 },
    { n: "Open Road", v: 2 },
    { n: "Sanctity", v: 2 },
    { n: "Scholar of Enemies", v: 2 },
    { n: "Scholar of Others", v: 2 },
    { n: "Friend of the Underground", v: 3 },
    { n: "Mole", v: 3 },
    { n: "Rising Star", v: 3 },
    { n: "Broken Bond", v: 4 },
    { n: "Clan Friendship", v: 4 },
    { n: "Primogen/Bishop Friendship", v: 4 },
    // Supernatural
    { n: "Deceptive Aura", v: 1 },
    { n: "Healing Touch", v: 1 },
    { n: "Inoffensive to Animals", v: 1 },
    { n: "Magic Resistance", v: 2 },
    { n: "Medium", v: 2 },
    { n: "Hidden Diablerie", v: 3 },
    { n: "Lucky", v: 3 },
    { n: "Oracular Ability", v: 3 },
    { n: "Spirit Mentor", v: 3 },
    { n: "True Love", v: 4 },
    { n: "Additional Discipline", v: 5 },
    { n: "Unbondable", v: 5 },
    { n: "Nine Lives", v: 6 },
    { n: "True Faith", v: 7 }
].sort((a, b) => a.n.localeCompare(b.n));

export const V20_FLAWS_LIST = [
    // Physical
    { n: "Hard of Hearing", v: 1 },
    { n: "Short", v: 1 },
    { n: "Smell of the Grave", v: 1 },
    { n: "Tic/Twitch", v: 1 },
    { n: "Bad Sight", v: 1, variable: true, range: "1 or 3" },
    { n: "Disfigured", v: 2 },
    { n: "Dulled Bite", v: 2 },
    { n: "Fourteenth Generation", v: 2 },
    { n: "Infectious Bite", v: 2 },
    { n: "One Eye", v: 2 },
    { n: "Vulnerability to Silver", v: 2 },
    { n: "Addiction", v: 3 },
    { n: "Child", v: 3 },
    { n: "Deformity", v: 3 },
    { n: "Glowing Eyes", v: 3 },
    { n: "Lame", v: 3 },
    { n: "Lazy", v: 3 },
    { n: "Monstrous", v: 3 },
    { n: "Permanent Fangs", v: 3 },
    { n: "Permanent Wound", v: 3 },
    { n: "Slow Healing", v: 3 },
    { n: "Open Wound", v: 2, variable: true, range: "2 or 4" },
    { n: "Deaf", v: 4 },
    { n: "Disease Carrier", v: 4 },
    { n: "Fifteenth Generation", v: 4 },
    { n: "Mute", v: 4 },
    { n: "Thin Blood", v: 4 },
    { n: "Flesh of the Corpse", v: 5 },
    { n: "Infertile Vitae", v: 5 },
    { n: "Blind", v: 6 },
    // Mental
    { n: "Deep Sleeper", v: 1 },
    { n: "Impatient", v: 1 },
    { n: "Nightmares", v: 1 },
    { n: "Prey Exclusion", v: 1 },
    { n: "Shy", v: 1 },
    { n: "Soft-Hearted", v: 1 },
    { n: "Speech Impediment", v: 1 },
    { n: "Unconvinced", v: 1 },
    { n: "Amnesia", v: 2 },
    { n: "Lunacy", v: 2 },
    { n: "Phobia", v: 2 },
    { n: "Short Fuse", v: 2 },
    { n: "Stereotype", v: 2 },
    { n: "Territorial", v: 2 },
    { n: "Thirst for Innocence", v: 2 },
    { n: "Vengeful", v: 2 },
    { n: "Victim of the Masquerade", v: 2 },
    { n: "Weak-Willed", v: 3 },
    { n: "Conspicuous Consumption", v: 4 },
    { n: "Guilt-Wracked", v: 4 },
    { n: "Flashbacks", v: 6 },
    // Social
    { n: "Botched Presentation", v: 1 },
    { n: "Dark Secret", v: 1 },
    { n: "Expendable", v: 1 },
    { n: "Incomplete Understanding", v: 1 },
    { n: "Infamous Sire", v: 1 },
    { n: "Mistaken Identity", v: 1 },
    { n: "New Arrival", v: 1 },
    { n: "New Kid", v: 1 },
    { n: "Recruitment Target", v: 1 },
    { n: "Sire's Resentment", v: 1 },
    { n: "Special Responsibility", v: 1 },
    { n: "Sympathizer", v: 1 },
    { n: "Enemy", v: 1, variable: true, range: "1-5" },
    { n: "Bound", v: 2 },
    { n: "Catspaw", v: 2 },
    { n: "Escaped Target", v: 2 },
    { n: "Failure", v: 2 },
    { n: "Masquerade Breaker", v: 2 },
    { n: "Old Flame", v: 2 },
    { n: "Rival Sires", v: 2 },
    { n: "Uppity", v: 2 },
    { n: "Disgrace to the Blood", v: 3 },
    { n: "Former Prince", v: 3 },
    { n: "Hunted Like a Dog", v: 3 },
    { n: "Narc", v: 3 },
    { n: "Sleeping With the Enemy", v: 3 },
    { n: "Clan Enmity", v: 4 },
    { n: "Hunted", v: 4 },
    { n: "Loathsome Regnant", v: 4 },
    { n: "Overextended", v: 4 },
    { n: "Probationary Sect Member", v: 4 },
    { n: "Blood Hunted", v: 4, variable: true, range: "4 or 6" },
    { n: "Laughingstock", v: 5 },
    { n: "Red List", v: 7 },
    // Supernatural
    { n: "Cast No Reflection", v: 1 },
    { n: "Cold Breeze", v: 1 },
    { n: "Repulsed by Garlic", v: 1 },
    { n: "Touch of Frost", v: 1 },
    { n: "Cursed", v: 1, variable: true, range: "1-5" },
    { n: "Beacon of the Unholy", v: 2 },
    { n: "Deathsight", v: 2 },
    { n: "Eerie Presence", v: 2 },
    { n: "Lord of the Flies", v: 2 },
    { n: "Can't Cross Running Water", v: 3 },
    { n: "Haunted", v: 3 },
    { n: "Repelled by Crosses", v: 3 },
    { n: "Grip of the Damned", v: 4 },
    { n: "Dark Fate", v: 5 },
    { n: "Light-Sensitive", v: 5 }
].sort((a, b) => a.n.localeCompare(b.n));


export const V20_WEAPONS_LIST = [
    { name: "Sap", diff: 4, dmg: "Str+1(B)", range: "-", rate: "-", clip: "-", conc: "P" },
    { name: "Club", diff: 4, dmg: "Str+2(B)", range: "-", rate: "-", clip: "-", conc: "T" },
    { name: "Knife", diff: 4, dmg: "Str+1(L)", range: "-", rate: "-", clip: "-", conc: "J" },
    { name: "Sword", diff: 6, dmg: "Str+2(L)", range: "-", rate: "-", clip: "-", conc: "T" },
    { name: "Axe", diff: 7, dmg: "Str+3(L)", range: "-", rate: "-", clip: "-", conc: "N" },
    { name: "Stake", diff: 6, dmg: "Str(L)", range: "-", rate: "-", clip: "-", conc: "T" },
    { name: "Revolver, Lt.", diff: 6, dmg: "4(L)", range: "12", rate: "3", clip: "6", conc: "P" },
    { name: "Revolver, Hvy.", diff: 6, dmg: "6(L)", range: "35", rate: "2", clip: "6", conc: "J" },
    { name: "Pistol, Lt.", diff: 6, dmg: "4(L)", range: "20", rate: "4", clip: "15+1", conc: "P" },
    { name: "Pistol, Hvy.", diff: 6, dmg: "5(L)", range: "25", rate: "3", clip: "13+1", conc: "J" },
    { name: "Rifle", diff: 8, dmg: "8(L)", range: "200", rate: "1", clip: "3+1", conc: "N" },
    { name: "SMG, Small", diff: 6, dmg: "4(L)", range: "20", rate: "3", clip: "17+1", conc: "J" },
    { name: "SMG, Large", diff: 6, dmg: "4(L)", range: "50", rate: "3", clip: "30+1", conc: "T" },
    { name: "Assault Rifle", diff: 7, dmg: "7(L)", range: "150", rate: "3", clip: "30+1", conc: "N" },
    { name: "Shotgun", diff: 6, dmg: "8(L)", range: "20", rate: "1", clip: "5+1", conc: "T" },
    { name: "Shotgun, Semi-auto", diff: 8, dmg: "8(L)", range: "20", rate: "3", clip: "6+1", conc: "T" },
    { name: "Crossbow", diff: 6, dmg: "5(L)", range: "20", rate: "1", clip: "1", conc: "T" }
];

export const V20_ARMOR_LIST = [
    { name: "Class One (Reinforced Clothing)", rating: 1, penalty: 0 },
    { name: "Class Two (Armor T-Shirt)", rating: 2, penalty: 1 },
    { name: "Class Three (Kevlar Vest)", rating: 3, penalty: 1 },
    { name: "Class Four (Flak Jacket)", rating: 4, penalty: 2 },
    { name: "Class Five (Full Riot Gear)", rating: 5, penalty: 3 }
];

export const V20_VEHICLE_LIST = [
    { name: "6-Wheel Truck", safe: "60/95", max: "90/145", man: "3" },
    { name: "Tank (modern)", safe: "60/95", max: "100/160", man: "4" },
    { name: "Tank (WWII)", safe: "30/50", max: "40/65", man: "3" },
    { name: "Bus", safe: "60/95", max: "100/160", man: "3" },
    { name: "18-Wheeler", safe: "70/110", max: "110/175", man: "4" },
    { name: "Sedan", safe: "70/110", max: "120/195", man: "5" },
    { name: "Minivan", safe: "70/110", max: "120/195", man: "6" },
    { name: "Compact", safe: "70/110", max: "130/210", man: "6" },
    { name: "Sporty Compact", safe: "100/160", max: "140/225", man: "7" },
    { name: "Sport Coupe", safe: "110/175", max: "150/240", man: "8" },
    { name: "Sports Car", safe: "110/175", max: "160/255", man: "8" },
    { name: "Exotic Car", safe: "130/210", max: "190+/305+", man: "9" },
    { name: "Luxury Sedan", safe: "85/135", max: "155/250", man: "7" },
    { name: "Sport Sedan", safe: "85/135", max: "165/265", man: "8" },
    { name: "Midsize", safe: "75/120", max: "125/200", man: "6" },
    { name: "SUV/ Crossover", safe: "70/110", max: "115/185", man: "6" },
    { name: "Formula One Racer", safe: "140/225", max: "240/385", man: "10" }
];

export const CLAN_WEAKNESSES = {
    "Assamite": "Due to the Tremere blood-curse, should an Assamite consume the blood of another Kindred, she suffers one automatic level of unsoakable lethal damage per blood point imbibed. Diablerie attempts result in automatic aggravated damage, one health level per point of permanent Willpower the victim possesses; the would-be diablerist gains no benefits (including Generation reduction) if he survives the process. In addition, Assamites must tithe some of the profits from their contracts to their sires or superiors (generally around 10 percent of all such earnings).",
    "Brujah": "The difficulties of rolls to resist or guide frenzy are two higher than normal. Additionally, a Brujah may never spend Willpower to avoid frenzy, though he may spend a point of Willpower to end a frenzy that has already begun.",
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
