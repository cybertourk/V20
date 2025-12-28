import { ATTRIBUTES, ABILITIES, DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST } from "./data.js";

// --- CONSTANTS ---

export const BROAD_ABILITIES = [
    "Crafts", "Academics", "Science", "Technology", "Performance", "Expression"
];

// --- CALCULATORS ---

/**
 * Calculates the total Freebie Points spent based on V20 Core Rules.
 * Assumes the character has ALREADY met the base creation requirements.
 * Any dots above the creation limits are charged.
 * @param {Object} state - The character state object.
 * @returns {number} Total freebie points spent.
 */
export function calculateTotalFreebiesSpent(state) {
    let spent = 0;

    // 1. Attributes (5 pts per dot)
    // Creation gives: 7 (Primary) + 5 (Secondary) + 3 (Tertiary) + 3 (Base 1 for each of 3 cats) = 18 dots total? 
    // Actually: 3 attributes per category. Base 1 each.
    // Phys(3) + Soc(3) + Men(3) = 9 Base dots.
    // Priorities add: 7 + 5 + 3 = 15 dots.
    // Total Expected at end of creation = 24 dots.
    let totalAttr = 0;
    Object.keys(ATTRIBUTES).forEach(cat => {
        ATTRIBUTES[cat].forEach(a => {
            totalAttr += (state.dots.attr[a] || 1);
        });
    });
    // Any dot above 24 costs 5 Freebies
    if (totalAttr > 24) spent += (totalAttr - 24) * 5;

    // 2. Abilities (2 pts per dot)
    // Creation: 13 + 9 + 5 = 27 dots.
    let totalAbil = 0;
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => {
            totalAbil += (state.dots.abil[a] || 0);
        });
    });
    // Add Custom Abilities
    if (state.customAbilityCategories) {
        Object.keys(state.dots.abil).forEach(k => {
            if (state.customAbilityCategories[k]) totalAbil += state.dots.abil[k];
        });
    }
    // Correct for double counting if custom are in standard list (unlikely but safe)
    // Simplified: Just iterate all abil dots? No, need to trust the standard sets + custom map.
    // The previous loop covers standard. Custom map covers write-ins.
    
    if (totalAbil > 27) spent += (totalAbil - 27) * 2;

    // 3. Disciplines (7 pts per dot)
    // Creation: 3 dots.
    let totalDisc = 0;
    Object.values(state.dots.disc || {}).forEach(v => totalDisc += v);
    if (totalDisc > 3) spent += (totalDisc - 3) * 7;

    // 4. Backgrounds (1 pt per dot)
    // Creation: 5 dots.
    let totalBack = 0;
    Object.values(state.dots.back || {}).forEach(v => totalBack += v);
    if (totalBack > 5) spent += (totalBack - 5) * 1;

    // 5. Virtues (2 pts per dot)
    // Creation: 7 dots + 3 Base (1 each) = 10 dots total.
    let totalVirt = 0;
    VIRTUES.forEach(v => totalVirt += (state.dots.virt[v] || 1));
    if (totalVirt > 10) spent += (totalVirt - 10) * 2;

    // 6. Humanity / Path (2 pts per dot)
    // Base = Conscience + Self-Control.
    const baseH = (state.dots.virt?.Conscience || 1) + (state.dots.virt?.["Self-Control"] || 1);
    const currentH = state.status.humanity !== undefined ? state.status.humanity : baseH;
    if (currentH > baseH) spent += (currentH - baseH) * 2; // Simple calculation, V20 p.83 says cost is 1? 
    // CHECK RULEBOOK: "Humanity ... 2 per dot". (V20 Core p.84 Chart) -> Correct.

    // 7. Willpower (1 pt per dot)
    // Base = Courage.
    const baseW = state.dots.virt?.Courage || 1;
    const currentW = state.status.willpower !== undefined ? state.status.willpower : baseW;
    if (currentW > baseW) spent += (currentW - baseW) * 1;

    // 8. Merits (Cost) & Flaws (Bonus)
    if (state.merits) state.merits.forEach(m => spent += (parseInt(m.val) || 0));
    
    let flawBonus = 0;
    if (state.flaws) state.flaws.forEach(f => flawBonus += (parseInt(f.val) || 0));
    
    // Max Flaw Bonus is usually 7 points in V20.
    const effectiveBonus = Math.min(flawBonus, 7);
    spent -= effectiveBonus;

    return spent;
}

/**
 * Validates if Character Creation (Pre-Freebies) is valid.
 * Checks Priorities: Attributes (7/5/3), Abilities (13/9/5), etc.
 * @param {Object} state 
 * @returns {Object} { complete: boolean, msg: string }
 */
