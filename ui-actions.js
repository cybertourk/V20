import { 
    ATTRIBUTES, ABILITIES, VIRTUES, CLAN_DISCIPLINES,
    GEN_LIMITS, HEALTH_STATES, CLAN_WEAKNESSES 
} from "./data.js";

import { 
    getXpCost,
    BROAD_ABILITIES,
    checkStepComplete
} from "./v20-rules.js";

import { 
    renderPrintSheet, 
    renderInventoryList, 
    renderSocialProfile, 
    refreshTraitRow, 
    renderDots,
    renderXpSidebar,
    renderDerangementsList,
    renderBloodBondRow,
    renderDynamicHavenRow
} from "./ui-renderer.js";

// --- HELPERS ---

window.showNotification = function(msg) { 
    const el = document.getElementById('notification'); 
    if (el) { 
        el.innerText = msg; 
        el.style.display = 'block'; 
        el.style.backgroundColor = 'rgba(15, 0, 0, 0.95)';
        setTimeout(() => { el.style.display = 'none'; }, 4000); 
    } 
};

function setSafeText(id, val) { 
    const el = document.getElementById(id); 
    if(el) el.innerText = val; 
}

// --- BOX CLICK HANDLER (Willpower, Blood, Health) ---
window.handleBoxClick = function(type, val, element) {
    if (!window.state.isPlayMode) return;

    if (type === 'wp') {
        let cur = window.state.status.tempWillpower || 0;
        window.state.status.tempWillpower = (val === cur) ? val - 1 : val;
    } 
    else if (type === 'blood') {
        let cur = window.state.status.blood || 0;
        window.state.status.blood = (val === cur) ? val - 1 : val;
    } 
    else if (type === 'health') {
        const idx = val - 1;
        const healthStates = window.state.status.health_states || [0,0,0,0,0,0,0];
        let s = healthStates[idx] || 0;
        s = (s + 1) % 4; 
        healthStates[idx] = s;
        window.state.status.health_states = healthStates;
        if(element) element.dataset.state = s; 
    }
    window.updatePools();
    renderPrintSheet();
};

window.clearPool = function() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    const hint = document.getElementById('specialty-hint'); if(hint) hint.innerHTML = '';
    const cb = document.getElementById('use-specialty'); if(cb) cb.checked = false;
    
    const slider = document.getElementById('custom-dice-input');
    if(slider) {
        slider.value = 0;
        const valDisplay = document.getElementById('bonus-dice-val');
        if(valDisplay) valDisplay.innerText = "0";
    }
    
    const wpSpend = document.getElementById('spend-willpower');
    if(wpSpend) wpSpend.checked = false;

    document.getElementById('dice-tray').classList.remove('open');
};

