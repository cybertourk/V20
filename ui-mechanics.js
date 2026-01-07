import { 
    ATTRIBUTES, ABILITIES, VIRTUES, 
    GEN_LIMITS, HEALTH_STATES, SPECIALTY_EXAMPLES, 
    CLAN_DISCIPLINES, CLAN_WEAKNESSES 
} from "./data.js";

import { 
    getXpCost,
    BROAD_ABILITIES
} from "./v20-rules.js";

import { 
    renderDots, renderBoxes, showNotification, setSafeText, renderSocialProfile 
} from "./ui-common.js";


// --- DICE & POOL MECHANICS ---

export function clearPool() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    
    const hint = document.getElementById('specialty-hint'); 
    if(hint) hint.innerHTML = '';
    
    const cb = document.getElementById('use-specialty'); 
    if(cb) cb.checked = false;
    
    // Clear Custom Dice Slider
    const slider = document.getElementById('custom-dice-input');
    if(slider) {
        slider.value = 0;
        const valDisplay = document.getElementById('bonus-dice-val');
        if(valDisplay) valDisplay.innerText = "0";
    }
    
    // Clear Willpower Spend Checkbox
    const wpSpend = document.getElementById('spend-willpower');
    if(wpSpend) wpSpend.checked = false;

    document.getElementById('dice-tray').classList.remove('open');
}
window.clearPool = clearPool;


export function handleTraitClick(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    
    if (existingIdx > -1) {
        window.state.activePool.splice(existingIdx, 1);
    } else { 
        if (window.state.activePool.length >= 2) window.state.activePool.shift(); 
        window.state.activePool.push({name, val}); 
    }
    
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    
    const display = document.getElementById('pool-display');
    const hint = document.getElementById('specialty-hint');
    
    if (!hint && display) {
        const hDiv = document.createElement('div'); 
        hDiv.id = 'specialty-hint'; 
        hDiv.className = 'text-[9px] text-[#4ade80] mt-1 h-4 flex items-center';
        display.parentNode.insertBefore(hDiv, display.nextSibling);
    }
    
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
        
        const specs = window.state.activePool.map(p => window.state.specialties[p.name]).filter(s => s); 
        const hintEl = document.getElementById('specialty-hint');
        
        if (hintEl) {
            if (specs.length > 0) {
                 const isApplied = document.getElementById('use-specialty')?.checked;
                 if(isApplied) {
                     hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`;
                 } else {
                     hintEl.innerHTML = `<span>Possible Specialty: ${specs.join(', ')}</span><button id="apply-spec-btn" class="ml-2 bg-[#d4af37] text-black px-1 rounded hover:bg-white pointer-events-auto text-[9px] font-bold uppercase">APPLY</button>`;
                     const btn = document.getElementById('apply-spec-btn');
                     if(btn) btn.onclick = (e) => { 
                         e.stopPropagation(); 
                         const cb = document.getElementById('use-specialty'); 
                         if(cb) { 
                             cb.checked = true; 
                             window.showNotification(`Applied: ${specs.join(', ')}`); 
                             hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`; 
                         } 
                     };
                 }
            } else {
                hintEl.innerHTML = '';
            }
        }
        document.getElementById('dice-tray').classList.add('open');
    } else {
        window.clearPool();
    }
}
window.handleTraitClick = handleTraitClick;


