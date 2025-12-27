import { ATTRIBUTES, ABILITIES, VIRTUES, STEPS_CONFIG } from "./data.js";

export const BROAD_ABILITIES = ["Crafts", "Science"];

/**
 * Calculates the total cost of Freebie Points spent based on the current state.
 * @param {Object} state - The character state object.
 * @returns {number} - Total freebies spent.
 */
export function calculateTotalFreebiesSpent(state) {
    if (!state || !state.dots) return 0;

    // 1. Attributes (5 pts per dot)
    let attrDots = 0;
    Object.keys(ATTRIBUTES).forEach(cat => {
        ATTRIBUTES[cat].forEach(a => attrDots += (state.dots.attr[a] || 1));
    });
    // Subtract base 3 (1 per attribute) * 3 categories * 3 attributes = actually base is 1 per attr.
    // Total attrs = 9. Base dots = 9. 
    // Creation dots = 7 + 5 + 3 = 15. Total free = 24.
    const attrCost = Math.max(0, attrDots - 24) * 5;

    // 2. Abilities (2 pts per dot)
    let abilDots = 0;
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => abilDots += (state.dots.abil[a] || 0));
        // Add custom abilities assigned to this category
        if (state.customAbilityCategories) {
            Object.entries(state.customAbilityCategories).forEach(([name, c]) => {
                if (c === cat && state.dots.abil[name]) abilDots += state.dots.abil[name];
            });
        }
    });
    // Creation dots = 13 + 9 + 5 = 27.
    const abilCost = Math.max(0, abilDots - 27) * 2;

    // 3. Disciplines (7 pts per dot)
    let discDots = Object.values(state.dots.disc || {}).reduce((a, b) => a + b, 0);
    // Creation dots = 3.
    const discCost = Math.max(0, discDots - 3) * 7;

    // 4. Backgrounds (1 pt per dot)
    let backDots = Object.values(state.dots.back || {}).reduce((a, b) => a + b, 0);
    // Creation dots = 5.
    const backCost = Math.max(0, backDots - 5) * 1;

    // 5. Virtues (2 pts per dot)
    let virtDots = VIRTUES.reduce((a, v) => a + (state.dots.virt[v] || 1), 0);
    // Creation dots = 7 + (3 base) = 10.
    const virtCost = Math.max(0, virtDots - 10) * 2;

    // 6. Humanity & Willpower
    const bH = (state.dots.virt?.Conscience || 1) + (state.dots.virt?.["Self-Control"] || 1);
    const bW = (state.dots.virt?.Courage || 1);
    
    const curH = state.status.humanity !== undefined ? state.status.humanity : bH;
    const curW = state.status.willpower !== undefined ? state.status.willpower : bW;
    
    const humCost = Math.max(0, curH - bH) * 2;
    const willCost = Math.max(0, curW - bW) * 1;

    // 7. Merits & Flaws
    let mfCost = 0, mfBonus = 0;
    if (state.merits) state.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
    if (state.flaws) state.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
    
    const cappedBonus = Math.min(mfBonus, 7); // Max 7 points returned from flaws

    return (attrCost + abilCost + discCost + backCost + virtCost + humCost + willCost + mfCost) - cappedBonus;
}

/**
 * Checks if a specific creation step is complete.
 * @param {number} step - The step number (1-4).
 * @param {Object} state - The character state object.
 * @returns {boolean}
 */
export function checkStepComplete(step, state) {
    if (!state) return false;
    const s = state;
    
    // Ensure structure exists
    if (!s.prios) s.prios = { attr: {}, abil: {} };
    if (!s.dots) s.dots = { attr: {}, abil: {}, disc: {}, back: {}, virt: {} };
    if (!s.textFields) s.textFields = {};

    if (step === 1) {
        // Concept: Needs Name, Nature, Demeanor, Clan
        return !!(s.textFields['c-name'] && s.textFields['c-nature'] && s.textFields['c-demeanor'] && s.textFields['c-clan']);
    }

    if (step === 2) {
        // Attributes: Needs 7/5/3 priority selection and exact point spending
        const prios = Object.values(s.prios.attr || {});
        // Check if priorities 7, 5, and 3 are all selected
        if (prios.length !== 3 || !prios.includes(7) || !prios.includes(5) || !prios.includes(3)) return false;
        
        return ['Physical', 'Social', 'Mental'].every(cat => {
            const limit = s.prios.attr[cat] || 0;
            let spent = 0;
            ATTRIBUTES[cat].forEach(a => { 
                const val = parseInt(s.dots.attr[a] || 1); 
                spent += (val - 1); // Subtract base dot
            });
            return spent === limit;
        });
    }

    if (step === 3) {
        // Abilities: Needs 13/9/5 priority selection and exact point spending
        const prios = Object.values(s.prios.abil || {});
        if (prios.length !== 3 || !prios.includes(13) || !prios.includes(9) || !prios.includes(5)) return false;
        
        return ['Talents', 'Skills', 'Knowledges'].every(cat => {
            const limit = s.prios.abil[cat] || 0;
            let spent = 0;
            ABILITIES[cat].forEach(a => spent += parseInt(s.dots.abil[a] || 0));
            // Add custom abilities
            if (s.customAbilityCategories) {
                Object.entries(s.customAbilityCategories).forEach(([name, c]) => {
                    if (c === cat) spent += parseInt(s.dots.abil[name] || 0);
                });
            }
            return spent === limit;
        });
    }

    if (step === 4) {
        // Advantages: 3 Disc, 5 Back, 7 Virtues (Total 10 virt dots)
        const discSpent = Object.values(s.dots.disc || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const backSpent = Object.values(s.dots.back || {}).reduce((a, b) => a + parseInt(b||0), 0);
        const virtTotal = VIRTUES.reduce((a, v) => a + parseInt(s.dots.virt[v] || 1), 0);
        
        return discSpent === 3 && backSpent === 5 && virtTotal === 10;
    }

    return true;
}

/**
 * Checks if all creation steps are valid.
 * @param {Object} state 
 * @returns {boolean}
 */
export function checkCreationComplete(state) {
    return checkStepComplete(1, state) && 
           checkStepComplete(2, state) && 
           checkStepComplete(3, state) && 
           checkStepComplete(4, state);
}
