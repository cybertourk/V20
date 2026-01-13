/**
 * npc-animal.js
 * Template definition for V20 Animals (Bestiary p. 389)
 */

const ANIMAL_SPECIES = {
    "Alligator": {
        attr: { Strength: 4, Dexterity: 2, Stamina: 4, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 2, Athletics: 2, Brawl: 2, Stealth: 3 },
        willpower: 3,
        bloodPool: 5,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ],
        notes: "One soak die of armor (bashing/lethal)."
    },
    "Bat": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 1, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Stealth: 2 },
        willpower: 2,
        bloodPool: 1, // 1/4 point technically
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-3', p: -3 }
        ],
        notes: "Fly at 25 mph. 4 bats = 1 blood point."
    },
    "Bear": {
        attr: { Strength: 5, Dexterity: 2, Stamina: 5, Perception: 3, Intelligence: 3, Wits: 2 },
        abil: { Alertness: 3, Brawl: 3, Intimidation: 2, Stealth: 1 },
        willpower: 4,
        bloodPool: 5,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-3', p: -3 }, { l: '-3', p: -3 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Bird (Small)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Performance: 3 }, // Performance (Mimicry)
        willpower: 1,
        bloodPool: 1, // 1/4 point
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-2', p: -2 }, { l: '-5', p: -5 }
        ],
        notes: "Attack is Harassment (-1 die to target)."
    },
    "Bird (Large)": {
        attr: { Strength: 2, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 2, Brawl: 1, Intimidation: 2 },
        willpower: 3,
        bloodPool: 1, // 1/2 point
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Camel": {
        attr: { Strength: 6, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 3, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 4 },
        willpower: 3,
        bloodPool: 6,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 },
            { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Cat (Bobcat)": {
        attr: { Strength: 3, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3 },
        willpower: 3,
        bloodPool: 4,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Cat (House)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 2, Intimidation: 2, Stealth: 4 },
        willpower: 3,
        bloodPool: 1,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-2', p: -2 },
            { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Cat (Leopard/Jaguar)": {
        attr: { Strength: 4, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3 },
        willpower: 4,
        bloodPool: 5,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Cat (Tiger/Lion)": {
        attr: { Strength: 5, Dexterity: 4, Stamina: 4, Perception: 4, Intelligence: 3, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3 },
        willpower: 5,
        bloodPool: 5,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Chimpanzee": {
        attr: { Strength: 4, Dexterity: 4, Stamina: 3, Perception: 3, Intelligence: 3, Wits: 4 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 2 },
        willpower: 5,
        bloodPool: 4,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Dog (Small)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 1, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3 },
        willpower: 3,
        bloodPool: 1,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-5', p: -5 }
        ]
    },
    "Dog (Medium)": {
        attr: { Strength: 2, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Survival: 3 },
        willpower: 3,
        bloodPool: 2,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Dog (Large)": {
        attr: { Strength: 4, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3, Survival: 3 },
        willpower: 5,
        bloodPool: 2,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Horse (Small)": {
        attr: { Strength: 4, Dexterity: 2, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 1 },
        willpower: 2,
        bloodPool: 3,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 },
            { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Horse (Large)": {
        attr: { Strength: 6, Dexterity: 2, Stamina: 5, Perception: 3, Intelligence: 2, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 1 },
        willpower: 4,
        bloodPool: 4,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 },
            { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Pig (Small)": {
        attr: { Strength: 2, Dexterity: 2, Stamina: 4, Perception: 3, Intelligence: 2, Wits: 2 },
        abil: { Alertness: 2, Athletics: 2, Brawl: 2 },
        willpower: 3,
        bloodPool: 3,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-4', p: -4 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Pig (Large/Boar)": {
        attr: { Strength: 4, Dexterity: 2, Stamina: 5, Perception: 3, Intelligence: 2, Wits: 2 },
        abil: { Alertness: 2, Athletics: 2, Brawl: 2 },
        willpower: 3,
        bloodPool: 4,
        health: [
            { l: 'OK', p: 0 }, { l: 'OK', p: 0 },
            { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-4', p: -4 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Rat": {
        attr: { Strength: 1, Dexterity: 2, Stamina: 3, Perception: 2, Intelligence: 1, Wits: 1 },
        abil: { Alertness: 2, Athletics: 3, Brawl: 1, Stealth: 3 },
        willpower: 4,
        bloodPool: 1, // 1/4 point
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-5', p: -5 }
        ]
    },
    "Snake (Constrictor)": {
        attr: { Strength: 2, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 1, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3 },
        willpower: 4,
        bloodPool: 2,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-2', p: -2 }, { l: '-2', p: -2 }, { l: '-5', p: -5 },
            { l: 'Incapacitated', p: 0 }
        ]
    },
    "Snake (Poisonous)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 1, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3 },
        willpower: 4,
        bloodPool: 1,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-2', p: -2 },
            { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    },
    "Spider": {
        attr: { Strength: 0, Dexterity: 3, Stamina: 1, Perception: 1, Intelligence: 1, Wits: 3 },
        abil: {},
        willpower: 3,
        bloodPool: 0,
        health: [
            { l: 'OK', p: 0 }, { l: 'Squashed', p: 0 }
        ]
    },
    "Wolf": {
        attr: { Strength: 3, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 2, Athletics: 1, Brawl: 3, Stealth: 2 },
        willpower: 3,
        bloodPool: 2,
        health: [
            { l: 'OK', p: 0 }, { l: '-1', p: -1 }, { l: '-1', p: -1 },
            { l: '-3', p: -3 }, { l: '-5', p: -5 }, { l: 'Incapacitated', p: 0 }
        ]
    }
};

