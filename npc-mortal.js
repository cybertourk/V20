import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS 
} from "./data.js";

// --- CONSTANTS ---
const XP_COSTS = {
    attribute: 4,       
    ability: 2,         
    newAbility: 3,      
    virtue: 2,          
    willpower: 1,       
    humanity: 2,        
    background: 3        
};

const FB_COSTS = {
    attribute: 5,
    ability: 2,
    background: 1,
    virtue: 2,
    humanity: 1,
    willpower: 1
};

const PRIORITY_SPREADS = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

// --- TEMPLATE DEFINITION ---
export const MortalTemplate = {
    type: "Mortal",
    label: "Mortal",
    
    // Feature Flags to toggle UI sections
    features: {
        disciplines: false,
        bloodPool: false, // Mortals have blood, but don't spend it like Vamps
        virtues: true,
        backgrounds: true
    },

    defaults: {
        type: "Mortal",
        concept: "",
        nature: "",
        demeanor: "",
        virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
        humanity: 1,
        willpower: 1
    },

    // HTML for Step 1 Extras (Occupation, etc.)
    renderIdentityExtras: (data) => {
        return `
            <div class="space-y-6">
                <div>
                    <label class="label-text text-[#d4af37]">Occupation / Role</label>
                    <input type="text" id="npc-occupation" value="${data.occupation || ''}" class="npc-input w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] outline-none transition-colors" placeholder="e.g. Detective, Bystander, Vessel">
                </div>
                <div class="p-4 bg-blue-900/10 border border-blue-900/30 rounded">
                    <div class="text-[10px] text-blue-300 mb-1 font-bold uppercase"><i class="fas fa-info-circle mr-1"></i> Mortal Rules</div>
                    <p class="text-[9px] text-gray-400">Mortals do not possess Disciplines or a Blood Pool for spending. They generate 7 Virtue dots and 21 Freebie points by default.</p>
                </div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const occEl = parent.querySelector('#npc-occupation');
        if (occEl) occEl.onchange = (e) => data.occupation = e.target.value;
    },

    getPriorities: () => PRIORITY_SPREADS,

    getVirtueLimit: (data) => 7,

    validateChange: (type, key, newVal, currentVal, data, priorities) => {
        const delta = newVal - currentVal;
        
        if (type === 'attributes') {
            let group = null;
            if (ATTRIBUTES.Physical.includes(key)) group = 'Physical';
            else if (ATTRIBUTES.Social.includes(key)) group = 'Social';
            else if (ATTRIBUTES.Mental.includes(key)) group = 'Mental';

            if (!group) return true;
            const limit = priorities.attr[group];
            if (limit === null) return "Select Priority for this Attribute group.";
            
            let spent = 0;
            ATTRIBUTES[group].forEach(k => spent += Math.max(0, (data.attributes[k] || 1) - 1));
            if (spent + delta > limit) return `Limit ${limit} dots for ${group} Attributes.`;
        }

        if (type === 'abilities') {
            let group = null;
            if (ABILITIES.Talents.includes(key)) group = 'Talents';
            else if (ABILITIES.Skills.includes(key)) group = 'Skills';
            else if (ABILITIES.Knowledges.includes(key)) group = 'Knowledges';

            if (!group) return true;
            if (newVal > 3) return "Abilities capped at 3 during creation.";
            
            const limit = priorities.abil[group];
            if (limit === null) return "Select Priority for this Ability group.";

            let spent = 0;
            const list = (group === 'Talents') ? ABILITIES.Talents : (group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
            list.forEach(k => spent += (data.abilities[k] || 0));
            if (spent + delta > limit) return `Limit ${limit} dots for ${group}.`;
        }

        if (type === 'backgrounds') {
            let total = 0;
            Object.values(data.backgrounds).forEach(v => total += v);
            if (total + delta > 5) return "Creation Limit: 5 Dots in Backgrounds.";
        }

        if (type === 'virtues') {
            let total = 0;
            VIRTUES.forEach(v => total += Math.max(0, (data.virtues[v] || 1) - 1));
            if (total + delta > 7) return "Creation Limit: 7 Dots in Virtues.";
        }

        return true;
    },

    getCost: (mode, type, key, current, target, data) => {
        const delta = target - current;
        if (delta <= 0) return 0;

        if (mode === 'xp') {
            if (delta > 1) return -1;
            
            if (type === 'attributes') return target * XP_COSTS.attribute;
            if (type === 'abilities') return (current === 0) ? XP_COSTS.newAbility : target * XP_COSTS.ability;
            if (type === 'virtues') return target * XP_COSTS.virtue;
            if (type === 'willpower') return current || 1; 
            if (type === 'humanity') return target * XP_COSTS.humanity;
            if (type === 'backgrounds') return XP_COSTS.background;
        } 
        else if (mode === 'freebie') {
            let mult = 0;
            if (type === 'attributes') mult = FB_COSTS.attribute;
            else if (type === 'abilities') mult = FB_COSTS.ability;
            else if (type === 'virtues') mult = FB_COSTS.virtue;
            else if (type === 'willpower') mult = FB_COSTS.willpower;
            else if (type === 'humanity') mult = FB_COSTS.humanity;
            else if (type === 'backgrounds') mult = FB_COSTS.background;
            
            return delta * mult;
        }
        return 0;
    }
};
