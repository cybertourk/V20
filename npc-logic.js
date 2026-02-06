import { ATTRIBUTES, ABILITIES, VIRTUES } from "./data.js";

// ==========================================================================
// DATA SANITIZATION
// ==========================================================================

/**
 * Ensure all necessary NPC data structures exist.
 * Fixes legacy data issues (e.g. converting health numbers to objects).
 */
export function sanitizeNpcData(npc) {
    // 1. Ensure basic container objects exist
    const keys = ['attributes', 'abilities', 'disciplines', 'backgrounds', 'virtues', 'specialties', 'merits', 'flaws', 'bio'];
    keys.forEach(k => { 
        if (!npc[k]) npc[k] = {}; 
    });

    // 2. Ensure Logs exist
    if (!npc.experience) npc.experience = { total: 0, spent: 0, log: [] };
    if (!npc.freebieLog) npc.freebieLog = []; 
    
    // 3. Ensure Attributes/Abilities have defaults (unless Animal which has specific defaults)
    if (npc.template !== 'animal') {
        if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (npc.attributes[a] === undefined) npc.attributes[a] = 1; });
        if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (npc.abilities[a] === undefined) npc.abilities[a] = 0; });
    }
    
    // 4. FIX: Ensure Health is an Object (Legacy Support)
    // Old animal templates might have saved health as a number (e.g., 7)
    if (!npc.health || typeof npc.health !== 'object') {
        npc.health = { damage: 0, aggravated: 0 }; 
    }
    
    // 5. Ensure Pools exist
    if (npc.tempWillpower === undefined) npc.tempWillpower = npc.willpower || 1;
    if (npc.currentBlood === undefined) npc.currentBlood = npc.bloodPool || 10;
    
    // 6. Ensure Inventory
    if (!npc.inventory || !Array.isArray(npc.inventory)) npc.inventory = [];
    
    return npc;
}

// ==========================================================================
// STATUS RECALCULATION
// ==========================================================================

export function recalcStatus(npc) {
    if (npc.template === 'animal') return; // Animals don't derive logic the same way

    const baseHum = (npc.virtues.Conscience || 1) + (npc.virtues["Self-Control"] || 1);
    const baseWill = npc.virtues.Courage || 1;
    
    const hasHumMod = npc.experience?.log.some(l => l.type === 'humanity' || l.trait === 'Humanity') || npc.freebieLog?.some(l => l.type === 'humanity' || l.trait === 'humanity');
    const hasWillMod = npc.experience?.log.some(l => l.type === 'willpower' || l.trait === 'Willpower') || npc.freebieLog?.some(l => l.type === 'willpower' || l.trait === 'willpower');

    if (!hasHumMod) npc.humanity = baseHum;
    else if (npc.humanity < baseHum) npc.humanity = baseHum;

    if (!hasWillMod) npc.willpower = baseWill;
    else if (npc.willpower < baseWill) npc.willpower = baseWill;
}

// ==========================================================================
// PRIORITY DETECTION
// ==========================================================================

export function autoDetectPriorities(npc, template, prioritiesObj) {
    // Reset
    prioritiesObj.attr = { Physical: null, Social: null, Mental: null };
    prioritiesObj.abil = { Talents: null, Skills: null, Knowledges: null };

    // Safety check for template
    if (!template || !template.getPriorities) return;

    const pConfig = template.getPriorities();
    if (!pConfig) return; // Template has no priorities defined (e.g. Custom/Freeform/Animal)

    const sumGroup = (cat, groupList, isAttr) => {
        let sum = 0;
        if (!groupList) return 0;
        groupList.forEach(k => {
            const val = isAttr ? (npc.attributes[k] || 1) : (npc.abilities[k] || 0);
            sum += isAttr ? Math.max(0, val - 1) : val;
        });
        return sum;
    };

    ['attr', 'abil'].forEach(cat => {
        // CRITICAL FIX: Check if priority array exists for this category before iterating
        if (!pConfig[cat] || !Array.isArray(pConfig[cat])) return;

        const groups = cat === 'attr' ? ['Physical', 'Social', 'Mental'] : ['Talents', 'Skills', 'Knowledges'];
        const sums = groups.map(g => ({ 
            grp: g, 
            val: sumGroup(cat, cat === 'attr' ? ATTRIBUTES[g] : ABILITIES[g], cat === 'attr') 
        })).sort((a, b) => b.val - a.val);

        sums.forEach((item, idx) => {
            if (pConfig[cat][idx] !== undefined) {
                prioritiesObj[cat][item.grp] = pConfig[cat][idx];
            }
        });
    });
}

// ==========================================================================
// FREEBIE LOGIC
// ==========================================================================

export function getFreebiesAvailable(npc) {
    let spent = 0;
    npc.freebieLog.forEach(l => spent += l.cost);
    return 21 - spent;
}

