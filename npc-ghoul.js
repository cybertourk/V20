import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    V20_MERITS_LIST, V20_FLAWS_LIST 
} from "./data.js";

// --- CONSTANTS ---
const REVENANT_FAMILIES = ["Bratovitch", "Grimaldi", "Obertus", "Zantosa"];

const XP_COSTS = {
    attribute: 4,       
    ability: 2,         
    newAbility: 3,      
    virtue: 2,          
    willpower: 1,       
    humanity: 2,        
    discipline_phys: 10, // Celerity, Fortitude, Potence
    discipline_other: 20, 
    background: 3        
};

const FB_COSTS = {
    attribute: 5,
    ability: 2,
    discipline: 10,
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
export const GhoulTemplate = {
    type: "Ghoul",
    label: "Ghoul / Revenant",
    
    // Initial Data Structure
    defaults: {
        type: "Vassal", // Sub-type (Vassal, Independent, Revenant)
        domitor: "", 
        domitorClan: "", 
        family: "", 
        weakness: "",
        disciplines: { Potence: 1 }, // Ghouls always start with Potence
        bloodPool: 10,
        virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
        humanity: 1,
        willpower: 1
    },

    // HTML Snippets for Step 1 (Identity)
    // This allows us to inject Domitor/Family fields only for Ghouls
    renderIdentityExtras: (data, clanOptions) => {
        const revOptions = REVENANT_FAMILIES.map(r => `<option value="${r}">${r}</option>`).join('');
        
        return `
            <div class="space-y-6">
                <div>
                    <label class="label-text text-[#d4af37]">Ghoul Type</label>
                    <select id="npc-subtype" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                        <option value="Vassal" ${data.type === 'Vassal' ? 'selected' : ''} class="bg-black">Vassal (7 Virtue Dots)</option>
                        <option value="Independent" ${data.type === 'Independent' ? 'selected' : ''} class="bg-black">Independent (7 Virtue Dots)</option>
                        <option value="Revenant" ${data.type === 'Revenant' ? 'selected' : ''} class="bg-black">Revenant (5 Virtue Dots)</option>
                    </select>
                </div>
                
                <!-- Domitor Clan (Hidden for Revenants) -->
                <div id="div-extra-clan" class="${data.type === 'Revenant' ? 'hidden' : 'block'}">
                    <label class="label-text text-[#d4af37]">Domitor Clan</label>
                    <select id="npc-extra-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                        <option value="" class="bg-black">Unknown/None</option>
                        ${clanOptions}
                    </select>
                </div>

                <!-- Revenant Family (Hidden for others) -->
                <div id="div-extra-family" class="${data.type === 'Revenant' ? 'block' : 'hidden'}">
                    <label class="label-text text-[#d4af37]">Revenant Family</label>
                    <select id="npc-extra-family" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                        <option value="" class="bg-black">Select Family...</option>
                        ${revOptions}
                    </select>
                </div>

                <!-- Weakness Box -->
                <div class="mt-4 p-4 bg-red-900/10 border border-red-900/30 rounded">
                    <label class="label-text text-red-400">Weakness (Conditional)</label>
                    <textarea id="npc-weakness" class="w-full h-20 bg-transparent border-b border-[#444] text-white p-1 text-xs focus:border-red-500 focus:outline-none transition-colors" placeholder="Enter specific weakness details...">${data.weakness || ''}</textarea>
                </div>
            </div>
        `;
    },

    // Handle events for the specific HTML above
    setupListeners: (parent, data, updateCallback) => {
        const subtypeEl = parent.querySelector('#npc-subtype');
        const clanEl = parent.querySelector('#npc-extra-clan');
        const famEl = parent.querySelector('#npc-extra-family');
        const weakEl = parent.querySelector('#npc-weakness');

        if (subtypeEl) {
            subtypeEl.onchange = (e) => {
                data.type = e.target.value;
                const isRevenant = data.type === 'Revenant';
                
                const divClan = parent.querySelector('#div-extra-clan');
                const divFam = parent.querySelector('#div-extra-family');
                if(divClan) divClan.className = isRevenant ? 'hidden' : 'block';
                if(divFam) divFam.className = isRevenant ? 'block' : 'hidden';

                updateCallback(); // Triggers UI refresh for Virtue limits etc.
            };
        }
        if (clanEl) clanEl.onchange = (e) => data.domitorClan = e.target.value;
        if (famEl) famEl.onchange = (e) => data.family = e.target.value;
        if (weakEl) weakEl.onchange = (e) => data.weakness = e.target.value;
    },

    // --- LOGIC ---

    getPriorities: () => PRIORITY_SPREADS,

    getVirtueLimit: (data) => {
        return data.type === 'Revenant' ? 5 : 7;
    },

    // Check if a change is valid based on Creation Rules
    validateChange: (type, key, newVal, currentVal, data, priorities) => {
        const delta = newVal - currentVal;
        
        // Attributes
        if (type === 'attributes') {
            let group = null;
            if (ATTRIBUTES.Physical.includes(key)) group = 'Physical';
            else if (ATTRIBUTES.Social.includes(key)) group = 'Social';
            else if (ATTRIBUTES.Mental.includes(key)) group = 'Mental';

            if (!group) return true;
            const limit = priorities.attr[group];
            if (limit === null) return "Please select a priority for this Attribute group.";
            
            let spent = 0;
            ATTRIBUTES[group].forEach(k => spent += Math.max(0, (data.attributes[k] || 1) - 1));
            if (spent + delta > limit) return `Cannot exceed ${limit} dots for ${group} Attributes.`;
        }

        // Abilities
        if (type === 'abilities') {
            let group = null;
            if (ABILITIES.Talents.includes(key)) group = 'Talents';
            else if (ABILITIES.Skills.includes(key)) group = 'Skills';
            else if (ABILITIES.Knowledges.includes(key)) group = 'Knowledges';

            if (!group) return true;
            if (newVal > 3) return "Abilities are capped at 3 dots during creation.";
            
            const limit = priorities.abil[group];
            if (limit === null) return "Please select a priority for this Ability group.";

            let spent = 0;
            const list = (group === 'Talents') ? ABILITIES.Talents : (group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
            list.forEach(k => spent += (data.abilities[k] || 0));
            if (spent + delta > limit) return `Cannot exceed ${limit} dots for ${group}.`;
        }

        // Advantages
        if (type === 'disciplines') {
            let total = 0;
            Object.values(data.disciplines).forEach(v => total += v);
            // 2 Dots total (Potence 1 + 1 Free)
            if (total + delta > 2) return "Creation Limit: 1 Free Dot + Potence 1 (Total 2).";
        }
        if (type === 'backgrounds') {
            let total = 0;
            Object.values(data.backgrounds).forEach(v => total += v);
            if (total + delta > 5) return "Creation Limit: 5 Dots in Backgrounds.";
        }

        // Virtues
        if (type === 'virtues') {
            let total = 0;
            VIRTUES.forEach(v => total += Math.max(0, (data.virtues[v] || 1) - 1));
            const limit = (data.type === 'Revenant') ? 5 : 7;
            if (total + delta > limit) return `Creation Limit: ${limit} Dots in Virtues.`;
        }

        return true; // Valid
    },

    // Calculate Costs for XP/Freebies
    getCost: (mode, type, key, current, target, data) => {
        const delta = target - current;
        if (delta <= 0) return 0;

        if (mode === 'xp') {
            // Incremental cost for XP
            if (delta > 1) return -1; // Can only buy 1 dot at a time usually
            
            if (type === 'attributes') return target * XP_COSTS.attribute;
            if (type === 'abilities') return (current === 0) ? XP_COSTS.newAbility : target * XP_COSTS.ability;
            if (type === 'virtues') return target * XP_COSTS.virtue;
            if (type === 'willpower') return current || 1; 
            if (type === 'humanity') return target * XP_COSTS.humanity;
            if (type === 'backgrounds') return XP_COSTS.background;
            if (type === 'disciplines') {
                const phys = ['Celerity', 'Fortitude', 'Potence'];
                return phys.includes(key) ? target * XP_COSTS.discipline_phys : target * XP_COSTS.discipline_other;
            }
        } 
        else if (mode === 'freebie') {
            // Bulk cost for Freebies
            let mult = 0;
            if (type === 'attributes') mult = FB_COSTS.attribute;
            else if (type === 'abilities') mult = FB_COSTS.ability;
            else if (type === 'virtues') mult = FB_COSTS.virtue;
            else if (type === 'willpower') mult = FB_COSTS.willpower;
            else if (type === 'humanity') mult = FB_COSTS.humanity;
            else if (type === 'backgrounds') mult = FB_COSTS.background;
            else if (type === 'disciplines') mult = FB_COSTS.discipline;
            
            return delta * mult;
        }
        return 0;
    }
};