export function rollPool() {
    const spendWP = document.getElementById('spend-willpower')?.checked;
    let autoSuccesses = 0;
    
    // Willpower Spending Logic
    if (spendWP) {
        if ((window.state.status.tempWillpower || 0) > 0) {
             window.state.status.tempWillpower--;
             autoSuccesses = 1;
             window.updatePools(); // Update UI to show spent point
             window.showNotification("Willpower spent: +1 Auto Success");
             document.getElementById('spend-willpower').checked = false; // Reset checkbox
        } else {
            window.showNotification("Cannot spend Willpower: Pool is empty!");
            document.getElementById('spend-willpower').checked = false;
            return; // Abort roll
        }
    }

    const custom = parseInt(document.getElementById('custom-dice-input')?.value) || 0;
    const poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0) + custom;
    
    if (poolSize <= 0 && autoSuccesses === 0) { 
        window.showNotification("Pool Empty"); 
        return; 
    }
    
    const diff = parseInt(document.getElementById('roll-diff').value) || 6;
    const isSpec = document.getElementById('use-specialty').checked;
    
    let results = [], ones = 0, rawSuccesses = 0;
    for(let i=0; i<poolSize; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        results.push(die);
        if (die === 1) ones++;
        if (die >= diff) { 
            if (isSpec && die === 10) rawSuccesses += 2; 
            else rawSuccesses += 1; 
        }
    }
    
    // Net Calculation:
    // 1. Raw Successes - Ones (min 0)
    let net = Math.max(0, rawSuccesses - ones);
    
    // 2. Add Auto Successes (cannot be cancelled)
    net += autoSuccesses;

    let outcome = "", outcomeClass = "";
    
    // Botch: No successes (raw or auto), and ones rolled.
    if (rawSuccesses === 0 && autoSuccesses === 0 && ones > 0) { 
        outcome = "BOTCH"; outcomeClass = "dice-botch"; 
    } 
    else if (net <= 0) { 
        outcome = "FAILURE"; outcomeClass = "text-gray-400"; 
    } 
    else { 
        outcome = `${net} SUCCESS${net > 1 ? 'ES' : ''}`; outcomeClass = "dice-success"; 
    }
    
    const tray = document.getElementById('roll-results');
    const row = document.createElement('div');
    row.className = 'bg-black/60 p-2 border border-[#333] text-[10px] mb-2 animate-in fade-in slide-in-from-right-4 duration-300';
    
    const diceRender = results.map(d => {
        let c = 'text-gray-500';
        if (d === 1) c = 'text-[#ff0000] font-bold';
        else if (d >= diff) { 
            c = 'text-[#d4af37] font-bold'; 
            if (d === 10 && isSpec) c = 'text-[#4ade80] font-black'; 
        }
        return `<span class="${c} text-3xl mx-1">${d}</span>`;
    }).join(' ');

    let extras = "";
    if (autoSuccesses > 0) extras = `<div class="text-[9px] text-blue-300 font-bold mt-1 text-center border-t border-[#333] pt-1 uppercase">Willpower Applied (+1 Success)</div>`;

    row.innerHTML = `<div class="flex justify-between border-b border-[#444] pb-1 mb-1"><span class="text-gray-400">Diff ${diff}${isSpec ? '*' : ''}</span><span class="${outcomeClass} font-black text-sm">${outcome}</span></div><div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>${extras}`;
    tray.insertBefore(row, tray.firstChild);
}
window.rollPool = rollPool;


export function rollCombat(name, diff, attr, ability) {
    window.clearPool();
    const attrVal = window.state.dots.attr[attr] || 1;
    window.state.activePool.push({name: attr, val: attrVal});
    
    const abilVal = window.state.dots.abil[ability] || 0;
    window.state.activePool.push({name: ability, val: abilVal});
    
    document.querySelectorAll('.trait-label').forEach(el => {
        if (el.innerText === attr || el.innerText === ability) el.classList.add('selected');
        else el.classList.remove('selected');
    });
    
    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = diff;
    
    const display = document.getElementById('pool-display');
    if (display) setSafeText('pool-display', `${attr} (${attrVal}) + ${ability} (${abilVal})`);
    
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');
}
window.rollCombat = rollCombat;


export function toggleDiceTray() {
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.toggle('open');
}
window.toggleDiceTray = toggleDiceTray;


// --- FRENZY & RÖTSCHRECK ---

