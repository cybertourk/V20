import { 
    ATTRIBUTES, ABILITIES 
} from "./data.js";

// V20 Animals typically don't track XP/Freebies strictly like PCs, 
// but we provide costs for editing consistency.
const XP_COSTS = {
    attribute: 5,       
    ability: 3,         
    willpower: 2,       
    discipline_phys: 15 // In case of Ghouled Animal
};

const FB_COSTS = {
    attribute: 5,
    ability: 2,
    willpower: 1,
    discipline: 10
};

// Animals don't use standard priority spreads usually, 
// but we define a flattened one for the "Creation" logic validation.
const PRIORITY_SPREADS = {
    attr: [7, 5, 3], // Generic strong/avg/weak spread
    abil: [13, 9, 5]
};

export const AnimalTemplate = {
    type: "Animal",
    label: "Animal / Beast",
    
    features: {
        disciplines: false, // Hidden by default (unless ghouled checkbox added later)
        bloodPool: false,
        virtues: false,     // Animals use Willpower, rarely Virtues
        backgrounds: false,
        humanity: false     // Animals do not have Humanity
    },

    defaults: {
        type: "Animal",
        species: "",
        concept: "Beast",
        nature: "Feral", // Placeholder
        demeanor: "Feral",
        attributes: { 
            Strength: 2, Dexterity: 3, Stamina: 3, 
            Charisma: 1, Manipulation: 1, Appearance: 1, 
            Perception: 3, Intelligence: 1, Wits: 3 
        },
        abilities: {
            Alertness: 2, Athletics: 2, Brawl: 2, Intimidation: 2, Stealth: 2, Survival: 2
        },
        willpower: 3,
        health: 7
    },

    renderIdentityExtras: (data) => {
        return `
            <div class="space-y-6">
                <div>
                    <label class="label-text text-[#d4af37]">Species</label>
                    <input type="text" id="npc-species" value="${data.species || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none transition-colors" placeholder="e.g. Wolf, Bat, Horse">
                </div>
                <div>
                    <label class="label-text text-[#d4af37]">Natural Weapons</label>
                    <textarea id="npc-nat-weapons" class="npc-input w-full h-16 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-[#d4af37] outline-none transition-colors" placeholder="e.g. Claws (Str+1 Agg), Bite (Str+1 Lethal)">${data.naturalWeapons || ''}</textarea>
                </div>
                <div class="p-4 bg-green-900/10 border border-green-900/30 rounded">
                    <div class="text-[10px] text-green-300 mb-1 font-bold uppercase"><i class="fas fa-paw mr-1"></i> Beast Rules</div>
                    <p class="text-[9px] text-gray-400">Animals rely on Physical Attributes and specific Abilities. They do not track Humanity or Virtues. Willpower is their primary drive trait.</p>
                </div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const specEl = parent.querySelector('#npc-species');
        const weapEl = parent.querySelector('#npc-nat-weapons');
        
        if (specEl) specEl.onchange = (e) => data.species = e.target.value;
        if (weapEl) weapEl.onchange = (e) => data.naturalWeapons = e.target.value;
    },

    getPriorities: () => PRIORITY_SPREADS,

    getVirtueLimit: () => 0, // Not used

    validateChange: (type, key, newVal, currentVal, data, priorities) => {
        // Animals are loose on rules; allow most changes in creation mode
        // unless explicitly negative
        if (newVal < 0) return false;
        
        // Cap Attributes/Abilities at 5 normally, though some ancient beasts might exceed
        if ((type === 'attributes' || type === 'abilities') && newVal > 5) return "Standard limit is 5.";

        return true; 
    },

    getCost: (mode, type, key, current, target, data) => {
        const delta = target - current;
        if (delta <= 0) return 0;

        if (mode === 'xp') {
            if (delta > 1) return -1;
            if (type === 'attributes') return target * XP_COSTS.attribute;
            if (type === 'abilities') return (current === 0) ? XP_COSTS.newAbility : target * XP_COSTS.ability;
            if (type === 'willpower') return current || 1;
        } 
        else if (mode === 'freebie') {
            let mult = 0;
            if (type === 'attributes') mult = FB_COSTS.attribute;
            else if (type === 'abilities') mult = FB_COSTS.ability;
            else if (type === 'willpower') mult = FB_COSTS.willpower;
            
            return delta * mult;
        }
        return 0;
    }
};
