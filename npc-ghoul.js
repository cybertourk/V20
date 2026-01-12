import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    CLAN_DISCIPLINES, CLANS 
} from "./data.js";

// --- REVENANT FAMILIES & DISCIPLINES ---
// V20 Core p. 497 mentions Grimaldi and Zantosa. 
// Common V20 Revenant families included for completeness.
const REVENANT_FAMILIES = {
    "Bratovitch": ["Animalism", "Potence", "Vicissitude"],
    "Grimaldi": ["Celerity", "Dominate", "Fortitude"],
    "Obertus": ["Auspex", "Obfuscate", "Vicissitude"],
    "Zantosa": ["Auspex", "Presence", "Vicissitude"]
};

// --- XP COSTS (V20 Ghouls p. 499) ---
const XP_COSTS = {
    attribute: 4,       // Current Rating x 4
    ability: 2,         // Current Rating x 2
    newAbility: 3,      // 3 points for first dot
    virtue: 2,          // Current Rating x 2
    willpower: 1,       // Current Rating
    humanity: 2,        // Current Rating x 2
    background: 3,      // Storyteller discretion (standard 3)
    newDiscipline: 20,  // Flat 20 for new dot
    disc_clan: 15,      // Current Level x 15 (Clan/Family/Phys)
    disc_other: 25      // Current Level x 25
};

// --- FREEBIE COSTS (V20 Ghouls p. 498) ---
const FB_COSTS = {
    attribute: 5,
    ability: 2,
    discipline: 10,
    background: 1,
    virtue: 2,
    humanity: 1,
    willpower: 1
};

// --- CREATION PRIORITIES (V20 p. 498) ---
const PRIORITY_SPREADS = {
    attr: [6, 4, 3], // Start with 1 free dot in each, distribute 6/4/3
    abil: [11, 7, 4] // No ability > 3 at this stage
};