export function rollFrenzy() {
    // 1. Setup Pool (Clear existing)
    window.clearPool();
    
    // V20 Rules: Frenzy is usually rolled on Self-Control. 
    // Vampires with Instincts ride the wave (automatic frenzy unless they spend willpower to control it?), 
    // but often players roll Instincts to control/direct it. 
    // For this app, we will load the appropriate virtue into the pool.
    const traitName = window.state.dots.virt["Instincts"] ? "Instincts" : "Self-Control";
    const traitVal = window.state.dots.virt[traitName] || 1;
    
    // Push to active pool so standard roller can use it
    window.state.activePool.push({name: traitName, val: traitVal});

    // 2. Setup Difficulty
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    let difficulty = 6; 
    let diffMsg = "";

    // Check for UI override
    const diffInputOverride = document.getElementById('frenzy-diff');
    if (diffInputOverride && diffInputOverride.value) {
        difficulty = parseInt(diffInputOverride.value) || 6;
        diffMsg = " (Custom)";
    } else if (clan === "Brujah") {
        difficulty += 2;
        diffMsg = " (Brujah Curse)";
    }

    // Set Main Diff Input
    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = difficulty;

    // 3. Update Display
    const display = document.getElementById('pool-display');
    if (display) {
        setSafeText('pool-display', `Frenzy Check: ${traitName} (${traitVal})`);
        // Optional: color code to indicate danger
        display.classList.add('text-red-500');
    }

    // 4. Open Tray for Player to Roll
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');

    showNotification(`Frenzy Pool Ready (Diff ${difficulty}${diffMsg}). Roll when ready.`);
}
window.rollFrenzy = rollFrenzy;


export function rollRotschreck() {
    // 1. Setup Pool
    window.clearPool();
    
    const traitName = "Courage";
    const traitVal = window.state.dots.virt[traitName] || 1;
    
    window.state.activePool.push({name: traitName, val: traitVal});
    
    // 2. Setup Difficulty
    let difficulty = 6;
    const diffInputOverride = document.getElementById('rotschreck-diff');
    if (diffInputOverride && diffInputOverride.value) {
        difficulty = parseInt(diffInputOverride.value) || 6;
    }

    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = difficulty;
    
    // 3. Update Display
    const display = document.getElementById('pool-display');
    if (display) {
        setSafeText('pool-display', `Rötschreck Check: ${traitName} (${traitVal})`);
        display.classList.add('text-orange-500');
    }

    // 4. Open Tray for Player to Roll
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');

    showNotification(`Fear Pool Ready (Diff ${difficulty}). Roll when ready.`);
}
window.rollRotschreck = rollRotschreck;


// --- STATE MANAGEMENT & POOL UPDATES ---