window.handleTraitClick = function(name, type) {
    const val = window.state.dots[type][name] || 0;
    const existingIdx = window.state.activePool.findIndex(p => p.name === name);
    if (existingIdx > -1) window.state.activePool.splice(existingIdx, 1);
    else { if (window.state.activePool.length >= 2) window.state.activePool.shift(); window.state.activePool.push({name, val}); }
    document.querySelectorAll('.trait-label').forEach(el => el.classList.toggle('selected', window.state.activePool.some(p => p.name === el.innerText)));
    const display = document.getElementById('pool-display');
    const hint = document.getElementById('specialty-hint');
    if (!hint && display) {
        const hDiv = document.createElement('div'); hDiv.id = 'specialty-hint'; hDiv.className = 'text-[9px] text-[#4ade80] mt-1 h-4 flex items-center';
        display.parentNode.insertBefore(hDiv, display.nextSibling);
    }
    if (window.state.activePool.length > 0) {
        setSafeText('pool-display', window.state.activePool.map(p => `${p.name} (${p.val})`).join(' + '));
        const specs = window.state.activePool.map(p => window.state.specialties[p.name]).filter(s => s); 
        const hintEl = document.getElementById('specialty-hint');
        if (hintEl) {
            if (specs.length > 0) {
                 const isApplied = document.getElementById('use-specialty')?.checked;
                 if(isApplied) hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`;
                 else {
                     hintEl.innerHTML = `<span>Possible Specialty: ${specs.join(', ')}</span><button id="apply-spec-btn" class="ml-2 bg-[#d4af37] text-black px-1 rounded hover:bg-white pointer-events-auto text-[9px] font-bold uppercase">APPLY</button>`;
                     const btn = document.getElementById('apply-spec-btn');
                     if(btn) btn.onclick = (e) => { e.stopPropagation(); const cb = document.getElementById('use-specialty'); if(cb) { cb.checked = true; window.showNotification(`Applied: ${specs.join(', ')}`); hintEl.innerHTML = `<span class="text-[#d4af37] font-bold">Specialty Active! (10s = 2 Successes)</span>`; } };
                 }
            } else hintEl.innerHTML = '';
        }
        document.getElementById('dice-tray').classList.add('open');
    } else window.clearPool();
};

window.rollPool = function() {
    const spendWP = document.getElementById('spend-willpower')?.checked;
    let autoSuccesses = 0;
    
    if (spendWP) {
        if ((window.state.status.tempWillpower || 0) > 0) {
             window.state.status.tempWillpower--;
             autoSuccesses = 1;
             window.updatePools();
             window.showNotification("Willpower spent: +1 Auto Success");
             document.getElementById('spend-willpower').checked = false; 
        } else {
            window.showNotification("Cannot spend Willpower: Pool is empty!");
            document.getElementById('spend-willpower').checked = false;
            return; 
        }
    }

    const custom = parseInt(document.getElementById('custom-dice-input')?.value) || 0;
    const poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0) + custom;
    
    if (poolSize <= 0 && autoSuccesses === 0) { window.showNotification("Pool Empty"); return; }
    
    const diff = parseInt(document.getElementById('roll-diff').value) || 6;
    const isSpec = document.getElementById('use-specialty').checked;
    
    let results = [], ones = 0, rawSuccesses = 0;
    for(let i=0; i<poolSize; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        results.push(die);
        if (die === 1) ones++;
        if (die >= diff) { if (isSpec && die === 10) rawSuccesses += 2; else rawSuccesses += 1; }
    }
    
    let net = Math.max(0, rawSuccesses - ones);
    net += autoSuccesses;

    let outcome = "", outcomeClass = "";
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
        else if (d >= diff) { c = 'text-[#d4af37] font-bold'; if (d === 10 && isSpec) c = 'text-[#4ade80] font-black'; }
        return `<span class="${c} text-3xl mx-1">${d}</span>`;
    }).join(' ');

    let extras = "";
    if (autoSuccesses > 0) extras = `<div class="text-[9px] text-blue-300 font-bold mt-1 text-center border-t border-[#333] pt-1 uppercase">Willpower Applied (+1 Success)</div>`;

    row.innerHTML = `<div class="flex justify-between border-b border-[#444] pb-1 mb-1"><span class="text-gray-400">Diff ${diff}${isSpec ? '*' : ''}</span><span class="${outcomeClass} font-black text-sm">${outcome}</span></div><div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>${extras}`;
    tray.insertBefore(row, tray.firstChild);
};

window.rollCombat = function(name, diff, attr, ability) {
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
};

window.toggleDiceTray = function() {
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.toggle('open');
};

// --- FRENZY ROLL FUNCTION ---
window.rollFrenzy = function() {
    const sc = window.state.dots.virt["Self-Control"] || 0;
    const inst = window.state.dots.virt["Instincts"] || 0;
    
    let traitName = "Self-Control";
    let traitVal = sc;
    
    if (inst > sc) {
        traitName = "Instincts";
        traitVal = inst;
    }
    if (traitVal < 1) traitVal = 1;

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    let difficulty = 6; 
    let diffMsg = "Standard Difficulty";

    if (clan === "Brujah") {
        difficulty += 2;
        diffMsg = "Brujah Curse (+2 Diff)";
    }

    let successes = 0;
    let rolls = [];
    let ones = 0;
    
    for(let i=0; i<traitVal; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        rolls.push(die);
        if (die >= difficulty) successes++;
        if (die === 1) ones++;
    }

    let net = Math.max(0, successes - ones);
    let outcome = "";
    
    if (successes === 0 && ones > 0) outcome = "BOTCH! The Beast takes over immediately!";
    else if (net === 0) outcome = "FAILURE! You succumb to Frenzy.";
    else if (net >= 5) outcome = "RIDING THE WAVE! You control the Frenzy.";
    else outcome = `SUCCESS (${net})! You resist for now.`;

    const tray = document.getElementById('roll-results');
    const row = document.createElement('div');
    row.className = 'bg-red-900/60 p-2 border border-red-500 text-[10px] mb-2 animate-in fade-in slide-in-from-right-4 duration-300';
    
    const diceRender = rolls.map(d => {
        let c = 'text-gray-400';
        if (d === 1) c = 'text-[#ff0000] font-bold';
        else if (d >= difficulty) c = 'text-[#d4af37] font-bold';
        return `<span class="${c} text-2xl mx-1">${d}</span>`;
    }).join(' ');

    row.innerHTML = `
        <div class="flex justify-between border-b border-red-500 pb-1 mb-1">
            <span class="text-red-200 font-bold">FRENZY CHECK (${traitName})</span>
            <span class="text-white font-bold text-xs">${outcome.split('!')[0]}</span>
        </div>
        <div class="text-center text-[9px] text-gray-300 mb-1">Diff ${difficulty} (${diffMsg})</div>
        <div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>
        <div class="text-center text-[9px] italic text-gray-400">${outcome}</div>
    `;
    
    tray.insertBefore(row, tray.firstChild);
    document.getElementById('dice-tray').classList.add('open');
};

window.setDots = function(name, type, val, min, max = 5) {
    if (window.state.isPlayMode) return;

    if (window.state.xpMode) {
        if (!window.state.xpLog) window.state.xpLog = [];
        let currentVal = 0;
        if (type === 'status') {
            if (name === 'Humanity') currentVal = window.state.status.humanity || 1;
            else if (name === 'Willpower') currentVal = window.state.status.willpower || 1;
        } else {
            currentVal = window.state.dots[type][name] || min;
        }
        if (val <= currentVal) { window.showNotification("Cannot lower traits in XP Mode."); return; }
        if (val > currentVal + 1) { window.showNotification("Purchase 1 dot at a time."); return; }
        
        const isClan = window.state.dots.disc && CLAN_DISCIPLINES[window.state.textFields['c-clan']]?.includes(name);
        const isCaitiff = window.state.textFields['c-clan'] === "Caitiff";
        let xpType = type;
        if (type === 'status') {
             if (name === 'Humanity') xpType = 'humanity';
             if (name === 'Willpower') xpType = 'willpower';
        }
        
        const cost = getXpCost(currentVal, xpType, isClan, isCaitiff);
        const totalXP = parseInt(document.getElementById('c-xp-total')?.value) || 0;
        let spentXP = window.state.xpLog.reduce((acc, log) => acc + log.cost, 0);
        const remaining = totalXP - spentXP;
        
        if (cost > remaining) { window.showNotification(`Need ${cost} XP. Have ${remaining}.`); return; }

        if (confirm(`Spend ${cost} XP to raise ${name} to ${val}?`)) {
            if (type === 'status') {
                if (name === 'Humanity') window.state.status.humanity = val;
                if (name === 'Willpower') { window.state.status.willpower = val; window.state.status.tempWillpower = val; }
            } else {
                window.state.dots[type][name] = val;
            }
            window.state.xpLog.push({ trait: name, old: currentVal, new: val, cost: cost, type: type, date: new Date().toISOString() });
            window.showNotification(`Purchased ${name} ${val} (${cost} XP)`);
            window.updatePools();
            renderPrintSheet();
        }
        return;
    }
    
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
        window.updatePools(); 
        renderPrintSheet();
        return;
    }

    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;

    if (!window.state.freebieMode) {
        if (type === 'attr') {
            let group = null; Object.keys(ATTRIBUTES).forEach(k => { if(ATTRIBUTES[k].includes(name)) group = k; });
            if (group) {
                 const limit = window.state.prios.attr[group];
                 if (limit === undefined) { window.showNotification(`Select priority for ${group}!`); return; }
                 let currentSpent = 0;
                 ATTRIBUTES[group].forEach(a => { if (a !== name) { const v = window.state.dots.attr[a] || 1; currentSpent += (v - 1); } });
                 if (currentSpent + (newVal - 1) > limit) { window.showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'abil') {
            if (newVal > 3) { window.showNotification("Max 3 dots in Abilities during creation!"); return; }
            let group = null; Object.keys(ABILITIES).forEach(k => { if(ABILITIES[k].includes(name)) group = k; });
            if (!group && window.state.customAbilityCategories && window.state.customAbilityCategories[name]) group = window.state.customAbilityCategories[name];
            if (group) {
                const limit = window.state.prios.abil[group];
                if (limit === undefined) { window.showNotification(`Select priority for ${group}!`); return; }
                let currentSpent = 0; ABILITIES[group].forEach(a => { if (a !== name) currentSpent += (window.state.dots.abil[a] || 0); });
                if (window.state.customAbilityCategories) { Object.keys(window.state.dots.abil).forEach(k => { if (k !== name && window.state.customAbilityCategories[k] === group) currentSpent += (window.state.dots.abil[k] || 0); }); }
                if (currentSpent + newVal > limit) { window.showNotification("Limit Exceeded!"); return; }
            }
        } else if (type === 'disc') {
            let currentSpent = 0; Object.keys(window.state.dots.disc).forEach(d => { if (d !== name) currentSpent += (window.state.dots.disc[d] || 0); });
            if (currentSpent + newVal > 3) { window.showNotification("Max 3 Creation Dots!"); return; }
        } else if (type === 'back') {
            let currentSpent = 0; Object.keys(window.state.dots.back).forEach(b => { if (b !== name) currentSpent += (window.state.dots.back[b] || 0); });
            if (currentSpent + newVal > 5) { window.showNotification("Max 5 Creation Dots!"); return; }
        } else if (type === 'virt') {
            let currentSpent = 0; VIRTUES.forEach(v => { if (v !== name) currentSpent += (window.state.dots.virt[v] || 1); });
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

    if (type === 'virt' && !window.state.isPlayMode && !window.state.freebieMode && !window.state.xpMode) {
         const delta = newVal - currentVal;
         if (delta !== 0) {
             if (name === 'Conscience' || name === 'Self-Control') {
                 if (window.state.status.humanity === undefined) window.state.status.humanity = 2;
                 window.state.status.humanity += delta;
                 if (window.state.status.humanity < 0) window.state.status.humanity = 0;
             }
             if (name === 'Courage') {
                 if (window.state.status.willpower === undefined) window.state.status.willpower = 1;
                 window.state.status.willpower += delta;
                 window.state.status.tempWillpower = window.state.status.willpower;
                 if (window.state.status.willpower < 0) window.state.status.willpower = 0;
             }
         }
    }

    if (type === 'attr' || type === 'abil') {
        refreshTraitRow(name, type);
    } else {
        document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(newVal, max));
    }
    window.updatePools();
    if(type === 'back') renderSocialProfile();
    renderPrintSheet();
};

window.updatePools = function() {
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

    Object.keys(ATTRIBUTES).forEach(cat => {
        let cs = 0; ATTRIBUTES[cat].forEach(a => cs += ((window.state.dots.attr[a] || 1) - 1));
        const targetId = (cat === 'Social') ? 'p-social' : (cat === 'Mental') ? 'p-mental' : 'p-phys';
        setSafeText(targetId, `[${Math.max(0, (window.state.prios.attr[cat] || 0) - cs)}]`);
    });
    
    Object.keys(ABILITIES).forEach(cat => {
        let cs = 0; ABILITIES[cat].forEach(a => cs += (window.state.dots.abil[a] || 0));
        if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) cs += window.state.dots.abil[name]; }); }
        setSafeText('p-' + cat.toLowerCase().slice(0,3), `[${Math.max(0, (window.state.prios.abil[cat] || 0) - cs)}]`);
    });
    
    const discSpent = Object.values(window.state.dots.disc || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-disc', `[${Math.max(0, 3 - discSpent)}]`);
    const backSpent = Object.values(window.state.dots.back || {}).reduce((a, b) => a + b, 0);
    setSafeText('p-back', `[${Math.max(0, 5 - backSpent)}]`);
    const virtTotalDots = VIRTUES.reduce((a, v) => a + (window.state.dots.virt[v] || 1), 0);
    setSafeText('p-virt', `[${Math.max(0, 7 - (virtTotalDots - 3))}]`);

    if (window.state.freebieMode) {
         const logEntries = [];
         let totalFreebieCost = 0;
         let totalFlawBonus = 0;

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

         const dDiff = Math.max(0, discSpent - 3);
         const dCost = dDiff * 7;
         setSafeText('sb-disc', dCost);
         totalFreebieCost += dCost;
         if(dCost > 0) logEntries.push(`Disciplines (+${dDiff}): ${dCost} pts`);

         const bgDiff = Math.max(0, backSpent - 5);
         const bgCost = bgDiff * 1;
         setSafeText('sb-back', bgCost);
         totalFreebieCost += bgCost;
         if(bgCost > 0) logEntries.push(`Backgrounds (+${bgDiff}): ${bgCost} pts`);

         const vDiff = Math.max(0, virtTotalDots - 10);
         const vCost = vDiff * 2;
         setSafeText('sb-virt', vCost);
         totalFreebieCost += vCost;
         if(vCost > 0) logEntries.push(`Virtues (+${vDiff}): ${vCost} pts`);

         const hDiff = Math.max(0, curH - bH); 
         const hCost = hDiff * 1;
         setSafeText('sb-human', hCost);
         totalFreebieCost += hCost;
         if(hCost > 0) logEntries.push(`Humanity (+${hDiff}): ${hCost} pts`);

         const wDiff = Math.max(0, curW - bW); 
         const wCost = wDiff * 1;
         setSafeText('sb-will', wCost);
         totalFreebieCost += wCost;
         if(wCost > 0) logEntries.push(`Willpower (+${wDiff}): ${wCost} pts`);

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

         const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
         const available = limit + cappedBonus;
         const remaining = available - totalFreebieCost;
         
         setSafeText('f-total-top', remaining);
         setSafeText('sb-total', remaining);
         const totalEl = document.getElementById('sb-total');
         if(totalEl) totalEl.className = remaining >= 0 ? "text-green-400 font-bold" : "text-red-500 font-bold animate-pulse";
         if(remaining < 0) document.getElementById('f-total-top').classList.add('text-red-500'); 
         else document.getElementById('f-total-top').classList.remove('text-red-500');

         const logContainer = document.getElementById('freebie-log-recent');
         if(logContainer) {
             if (logEntries.length === 0) logContainer.innerHTML = '<span class="text-gray-600 italic">No freebies spent...</span>';
             else logContainer.innerHTML = logEntries.map(e => `<div class="border-b border-[#333] py-1 text-gray-300 text-[9px]">${e}</div>`).join('');
         }

         document.getElementById('freebie-sidebar').classList.add('active'); 
    } else {
         document.getElementById('freebie-sidebar').classList.remove('active');
    }

    if (window.state.xpMode) {
        renderXpSidebar();
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
    document.querySelectorAll('#willpower-boxes-play').forEach(el => {
        let h = '';
        const temp = window.state.status.tempWillpower !== undefined ? window.state.status.tempWillpower : 5;
        for(let i=0; i<10; i++) {
             h += `<span class="box ${i < temp ? 'checked' : ''}" data-v="${i+1}" data-type="wp"></span>`;
        }
        el.innerHTML = h;
    });
    
    const bpContainer = document.querySelectorAll('#blood-boxes-play');
    bpContainer.forEach(el => {
        let h = '';
        const currentBlood = window.state.status.blood || 0;
        const maxBloodForGen = lim.m;
        for (let i = 1; i <= 20; i++) {
            let classes = "box";
            if (i <= currentBlood) classes += " checked";
            if (i > maxBloodForGen) classes += " cursor-not-allowed opacity-50 bg-[#1a1a1a]"; else classes += " cursor-pointer";
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
    updateWalkthrough();

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

    document.querySelectorAll('.box').forEach(b => {
        b.onclick = (e) => {
            e.stopPropagation();
            const t = b.dataset.type;
            const v = parseInt(b.dataset.v);
            window.handleBoxClick(t, v, b);
        };
    });
};

window.removeInventory = (idx) => { window.state.inventory.splice(idx, 1); renderInventoryList(); };
window.toggleInvStatus = (idx) => { const item = window.state.inventory[idx]; item.status = item.status === 'carried' ? 'owned' : 'carried'; renderInventoryList(); };

window.updateWalkthrough = function() {
    if (!window.state) return;
    
    const nav = document.getElementById('sheet-nav');
    if (nav && !window.state.isPlayMode) {
         const current = window.state.currentPhase;
         const furthest = window.state.furthestPhase || 1;
         
         if (checkStepComplete(current, window.state)) {
             if (current === furthest && current < 8) {
                 window.state.furthestPhase = current + 1;
                 window.changeStep(current);
             }
         }
         
         const guideMsg = document.getElementById('guide-message');
         const guideIcon = document.getElementById('guide-icon');
         if (guideMsg && guideIcon) {
             const isComplete = checkStepComplete(current, window.state);
             if (isComplete) {
                 guideMsg.innerText = "Step Complete! Proceed...";
                 guideMsg.classList.add('text-green-400');
                 guideIcon.classList.add('ready');
             } else {
                 guideMsg.classList.remove('text-green-400');
                 guideIcon.classList.remove('ready');
                 if (current === 1) guideMsg.innerText = "Enter Name & Clan...";
                 else if (current === 2) guideMsg.innerText = "Select Attributes...";
                 else guideMsg.innerText = "Complete Requirements...";
             }
         }
    }
    renderPrintSheet();
};

window.nextStep = function() {
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    if (current < furthest) window.changeStep(furthest);
    else if (checkStepComplete(current, window.state)) { if (current < 8) window.changeStep(current + 1); else window.showNotification("Character Ready!"); } 
    else window.showNotification("Complete current step first!");
};

window.changeStep = function(s) {
    if (!window.state.furthestPhase || s > window.state.furthestPhase) { if (s > (window.state.furthestPhase || 0)) window.state.furthestPhase = s; }
    document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
    const prefix = window.state.isPlayMode ? 'play-mode-' : 'phase-';
    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             const steps = ["Sheet", "Traits", "Social", "Biography"];
             steps.forEach((text, i) => {
                 const it = document.createElement('div'); it.className = `nav-item ${window.state.currentPhase === (i+1) ? 'active' : ''}`;
                 it.innerHTML = `<i class="fas fa-scroll"></i><span style="display:block; font-size:9px; margin-top:2px;">${text}</span>`;
                 it.onclick = () => window.changeStep(i+1); nav.appendChild(it);
             });
        } else {
            const furthest = window.state.furthestPhase || 1;
            STEPS_CONFIG.forEach(step => {
                const it = document.createElement('div'); let statusClass = '';
                if (step.id === s) statusClass = 'active'; else if (step.id < s) statusClass = 'completed'; else if (step.id <= furthest) statusClass = 'unlocked'; else statusClass = 'locked';
                it.className = `nav-item ${statusClass}`;
                it.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full"><i class="fas ${step.icon}"></i><span style="display:block !important; font-size:7px; text-transform:uppercase; margin-top:2px; opacity:1;">${step.label}</span></div>`;
                it.onclick = () => { if (step.id <= furthest) window.changeStep(step.id); };
                nav.appendChild(it);
            });
        }
    }
    window.updatePools();
};

