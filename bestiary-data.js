/**
 * V20 Bestiary Data
 * A library of pre-generated NPCs and Creatures for Storyteller Mode.
 */

export const BESTIARY = {
    "Lupines": {
        "Adolescent Werewolf": {
            template: "animal", // Using 'animal' template structure but with higher stats
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
            disciplines: { // "Equivalent Disciplines"
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
    "Mortals": {
        // Placeholder for future expansion
    },
    "Ghouls": {
        // Placeholder for future expansion
    }
};
