import { ATTRIBUTES, ABILITIES, DISCIPLINES, BACKGROUNDS, VIRTUES, V20_MERITS_LIST, V20_FLAWS_LIST } from "./data.js";

// --- CORE POOL UPDATER ---
// Calculates all costs (Freebie & XP) and updates the sidebar ledgers
export function updatePools() {
    const s = window.state;
    if (!s) return;

    // --- 1. PRIORITY COUNTING (Creation Phase) ---
    // Calculate how many dots are currently placed in Attributes/Abilities vs the allowed Priority
    const counts = {
        attr: { Physical: 0, Social: 0, Mental: 0 },
        abil: { Talents: 0, Skills: 0, Knowledges: 0 },
        disc: 0, back: 0, virt: 0
    };

    // Attributes (Base 1 dot doesn't count towards Priority, so subtract 1 from val)
    Object.keys(ATTRIBUTES).forEach(cat => {
        ATTRIBUTES[cat].forEach(a => {
            const val = s.dots.attr[a] || 1;
            // Valid dots for pool are anything above 1 (the free dot)
            counts.attr[cat] += Math.max(0, val - 1);
        });
    });

    // Abilities (Base 0)
    Object.keys(ABILITIES).forEach(cat => {
        ABILITIES[cat].forEach(a => {
            counts.abil[cat] += s.dots.abil[a] || 0;
        });
        // Add custom abilities to counts
        if (s.customAbilityCategories) {
            Object.entries(s.customAbilityCategories).forEach(([name, c]) => {
                if (c === cat) counts.abil[cat] += s.dots.abil[name] || 0;
            });
        }
    });

    // Advantages
    Object.keys(s.dots.disc).forEach(d => counts.disc += s.dots.disc[d] || 0);
    Object.keys(s.dots.back).forEach(d => counts.back += s.dots.back[d] || 0);
    // Virtues (Base 1 free, so subtract 1)
    VIRTUES.forEach(v => counts.virt += Math.max(0, (s.dots.virt[v] || 1) - 1));

    // Update Priority Headers (Visual Feedback)
    updateHeaderCount('p-phys', counts.attr.Physical, s.prios.attr?.Physical);
    updateHeaderCount('p-social', counts.attr.Social, s.prios.attr?.Social);
    updateHeaderCount('p-mental', counts.attr.Mental, s.prios.attr?.Mental);
    updateHeaderCount('p-tal', counts.abil.Talents, s.prios.abil?.Talents);
    updateHeaderCount('p-ski', counts.abil.Skills, s.prios.abil?.Skills);
    updateHeaderCount('p-kno', counts.abil.Knowledges, s.prios.abil?.Knowledges);
    updateHeaderCount('p-disc', counts.disc, 3); // Base 3
    updateHeaderCount('p-back', counts.back, 5); // Base 5
    updateHeaderCount('p-virt', counts.virt, 7); // Base 7

    // --- 2. FREEBIE CALCULATION & LOGGING ---
    // Calculates overdrafts (spending beyond priority) and builds the log
    
    let freebieSpent = 0;
    let bonusFromFlaws = 0;
    const logEntries = []; // Array to store log strings

    // A. Attributes (5 pts/dot)
    // Logic: If Priority is set (e.g. 7), and you have 8, that's 1 Overdraft
    Object.keys(counts.attr).forEach(cat => {
        const allowance = s.prios.attr?.[cat] || 0;
        if (counts.attr[cat] > allowance) {
            const diff = counts.attr[cat] - allowance;
            const cost = diff * 5;
            freebieSpent += cost;
            logEntries.push(`${cat} Attr (+${diff}): ${cost} pts`);
        }
    });

    // B. Abilities (2 pts/dot)
    Object.keys(counts.abil).forEach(cat => {
        const allowance = s.prios.abil?.[cat] || 0;
        if (counts.abil[cat] > allowance) {
            const diff = counts.abil[cat] - allowance;
            const cost = diff * 2;
            freebieSpent += cost;
            logEntries.push(`${cat} Abil (+${diff}): ${cost} pts`);
        }
    });

    // C. Disciplines (7 pts/dot) -> Allowance 3
    // Note: V20 rules say 3 dots inClan. Usually interpreted as 3 dots total for creation.
    if (counts.disc > 3) {
        const diff = counts.disc - 3;
        const cost = diff * 7;
        freebieSpent += cost;
        logEntries.push(`Disciplines (+${diff}): ${cost} pts`);
    }

    // D. Backgrounds (1 pt/dot) -> Allowance 5
    if (counts.back > 5) {
        const diff = counts.back - 5;
        const cost = diff * 1;
        freebieSpent += cost;
        logEntries.push(`Backgrounds (+${diff}): ${cost} pts`);
    }

    // E. Virtues (2 pts/dot) -> Allowance 7
    if (counts.virt > 7) {
        const diff = counts.virt - 7;
        const cost = diff * 2;
        freebieSpent += cost;
        logEntries.push(`Virtues (+${diff}): ${cost} pts`);
    }

    // F. Humanity/Path (1 pt/dot in V20 for Freebies, 2 for XP)
    // Base is decided by Conscience + Self-Control.
    // Calculation: Base = (Conscience + SelfControl).
    // If dots.virt['Conscience'] + dots.virt['Self-Control'] < Humanity, user spent freebies?
    // Actually, simple rule: Humanity starts equal to C+SC. User can buy up.
    // We check state.status.humanity vs derived base.
    const conscience = s.dots.virt['Conscience'] || s.dots.virt['Conviction'] || 1;
    const selfControl = s.dots.virt['Self-Control'] || s.dots.virt['Instinct'] || 1;
    const baseHumanity = conscience + selfControl;
    if (s.status.humanity > baseHumanity) {
        const diff = s.status.humanity - baseHumanity;
        const cost = diff * 1; // V20 cost
        freebieSpent += cost;
        logEntries.push(`Humanity (+${diff}): ${cost} pts`);
    }

    // G. Willpower (1 pt/dot)
    // Base = Courage.
    const courage = s.dots.virt['Courage'] || 1;
    if (s.status.willpower > courage) {
        const diff = s.status.willpower - courage;
        const cost = diff * 1; 
        freebieSpent += cost;
        logEntries.push(`Willpower (+${diff}): ${cost} pts`);
    }

    // H. Merits & Flaws
    // Merits cost points. Flaws give points (negative cost).
    if (s.merits) {
        s.merits.forEach(m => {
            const cost = parseInt(m.cost) || 0;
            freebieSpent += cost;
            logEntries.push(`Merit: ${m.name} (${cost})`);
        });
    }
    if (s.flaws) {
        s.flaws.forEach(f => {
            const bonus = parseInt(f.bonus) || 0;
            bonusFromFlaws += bonus;
            // Flaws don't add to "Spent", they add to "Total Available" usually, 
            // OR they subtract from Spent. 
            // Standard V20: Flaws give phantom points up to 7 limit.
            // We will display them as Bonus.
            logEntries.push(`Flaw: ${f.name} (+${bonus})`);
        });
    }

    // Limit Flaw Bonus to 7
    const effectiveFlawBonus = Math.min(bonusFromFlaws, 7);
    const baseFreebies = 15;
    const totalFreebies = baseFreebies + effectiveFlawBonus;
    const remaining = totalFreebies - freebieSpent;

    // --- 3. UPDATE UI LEDGER ---
    if (document.getElementById('freebie-sidebar')) {
        // Update Sidebar Values
        // Note: For simplicity in this visual updater, we just show 0 if no overdraft,
        // or the cost if there is overdraft.
        setHtml('sb-attr', calculateCategoryCost(counts.attr, s.prios.attr, 5));
        setHtml('sb-abil', calculateCategoryCost(counts.abil, s.prios.abil, 2));
        setHtml('sb-disc', Math.max(0, counts.disc - 3) * 7);
        setHtml('sb-back', Math.max(0, counts.back - 5) * 1);
        setHtml('sb-virt', Math.max(0, counts.virt - 7) * 2);
        
        const humCost = Math.max(0, s.status.humanity - baseHumanity) * 1;
        setHtml('sb-human', humCost);
        
        const willCost = Math.max(0, s.status.willpower - courage) * 1;
        setHtml('sb-will', willCost);

        const meritCost = s.merits.reduce((acc, m) => acc + (parseInt(m.cost)||0), 0);
        setHtml('sb-merit', meritCost);
        setHtml('sb-flaw', effectiveFlawBonus);

        // Update Total
        const totalEl = document.getElementById('sb-total');
        if(totalEl) {
            totalEl.innerText = remaining;
            totalEl.className = remaining >= 0 ? "text-green-400 font-bold" : "text-red-500 font-bold animate-pulse";
        }

        // Top Bar Input
        const topInput = document.getElementById('c-freebie-total');
        if(topInput) {
            // If user manually changed the base (e.g. ST gave extra points), respect it?
            // The input currently defaults to 15. We should read it to allow ST overrides.
            // But for now, let's keep the logic consistent with standard rules:
            // "15" is base. If user edits the input, we use that as base.
            const currentInputVal = parseInt(topInput.value) || 15;
            const dynamicTotal = currentInputVal + effectiveFlawBonus;
            const dynamicRemaining = dynamicTotal - freebieSpent;
            document.getElementById('f-total-top').innerText = dynamicRemaining;
            
            // Visual Warning on Top Bar
            if (dynamicRemaining < 0) document.getElementById('f-total-top').classList.add('text-red-500');
            else document.getElementById('f-total-top').classList.remove('text-red-500');
        }

        // Update Log
        const logContainer = document.getElementById('freebie-log-recent');
        if(logContainer) {
            // Reverse to show most 'expensive' or significant at top? Or just list.
            // Let's simple join.
            if (logEntries.length === 0) {
                logContainer.innerHTML = '<span class="text-gray-600 italic">No freebies spent...</span>';
            } else {
                logContainer.innerHTML = logEntries.map(e => `<div class="border-b border-[#333] py-1">${e}</div>`).join('');
            }
        }
    }

    // --- 4. XP LEDGER UPDATES ---
    updateXpLedger(s);
}