window.toggleFreebieMode = function() {
     window.state.freebieMode = !window.state.freebieMode;
     if (window.state.freebieMode && window.state.xpMode) window.toggleXpMode();
     document.body.classList.toggle('freebie-mode', window.state.freebieMode);
     const fbBtn = document.getElementById('toggle-freebie-btn');
     const fbBtnText = document.getElementById('freebie-btn-text');
     if (fbBtnText) fbBtnText.innerText = window.state.freebieMode ? "Exit Freebies" : "Freebies";
     if (fbBtn) { fbBtn.classList.toggle('bg-blue-900/40', window.state.freebieMode); fbBtn.classList.toggle('border-blue-500', window.state.freebieMode); fbBtn.classList.toggle('text-blue-200', window.state.freebieMode); }
     const mMsg = document.getElementById('merit-locked-msg'); const fMsg = document.getElementById('flaw-locked-msg');
     if(mMsg) mMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     if(fMsg) fMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     window.fullRefresh(); // Triggers re-renders
};

window.toggleSidebarLedger = function() { document.getElementById('freebie-sidebar').classList.toggle('open'); };
window.toggleXpSidebarLedger = function() { document.getElementById('xp-sidebar').classList.toggle('open'); };

window.toggleXpMode = function() {
    window.state.xpMode = !window.state.xpMode;
    document.body.classList.toggle('xp-mode', window.state.xpMode);
    
    const btn = document.getElementById('toggle-xp-btn');
    if(btn) {
        btn.classList.toggle('bg-purple-900/40', window.state.xpMode);
        btn.classList.toggle('border-purple-500', window.state.xpMode);
        btn.classList.toggle('text-purple-200', window.state.xpMode);
        const txt = document.getElementById('xp-btn-text');
        if(txt) txt.innerText = window.state.xpMode ? "Exit Experience" : "Experience";
    }

    if (window.state.xpMode && window.state.freebieMode) window.toggleFreebieMode();

    const sb = document.getElementById('xp-sidebar');
    if(sb) {
        if(window.state.xpMode) {
            sb.classList.remove('hidden');
            setTimeout(() => sb.classList.add('open'), 10);
            renderXpSidebar();
        } else {
            sb.classList.remove('open');
            setTimeout(() => sb.classList.add('hidden'), 300);
        }
    }
    window.fullRefresh();
};
