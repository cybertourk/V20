import { 
    ATTRIBUTES, ABILITIES 
} from "./data.js";

// --- V20 BESTIARY DATABASE ---
const SPECIES_DB = {
    "Alligator": {
        attr: { Strength: 4, Dexterity: 2, Stamina: 4, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 2, Athletics: 2, Brawl: 2, Stealth: 3 },
        wp: 3, bp: 5,
        note: "Health: 8 Levels (Inc. -5). Armor: 1 Soak die (Bash/Lethal). Attacks: Bite (7 dice), Tail (6 dice)."
    },
    "Bat": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 1, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Stealth: 2 },
        wp: 2, bp: 1, 
        note: "Health: 3 Levels (OK, -1, -3). Fly: 25mph. Attack: Bite (1 die). 4 Bats = 1 BP."
    },
    "Bear": {
        attr: { Strength: 5, Dexterity: 2, Stamina: 5, Perception: 3, Intelligence: 3, Wits: 2 },
        abil: { Alertness: 3, Brawl: 3, Intimidation: 2, Stealth: 1 },
        wp: 4, bp: 5,
        note: "Health: 10 Levels (OKx3, -1x3, -3x2, -5, Incap). Attacks: Claw (7 dice), Bite (5 dice)."
    },
    "Bird (Small)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Performance: 3 },
        wp: 1, bp: 1,
        note: "Health: 4 Levels. Attack: Harassment (-1 die to target). 4 Birds = 1 BP."
    },
    "Bird (Large)": {
        attr: { Strength: 2, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 2, Brawl: 1, Intimidation: 2 },
        wp: 3, bp: 1,
        note: "Health: 6 Levels. Attack: Claw (2 dice), Bite (1 die). 2 Birds = 1 BP."
    },
    "Camel": {
        attr: { Strength: 6, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 3, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 4 },
        wp: 3, bp: 6,
        note: "Health: 8 Levels. Attack: Kick (6 dice), Bite (4 dice)."
    },
    "Cat (House)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 2, Intimidation: 2, Stealth: 4, Empathy: 2, Subterfuge: 2 },
        wp: 3, bp: 1,
        note: "Health: 5 Levels. Attack: Bite/Claw (1 die)."
    },
    "Cat (Big/Leopard)": {
        attr: { Strength: 4, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3, Intimidation: 4, Stealth: 3 },
        wp: 4, bp: 5,
        note: "Health: 7 Levels. Attack: Bite (5 dice), Claw (4 dice)."
    },
    "Cat (Tiger/Lion)": {
        attr: { Strength: 5, Dexterity: 4, Stamina: 4, Perception: 4, Intelligence: 3, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3, Intimidation: 4, Stealth: 3 },
        wp: 5, bp: 5,
        note: "Health: 7 Levels. Attack: Bite (6 dice), Claw (5 dice)."
    },
    "Chimpanzee": {
        attr: { Strength: 4, Dexterity: 4, Stamina: 3, Perception: 3, Intelligence: 3, Wits: 4 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 2, Empathy: 2 },
        wp: 5, bp: 4,
        note: "Health: 6 Levels. Attack: Bite (5 dice), Claw (4 dice)."
    },
    "Dog (Small)": {
        attr: { Strength: 1, Dexterity: 3, Stamina: 2, Perception: 3, Intelligence: 1, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Empathy: 2, Stealth: 3 },
        wp: 3, bp: 1,
        note: "Health: 3 Levels (OK, -1, -5). Attack: Bite (2 dice)."
    },
    "Dog (Medium)": {
        attr: { Strength: 2, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Survival: 3, Empathy: 2, Stealth: 2 },
        wp: 3, bp: 2,
        note: "Health: 6 Levels. Attack: Bite (3 dice), Claw (2 dice)."
    },
    "Dog (Large)": {
        attr: { Strength: 4, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 3, Survival: 3, Empathy: 2, Intimidation: 3 },
        wp: 5, bp: 2,
        note: "Health: 7 Levels. Attack: Bite (5 dice), Claw (4 dice)."
    },
    "Horse (Large)": {
        attr: { Strength: 6, Dexterity: 2, Stamina: 5, Perception: 3, Intelligence: 2, Wits: 2 },
        abil: { Alertness: 3, Athletics: 3, Brawl: 1, Intimidation: 2 },
        wp: 4, bp: 4,
        note: "Health: 7 Levels. Attack: Trample/Kick (7 dice), Bite (3 dice)."
    },
    "Rat (Swarm)": {
        attr: { Strength: 1, Dexterity: 2, Stamina: 3, Perception: 2, Intelligence: 1, Wits: 1 },
        abil: { Alertness: 2, Athletics: 3, Brawl: 1, Stealth: 3 },
        wp: 4, bp: 1, 
        note: "Health: 3 Levels. Attack: Bite (1 die). 4 Rats = 1 BP."
    },
    "Wolf": {
        attr: { Strength: 3, Dexterity: 3, Stamina: 3, Perception: 3, Intelligence: 2, Wits: 3 },
        abil: { Alertness: 2, Athletics: 1, Brawl: 3, Stealth: 2 },
        wp: 3, bp: 2,
        note: "Health: 5 Levels (OK, -1, -1, -3, -5). Attack: Bite (4 dice), Claw (4 dice)."
    }
};