export const AnimalTemplate = {
    type: "Animal",
    label: "Animal",
    
    // Animals use a simplified sheet
    features: {
        disciplines: false, // Unless ghouled (handled dynamically)
        bloodPool: true,
        virtues: false, // Animals have WP, not Virtues
        backgrounds: false,
        humanity: false // Animals don't use Humanity
    },

    defaults: {
        template: "animal",
        species: "",
        ghouled: false,
        domitor: "",
        attributes: { 
            Strength: 1, Dexterity: 1, Stamina: 1, 
            Charisma: 1, Manipulation: 1, Appearance: 1, 
            Perception: 1, Intelligence: 1, Wits: 1 
        },
        abilities: {},
        disciplines: {}, // Only if ghouled
        healthConfig: [], // Custom health tracks
        willpower: 1,
        bloodPool: 1,
        bio: { Description: "", Notes: "" },
        merits: {},
        flaws: {}
    },

    getPriorities: () => ({ attr: null, abil: null }), // No prioritization for animals, direct stats

    // Cost is N/A for animals mostly, they are created by GM fiat
    getCost: () => 0, 
    validateChange: () => true,
    getVirtueLimit: () => 10,

    renderIdentityExtras: (data) => {
        const speciesOpts = Object.keys(ANIMAL_SPECIES).sort().map(s => 
            `<option value="${s}" ${data.species === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        // If ghouled, show Potence and Blood Pool bonus info
        // (V20 p. 389: "gain Willpower, a dot of Potence, a useable blood pool of 2")
        
        return `
            <div class="space-y-6 border-t border-[#333] pt-4 mt-2">
                <div>
                    <label class="label-text text-[#d4af37]">Species</label>
                    <select id="npc-species" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                        <option value="" class="bg-black">-- Select Species --</option>
                        ${speciesOpts}
                    </select>
                </div>

                <div class="flex items-center gap-3 bg-[#111] p-2 border border-[#333]">
                    <input type="checkbox" id="npc-ghoul-toggle" ${data.ghouled ? 'checked' : ''} class="accent-[#8b0000] w-4 h-4">
                    <div>
                        <label for="npc-ghoul-toggle" class="text-[#d4af37] font-bold text-xs uppercase cursor-pointer">Ghouled Animal</label>
                        <div class="text-[9px] text-gray-500">Gains +1 Potence, Min 2 Blood, Trained Abilities.</div>
                    </div>
                </div>
                
                ${data.ghouled ? `
                <div>
                    <label class="label-text text-[#d4af37]">Domitor</label>
                    <input type="text" id="npc-domitor" value="${data.domitor || ''}" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm focus:border-[#d4af37] focus:outline-none">
                </div>
                ` : ''}
            </div>
        `;
    },

    renderBio: (data) => {
        // Animals don't need detailed history/goals
        return `
            <div class="space-y-4">
                <div><label class="label-text text-[#d4af37] mb-2">Description / Notes</label><textarea id="npc-desc" class="w-full h-64 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${data.bio.Description||''}</textarea></div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const spEl = parent.querySelector('#npc-species');
        const ghoulEl = parent.querySelector('#npc-ghoul-toggle');
        const domEl = parent.querySelector('#npc-domitor');

        if (spEl) {
            spEl.onchange = (e) => {
                const species = e.target.value;
                data.species = species;
                
                const stats = ANIMAL_SPECIES[species];
                if (stats) {
                    // Apply Defaults
                    data.attributes = JSON.parse(JSON.stringify(stats.attr));
                    data.abilities = JSON.parse(JSON.stringify(stats.abil));
                    data.willpower = stats.willpower;
                    data.bloodPool = stats.bloodPool;
                    data.healthConfig = JSON.parse(JSON.stringify(stats.health));
                    
                    if (stats.notes) data.bio.Notes = stats.notes;
                }
                
                // Re-apply ghoul bonuses if checked
                if (data.ghouled) applyGhoulBonuses(data);

                updateCallback();
            };
        }

        if (ghoulEl) {
            ghoulEl.onchange = (e) => {
                data.ghouled = e.target.checked;
                if (data.ghouled) applyGhoulBonuses(data);
                else {
                    // Revert to species default if possible
                    if (data.species && ANIMAL_SPECIES[data.species]) {
                        data.bloodPool = ANIMAL_SPECIES[data.species].bloodPool;
                        if (data.disciplines) delete data.disciplines.Potence;
                    }
                }
                updateCallback(); // Triggers re-render to show/hide domitor field
            };
        }

        if (domEl) {
            domEl.onchange = (e) => data.domitor = e.target.value;
        }
    }
};

function applyGhoulBonuses(data) {
    // V20 p. 389: "gain Willpower [usually +1? Text vague, implies they gain the Trait], a dot of Potence, a useable blood pool of 2"
    if (data.bloodPool < 2) data.bloodPool = 2;
    if (!data.disciplines) data.disciplines = {};
    if (!data.disciplines.Potence) data.disciplines.Potence = 1;
}
