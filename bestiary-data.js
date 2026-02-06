/**
 * V20 Bestiary Data
 * A library of pre-generated NPCs and Creatures for Storyteller Mode.
 */

export const BESTIARY = {
    "Lupines": {
        "Adolescent Werewolf": {
            template: "animal", 
            name: "Adolescent Werewolf",
            species: "Werewolf",
            ghouled: false,
            attributes: { 
                Strength: 3, Dexterity: 3, Stamina: 3, 
                Charisma: 2, Manipulation: 2, Appearance: 2, 
                Perception: 3, Intelligence: 2, Wits: 3 
            },
            abilities: {
                Academics: 1, Alertness: 3, "Animal Ken": 2, Athletics: 2,
                Awareness: 2, Brawl: 3, Crafts: 2, Firearms: 2,
                Intimidation: 3, Investigation: 2, Leadership: 1,
                Melee: 2, Occult: 1, Stealth: 3, Survival: 3
            },
            disciplines: { 
                Celerity: 3, Potence: 1, Protean: 4
            },
            willpower: 5,
            humanity: 7,
            bloodPool: 4, // Representing Gnosis
            healthConfig: [
                { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
                { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
                { l: 'Incapacitated', p: 0 }
            ],
            naturalWeapons: "Battle Form: Double Physical Attributes. 4-6 Actions/Turn. Regenerates 1 Health/Turn. Soak Lethal/Aggravated with Stamina. Weakness: Silver (No Soak).",
            bio: {
                Description: "A young, fierce warrior of Gaia. Capable of shifting into a crinos battle form that induces Delirium in mortals.",
                Notes: "Gnosis: 4. Rage: High."
            }
        },
        "Veteran Lupine": {
            template: "animal",
            name: "Veteran Lupine",
            species: "Werewolf",
            ghouled: false,
            attributes: { 
                Strength: 4, Dexterity: 3, Stamina: 4, 
                Charisma: 3, Manipulation: 2, Appearance: 3, 
                Perception: 4, Intelligence: 3, Wits: 4 
            },
            abilities: {
                Academics: 1, Alertness: 3, "Animal Ken": 3, Athletics: 2,
                Awareness: 3, Brawl: 4, Crafts: 2, Expression: 1,
                Firearms: 2, Intimidation: 3, Investigation: 2,
                Leadership: 1, Medicine: 1, Melee: 3, Occult: 3,
                Stealth: 3, Survival: 4
            },
            disciplines: {
                Celerity: 4, Potence: 2, Protean: 4
            },
            willpower: 7,
            humanity: 6,
            bloodPool: 6, // Gnosis
            naturalWeapons: "Battle Form: Double Physical Attributes. Multiple Actions. Regenerates 1 Health/Turn. Soak Lethal/Aggravated with Stamina. Weakness: Silver.",
            bio: {
                Description: "A hardened warrior who has survived many battles. Dangerous and cunning.",
                Notes: "Gnosis: 6."
            }
        },
        "Elder Shapeshifter": {
            template: "animal",
            name: "Elder Shapeshifter",
            species: "Werewolf",
            ghouled: false,
            attributes: { 
                Strength: 5, Dexterity: 4, Stamina: 5, 
                Charisma: 5, Manipulation: 3, Appearance: 3, 
                Perception: 5, Intelligence: 3, Wits: 4 
            },
            abilities: {
                Academics: 1, Alertness: 4, "Animal Ken": 4, Athletics: 4,
                Awareness: 3, Brawl: 5, Crafts: 2, Expression: 3,
                Firearms: 2, Intimidation: 4, Investigation: 2,
                Leadership: 4, Medicine: 1, Melee: 5, Occult: 4,
                Stealth: 4, Survival: 5
            },
            disciplines: {
                Celerity: 6, Dominate: 2, Fortitude: 2,
                Obfuscate: 3, Potence: 3, Protean: 4
            },
            willpower: 9,
            humanity: 5,
            bloodPool: 8, // Gnosis
            naturalWeapons: "Battle Form: Double Physical Attributes. Master of Spirits. Regenerates. Soak Lethal/Aggravated. Weakness: Silver.",
            bio: {
                Description: "A legendary leader of the pack. Possesses strange mystical powers akin to Thaumaturgy.",
                Notes: "Gnosis: 8. One other Discipline at 4."
            }
        }
    },
    "Witch-Hunters": {
        "Society of Leopold Inquisitor": {
            template: "mortal",
            name: "Leopold Inquisitor",
            species: "Mortal",
            attributes: {
                Strength: 2, Dexterity: 3, Stamina: 3,
                Charisma: 4, Manipulation: 3, Appearance: 2,
                Perception: 3, Intelligence: 3, Wits: 3
            },
            abilities: {
                Academics: 3, Alertness: 2, Athletics: 2, Brawl: 2,
                Drive: 1, Expression: 2, Leadership: 3, Melee: 3,
                Occult: 3, Stealth: 2
            },
            specialties: {
                Academics: "Theology",
                Melee: "Sword-Cane"
            },
            willpower: 9,
            humanity: 9,
            bloodPool: 0,
            inventory: [
                { name: "Sword-Cane", type: "Weapon", stats: { diff: 6, dmg: "Str+2(L)", range: "-", rate: "-", clip: "-" }, status: "carried" },
                { name: "Stake", type: "Weapon", stats: { diff: 6, dmg: "Str(L)", range: "-", rate: "-", clip: "-" }, status: "carried" },
                { name: "Propane Torch", type: "Weapon", stats: { diff: 7, dmg: "2(A)", range: "Touch", rate: "1", clip: "Fuel" }, status: "carried" },
                { name: "Rosary", type: "Gear", status: "carried" },
                { name: "Crucifix", type: "Gear", status: "carried" },
                { name: "Bible", type: "Gear", status: "carried" }
            ],
            merits: [
                { name: "True Faith", val: 1, desc: "Can ward off vampires. Resist Dominate/Presence." }
            ],
            bio: {
                Description: "A dedicated hunter from the Society of Leopold. Often highly educated in theology and trained in the arts of combat and interrogation.",
                Notes: "TRUE FAITH RULES:\n• Ward: Roll Faith (Diff = Vamp WP). Successes push vampire back. Touch causes Agg damage.\n• Rating 2+: Resist Dominate/Mind Control by spending 1 WP.\n• Rating 3+: Sense Unholy/Vampires (Awareness roll).\n• Rating 4+: Immune to Dominate, Presence, Obfuscate. Cannot be Ghouled.\n• Rating 5+: Holy Aura causes vampires to flee (Stamina roll Diff 5+Int to resist) or cower in pain."
            }
        },
        "Government Agent": {
            template: "mortal",
            name: "Government Agent",
            species: "Mortal",
            attributes: {
                Strength: 3, Dexterity: 2, Stamina: 3,
                Charisma: 2, Manipulation: 3, Appearance: 2,
                Perception: 3, Intelligence: 3, Wits: 3
            },
            abilities: {
                Alertness: 3, Athletics: 3, Brawl: 3, Computer: 1,
                Drive: 3, Firearms: 3, Investigation: 4, Melee: 2,
                Occult: 1, Politics: 2, Stealth: 2
            },
            willpower: 7,
            humanity: 7,
            bloodPool: 0,
            inventory: [
                { name: "Heavy Pistol", type: "Weapon", stats: { diff: 6, dmg: "5(L)", range: "25", rate: "3", clip: "13+1" }, status: "carried" },
                { name: "Badge & ID", type: "Gear", status: "carried" },
                { name: "Sunglasses", type: "Gear", status: "carried" },
                { name: "Surveillance Device", type: "Gear", status: "carried" }
            ],
            bio: {
                Description: "An agent of the NSA, FBI (SAD), or similar organization. Likely aware of the existence of 'negative bodies' or 'extradimensionals' but may not understand true vampiric nature.",
                Notes: "May have access to Chaoscopic scanners or infrared equipment."
            }
        },
        "Arcanum Scholar": {
            template: "mortal",
            name: "Arcanum Scholar",
            species: "Mortal",
            attributes: {
                Strength: 2, Dexterity: 2, Stamina: 2,
                Charisma: 2, Manipulation: 2, Appearance: 2,
                Perception: 4, Intelligence: 4, Wits: 3
            },
            abilities: {
                Academics: 4, Athletics: 1, Computer: 3, Drive: 1,
                Etiquette: 2, Expression: 2, Investigation: 3, Melee: 1,
                Occult: 4, Science: 3
            },
            willpower: 7,
            humanity: 8,
            bloodPool: 0,
            inventory: [
                { name: "Laptop", type: "Gear", status: "carried" },
                { name: "Occult Books", type: "Gear", status: "owned" }
            ],
            bio: {
                Description: "A member of the Arcanum, seeking knowledge of the supernatural. More likely to observe and record than fight directly, but may redirect hunters.",
                Notes: "Extensive knowledge of occult lore."
            }
        }
    },
    "Criminals": {
        "Criminal Enforcer/Boss": {
            template: "mortal",
            name: "Criminal Enforcer",
            species: "Mortal",
            attributes: {
                Strength: 4, Dexterity: 3, Stamina: 3,
                Charisma: 3, Manipulation: 4, Appearance: 1,
                Perception: 2, Intelligence: 2, Wits: 3
            },
            abilities: {
                Alertness: 2, Athletics: 3, Brawl: 3, Drive: 2,
                Finance: 2, Firearms: 3, Larceny: 3, Melee: 2,
                Stealth: 2, Streetwise: 3, Subterfuge: 2
            },
            willpower: 6,
            humanity: 6,
            bloodPool: 0,
            inventory: [
                { name: "SMG", type: "Weapon", stats: { diff: 6, dmg: "4(L)", range: "50", rate: "3", clip: "30+1" }, status: "carried" },
                { name: "Knife", type: "Weapon", stats: { diff: 4, dmg: "Str+1(L)", range: "-", rate: "-", clip: "-" }, status: "carried" },
                { name: "Bulletproof Vest", type: "Armor", stats: { rating: 2, penalty: 1 }, status: "carried" }
            ],
            bio: {
                Description: "A tough, savvy member of the underworld. Could be a Mafia lieutenant, cartel boss, or high-ranking gang member.",
                Notes: "Has access to criminal resources and manpower."
            }
        }
    },
    "Magi": {
        "Young Cultist": {
            template: "mortal",
            name: "Young Cultist",
            species: "Mage",
            attributes: {
                Strength: 3, Dexterity: 3, Stamina: 3,
                Charisma: 3, Manipulation: 4, Appearance: 3,
                Perception: 2, Intelligence: 4, Wits: 4
            },
            abilities: {
                Academics: 2, Alertness: 3, Athletics: 2, Awareness: 3,
                Brawl: 2, Drive: 2, Empathy: 2, Firearms: 3,
                Intimidation: 2, Melee: 2, Occult: 4, Streetwise: 3,
                Subterfuge: 3
            },
            disciplines: { // "Equivalent Disciplines"
                Auspex: 2, Dominate: 2, Presence: 1, 
                Protean: 1, Thaumaturgy: 3
            },
            willpower: 5,
            humanity: 7,
            bloodPool: 10, // Quintessence
            inventory: [
                { name: "Knife", type: "Weapon", stats: { diff: 4, dmg: "Str+1(L)", range: "-", rate: "-", clip: "-" }, status: "carried" },
                { name: "Ritual Tools", type: "Gear", status: "carried" }
            ],
            bio: {
                Description: "A novice magic-user, possibly part of a coven or cult. Wields strange powers equivalent to blood magic.",
                Notes: "Mage: Uses Quintessence (Blood Pool) to power effects. Takes Lethal damage from bashing."
            }
        },
        "High Wizard": {
            template: "mortal",
            name: "High Wizard",
            species: "Mage",
            attributes: {
                Strength: 2, Dexterity: 2, Stamina: 2,
                Charisma: 3, Manipulation: 5, Appearance: 2,
                Perception: 4, Intelligence: 4, Wits: 4
            },
            abilities: {
                Academics: 5, Alertness: 3, Athletics: 2, Awareness: 4,
                Drive: 1, Empathy: 4, Etiquette: 3, Finance: 2,
                Firearms: 1, Intimidation: 4, Investigation: 3, Leadership: 2,
                Medicine: 2, Occult: 5, Subterfuge: 3
            },
            disciplines: {
                Auspex: 4, Chimerstry: 3, Dominate: 2, 
                Fortitude: 2, Obfuscate: 4, Presence: 3, 
                Thaumaturgy: 5
            },
            willpower: 9,
            humanity: 5,
            bloodPool: 12, // Quintessence
            inventory: [
                { name: "Sword-Cane", type: "Weapon", stats: { diff: 6, dmg: "Str+2(L)", range: "-", rate: "-", clip: "-" }, status: "carried" },
                { name: "Potions", type: "Gear", status: "carried" }
            ],
            bio: {
                Description: "A powerful, enlightened sorcerer. Capable of bending reality in subtle and terrifying ways.",
                Notes: "Mage: High level magic. Paradox may occur on botched rolls."
            }
        },
        "Technological Abomination": {
            template: "mortal",
            name: "Techno-Mage",
            species: "Mage",
            attributes: {
                Strength: 5, Dexterity: 4, Stamina: 5,
                Charisma: 2, Manipulation: 2, Appearance: 2,
                Perception: 4, Intelligence: 3, Wits: 4
            },
            abilities: {
                Alertness: 3, Athletics: 3, Awareness: 4, Brawl: 3,
                Computer: 4, Drive: 3, Firearms: 4, Intimidation: 4,
                Investigation: 4, Larceny: 5, Law: 2, Melee: 3,
                Occult: 4, Science: 3, Stealth: 2, Streetwise: 2,
                Technology: 4
            },
            disciplines: {
                Auspex: 2, Dominate: 2, Fortitude: 4, 
                Potence: 3, Presence: 3
            },
            willpower: 8,
            humanity: 3,
            bloodPool: 10, // Quintessence
            inventory: [
                { name: "Assault Rifle", type: "Weapon", stats: { diff: 7, dmg: "7(L)", range: "150", rate: "3", clip: "30+1" }, status: "carried" },
                { name: "Body Armor", type: "Armor", stats: { rating: 4, penalty: 2 }, status: "carried" },
                { name: "Cyber-Deck", type: "Gear", status: "carried" }
            ],
            bio: {
                Description: "A mage who blends magic with high technology and cybernetics. Their blood is often toxic to vampires.",
                Notes: "Toxic Blood: Causes 1 Aggravated damage per point consumed."
            }
        }
    },
    "Faeries": {
        "Pooka Trickster": {
            template: "mortal",
            name: "Pooka Trickster",
            species: "Faerie",
            attributes: {
                Strength: 2, Dexterity: 5, Stamina: 2,
                Charisma: 4, Manipulation: 5, Appearance: 2,
                Perception: 3, Intelligence: 2, Wits: 2
            },
            abilities: {
                Alertness: 3, "Animal Ken": 2, Athletics: 5,
                Awareness: 3, Brawl: 3, Larceny: 5, Performance: 3,
                Occult: 2, Stealth: 5, Subterfuge: 4
            },
            disciplines: { // "Equivalent Disciplines"
                Animalism: 2, Auspex: 2, Chimerstry: 3,
                Celerity: 2, Obfuscate: 4, Protean: 4
            },
            willpower: 6,
            humanity: 6,
            bloodPool: 6, // Glamour
            inventory: [],
            bio: {
                Description: "A trickster of the fae, often taking delight in teasing and tormenting others. May resemble an animal in true form.",
                Notes: "Weakness: Cold Iron (No Soak). Fire causes Agg damage. Glamour powers abilities."
            }
        },
        "Redcap Warrior": {
            template: "mortal",
            name: "Redcap Warrior",
            species: "Faerie",
            attributes: {
                Strength: 3, Dexterity: 4, Stamina: 4,
                Charisma: 1, Manipulation: 3, Appearance: 1,
                Perception: 3, Intelligence: 2, Wits: 4
            },
            abilities: {
                Alertness: 3, Athletics: 3, Brawl: 4, Intimidation: 4,
                Larceny: 2, Melee: 4, Streetwise: 3, Stealth: 2
            },
            disciplines: {
                Celerity: 3, Fortitude: 2, Obfuscate: 3, Potence: 2
            },
            willpower: 5,
            humanity: 4,
            bloodPool: 5, // Glamour
            inventory: [
                { name: "Great Axe (Iron)", type: "Weapon", stats: { diff: 7, dmg: "Str+3(L)", range: "-", rate: "-", clip: "-" }, status: "carried" }
            ],
            bio: {
                Description: "A brutish faerie thriving on carnage. Known for dipping their caps in the blood of victims.",
                Notes: "Weakness: Cold Iron (No Soak). Fire causes Agg damage."
            }
        },
        "Sidhe Enchantress": {
            template: "mortal",
            name: "Sidhe Enchantress",
            species: "Faerie",
            attributes: {
                Strength: 2, Dexterity: 4, Stamina: 3,
                Charisma: 4, Manipulation: 4, Appearance: 5, // V20 stat max is usually 5, but Sidhe are exceptions. Capped at 5 for sheet compatibility, noted in bio.
                Perception: 3, Intelligence: 3, Wits: 4
            },
            abilities: {
                Alertness: 2, Athletics: 2, Awareness: 5, Empathy: 3,
                Etiquette: 4, Expression: 4, Intimidation: 3, Leadership: 4,
                Occult: 4, Performance: 4, Subterfuge: 2
            },
            disciplines: {
                Celerity: 1, Chimerstry: 5, Dominate: 4,
                Obfuscate: 4, Presence: 5
            },
            willpower: 7,
            humanity: 2,
            bloodPool: 10, // Glamour
            inventory: [],
            bio: {
                Description: "A magnificent noble of the fae courts. Her beauty is overwhelming (App 7 effect).",
                Notes: "Appearance effectively 7. Weakness: Cold Iron (No Soak). Fire causes Agg damage."
            }
        }
    },
    "Ghosts": {
        "Recently Deceased": {
            template: "mortal",
            name: "Recently Deceased",
            species: "Wraith",
            attributes: {
                Strength: 0, Dexterity: 3, Stamina: 3,
                Charisma: 2, Manipulation: 3, Appearance: 2,
                Perception: 3, Intelligence: 2, Wits: 3
            },
            abilities: {
                Academics: 2, Alertness: 3, Athletics: 2, Awareness: 2,
                Brawl: 1, Computer: 2, Empathy: 3, Intimidation: 2,
                Investigation: 1, Law: 2, Melee: 1, Occult: 2,
                Politics: 1, Stealth: 1, Streetwise: 1, Subterfuge: 2
            },
            disciplines: {
                Auspex: 1, Chimerstry: 1, Dementation: 2,
                Dominate: 1, Vicissitude: 1
            },
            willpower: 5,
            humanity: 6,
            bloodPool: 5, // Passion Pool
            bio: {
                Description: "A newly made wraith, inexperienced in the Underworld.",
                Notes: "Incorporeal in Skinlands (Str 0). Strength 2 in Shadowlands. Feeds on Emotion."
            }
        },
        "Spectre": {
            template: "mortal",
            name: "Spectre",
            species: "Wraith",
            attributes: {
                Strength: 0, Dexterity: 3, Stamina: 5,
                Charisma: 2, Manipulation: 3, Appearance: 1,
                Perception: 2, Intelligence: 4, Wits: 3
            },
            abilities: {
                Alertness: 3, Athletics: 4, Awareness: 3, Brawl: 4,
                Intimidation: 3, Melee: 3, Occult: 2, Stealth: 2,
                Streetwise: 3, Subterfuge: 3
            },
            disciplines: {
                Auspex: 2, Chimerstry: 4, Dementation: 4, Obfuscate: 2,
                Obtenebration: 3, Presence: 2, Protean: 2, Vicissitude: 4
            },
            willpower: 7,
            humanity: 3,
            bloodPool: 9, // Passion Pool
            bio: {
                Description: "A ghost consumed by its dark side (Shadow). Thrives on pain and fear.",
                Notes: "Incorporeal in Skinlands (Str 0). Strength 3 in Shadowlands. Hive mind communication."
            }
        },
        "Old Soul": {
            template: "mortal",
            name: "Old Soul",
            species: "Wraith",
            attributes: {
                Strength: 0, Dexterity: 5, Stamina: 5,
                Charisma: 3, Manipulation: 4, Appearance: 1,
                Perception: 5, Intelligence: 3, Wits: 3
            },
            abilities: {
                Academics: 2, Alertness: 3, Athletics: 3, Awareness: 5,
                Brawl: 2, Computer: 3, Empathy: 3, Intimidation: 3,
                Investigation: 1, Law: 2, Melee: 2, Occult: 2,
                Politics: 1, Stealth: 3, Streetwise: 1, Subterfuge: 3
            },
            disciplines: {
                Auspex: 2, Chimerstry: 1, Dementation: 4, Dominate: 3,
                Presence: 2, Thaumaturgy: 3, Vicissitude: 3
            },
            willpower: 9,
            humanity: 1,
            bloodPool: 10, // Passion Pool
            bio: {
                Description: "An ancient ghost, rarely seen in the Shadowlands. Feared for their power.",
                Notes: "Incorporeal in Skinlands (Str 0). Strength 4 in Shadowlands. Thaumaturgy: Lure of Flames/Movement of Mind."
            }
        }
    },
    "Demons": {
        "Fallen Tempter": {
            template: "mortal",
            name: "Fallen Tempter",
            species: "Demon",
            attributes: {
                Strength: 2, Dexterity: 2, Stamina: 2,
                Charisma: 3, Manipulation: 4, Appearance: 3,
                Perception: 3, Intelligence: 4, Wits: 4
            },
            abilities: {
                Alertness: 2, Awareness: 4, Computer: 1, Drive: 2,
                Empathy: 2, Etiquette: 4, Expression: 3, Finance: 4,
                Intimidation: 4, Law: 3, Leadership: 4, Occult: 2,
                Performance: 2, Politics: 5, Stealth: 1, Subterfuge: 5
            },
            disciplines: {
                Dominate: 2, Fortitude: 2, Obtenebration: 4 // Daimoinon approximation
            },
            willpower: 7,
            humanity: 3,
            bloodPool: 7, // Faith
            bio: {
                Description: "A Fallen demon ensconced in a mortal shell. Schemes to gather followers and faith.",
                Notes: "Immune to Mind Control. Feeds on Faith. Can reveal Apocalyptic Form."
            }
        },
        "Earthbound Defiler": {
            template: "mortal",
            name: "Earthbound Defiler",
            species: "Demon",
            attributes: {
                Strength: 2, Dexterity: 2, Stamina: 2,
                Charisma: 3, Manipulation: 4, Appearance: 3,
                Perception: 5, Intelligence: 5, Wits: 5
            },
            abilities: {
                Alertness: 3, Awareness: 4, Expression: 3, Finance: 4,
                Intimidation: 3, Leadership: 4, Medicine: 3, Melee: 3,
                Occult: 3, Performance: 2, Politics: 3, Stealth: 1, Subterfuge: 5
            },
            disciplines: {
                Dominate: 6, Potence: 6, Vicissitude: 6
            },
            willpower: 10,
            humanity: 1,
            bloodPool: 10, // Faith
            bio: {
                Description: "An ancient, maddened demon haunting an object or place. Immensely powerful.",
                Notes: "Physical stats only apply when projecting form. Immune to Mind Control. Cannot possess mortals long without destroying them."
            }
        }
    },
    "Mortals": {
        // Placeholder for future expansion
    },
    "Ghouls": {
        // Placeholder for future expansion
    }
};