export function updatePools() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
    const bW = (window.state.dots.virt?.Courage || 1);

    if (!window.state.freebieMode && !window.state.xpMode && !window.state.isPlayMode) {
         if (window.state.status.humanity === 7 && bH === 2) window.state.status.humanity = 2;
         if (window.state.status.willpower === 5 && bW === 1) { window.state.status.willpower = 1; window.state.status.tempWillpower = 1; }
    }

    const curH = window.state.status.humanity;
    const curW = window.state.status.willpower;
    const tempW = window.state.status.tempWillpower;
    const gen = parseInt(document.getElementById('c-gen')?.value) || 13;
    const lim = GEN_LIMITS[gen] || GEN_LIMITS[13];

    // Priority Counts
    Object.keys(ATTRIBUTES).forEach(cat => {
        let cs = 0; 
        ATTRIBUTES[cat].forEach(a => cs += ((window.state.dots.attr[a] || 1) - 1));
        const targetId = (cat === 'Social') ? 'p-social' : (cat === 'Mental') ? 'p-mental' : 'p-phys';
        setSafeText(targetId, `[${Math.max(0, (window.state.prios.attr[cat] || 0) - cs)}]`);
    });
    
    Object.keys(ABILITIES).forEach(cat => {
        let cs = 0; 
        ABILITIES[cat].forEach(a => cs += (window.state.dots.abil[a] || 0));
        if (window.state.customAbilityCategories) { 
            Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { 
                if (c === cat && window.state.dots.abil[name]) cs += window.state.dots.abil[name]; 
            }); 
        }
        setSafeText('p-' + cat.toLowerCase().slice(0,3), `[${Math.max(0, (window.state.prios.abil[cat] || 0) - cs)}]`);
    });
    
    const discSpent = Object.values(window.state.dots.disc || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-disc', `[${Math.max(0, 3 - discSpent)}]`);
    
    const backSpent = Object.values(window.state.dots.back || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-back', `[${Math.max(0, 5 - backSpent)}]`);
    
    const virtTotalDots = VIRTUES.reduce((a, v) => a + (window.state.dots.virt[v] || 1), 0);
    setSafeText('p-virt', `[${Math.max(0, 7 - (virtTotalDots - 3))}]`);

    // FREEBIE MODE SIDEBAR & LOGGING
    if (window.state.freebieMode) {
         const logEntries = [];
         let totalFreebieCost = 0;
         let totalFlawBonus = 0;

         // 1. Attributes (5/dot)
         const attrCats = { Physical: 0, Social: 0, Mental: 0 };
         let attrCost = 0;
         Object.keys(ATTRIBUTES).forEach(cat => {
             ATTRIBUTES[cat].forEach(a => attrCats[cat] += Math.max(0, (window.state.dots.attr[a] || 1) - 1));
             const limit = window.state.prios.attr[cat] || 0;
             if (attrCats[cat] > limit) {
                 const diff = attrCats[cat] - limit;
                 const c = diff * 5;
                 attrCost += c;
                 logEntries.push(`${cat} Attr (+${diff}): ${c} pts`);
             }
         });
         setSafeText('sb-attr', attrCost);
         totalFreebieCost += attrCost;

         // 2. Abilities (2/dot)
         const abilCats = { Talents: 0, Skills: 0, Knowledges: 0 };
         let abilCost = 0;
         Object.keys(ABILITIES).forEach(cat => {
             ABILITIES[cat].forEach(a => abilCats[cat] += (window.state.dots.abil[a] || 0));
             if (window.state.customAbilityCategories) {
                 Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => {
                     if (c === cat && window.state.dots.abil[name]) abilCats[cat] += window.state.dots.abil[name];
                 });
             }
             const limit = window.state.prios.abil[cat] || 0;
             if (abilCats[cat] > limit) {
                 const diff = abilCats[cat] - limit;
                 const c = diff * 2;
                 abilCost += c;
                 logEntries.push(`${cat} Abil (+${diff}): ${c} pts`);
             }
         });
         setSafeText('sb-abil', abilCost);
         totalFreebieCost += abilCost;

         // 3. Disciplines (7/dot, Limit 3)
         const dDiff = Math.max(0, discSpent - 3);
         const dCost = dDiff * 7;
         setSafeText('sb-disc', dCost);
         totalFreebieCost += dCost;
         if(dCost > 0) logEntries.push(`Disciplines (+${dDiff}): ${dCost} pts`);

         // 4. Backgrounds (1/dot, Limit 5)
         const bgDiff = Math.max(0, backSpent - 5);
         const bgCost = bgDiff * 1;
         setSafeText('sb-back', bgCost);
         totalFreebieCost += bgCost;
         if(bgCost > 0) logEntries.push(`Backgrounds (+${bgDiff}): ${bgCost} pts`);

         // 5. Virtues (2/dot, Limit 7)
         const vDiff = Math.max(0, virtTotalDots - 10);
         const vCost = vDiff * 2;
         setSafeText('sb-virt', vCost);
         totalFreebieCost += vCost;
         if(vCost > 0) logEntries.push(`Virtues (+${vDiff}): ${vCost} pts`);

         // 6. Humanity (1/dot)
         const hDiff = Math.max(0, curH - bH); 
         const hCost = hDiff * 1;
         setSafeText('sb-human', hCost);
         totalFreebieCost += hCost;
         if(hCost > 0) logEntries.push(`Humanity (+${hDiff}): ${hCost} pts`);

         // 7. Willpower (1/dot)
         const wDiff = Math.max(0, curW - bW); 
         const wCost = wDiff * 1;
         setSafeText('sb-will', wCost);
         totalFreebieCost += wCost;
         if(wCost > 0) logEntries.push(`Willpower (+${wDiff}): ${wCost} pts`);

         // 8. Merits / Flaws
         let mCost = 0;
         if (window.state.merits) window.state.merits.forEach(m => { 
             const v = parseInt(m.val) || 0; 
             mCost += v; 
             logEntries.push(`Merit: ${m.name} (${v})`);
         });
         setSafeText('sb-merit', mCost);
         totalFreebieCost += mCost;

         if (window.state.flaws) window.state.flaws.forEach(f => {
             const v = parseInt(f.val) || 0;
             totalFlawBonus += v;
             logEntries.push(`Flaw: ${f.name} (+${v})`);
         });
         const cappedBonus = Math.min(totalFlawBonus, 7);
         setSafeText('sb-flaw', `+${cappedBonus}`);

         // Final Totals
         const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
         const available = limit + cappedBonus;
         const remaining = available - totalFreebieCost;
         
         setSafeText('f-total-top', remaining);
         setSafeText('sb-total', remaining);
         const totalEl = document.getElementById('sb-total');
         if(totalEl) totalEl.className = remaining >= 0 ? "text-green-400 font-bold" : "text-red-500 font-bold animate-pulse";
         if(remaining < 0) document.getElementById('f-total-top').classList.add('text-red-500'); 
         else document.getElementById('f-total-top').classList.remove('text-red-500');

         // Populate Log
         const logContainer = document.getElementById('freebie-log-recent');
         if(logContainer) {
             if (logEntries.length === 0) logContainer.innerHTML = '<span class="text-gray-600 italic">No freebies spent...</span>';
             else logContainer.innerHTML = logEntries.map(e => `<div class="border-b border-[#333] py-1 text-gray-300 text-[9px]">${e}</div>`).join('');
         }

         document.getElementById('freebie-sidebar').classList.add('active'); 
    } else {
         document.getElementById('freebie-sidebar').classList.remove('active');
    }

    // EXPERIENCE MODE SIDEBAR
    if (window.state.xpMode) {
        if(window.renderXpSidebar) window.renderXpSidebar();
        document.getElementById('xp-sidebar').classList.add('active');
        document.getElementById('xp-sidebar').classList.add('open');
    } else {
        document.getElementById('xp-sidebar').classList.remove('active');
        document.getElementById('xp-sidebar').classList.remove('open');
    }

    const fbBtn = document.getElementById('toggle-freebie-btn');
    if (fbBtn) {
        if (window.state.isPlayMode) {
            fbBtn.disabled = true;
        } else {
            fbBtn.disabled = false;
        }
    }

    document.querySelectorAll('.dot-row').forEach(el => {
        const name = el.dataset.n;
        const type = el.dataset.t;
        if (name && type && window.state.dots[type]) {
            const val = window.state.dots[type][name] || 0; 
            el.innerHTML = renderDots(val, 5);
        }
    });

    const p8h = document.getElementById('phase8-humanity-dots');
    if(p8h) {
        p8h.innerHTML = renderDots(curH, 10);
        p8h.onclick = (e) => { 
            if (window.state.freebieMode && e.target.dataset.v) setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10); 
            if (window.state.xpMode && e.target.dataset.v) setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10);
        };
    }
    const p8w = document.getElementById('phase8-willpower-dots');
    if(p8w) {
        p8w.innerHTML = renderDots(curW, 10);
        p8w.onclick = (e) => { 
            if (window.state.freebieMode && e.target.dataset.v) setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10); 
            if (window.state.xpMode && e.target.dataset.v) setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10);
        };
    }

    document.querySelectorAll('#humanity-dots-play').forEach(el => el.innerHTML = renderDots(curH, 10));
    document.querySelectorAll('#willpower-dots-play').forEach(el => el.innerHTML = renderDots(curW, 10));
    document.querySelectorAll('#willpower-boxes-play').forEach(el => el.innerHTML = renderBoxes(curW, tempW, 'wp'));
    
    const bpContainer = document.querySelectorAll('#blood-boxes-play');
    bpContainer.forEach(el => {
        let h = '';
        const currentBlood = window.state.status.blood || 0;
        const maxBloodForGen = lim.m;
        for (let i = 1; i <= 20; i++) {
            let classes = "box";
            if (i <= currentBlood) classes += " checked";
            if (i > maxBloodForGen) classes += " cursor-not-allowed opacity-50 bg-[#1a1a1a]"; else classes += " cursor-pointer";
            if (i > maxBloodForGen) classes += " pointer-events-none";
            h += `<span class="${classes}" data-v="${i}" data-type="blood"></span>`;
        }
        el.innerHTML = h;
    });

    const bptContainer = document.querySelector('#blood-boxes-play + .text-center');
    if (bptContainer) {
        bptContainer.innerHTML = `Blood Per Turn: <span class="text-white">${lim.pt}</span>`;
    }

    const healthCont = document.getElementById('health-chart-play');
    if(healthCont && healthCont.children.length === 0) {
         HEALTH_STATES.forEach((h, i) => {
            const d = document.createElement('div'); 
            d.className = 'flex justify-between items-center text-[10px] uppercase border-b border-[#333] py-2 font-bold';
            const penaltyText = h.p !== 0 ? h.p : '';
            d.innerHTML = `<span>${h.l}</span><div class="flex gap-3"><span class="text-red-500">${penaltyText}</span><div class="box" data-v="${i+1}" data-type="health"></div></div>`;
            healthCont.appendChild(d);
        });
    }

    const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
    document.querySelectorAll('#health-chart-play .box').forEach((box, i) => {
        box.classList.remove('checked'); 
        box.dataset.state = healthStates[i] || 0;
    });
    
    renderSocialProfile();
    if(window.updateWalkthrough) window.updateWalkthrough();

    // --- Ensure Dice Button Exists & Update State ---
    let diceBtn = document.getElementById('dice-toggle-btn');
    if (!diceBtn) {
        diceBtn = document.createElement('button');
        diceBtn.id = 'dice-toggle-btn';
        diceBtn.className = 'fixed bottom-6 right-6 z-[100] bg-[#8b0000] text-white w-12 h-12 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] border border-[#d4af37] hover:bg-[#a00000] flex items-center justify-center transition-all hidden transform hover:scale-110 active:scale-95'; 
        diceBtn.innerHTML = '<i class="fas fa-dice text-xl"></i>';
        diceBtn.title = "Open Dice Roller";
        diceBtn.onclick = window.toggleDiceTray;
        document.body.appendChild(diceBtn);
    }
    
    if (window.state.isPlayMode) diceBtn.classList.remove('hidden');
    else diceBtn.classList.add('hidden');

    // --- ATTACH CLICK LISTENERS FOR PLAY MODE BOXES ---
    // Willpower, Blood, Health
    document.querySelectorAll('.box').forEach(b => {
        b.onclick = (e) => {
            e.stopPropagation(); // Prevent bubbling issues
            const t = b.dataset.type;
            const v = parseInt(b.dataset.v);
            if(window.handleBoxClick) window.handleBoxClick(t, v, b);
        };
    });
}
window.updatePools = updatePools;


