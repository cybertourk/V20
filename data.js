// --- V20 DATA CONSTANTS ---
// Extracted from original script.js to reduce file size.

export const CLANS = [
    "Assamite", "Brujah", "Followers of Set", "Gangrel", "Giovanni", "Lasombra", 
    "Malkavian", "Nosferatu", "Ravnos", "Toreador", "Tremere", "Tzimisce", 
    "Ventrue", "Caitiff"
];

export const ARCHETYPES = [
    "Architect", "Autocrat", "Bon Vivant", "Bravo", "Capitalist", "Caregiver", 
    "Celebrant", "Chameleon", "Child", "Competitor", "Conformist", "Conniver", 
    "Curmudgeon", "Dabbler", "Deviant", "Director", "Enigma", "Eye of the Storm", 
    "Fanatic", "Gallant", "Guru", "Idealist", "Judge", "Loner", "Martyr", 
    "Masochist", "Monster", "Pedagogue", "Penitent", "Perfectionist", "Rebel", 
    "Rogue", "Sadist", "Scientist", "Sociopath", "Soldier", "Survivor", 
    "Thrill-Seeker", "Traditionalist", "Trickster", "Visionary"
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

export const BACKGROUNDS = [
    "Allies", "Alternate Identity", "Black Hand Membership", "Contacts", "Domain", 
    "Fame", "Generation", "Herd", "Influence", "Mentor", "Resources", 
    "Retainers", "Rituals", "Status"
];

export const DISCIPLINES = [
    "Animalism", "Auspex", "Celerity", "Chimerstry", "Dementation", "Dominate", 
    "Fortitude", "Necromancy", "Obfuscate", "Obtenebration", "Potence", 
    "Presence", "Protean", "Quietus", "Serpentis", "Thaumaturgy", "Vicissitude"
];

export const VIRTUES = ["Conscience", "Self-Control", "Courage"];

export const PATHS = [
    "Humanity", "Path of Blood", "Path of Bones", "Path of Caine", "Path of Cathari", 
    "Path of the Feral Heart", "Path of the Honorable Accord", "Path of Lilith", 
    "Path of Metamorphosis", "Path of Night", "Path of Paradox", "Path of Typhon"
];

export const VIT = ["age", "app-age", "dob", "rip", "hair", "eyes", "race", "nat", "height", "weight", "sex"];

export const HEALTH_STATES = [
    {l: "Bruised", p: 0}, {l: "Hurt", p: -1}, {l: "Injured", p: -1}, 
    {l: "Wounded", p: -2}, {l: "Mauled", p: -2}, {l: "Crippled", p: -5}, 
    {l: "Incap", p: -99}
];

export const GEN_LIMITS = { 
    15: {m:10,p:1}, 14: {m:10,p:1}, 13: {m:10,p:1}, 12: {m:11,p:1}, 11: {m:12,p:1}, 10: {m:13,p:1}, 
    9: {m:14,p:2}, 8: {m:15,p:3}, 7: {m:20,p:4}, 6: {m:30,p:6}, 5: {m:40,p:10}, 4: {m:50,p:15}, 3: {m:100,p:100} 
};

export const SPECIALTY_EXAMPLES = {
    "Strength": ["Dead Lift", "Punch", "Jump", "Crush", "Holding On"],
    "Dexterity": ["Speed", "Agility", "Flexibility", "Balance", "Reflexes"],
    "Stamina": ["Endurance", "Determination", "Hold Breath", "Resilience"],
    "Charisma": ["Smooth Talker", "Eloquent", "Outspoken", "Charming", "Command"],
    "Manipulation": ["Persuasive", "Cunning", "Blackmailer", "Seductive"],
    "Appearance": ["Bold", "Exotic", "Classic", "Innocent", "Alluring"],
    "Perception": ["Insight", "Attentive", "Patient", "Uncanny"],
    "Intelligence": ["Memory", "Research", "Analysis", "Strategy", "Logic"],
    "Wits": ["Clever", "Ambushes", "Comebacks", "Changes in Strategy"],
    "Alertness": ["Noises", "Traps", "Ambushes", "Hidden Weapons"],
    "Athletics": ["Acrobatics", "Climbing", "Running", "Swimming", "Throwing"],
    "Awareness": ["Auras", "Spirits", "Magic", "Shifting"],
    "Brawl": ["Boxing", "Wrestling", "Dirty Fighting", "Throws", "Claws"],
    "Empathy": ["Emotions", "Personalities", "Truths", "Motives"],
    "Expression": ["Poetry", "Acting", "Guitar", "Writing", "Oratory"],
    "Intimidation": ["Physical", "Veiled Threats", "Social", "Stare Down"],
    "Leadership": ["Command", "Oratory", "Military", "Motivation"],
    "Streetwise": ["Fencing", "Drugs", "Gangs", "Rumors", "Turf"],
    "Subterfuge": ["Lying", "Seduction", "Impeccable Logic", "The Long Con"],
    "Animal Ken": ["Dogs", "Wolves", "Cats", "Horses", "Training"],
    "Crafts": ["Pottery", "Sewing", "Carpentry", "Blacksmithing", "Mechanics"],
    "Drive": ["Curves", "High Speed", "Stunts", "Heavy Traffic", "Tail"],
    "Etiquette": ["Camarilla", "Sabbat", "High Society", "Business", "Street"],
    "Firearms": ["Pistols", "Rifles", "Shotguns", "Sniping", "Quick Draw"],
    "Larceny": ["Lockpicking", "Pickpocket", "Safecracking", "Security"],
    "Melee": ["Knives", "Swords", "Axes", "Clubs", "Disarm"],
    "Performance": ["Singing", "Dancing", "Comedy", "Instrument"],
    "Stealth": ["Shadowing", "Hiding", "Silent Movement", "Crowds"],
    "Survival": ["Forest", "Jungle", "Desert", "Urban", "Tracking"],
    "Academics": ["History", "Literature", "Philosophy", "Art", "Theology"],
    "Computer": ["Hacking", "Programming", "Hardware", "Data Retrieval"],
    "Finance": ["Stock Market", "Laundering", "Appraisal", "Accounting"],
    "Investigation": ["Search", "Forensics", "Research", "Interrogation"],
    "Law": ["Criminal", "Civil", "Kindred Law", "Police Procedure"],
    "Medicine": ["First Aid", "Surgery", "Pharmacy", "Pathology", "Poison"],
    "Occult": ["Kindred Lore", "Magic", "Ghosts", "Demons", "Rituals"],
    "Politics": ["City", "National", "Camarilla", "Sabbat", "Bribery"],
    "Science": ["Biology", "Chemistry", "Physics", "Geology", "Botany"],
    "Technology": ["Electronics", "Security", "Communications", "Invention"]
};

export const DERANGEMENTS = [
    "Amnesia", "Anxiety", "Bipolar Disorder", "Bulimia", "Fugue", "Hysteria", 
    "Megalomania", "Multiple Personalities", "Obsessive-Compulsive", "Paranoia", 
    "Phobia", "Schizophrenia", "Sanguinary Animism"
];

export const V20_MERITS_LIST = [
    { n: "Acute Sense", t: "Merit", v: 1 }, { n: "Ambidextrous", t: "Merit", v: 1 }, { n: "Catlike Balance", t: "Merit", v: 1 }, { n: "Early Riser", t: "Merit", v: 1 }, { n: "Eat Food", t: "Merit", v: 1 }, { n: "Blush of Health", t: "Merit", v: 2 }, { n: "Enchanting Voice", t: "Merit", v: 2 }, { n: "Daredevil", t: "Merit", v: 3 }, { n: "Efficient Digestion", t: "Merit", v: 3 }, { n: "Huge Size", t: "Merit", v: 4 }, { n: "Prestigious Sire", t: "Merit", v: 1 }, { n: "Natural Leader", t: "Merit", v: 1 }, { n: "Specific Interests", t: "Merit", v: 1 }, { n: "Harmless", t: "Merit", v: 1 }, { n: "Protege", t: "Merit", v: 1 }, { n: "Rep", t: "Merit", v: 1 }, { n: "Language", t: "Merit", v: 1 }, { n: "Common Sense", t: "Merit", v: 1 }, { n: "Concentration", t: "Merit", v: 1 }, { n: "Time Sense", t: "Merit", v: 1 }, { n: "Code of Honor", t: "Merit", v: 1 }, { n: "Eidetic Memory", t: "Merit", v: 2 }, { n: "Light Sleeper", t: "Merit", v: 2 }, { n: "Calm Heart", t: "Merit", v: 3 }, { n: "Iron Will", t: "Merit", v: 3 }, { n: "Medium", t: "Merit", v: 2 }, { n: "Magic Resistance", t: "Merit", v: 2 }, { n: "Oracular Ability", t: "Merit", v: 3 }, { n: "Unbondable", t: "Merit", v: 3 }, { n: "Lucky", t: "Merit", v: 3 }, { n: "True Faith", t: "Merit", v: 7 }
];

export const V20_FLAWS_LIST = [
    { n: "Deep Sleeper", t: "Flaw", v: 1 }, { n: "Intolerance", t: "Flaw", v: 1 }, { n: "Nightmare", t: "Flaw", v: 1 }, { n: "Prey Exclusion", t: "Flaw", v: 1 }, { n: "Overconfident", t: "Flaw", v: 1 }, { n: "Shy", t: "Flaw", v: 1 }, { n: "Soft-Hearted", t: "Flaw", v: 1 }, { n: "Speech Impediment", t: "Flaw", v: 1 }, { n: "Bad Sight", t: "Flaw", v: 2 }, { n: "One Eye", t: "Flaw", v: 2 }, { n: "Short Fuse", t: "Flaw", v: 2 }, { n: "Vengeful", t: "Flaw", v: 2 }, { n: "Amnesia", t: "Flaw", v: 2 }, { n: "Lunacy", t: "Flaw", v: 2 }, { n: "Phobia", t: "Flaw", v: 2 }, { n: "Addiction", t: "Flaw", v: 3 }, { n: "Lame", t: "Flaw", v: 3 }, { n: "Deformity", t: "Flaw", v: 3 }, { n: "Deaf", t: "Flaw", v: 4 }, { n: "Hunted", t: "Flaw", v: 4 }, { n: "Blind", t: "Flaw", v: 6 }, { n: "Enemy", t: "Flaw", v: 1, range: "1-5", variable: true }, { n: "Dark Secret", t: "Flaw", v: 1, range: "1-5", variable: true }, { n: "Cursed", t: "Flaw", v: 1, range: "1-5", variable: true }, { n: "Mistaken Identity", t: "Flaw", v: 1 }, { n: "Beacon of the Unholy", t: "Flaw", v: 2 }, { n: "Death Sight", t: "Flaw", v: 2 }, { n: "Haunted", t: "Flaw", v: 3 }, { n: "Flashbacks", t: "Flaw", v: 1, range: "1-2", variable: true }
];

export const V20_WEAPONS_LIST = [
    { n: "Sap / Blackjack", diff: 4, dmg: "Str+1(B)", range: "-", rate: "1", clip: "-" }, { n: "Club / Bat", diff: 4, dmg: "Str+2(B)", range: "-", rate: "1", clip: "-" }, { n: "Knife", diff: 4, dmg: "Str+1(L)", range: "-", rate: "1", clip: "-" }, { n: "Sword", diff: 6, dmg: "Str+2(L)", range: "-", rate: "1", clip: "-" }, { n: "Axe", diff: 7, dmg: "Str+3(L)", range: "-", rate: "1", clip: "-" }, { n: "Stake", diff: 6, dmg: "Str+1(L)", range: "-", rate: "1", clip: "-" }, { n: "Revolver, Lt", diff: 6, dmg: "4", range: "12", rate: "3", clip: "6" }, { n: "Revolver, Hvy", diff: 7, dmg: "6", range: "35", rate: "2", clip: "6" }, { n: "Pistol, Lt", diff: 6, dmg: "4", range: "20", rate: "4", clip: "17+1" }, { n: "Pistol, Hvy", diff: 7, dmg: "5", range: "30", rate: "3", clip: "7+1" }, { n: "Rifle", diff: 8, dmg: "8", range: "200", rate: "1", clip: "5+1" }, { n: "SMG, Small", diff: 7, dmg: "4", range: "25", rate: "3", clip: "30+1" }, { n: "SMG, Large", diff: 6, dmg: "6", range: "50", rate: "3", clip: "30+1" }, { n: "Assault Rifle", diff: 7, dmg: "7", range: "150", rate: "3", clip: "30+1" }, { n: "Shotgun", diff: 6, dmg: "8", range: "20", rate: "1", clip: "5+1" }, { n: "Shotgun, Sawed-Off", diff: 7, dmg: "8", range: "10", rate: "2", clip: "2" }
];

export const V20_ARMOR_LIST = [
    { n: "Class I (Reinforced Clothing)", r: 1, p: 0 }, { n: "Class II (Armor T-Shirt)", r: 2, p: 1 }, { n: "Class III (Kevlar Vest)", r: 3, p: 1 }, { n: "Class IV (Flak Jacket)", r: 4, p: 2 }, { n: "Class V (Full Riot Gear)", r: 5, p: 3 }
];

export const V20_VEHICLE_LIST = [
    { n: "6-Wheel Truck", safe: "60/95", max: "90/145", man: 3 }, 
    { n: "Tank (modern)", safe: "60/95", max: "100/160", man: 4 }, 
    { n: "Tank (WWII)", safe: "30/50", max: "40/65", man: 3 }, 
    { n: "Bus", safe: "60/95", max: "100/160", man: 3 }, 
    { n: "18-Wheeler", safe: "70/110", max: "110/175", man: 4 }, 
    { n: "Sedan", safe: "70/110", max: "120/195", man: 5 }, 
    { n: "Minivan", safe: "70/110", max: "120/195", man: 6 }, 
    { n: "Compact", safe: "70/110", max: "130/210", man: 6 }, 
    { n: "Sporty Compact", safe: "100/160", max: "140/225", man: 7 }, 
    { n: "Sport Coupe", safe: "110/175", max: "150/240", man: 8 }, 
    { n: "Sports Car", safe: "110/175", max: "160/255", man: 8 }, 
    { n: "Exotic Car", safe: "130/210", max: "190+/305+", man: 9 }, 
    { n: "Luxury Sedan", safe: "85/135", max: "155/250", man: 7 }, 
    { n: "Sport Sedan", safe: "85/135", max: "165/265", man: 8 }, 
    { n: "Midsize", safe: "75/120", max: "125/200", man: 6 }, 
    { n: "SUV/ Crossover", safe: "70/110", max: "115/185", man: 6 }, 
    { n: "Formula One Racer", safe: "140/225", max: "240/385", man: 10 }
];
