import { ATTRIBUTES, ABILITIES, DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST, GEN_LIMITS } from "./data.js";

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
    let totalAttr = 0;
    Object.keys(ATTRIBUTES).forEach(cat => {
        ATTRIBUTES[cat].forEach(a => {
            totalAttr += (state.dots.attr[a] || 1);
        });
    });
    if (totalAttr > 24) spent += (totalAttr - 24) * 5;

    // 2. Abilities (2 pts per dot)
    let totalAbil = 0;
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => {
            totalAbil += (state.dots.abil[a] || 0);
        });
    });
    if (state.customAbilityCategories) {
        Object.keys(state.dots.abil).forEach(k => {
            if (state.customAbilityCategories[k]) totalAbil += state.dots.abil[k];
        });
    }
    
    if (totalAbil > 27) spent += (totalAbil - 27) * 2;

    // 3. Disciplines (7 pts per dot)
    let totalDisc = 0;
    Object.values(state.dots.disc || {}).forEach(v => totalDisc += v);
    if (totalDisc > 3) spent += (totalDisc - 3) * 7;

    // 4. Backgrounds (1 pt per dot)
    let totalBack = 0;
    Object.values(state.dots.back || {}).forEach(v => totalBack += v);
    if (totalBack > 5) spent += (totalBack - 5) * 1;

    // 5. Virtues (2 pts per dot)
    let totalVirt = 0;
    VIRTUES.forEach(v => totalVirt += (state.dots.virt[v] || 1));
    if (totalVirt > 10) spent += (totalVirt - 10) * 2;

    // 6. Humanity / Path (2 pts per dot)
    const baseH = (state.dots.virt?.Conscience || 1) + (state.dots.virt?.["Self-Control"] || 1);
    const currentH = state.status.humanity !== undefined ? state.status.humanity : baseH;
    if (currentH > baseH) spent += (currentH - baseH) * 2;

    // 7. Willpower (1 pt per dot)
    const baseW = state.dots.virt?.Courage || 1;
    const currentW = state.status.willpower !== undefined ? state.status.willpower : baseW;
    if (currentW > baseW) spent += (currentW - baseW) * 1;

    // 8. Merits (Cost) & Flaws (Bonus)
    if (state.merits) state.merits.forEach(m => spent += (parseInt(m.val) || 0));
    
    let flawBonus = 0;
    if (state.flaws) state.flaws.forEach(f => flawBonus += (parseInt(f.val) || 0));
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
    for (const [group, val] of Object.entries(state.prios.attr)) {
        let sum = 0;
        ATTRIBUTES[group].forEach(a => sum += (state.dots.attr[a] || 1) - 1);
        if (sum !== val) return { complete: false, msg: `Attributes: ${group} needs ${val} dots.` };
    }

    for (const [group, val] of Object.entries(state.prios.abil)) {
        let sum = 0;
        ABILITIES[group].forEach(a => sum += (state.dots.abil[a] || 0));
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
        const f = state.textFields || {};
        // Ensure values exist and are strings (specifically for c-gen which might be number 13 or string "13")
        const hasName = f['c-name'] && f['c-name'].trim() !== "";
        const hasClan = f['c-clan'] && f['c-clan'].trim() !== "";
        const hasGen = (f['c-gen'] !== undefined && f['c-gen'] !== null && f['c-gen'] !== "");
        return hasName && hasClan && hasGen;
    }
    if (step === 2) {
        if (!state.prios?.attr) return false;
        const prios = Object.values(state.prios.attr);
        if (!prios.includes(7) || !prios.includes(5) || !prios.includes(3)) return false;
        for (const [group, target] of Object.entries(state.prios.attr)) {
            let sum = 0;
            ATTRIBUTES[group].forEach(a => sum += (state.dots.attr[a] || 1) - 1);
            if (sum !== target) return false;
        }
        return true;
    }
    if (step === 3) {
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
        let dSum = 0; Object.values(state.dots.disc || {}).forEach(v => dSum += v);
        let bSum = 0; Object.values(state.dots.back || {}).forEach(v => bSum += v);
        let vSum = 0; VIRTUES.forEach(v => vSum += (state.dots.virt[v] || 1) - 1);
        return dSum === 3 && bSum === 5 && vSum === 7;
    }
    if (step === 5) return true;
    if (step === 6) return true;
    if (step === 7) return true;
    if (step === 8) {
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
 * Calculates XP Cost for upgrades based on V20 Core p.124
 * @param {number} currentRating - The dot value the character ALREADY has.
 * @param {string} type - 'attr', 'abil', 'disc', 'virt', 'humanity', 'willpower', 'path'
 * @param {boolean} isClan - If the Discipline is in-clan (ignored for Caitiff who use specific rule)
 * @param {boolean} isCaitiff - If the character is Clanless (all Discs cost x6)
 * @returns {number} The cost to buy the NEXT dot.
 */
export function getXpCost(currentRating, type, isClan = false, isCaitiff = false) {
    // Note: currentRating is what you HAVE. We are buying currentRating + 1.
    // The multiplier applies to the NEW rating (currentRating + 1) for most things,
    // OR "Current Rating" for Willpower.
    
    // Check Chart logic carefully: "current rating x N" usually implies the rating you are GOING TO?
    // V20 p.124 Chart says: "Current Rating x 4" for Attributes.
    // Example: Strength 2 to 3. Is cost 2x4=8 or 3x4=12?
    // Standard V20 interpretation is NEW RATING.
    // However, the text you provided says "current rating x 4". 
    // Usually "current rating" in WW books refers to the dot you are buying (the level you are achieving).
    // Let's stick to the standard V20 convention: Cost to go from 2 to 3 is 3 x Multiplier.
    // UNLESS it is Willpower which is typically "current rating" meaning the one you have?
    // Wait, the chart provided says "Willpower... current rating". 
    // If I have 5 and want 6, cost is 5? That seems low. Standard is often "current rating" (5).
    
    const nextDot = currentRating + 1;

    switch(type) {
        case 'attr': 
            // "Attribute... current rating x 4" -> Standard V20 is New Rating x 4.
            return nextDot * 4; 
            
        case 'abil': 
            // "New Ability... 3"
            if (currentRating === 0) return 3;
            // "Ability... current rating x 2" -> Standard V20 is New Rating x 2.
            return nextDot * 2;
            
        case 'disc': 
            // "New Discipline... 10"
            if (currentRating === 0) return 10;
            
            // "Caitiff... current rating x 6"
            if (isCaitiff) return nextDot * 6;

            // "Clan Discipline... current rating x 5" -> Standard V20 is New Rating x 5
            if (isClan) return nextDot * 5;
            
            // "Other Discipline... current rating x 7"
            return nextDot * 7;
            
        case 'virt': 
            // "Virtue... current rating x 2" -> Standard V20 is New Rating x 2
            return nextDot * 2;
            
        case 'humanity': 
            // "Humanity... current rating x 2" -> Standard V20 is New Rating x 2
            return nextDot * 2;
            
        case 'willpower': 
            // "Willpower... current rating" -> Usually implies the cost is the number you HAVE.
            // Example: 4 to 5 costs 4 XP.
            return currentRating;
            
        case 'path':
            // "New Path... 7"
            if (currentRating === 0) return 7;
            // "Secondary Path... current rating x 4" -> Standard V20 is New Rating x 4
            return nextDot * 4;

        default: return 0;
    }
}

/**
 * Calculates generation and blood limits based on dots in Generation background.
 * @param {number} dots - Dots in "Generation" background (0-5).
 * @returns {Object} { generation: number, maxBlood: number, bpPerTurn: number }
 */
export function getGenerationDerivedStats(dots = 0) {
    const baseGen = 13;
    const currentGen = baseGen - dots; // 13 - 0 = 13th, 13 - 5 = 8th
    
    // Safety clamp (though inputs should handle this)
    const effectiveGen = Math.max(8, Math.min(13, currentGen));
    
    // Look up in GEN_LIMITS from data.js
    // Keys in GEN_LIMITS are numbers like 13, 12, etc.
    const limits = GEN_LIMITS[effectiveGen] || { m: 10, pt: 1 };

    return {
        generation: effectiveGen,
        maxBlood: limits.m,
        bpPerTurn: limits.pt
    };
}
