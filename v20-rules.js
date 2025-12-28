import { ATTRIBUTES, ABILITIES, DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST } from "./data.js";

/**
 * Calculates the total Freebie Points spent based on V20 Core Rules.
 * @param {Object} state - The character state object.
 * @returns {Object} breakdown of spent points and total.
 */
export function calculateFreebies(state) {
    let spent = 0;
    const log = [];

    // 1. Attributes (5 pts per dot)
    // Base is 1. Dots bought with Priorities are "free" for this calculation's baseline,
    // BUT usually freebies are calculated *after* priorities are maxed.
    // However, a simple "current dots vs expected dots" check is complex without knowing exact assignment.
    // SIMPLIFICATION: We assume the UI handles the "Phase" separation.
    // In "Freebie Mode", ANY increase costs freebies.
    // This function calculates costs based on a 'diff' if we had a baseline, 
    // but typically V20 apps calculate TOTAL cost and subtract allowance.
    //
    // HERE: We will return the cost per-type constants for the UI to use in delta-calculations,
    // or if this is a "validate total" function, we need the baseline.
    //
    // Given the architecture, this file likely provides CONSTANTS and small helpers.
    
    return {
        costAttribute: 5,
        costAbility: 2,
        costDiscipline: 7,
        costBackground: 1,
        costVirtue: 2,
        costHumanity: 1,
        costWillpower: 1
    };
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
    // We expect the user to have selected High(7), Mid(5), Low(3)
    const attrPrios = Object.values(state.prios.attr || {});
    const hasAttr7 = attrPrios.includes(7);
    const hasAttr5 = attrPrios.includes(5);
    const hasAttr3 = attrPrios.includes(3);

    if (!hasAttr7 || !hasAttr5 || !hasAttr3) {
        return { complete: false, msg: "Attributes: Must assign Primary (7), Secondary (5), and Tertiary (3)." };
    }

    // 2. Check Ability Priorities
    // High(13), Mid(9), Low(5)
    const abilPrios = Object.values(state.prios.abil || {});
    const hasAbil13 = abilPrios.includes(13);
    const hasAbil9 = abilPrios.includes(9);
    const hasAbil5 = abilPrios.includes(5);

    if (!hasAbil13 || !hasAbil9 || !hasAbil5) {
        return { complete: false, msg: "Abilities: Must assign Primary (13), Secondary (9), and Tertiary (5)." };
    }

    // 3. Verify Points Spent Matches Priorities
    // Attributes (Base 1 + Prio)
    const checkAttrGroup = (group, expected) => {
        let sum = 0;
        ATTRIBUTES[group].forEach(a => {
            sum += (state.dots.attr[a] || 1) - 1; // Subtract base 1
        });
        return sum === expected;
    };

    // Find which group is assigned which value
    const attrMap = state.prios.attr; // { Physical: 7, Social: 5... }
    for (const [group, val] of Object.entries(attrMap)) {
        if (!checkAttrGroup(group, val)) {
            return { complete: false, msg: `Attributes: ${group} should have exactly ${val} dots spent.` };
        }
    }

    // Abilities (Base 0 + Prio)
    const checkAbilGroup = (group, expected) => {
        let sum = 0;
        ABILITIES[group].forEach(a => {
            sum += (state.dots.abil[a] || 0);
        });
        // Also check "Custom" abilities if they map to this group
        if (state.customAbilityCategories) {
            Object.entries(state.customAbilityCategories).forEach(([name, cat]) => {
                if (cat === group) sum += (state.dots.abil[name] || 0);
            });
        }
        return sum === expected;
    };

    const abilMap = state.prios.abil;
    for (const [group, val] of Object.entries(abilMap)) {
        if (!checkAbilGroup(group, val)) {
            return { complete: false, msg: `Abilities: ${group} should have exactly ${val} dots spent.` };
        }
    }

    // 4. Disciplines (3 dots)
    let discSum = 0;
    Object.keys(state.dots.disc || {}).forEach(k => discSum += state.dots.disc[k]);
    if (discSum !== 3) return { complete: false, msg: `Disciplines: Must spend exactly 3 dots (Current: ${discSum}).` };

    // 5. Backgrounds (5 dots)
    let backSum = 0;
    Object.keys(state.dots.back || {}).forEach(k => backSum += state.dots.back[k]);
    if (backSum !== 5) return { complete: false, msg: `Backgrounds: Must spend exactly 5 dots (Current: ${backSum}).` };

    // 6. Virtues (7 dots)
    // Conscience/Self-Control/Courage start at 1.
    let virtSum = 0;
    VIRTUES.forEach(v => {
        virtSum += (state.dots.virt[v] || 1) - 1;
    });
    if (virtSum !== 7) return { complete: false, msg: `Virtues: Must spend exactly 7 dots (Current: ${virtSum}).` };

    return { complete: true, msg: "Base creation complete! Freebie Mode unlocked." };
}

/**
 * Calculates current Dice Pool for a given attribute+ability combo
 * @param {Object} state 
 * @param {string} attrName 
 * @param {string} abilName 
 * @returns {number}
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
        case 'abil': return next * 2; // "New Ability" is 3, but this func assumes upgrading
        case 'disc': return isClan ? next * 5 : next * 7;
        case 'virt': return next * 2;
        case 'humanity': return next * 2;
        case 'willpower': return currentRating; // Cost is current rating
        default: return 0;
    }
}