export function refreshTraitRow(label, type, targetEl) {
    let rowDiv = targetEl;
    if (!rowDiv) {
        const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
        rowDiv = document.getElementById(safeId);
    }
    
    if(!rowDiv) return;

    const min = (type === 'attr') ? 1 : 0;
    const val = window.state.dots[type][label] || min;
    const max = 5;

    let showSpecialty = false;
    let warningMsg = "";

    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
                if (!BROAD_ABILITIES.includes(label) && val < 4) warningMsg = "Rule Note: Standard V20 requires 4 dots for specialties, but you may override.";
                else if (BROAD_ABILITIES.includes(label)) warningMsg = "Rule Note: This ability is too broad to be used without a specialty.";
            }
        }
    }

    let specInputHTML = '';
    if (showSpecialty) {
        const specVal = window.state.specialties[label] || "";
        if (window.state.isPlayMode && !specVal) specInputHTML = '<div class="flex-1"></div>'; 
        else {
            const listId = `list-${label.replace(/[^a-zA-Z0-9]/g, '')}`;
            let optionsHTML = '';
            if (SPECIALTY_EXAMPLES[label]) optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
            specInputHTML = `<div class="flex-1 mx-2 relative"><input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}"><datalist id="${listId}">${optionsHTML}</datalist></div>`;
        }
    } else { specInputHTML = '<div class="flex-1"></div>'; }

    rowDiv.innerHTML = `<span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold">${label}</span>${specInputHTML}<div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}">${renderDots(val, max)}</div>`;

    rowDiv.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode) window.handleTraitClick(label, type); };
    rowDiv.querySelector('.dot-row').onclick = (e) => { if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); };
    
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = rowDiv.querySelector('input');
        if(input) {
            input.onblur = (e) => { window.state.specialties[label] = e.target.value; if(window.renderPrintSheet) window.renderPrintSheet(); };
            if (warningMsg) { input.onfocus = () => window.showNotification(warningMsg); }
            input.disabled = window.state.isPlayMode;
        }
    }
}
window.refreshTraitRow = refreshTraitRow;


