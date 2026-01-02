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
        const hasName = f['c-name'] && f['c-name'].trim() !== "";
        const hasClan = f['c-clan'] && f['c-clan'].trim() !== "";
        // FIXED: c-gen is often auto-filled but ensure it exists
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
    const nextDot = currentRating + 1;

    switch(type) {
        case 'attr': return nextDot * 4; 
        case 'abil': 
            if (currentRating === 0) return 3;
            return nextDot * 2;
        case 'disc': 
            if (currentRating === 0) return 10;
            if (isCaitiff) return nextDot * 6;
            if (isClan) return nextDot * 5;
            return nextDot * 7;
        case 'virt': return nextDot * 2;
        case 'humanity': return nextDot * 2;
        case 'willpower': return currentRating;
        case 'path':
            if (currentRating === 0) return 7;
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
    const currentGen = baseGen - dots; 
    
    // Safety clamp 
    const effectiveGen = Math.max(8, Math.min(13, currentGen));
    
    const limits = GEN_LIMITS[effectiveGen] || { m: 10, pt: 1 };

    return {
        generation: effectiveGen,
        maxBlood: limits.m,
        bpPerTurn: limits.pt
    };
}

/**
 * Calculates dice pools for a specific weapon.
 * @param {Object} weapon - Weapon object from V20_WEAPONS_LIST (with stats).
 * @param {Object} state - Character state.
 * @returns {Object} { attackPool: number, damagePool: number, damageType: string }
 */
export function getCombatPools(weapon, state) {
    // Attack Pool: Dex + Skill
    // Default Skill mapping:
    // Firearms/Ranged -> Firearms
    // Melee -> Melee
    // Brawl (if weapon name implies like "Fist" or "Clinch", though standard list is "Melee")
    
    // Simplification: Check "Type" or "Name" or "Stats"
    // Since our data structure puts them all in one list with 'stats', we infer.
    // Guns have 'clip' usually defined as number or formula. Melee has clip '-'
    
    let skill = 'Melee';
    const clip = weapon.clip;
    if (clip && clip !== '-') skill = 'Firearms';
    
    // Special case: Brawl weapons (Sap, Club sometimes? V20 usually puts Sap/Club in Melee, but "Clinch" is Brawl)
    // The provided chart lists "Sap" and "Club" under Melee Weapons Chart.
    // So we default to Melee unless it's a gun.
    
    const dex = state.dots.attr.Dexterity || 1;
    const skillVal = state.dots.abil[skill] || 0;
    const attackPool = dex + skillVal;

    // Damage Pool
    // Melee: Str + Bonus
    // Firearms: Fixed (usually)
    let damagePool = 0;
    let damageType = 'L'; // Lethal default
    
    // Parse damage string "Str+1(B)" or "4(L)"
    // stats.dmg looks like "Str+1(B)" or "4(L)"
    const dmgStr = weapon.stats?.dmg || weapon.dmg || "";
    
    if (dmgStr) {
        // Extract type (B, L, A)
        const typeMatch = dmgStr.match(/\((.)\)/);
        if (typeMatch) damageType = typeMatch[1];
        
        // Check for Strength
        const strVal = state.dots.attr.Strength || 1;
        
        if (dmgStr.toLowerCase().includes('str')) {
            // Melee
            // Parse bonus: "Str+2" -> 2
            const bonusMatch = dmgStr.match(/[\+\-](\d+)/);
            const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0;
            damagePool = strVal + bonus;
        } else {
            // Ranged / Fixed
            // "4(L)" -> 4
            const fixedMatch = dmgStr.match(/^(\d+)/);
            damagePool = fixedMatch ? parseInt(fixedMatch[1]) : 0;
        }
    }

    return {
        attackPool,
        damagePool,
        damageType,
        skillUsed: skill
    };
}