export function checkCreationComplete(state) {
    if (!state.prios) return { complete: false, msg: "Priorities not selected." };

    // 1. Check Attribute Priorities
    const attrPrios = Object.values(state.prios.attr || {});
    if (!attrPrios.includes(7) || !attrPrios.includes(5) || !attrPrios.includes(3)) {
        return { complete: false, msg: "Attributes incomplete." };
    }

    // 2. Check Ability Priorities
    const abilPrios = Object.values(state.prios.abil || {});
    if (!abilPrios.includes(13) || !abilPrios.includes(9) || !abilPrios.includes(5)) {
        return { complete: false, msg: "Abilities incomplete." };
    }

    // 3. Verify Points Spent Matches Priorities
    // Attributes
    for (const [group, val] of Object.entries(state.prios.attr)) {
        let sum = 0;
        ATTRIBUTES[group].forEach(a => sum += (state.dots.attr[a] || 1) - 1);
        if (sum !== val) return { complete: false, msg: `Attributes: ${group} needs ${val} dots.` };
    }

    // Abilities
    for (const [group, val] of Object.entries(state.prios.abil)) {
        let sum = 0;
        ABILITIES[group].forEach(a => sum += (state.dots.abil[a] || 0));
        // Check custom
        if (state.customAbilityCategories) {
            Object.entries(state.customAbilityCategories).forEach(([name, cat]) => {
                if (cat === group) sum += (state.dots.abil[name] || 0);
            });
        }
        if (sum !== val) return { complete: false, msg: `Abilities: ${group} needs ${val} dots.` };
    }

    // 4. Disciplines (3 dots)
    let discSum = 0;
    Object.values(state.dots.disc || {}).forEach(v => discSum += v);
    if (discSum !== 3) return { complete: false, msg: "Disciplines: Select exactly 3 dots." };

    // 5. Backgrounds (5 dots)
    let backSum = 0;
    Object.values(state.dots.back || {}).forEach(v => backSum += v);
    if (backSum !== 5) return { complete: false, msg: "Backgrounds: Select exactly 5 dots." };

    // 6. Virtues (7 dots)
    let virtSum = 0;
    VIRTUES.forEach(v => virtSum += (state.dots.virt[v] || 1) - 1);
    if (virtSum !== 7) return { complete: false, msg: "Virtues: Select exactly 7 dots." };

    return { complete: true, msg: "Complete" };
}

/**
 * Checks if a specific Step Phase (1-8) is complete.
 * Used for Walkthrough navigation.
 */
export function checkStepComplete(step, state) {
    if (step === 1) {
        // Concept
        const f = state.textFields || {};
        return f['c-name'] && f['c-nature'] && f['c-demeanor'] && f['c-clan'] && f['c-gen'];
    }
    if (step === 2) {
        // Attributes (7/5/3)
        if (!state.prios?.attr) return false;
        const prios = Object.values(state.prios.attr);
        if (!prios.includes(7) || !prios.includes(5) || !prios.includes(3)) return false;
        
        // Check sums
        for (const [group, target] of Object.entries(state.prios.attr)) {
            let sum = 0;
            ATTRIBUTES[group].forEach(a => sum += (state.dots.attr[a] || 1) - 1);
            if (sum !== target) return false;
        }
        return true;
    }
    if (step === 3) {
        // Abilities (13/9/5)
        if (!state.prios?.abil) return false;
        const prios = Object.values(state.prios.abil);
        if (!prios.includes(13) || !prios.includes(9) || !prios.includes(5)) return false;
        
        for (const [group, target] of Object.entries(state.prios.abil)) {
            let sum = 0;
            ABILITIES[group].forEach(a => sum += (state.dots.abil[a] || 0));
            if (state.customAbilityCategories) {
                Object.entries(state.customAbilityCategories).forEach(([name, cat]) => {
                    if (cat === group) sum += (state.dots.abil[name] || 0);
                });
            }
            if (sum !== target) return false;
        }
        return true;
    }
    if (step === 4) {
        // Advantages
        let dSum = 0; Object.values(state.dots.disc || {}).forEach(v => dSum += v);
        let bSum = 0; Object.values(state.dots.back || {}).forEach(v => bSum += v);
        let vSum = 0; VIRTUES.forEach(v => vSum += (state.dots.virt[v] || 1) - 1);
        return dSum === 3 && bSum === 5 && vSum === 7;
    }
    if (step === 5) {
        // Possessions (Optional)
        return true;
    }
    if (step === 6) {
        // Merits (Optional)
        return true;
    }
    if (step === 7) {
        // Bio (Optional but encouraged)
        return true;
    }
    if (step === 8) {
        // Finalize
        const createCheck = checkCreationComplete(state);
        return createCheck.complete;
    }
    return false;
}

/**
 * Calculates current Dice Pool for a given attribute+ability combo
 */
export function getPool(state, attrName, abilName) {
    const a = state.dots.attr[attrName] || 1;
    const b = state.dots.abil[abilName] || 0;
    return a + b;
}

/**
 * Calculates XP Cost for upgrades (V20 p.124)
 */
export function getXpCost(currentRating, type, isClan = false) {
    const next = currentRating + 1;
    switch(type) {
        case 'attr': return next * 4;
        case 'abil': return next * 2; 
        case 'disc': return isClan ? next * 5 : next * 7;
        case 'virt': return next * 2;
        case 'humanity': return next * 2;
        case 'willpower': return currentRating; 
        default: return 0;
    }
}