export function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    const div = document.createElement('div'); 
    div.id = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    div.className = 'flex items-center justify-between w-full py-1';
    cont.appendChild(div);
    refreshTraitRow(label, type, div); 
}
window.renderRow = renderRow;


// --- UPDATED setDots with Experience Mode ---
export function setDots(name, type, val, min, max = 5) {
    if (window.state.isPlayMode) return;

    // --- EXPERIENCE MODE LOGIC ---
    if (window.state.xpMode) {
        if (!window.state.xpLog) window.state.xpLog = [];

        let currentVal = 0;
        // Determine current value
        if (type === 'status') {
            if (name === 'Humanity') currentVal = window.state.status.humanity || 1;
            else if (name === 'Willpower') currentVal = window.state.status.willpower || 1;
        } else {
            currentVal = window.state.dots[type][name] || min;
        }

        // Only handle INCREASES in XP mode (cannot remove dots to refund XP usually, standard is permanent)
        // If user clicks same or lower, do nothing or show info
        if (val <= currentVal) {
            window.showNotification("Cannot lower traits in XP Mode.");
            return;
        }

        // Only allow buying 1 dot at a time for safety/rules adherence
        if (val > currentVal + 1) {
            window.showNotification("Purchase 1 dot at a time.");
            return;
        }
        
        // Calculate Cost
        const isClan = window.state.dots.disc && CLAN_DISCIPLINES[window.state.textFields['c-clan']]?.includes(name);
        const isCaitiff = window.state.textFields['c-clan'] === "Caitiff";
        
        let xpType = type;
        if (type === 'status') {
             if (name === 'Humanity') xpType = 'humanity';
             if (name === 'Willpower') xpType = 'willpower';
        }
        
        const cost = getXpCost(currentVal, xpType, isClan, isCaitiff);
        
        // Calculate Budget
        const totalXP = parseInt(document.getElementById('c-xp-total')?.value) || 0;
        let spentXP = window.state.xpLog.reduce((acc, log) => acc + log.cost, 0);
        const remaining = totalXP - spentXP;
        
        if (cost > remaining) {
            window.showNotification(`Need ${cost} XP. Have ${remaining}.`);
            return;
        }

        if (confirm(`Spend ${cost} XP to raise ${name} to ${val}?`)) {
            // APPLY CHANGE
            if (type === 'status') {
                if (name === 'Humanity') window.state.status.humanity = val;
                if (name === 'Willpower') {
                    window.state.status.willpower = val;
                    window.state.status.tempWillpower = val; // Max increases temp
                }
            } else {
                window.state.dots[type][name] = val;
            }
            
            // LOG IT
            window.state.xpLog.push({
                trait: name,
                old: currentVal,
                new: val,
                cost: cost,
                type: type,
                date: new Date().toISOString()
            });

            window.showNotification(`Purchased ${name} ${val} (${cost} XP)`);
            updatePools(); // Refresh UI including sidebar
            if(window.renderPrintSheet) window.renderPrintSheet();
        }
        return;
    }
    // --- END EXPERIENCE MODE LOGIC ---
    
    // --- STANDARD CREATION LOGIC ---
    if (type === 'status') {
        if (!window.state.freebieMode) return;
        if (name === 'Humanity') {
             const baseH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
             if (val < baseH) val = baseH;
             window.state.status.humanity = val;
        }
        else if (name === 'Willpower') {
            const baseW = window.state.dots.virt?.Courage || 1;
            if (val < baseW) val = baseW;
            window.state.status.willpower = val;
            window.state.status.tempWillpower = val;
        }
        updatePools(); 
        if(window.renderPrintSheet) window.renderPrintSheet();
        return;
    }

    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;

    if (window.state.freebieMode) {
        // Freebie mode allows unlimited editing, the ledger just tracks the cost.
    } else {
        // ... [Standard Priority Checks for Phases 2,3,4] ...
        if (type === 'attr') {
            let group = null; 
            Object.keys(ATTRIBUTES).forEach(k => { if(ATTRIBUTES[k].includes(name)) group = k; });
            
            if (group) {
                 const limit = window.state.prios.attr[group];
                 if (limit === undefined) { window.showNotification(`Select priority for ${group}!`); return; }
                 
                 let currentSpent = 0;
                 ATTRIBUTES[group].forEach(a => { if (a !== name) { const v = window.state.dots.attr[a] || 1; currentSpent += (v - 1); } });
                 
                 if (currentSpent + (newVal - 1) > limit) { window.showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'abil') {
            if (newVal > 3) { window.showNotification("Max 3 dots in Abilities during creation!"); return; }
            
            let group = null; 
            Object.keys(ABILITIES).forEach(k => { if(ABILITIES[k].includes(name)) group = k; });
            if (!group && window.state.customAbilityCategories && window.state.customAbilityCategories[name]) group = window.state.customAbilityCategories[name];
            
            if (group) {
                const limit = window.state.prios.abil[group];
                if (limit === undefined) { window.showNotification(`Select priority for ${group}!`); return; }
                
                let currentSpent = 0; 
                ABILITIES[group].forEach(a => { if (a !== name) currentSpent += (window.state.dots.abil[a] || 0); });
                
                if (window.state.customAbilityCategories) { 
                    Object.keys(window.state.dots.abil).forEach(k => { 
                        if (k !== name && window.state.customAbilityCategories[k] === group) currentSpent += (window.state.dots.abil[k] || 0); 
                    }); 
                }
                
                if (currentSpent + newVal > limit) { window.showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'disc') {
            let currentSpent = 0; 
            Object.keys(window.state.dots.disc).forEach(d => { if (d !== name) currentSpent += (window.state.dots.disc[d] || 0); });
            if (currentSpent + newVal > 3) { window.showNotification("Max 3 Creation Dots!"); return; }
        } else if (type === 'back') {
            let currentSpent = 0; 
            Object.keys(window.state.dots.back).forEach(b => { if (b !== name) currentSpent += (window.state.dots.back[b] || 0); });
            if (currentSpent + newVal > 5) { window.showNotification("Max 5 Creation Dots!"); return; }
        } else if (type === 'virt') {
            let currentSpent = 0; 
            VIRTUES.forEach(v => { if (v !== name) currentSpent += (window.state.dots.virt[v] || 1); });
            if ((currentSpent + newVal) > 10) { window.showNotification("Max 7 Creation Dots!"); return; }
        }
    }

    window.state.dots[type][name] = newVal;
    
    if (type === 'back' && name === 'Generation') {
        const newGen = 13 - newVal;
        if (!window.state.textFields) window.state.textFields = {};
        window.state.textFields['c-gen'] = newGen.toString();
        const genInput = document.getElementById('c-gen');
        if (genInput) genInput.value = newGen;
    }

    // Auto-update Status from Virtues in Creation Mode
    if (type === 'virt' && !window.state.isPlayMode && !window.state.freebieMode && !window.state.xpMode) {
         const delta = newVal - currentVal;
         if (delta !== 0) {
             if (name === 'Conscience' || name === 'Self-Control') {
                 if (window.state.status.humanity === undefined) window.state.status.humanity = 2; // Initial Min
                 window.state.status.humanity += delta;
                 if (window.state.status.humanity < 0) window.state.status.humanity = 0;
             }
             if (name === 'Courage') {
                 if (window.state.status.willpower === undefined) window.state.status.willpower = 1;
                 window.state.status.willpower += delta;
                 window.state.status.tempWillpower = window.state.status.willpower; // Sync temp in creation
                 if (window.state.status.willpower < 0) window.state.status.willpower = 0;
             }
         }
    }

    if (type === 'attr' || type === 'abil') {
        refreshTraitRow(name, type);
    } else {
        document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(newVal, max));
    }
    updatePools();
    if(type === 'back') renderSocialProfile();
    if(window.renderPrintSheet) window.renderPrintSheet();
}
window.setDots = setDots;