// --- TEMPLATE DEFINITION ---
export const GhoulTemplate = {
    type: "Ghoul",
    label: "Ghoul / Revenant",
    
    features: {
        disciplines: true,
        bloodPool: true,
        virtues: true,
        backgrounds: true,
        humanity: true
    },

    defaults: {
        type: "Vassal", // Vassal, Independent, Revenant
        domitor: "", 
        domitorClan: "", 
        family: "", 
        weakness: "",
        // Ghouls start with Potence 1 automatically (V20 p. 499)
        disciplines: { Potence: 1 }, 
        attributes: { 
            Strength: 1, Dexterity: 1, Stamina: 1, 
            Charisma: 1, Manipulation: 1, Appearance: 1, 
            Perception: 1, Intelligence: 1, Wits: 1 
        },
        abilities: {},
        virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
        humanity: 1,
        willpower: 1,
        bloodPool: 10, // Max capacity (human), though can overdose based on Stamina
        backgrounds: {},
        merits: {},
        flaws: {}
    },

    renderIdentityExtras: (data) => {
        // Generate options locally to ensure 'selected' state is applied correctly
        const revOptions = Object.keys(REVENANT_FAMILIES).map(r => 
            `<option value="${r}" ${data.family === r ? 'selected' : ''}>${r}</option>`
        ).join('');

        const domitorOptions = (CLANS || []).sort().map(c => 
            `<option value="${c}" ${data.domitorClan === c ? 'selected' : ''}>${c}</option>`
        ).join('');
        
        return `
            <div class="space-y-6 border-t border-[#333] pt-4 mt-2">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="label-text text-[#d4af37]">Ghoul Type</label>
                        <select id="npc-subtype" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                            <option value="Vassal" ${data.type === 'Vassal' ? 'selected' : ''} class="bg-black">Vassal (Bound to Master)</option>
                            <option value="Independent" ${data.type === 'Independent' ? 'selected' : ''} class="bg-black">Independent (Masterless)</option>
                            <option value="Revenant" ${data.type === 'Revenant' ? 'selected' : ''} class="bg-black">Revenant (Hereditary)</option>
                        </select>
                    </div>
                    
                    <!-- Domitor Clan (Vassal Only) -->
                    <div id="div-extra-clan" class="${data.type === 'Vassal' ? 'block' : 'hidden'}">
                        <label class="label-text text-[#d4af37]">Domitor's Clan</label>
                        <select id="npc-extra-clan" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                            <option value="" class="bg-black">Unknown / None</option>
                            ${domitorOptions}
                        </select>
                    </div>

                    <!-- Revenant Family (Revenant Only) -->
                    <div id="div-extra-family" class="${data.type === 'Revenant' ? 'block' : 'hidden'}">
                        <label class="label-text text-[#d4af37]">Revenant Family</label>
                        <select id="npc-extra-family" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm font-bold focus:border-[#d4af37] focus:outline-none transition-colors">
                            <option value="" class="bg-black">Select Family...</option>
                            ${revOptions}
                        </select>
                    </div>
                </div>

                <!-- Weakness / Overdose Effect -->
                <div>
                    <label class="label-text text-[#d4af37]">Weakness / Curse</label>
                    <input type="text" id="g-weakness" value="${data.weakness || ''}" placeholder="e.g. Overdose Effect, Clan Weakness, or Family Curse" class="w-full bg-transparent border-b border-[#444] text-white p-1 text-sm focus:border-[#d4af37] focus:outline-none">
                    <p class="text-[9px] text-gray-500 mt-1 italic">Ghouls may inherit mild Clan weaknesses or suffer overdose effects.</p>
                </div>

                <div class="p-4 bg-red-900/10 border border-red-900/30 rounded mt-4">
                    <div class="text-[10px] text-red-300 mb-1 font-bold uppercase"><i class="fas fa-info-circle mr-1"></i> V20 Ghoul Rules</div>
                    <ul class="text-[9px] text-gray-400 list-disc list-inside space-y-1">
                        <li><strong>Attributes:</strong> 6 / 4 / 3</li>
                        <li><strong>Abilities:</strong> 11 / 7 / 4 (Max 3)</li>
                        <li><strong>Disciplines:</strong> Potence 1 + 1 Dot</li>
                        <li><strong>Virtues:</strong> 7 Dots (5 for Revenant)</li>
                        <li><strong>Freebies:</strong> 21 Points</li>
                        <li><strong>XP Costs:</strong> Based on Current Rating.</li>
                    </ul>
                </div>
            </div>
        `;
    },

    setupListeners: (parent, data, updateCallback) => {
        const subtypeEl = parent.querySelector('#npc-subtype');
        const clanEl = parent.querySelector('#npc-extra-clan');
        const famEl = parent.querySelector('#npc-extra-family');
        const weakEl = parent.querySelector('#g-weakness');

        if (subtypeEl) {
            subtypeEl.onchange = (e) => {
                data.type = e.target.value;
                const isRev = data.type === 'Revenant';
                const isVassal = data.type === 'Vassal';
                
                const divClan = parent.querySelector('#div-extra-clan');
                const divFam = parent.querySelector('#div-extra-family');
                if(divClan) divClan.className = isVassal ? 'block' : 'hidden';
                if(divFam) divFam.className = isRev ? 'block' : 'hidden';

                updateCallback(); // Refresh UI for Virtue limits etc.
            };
        }
        if (clanEl) clanEl.onchange = (e) => data.domitorClan = e.target.value;
        if (famEl) famEl.onchange = (e) => data.family = e.target.value;
        if (weakEl) weakEl.onchange = (e) => data.weakness = e.target.value;
    },

    getPriorities: () => PRIORITY_SPREADS,

    getVirtueLimit: (data) => {
        // V20 p. 499: 5 for revenants and Sabbat ghouls, 7 for all others.
        return data.type === 'Revenant' ? 5 : 7;
    },

    validateChange: (type, key, newVal, currentVal, data, priorities) => {
        const delta = newVal - currentVal;
        
        // Attributes (6/4/3)
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

        // Abilities (11/7/4)
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

        // Advantages
        if (type === 'disciplines') {
            let total = 0;
            Object.values(data.disciplines).forEach(v => total += v);
            // 2 Dots total (Potence 1 + 1 Free)
            if (total + delta > 2) return "Limit: Potence 1 + 1 Free Dot. Use Freebie Mode for more.";
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
            const limit = data.type === 'Revenant' ? 5 : 7;
            if (total + delta > limit) return `Creation Limit: ${limit} Dots in Virtues.`;
        }

        return true;
    },

    getCost: (mode, type, key, current, target, data) => {
        const delta = target - current;
        if (delta <= 0) return 0;

        if (mode === 'xp') {
            // Incremental XP cost
            if (delta > 1) return -1; // Buy 1 at a time
            
            // V20 Rules: "Current Rating" multipliers (p. 269 & 500)
            
            if (type === 'attributes') return current * XP_COSTS.attribute;
            
            if (type === 'abilities') {
                return (current === 0) ? XP_COSTS.newAbility : current * XP_COSTS.ability;
            }
            
            if (type === 'virtues') return current * XP_COSTS.virtue;
            if (type === 'willpower') return current * XP_COSTS.willpower; 
            if (type === 'humanity') return current * XP_COSTS.humanity;
            if (type === 'backgrounds') return XP_COSTS.background;
            
            if (type === 'disciplines') {
                if (current === 0) return XP_COSTS.newDiscipline; // 20 for New

                // Determine Multiplier (15 vs 25)
                // Vassal: Domitor's Clan Disciplines = 15.
                // Independent: Celerity, Fortitude, Potence = 15.
                // Revenant: Family Disciplines = 15.
                
                let isFavored = false;
                
                if (data.type === 'Vassal') {
                    const domitorClan = data.domitorClan || "";
                    if (CLAN_DISCIPLINES[domitorClan] && CLAN_DISCIPLINES[domitorClan].includes(key)) {
                        isFavored = true;
                    }
                } else if (data.type === 'Independent') {
                    if (["Celerity", "Fortitude", "Potence"].includes(key)) {
                        isFavored = true;
                    }
                } else if (data.type === 'Revenant') {
                    const family = data.family || "";
                    if (REVENANT_FAMILIES[family] && REVENANT_FAMILIES[family].includes(key)) {
                        isFavored = true;
                    }
                }

                const mult = isFavored ? XP_COSTS.disc_clan : XP_COSTS.disc_other;
                return current * mult;
            }
        } 
        else if (mode === 'freebie') {
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