export function calculateMarginalFreebieCost(type, key, startVal, endVal, npc, priorities, template, simulatedVal = null) {
    let group = null;
    let cap = 0;
    let spent = 0;

    // Attributes & Abilities
    if (type === 'attributes' || type === 'abilities') {
        const list = (type === 'attributes') ? ATTRIBUTES : ABILITIES;
        if (list.Physical && list.Physical.includes(key)) group = 'Physical';
        else if (list.Social && list.Social.includes(key)) group = 'Social';
        else if (list.Mental && list.Mental.includes(key)) group = 'Mental';
        else if (list.Talents && list.Talents.includes(key)) group = 'Talents';
        else if (list.Skills && list.Skills.includes(key)) group = 'Skills';
        else if (list.Knowledges && list.Knowledges.includes(key)) group = 'Knowledges';

        if (group) {
            const prioSet = (type === 'attributes') ? priorities.attr : priorities.abil;
            cap = prioSet[group] || 0;
            const groupList = list[group];
            groupList.forEach(k => {
                let v = (npc[type][k] || (type === 'attributes' ? 1 : 0));
                if (simulatedVal !== null && k === key) v = simulatedVal;
                
                if (type === 'attributes') spent += Math.max(0, v - 1);
                else spent += v;
            });
        }
    }
    // Disciplines
    else if (type === 'disciplines') {
        cap = 2; // Standard suggestion for NPCs
        Object.keys(npc.disciplines).forEach(k => {
            let v = npc.disciplines[k];
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += v;
        });
    }
    // Backgrounds
    else if (type === 'backgrounds') {
        cap = 5;
        Object.keys(npc.backgrounds).forEach(k => {
            let v = npc.backgrounds[k];
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += v;
        });
    }
    // Virtues
    else if (type === 'virtues') {
        cap = template.getVirtueLimit(npc);
        VIRTUES.forEach(k => {
            let v = (npc.virtues[k] || 1);
            if (simulatedVal !== null && k === key) v = simulatedVal;
            spent += Math.max(0, v - 1);
        });
    }
    // Humanity
    else if (type === 'humanity') {
        cap = (npc.virtues.Conscience||1) + (npc.virtues["Self-Control"]||1);
        spent = simulatedVal !== null ? simulatedVal : npc.humanity;
    }
    // Willpower
    else if (type === 'willpower') {
        cap = (npc.virtues.Courage||1);
        spent = simulatedVal !== null ? simulatedVal : npc.willpower;
    }

    let currentTraitContrib = 0;
    let currentValForCalc = simulatedVal !== null ? simulatedVal : (key ? npc[type][key] : npc[type]);
    if(type === 'attributes' || type === 'virtues') currentValForCalc = Math.max(0, currentValForCalc - 1);
    
    let baseSpent = spent - currentValForCalc;
    
    let startContrib = type === 'attributes' || type === 'virtues' ? Math.max(0, startVal - 1) : startVal;
    let endContrib = type === 'attributes' || type === 'virtues' ? Math.max(0, endVal - 1) : endVal;
    
    let totalStart = baseSpent + startContrib;
    let totalEnd = baseSpent + endContrib;
    
    let overageStart = Math.max(0, totalStart - cap);
    let overageEnd = Math.max(0, totalEnd - cap);
    
    let chargedDots = overageEnd - overageStart;
    
    if (chargedDots > 0) {
        const costPerDot = template.getCost('freebie', type, key, 0, 1, npc);
        return chargedDots * costPerDot;
    }
    
    return 0;
}

export function validateFreebieRefund(type, key, newVal, npc, priorities, template) {
    if (type === 'attributes' || type === 'abilities') {
        let group = null;
        const list = (type === 'attributes') ? ATTRIBUTES : ABILITIES;
        
        if (list.Physical && list.Physical.includes(key)) group = 'Physical';
        else if (list.Social && list.Social.includes(key)) group = 'Social';
        else if (list.Mental && list.Mental.includes(key)) group = 'Mental';
        else if (list.Talents && list.Talents.includes(key)) group = 'Talents';
        else if (list.Skills && list.Skills.includes(key)) group = 'Skills';
        else if (list.Knowledges && list.Knowledges.includes(key)) group = 'Knowledges';

        if (!group) return true;

        const prioSet = (type === 'attributes') ? priorities.attr : priorities.abil;
        const limit = prioSet[group];
        if (limit === null) return true;

        let total = 0;
        const groupList = list[group];
        groupList.forEach(k => {
            const v = (k === key) ? newVal : (npc[type][k] || (type==='attributes'?1:0));
            if (type === 'attributes') total += Math.max(0, (v||1) - 1);
            else total += v;
        });

        return total >= limit;
    }
    if (type === 'disciplines') {
        let total = 0;
        Object.keys(npc.disciplines).forEach(k => {
            const v = (k === key) ? newVal : npc.disciplines[k];
            total += v;
        });
        return total >= 2; 
    }
    if (type === 'backgrounds') {
        let total = 0;
        Object.keys(npc.backgrounds).forEach(k => {
            const v = (k === key) ? newVal : npc.backgrounds[k];
            total += v;
        });
        return total >= 5;
    }
    if (type === 'virtues') {
        let total = 0;
        VIRTUES.forEach(k => {
            const v = (k === key) ? newVal : (npc.virtues[k] || 1);
            total += Math.max(0, v - 1);
        });
        const limit = template.getVirtueLimit(npc);
        return total >= limit;
    }
    if (type === 'humanity') {
        const base = (npc.virtues.Conscience||1) + (npc.virtues["Self-Control"]||1);
        return newVal >= base;
    }
    if (type === 'willpower') {
        const base = (npc.virtues.Courage||1);
        return newVal >= base;
    }
    return true;
}