// --- COSTS FOR EDITING ---
const XP_COSTS = {
    attribute: 5,       
    ability: 3,         
    willpower: 2,       
    discipline_phys: 15,
    newDiscipline: 20
};

const FB_COSTS = {
    attribute: 5,
    ability: 2,
    willpower: 1,
    discipline: 10
};

// --- TEMPLATE DEFINITION ---
export const AnimalTemplate = {
    type: "Animal",
    label: "Animal / Beast",
    
    features: {
        disciplines: true, // Only relevant if Ghouled
        bloodPool: true,
        virtues: false,     
        backgrounds: false,
        humanity: false     
    },

    defaults: {
        type: "Animal",
        species: "",
        concept: "Beast",
        nature: "Feral", 
        demeanor: "Feral",
        ghouled: false,
        attributes: { 
            Strength: 1, Dexterity: 1, Stamina: 1, 
            Charisma: 1, Manipulation: 1, Appearance: 1, 
            Perception: 1, Intelligence: 1, Wits: 1 
        },
        abilities: {},
        willpower: 1,
        health: 7,
        disciplines: {},
        bloodPool: 1,
        bio: {}
    },

    renderIdentityExtras: (data) => {
        const speciesOpts = Object.keys(SPECIES_DB).sort().map(s => `<option value="${s}" ${data.species === s ? 'selected' : ''}>${s}</option>`).join('');
        
        return `
            <div class="space-y-6">
                <div>
                    <label class="label-text text-[#d4af37]">Species Preset</label>
                    <select id="npc-species" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                        <option value="">-- Custom / Select --</option>
                        ${speciesOpts}
                    </select>
                </div>
                <div class="flex items-center gap-2 border border-[#444] p-2 bg-[#111] rounded">
                    <input type="checkbox" id="npc-ghoul-toggle" class="w-4 h-4 accent-red-600 cursor-pointer" ${data.ghouled ? 'checked' : ''}>
                    <label for="npc-ghoul-toggle" class="cursor-pointer select-none">
                        <span class="text-white font-bold text-xs uppercase">Ghouled Animal</span>
                        <div class="text-[9px] text-gray-500">Gains Potence 1, +1 Willpower, Min BP 2</div>
                    </label>
                </div>
                <div>
                    <label class="label-text text-[#d4af37]">Natural Weapons & Health</label>
                    <textarea id="npc-nat-weapons" class="npc-input w-full h-20 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-[#d4af37] outline-none transition-colors" placeholder="Stats will appear here...">${data.naturalWeapons || ''}</textarea>
                </div>
            </div>
        `;
    },

    // Custom Biography Renderer for Animals
    renderBio: (data) => {
        // Safe access helper
        const getVal = (field) => (data.bio && data.bio[field]) ? data.bio[field] : '';
        
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-4">
                    <div class="flex justify-between items-center border-b border-[#333] pb-1">
                        <label class="label-text text-[#d4af37] w-1/3">Scales / Fur / Skin</label>
                        <input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="Skin" value="${getVal('Skin')}">
                    </div>
                    <div class="flex justify-between items-center border-b border-[#333] pb-1">
                        <label class="label-text text-[#d4af37] w-1/3">Eye Color</label>
                        <input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="Eyes" value="${getVal('Eyes')}">
                    </div>
                    <div class="flex justify-between items-center border-b border-[#333] pb-1">
                        <label class="label-text text-[#d4af37] w-1/3">Height / Length</label>
                        <input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="Height" value="${getVal('Height')}">
                    </div>
                    <div class="flex justify-between items-center border-b border-[#333] pb-1">
                        <label class="label-text text-[#d4af37] w-1/3">Weight</label>
                        <input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="Weight" value="${getVal('Weight')}">
                    </div>
                     <div class="flex justify-between items-center border-b border-[#333] pb-1">
                        <label class="label-text text-[#d4af37] w-1/3">Sex</label>
                        <input type="text" class="npc-bio w-2/3 bg-transparent text-white text-xs text-right focus:outline-none" data-field="Sex" value="${getVal('Sex')}">
                    </div>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="label-text text-[#d4af37] mb-2">Description / Markings</label>
                        <textarea id="npc-desc" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${data.bio.Description||''}</textarea>
                    </div>
                    <div>
                        <label class="label-text text-[#d4af37] mb-2">Behavior Notes</label>
                        <textarea id="npc-notes" class="w-full h-32 bg-transparent border border-[#444] text-white p-2 text-xs focus:border-[#d4af37] outline-none resize-none">${data.bio.Notes||''}</textarea>
                    </div>
                </div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const specEl = parent.querySelector('#npc-species');
        const weapEl = parent.querySelector('#npc-nat-weapons');
        const ghoulEl = parent.querySelector('#npc-ghoul-toggle');
        
        // --- SPECIES SELECTION LOGIC ---
        if (specEl) specEl.onchange = (e) => {
            const s = e.target.value;
            data.species = s;
            
            if (SPECIES_DB[s]) {
                const stats = SPECIES_DB[s];
                
                // 1. Attributes
                data.attributes = JSON.parse(JSON.stringify(stats.attr));
                
                // 2. Abilities (Reset then fill)
                data.abilities = JSON.parse(JSON.stringify(stats.abil));
                
                // 3. Willpower
                data.willpower = stats.wp;
                if (data.ghouled) data.willpower += 1; 

                // 4. Blood Pool
                data.bloodPool = stats.bp;
                if (data.ghouled && data.bloodPool < 2) data.bloodPool = 2;

                // 5. Notes
                data.naturalWeapons = stats.note;
                if (weapEl) weapEl.value = stats.note;
            }
            updateCallback(); 
        };

        // --- GHOUL TOGGLE LOGIC ---
        if (ghoulEl) ghoulEl.onchange = (e) => {
            data.ghouled = e.target.checked;
            
            if (data.ghouled) {
                if (!data.disciplines.Potence) data.disciplines.Potence = 1;
                if (data.bloodPool < 2) data.bloodPool = 2;
                data.willpower = (data.willpower || 1) + 1;
            } else {
                if (data.disciplines.Potence === 1) delete data.disciplines.Potence;
                if (data.willpower > 1) data.willpower -= 1;
                
                if (data.species && SPECIES_DB[data.species]) {
                    data.bloodPool = SPECIES_DB[data.species].bp;
                } else {
                    if (data.bloodPool > 1) data.bloodPool = 1;
                }
            }
            updateCallback(); 
        };

        if (weapEl) weapEl.onchange = (e) => data.naturalWeapons = e.target.value;
    },

    getPriorities: () => ({ attr: [], abil: [] }), // No priority validation for beasts

    getVirtueLimit: () => 0, 

    validateChange: (type, key, newVal, currentVal) => {
        // STRICT LOCK: Animal stats are fixed by species preset in Creation Mode
        // Return a string error message to block the change.
        return "Animal stats are fixed by species preset. Use XP/Freebie Mode to modify.";
    },

    getCost: (mode, type, key, current, target, data) => {
        const delta = target - current;
        if (delta <= 0) return 0;

        if (mode === 'xp') {
            if (delta > 1) return -1;
            if (type === 'attributes') return target * XP_COSTS.attribute;
            if (type === 'abilities') return (current === 0) ? XP_COSTS.newAbility : target * XP_COSTS.ability;
            if (type === 'willpower') return current * XP_COSTS.willpower;
            if (type === 'disciplines') return current * XP_COSTS.discipline_phys;
        } 
        else if (mode === 'freebie') {
            let mult = 0;
            if (type === 'attributes') mult = FB_COSTS.attribute;
            else if (type === 'abilities') mult = FB_COSTS.ability;
            else if (type === 'willpower') mult = FB_COSTS.willpower;
            else if (type === 'disciplines') mult = FB_COSTS.discipline;
            
            return delta * mult;
        }
        return 0;
    }
};