// Helper for Header Counts (e.g. "Physical [5/7]")
function updateHeaderCount(id, current, max) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (max) {
        el.innerText = `[${current}/${max}]`;
        if (current > max) el.className = "pool-counter text-red-500 font-bold";
        else if (current === max) el.className = "pool-counter text-green-400";
        else el.className = "pool-counter text-gray-500";
    } else {
        el.innerText = `[${current}]`;
        el.className = "pool-counter";
    }
}

// Helper to calc total cost for a category group
function calculateCategoryCost(countsObj, priosObj, costPerDot) {
    let total = 0;
    Object.keys(countsObj).forEach(cat => {
        const allowance = priosObj?.[cat] || 0;
        if (countsObj[cat] > allowance) {
            total += (countsObj[cat] - allowance) * costPerDot;
        }
    });
    return total;
}

// Helper for text setting
function setHtml(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}

// XP Calculation Logic
function updateXpLedger(s) {
    if (!s.xpMode) return;

    // This just sums up the 'xpLog' entries. 
    // Usually the log entries contain { trait, cost, oldVal, newVal }.
    // We aggregate them for the sidebar.
    
    const totals = { attr: 0, abil: 0, disc: 0, virt: 0, human: 0, will: 0 };
    let grandTotal = 0;

    s.xpLog.forEach(entry => {
        const cost = entry.cost || 0;
        grandTotal += cost;
        
        // Simple heuristic to categorize based on log string or type
        // Ideally entry has 'type'. Assuming it does:
        if (entry.type === 'attr') totals.attr += cost;
        else if (entry.type === 'abil') totals.abil += cost;
        else if (entry.type === 'disc') totals.disc += cost;
        else if (entry.type === 'virt') totals.virt += cost;
        else if (entry.type === 'human') totals.human += cost; // Humanity or Path
        else if (entry.type === 'will') totals.will += cost;
    });

    setHtml('sb-xp-attr', totals.attr);
    setHtml('sb-xp-abil', totals.abil);
    setHtml('sb-xp-disc', totals.disc);
    setHtml('sb-xp-virt', totals.virt);
    setHtml('sb-xp-human', totals.human);
    setHtml('sb-xp-will', totals.will);
    setHtml('sb-xp-spent', grandTotal);

    const earned = parseInt(s.textFields['c-xp-total'] || '0');
    setHtml('sb-xp-remaining', earned - grandTotal);
    
    // XP Log Display
    const logEl = document.getElementById('xp-log-recent');
    if (logEl) {
        // Show last 20 entries
        const recent = s.xpLog.slice().reverse(); 
        logEl.innerHTML = recent.map(l => `<div class="border-b border-[#333] py-1"><span class="text-purple-300 font-bold">${l.cost}xp</span>: ${l.msg}</div>`).join('');
    }
}

// Attach to window so main.js can call it
window.updatePools = updatePools;
