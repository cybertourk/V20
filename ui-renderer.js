import { 
    ATTRIBUTES, ABILITIES, DISCIPLINES, BACKGROUNDS, VIRTUES, 
    V20_MERITS_LIST, V20_FLAWS_LIST, STEPS_CONFIG, GEN_LIMITS, 
    HEALTH_STATES, SPECIALTY_EXAMPLES, VIT, DERANGEMENTS, 
    V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLE_LIST, CLAN_WEAKNESSES 
} from "./data.js";

import { 
    calculateTotalFreebiesSpent, 
    checkCreationComplete, 
    checkStepComplete, 
    BROAD_ABILITIES 
} from "./v20-rules.js";

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

export function renderDots(count, max = 5) { 
    let h = ''; 
    for(let i=1; i<=max; i++) h += `<span class="dot ${i <= count ? 'filled' : ''}" data-v="${i}"></span>`; 
    return h; 
}

export function renderBoxes(count, checked = 0, type = '') { 
    let h = ''; 
    for(let i=1; i<=count; i++) h += `<span class="box ${i <= checked ? 'checked' : ''}" data-v="${i}" data-type="${type}"></span>`; 
    return h; 
}

export function hydrateInputs() {
    if(!window.state || !window.state.textFields) return;
    Object.entries(window.state.textFields).forEach(([id, val]) => { 
        const el = document.getElementById(id); 
        if (el) el.value = val; 
    });
}

export function renderSocialProfile() {
    const list = document.getElementById('social-profile-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (window.state.dots.back) {
        Object.entries(window.state.dots.back).forEach(([name, val]) => {
            if (val > 0) {
                const safeId = 'desc-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const box = document.createElement('div');
                box.className = 'flex flex-col gap-1';
                const existingVal = window.state.textFields[safeId] || "";
                
                box.innerHTML = `
                    <label class="label-text text-gold">${name} (${val} dots)</label>
                    <textarea id="${safeId}" class="h-20 w-full text-xs bg-black/40 border border-[#333] text-white p-2" placeholder="Describe your ${name}...">${existingVal}</textarea>
                `;
                list.appendChild(box);
                const ta = box.querySelector('textarea');
                ta.onblur = (e) => { window.state.textFields[safeId] = e.target.value; };
            }
        });
    }
    
    if (list.innerHTML === '') {
        list.innerHTML = '<div class="text-gray-500 italic text-xs">Select Backgrounds in Step 4 to add descriptions here.</div>';
    }
}

export function setupInventoryListeners() {
    const typeSelect = document.getElementById('inv-type');
    const baseSelect = document.getElementById('inv-base-select');
    const baseWrapper = document.getElementById('inv-base-wrapper');
    const addBtn = document.getElementById('add-inv-btn');
    
    if(!typeSelect || !addBtn) return; 

    typeSelect.onchange = () => {
        const t = typeSelect.value;
        document.getElementById('inv-stats-row').classList.toggle('hidden', t !== 'Weapon');
        document.getElementById('inv-armor-row').classList.toggle('hidden', t !== 'Armor');
        document.getElementById('inv-vehicle-row').classList.toggle('hidden', t !== 'Vehicle');
        
        if (['Weapon', 'Armor', 'Vehicle'].includes(t)) {
            baseWrapper.classList.remove('hidden');
            baseSelect.innerHTML = '<option value="">-- Custom / Manual --</option>';
            let source = [];
            if(t==='Weapon') source = V20_WEAPONS_LIST;
            if(t==='Armor') source = V20_ARMOR_LIST;
            if(t==='Vehicle') source = V20_VEHICLE_LIST;
            source.forEach((item, i) => { baseSelect.add(new Option(item.name, i)); });
        } else {
            baseWrapper.classList.add('hidden');
            baseSelect.innerHTML = '';
        }
    };

    baseSelect.onchange = () => {
        const t = typeSelect.value;
        const idx = baseSelect.value;
        if (idx === "") return;
        let item = null;
        if(t==='Weapon') item = V20_WEAPONS_LIST[idx];
        if(t==='Armor') item = V20_ARMOR_LIST[idx];
        if(t==='Vehicle') item = V20_VEHICLE_LIST[idx];
        
        if (item) {
            document.getElementById('inv-name').value = item.name;
            if (t==='Weapon') {
                document.getElementById('inv-diff').value = item.diff;
                document.getElementById('inv-dmg').value = item.dmg;
                document.getElementById('inv-range').value = item.range;
                document.getElementById('inv-rate').value = item.rate;
                document.getElementById('inv-clip').value = item.clip;
            }
            if (t==='Armor') {
                document.getElementById('inv-rating').value = item.rating;
                document.getElementById('inv-penalty').value = item.penalty;
            }
            if (t==='Vehicle') {
                document.getElementById('inv-safe').value = item.safe;
                document.getElementById('inv-max').value = item.max;
                document.getElementById('inv-man').value = item.man;
            }
        }
    };

    addBtn.onclick = () => {
        const type = typeSelect.value;
        const name = document.getElementById('inv-name').value || "Unnamed Item";
        const isCarried = document.getElementById('inv-carried').checked;
        
        const newItem = { type, name, displayName: name, status: isCarried ? 'carried' : 'owned', stats: {} };
        if (baseSelect.value !== "") newItem.baseType = baseSelect.options[baseSelect.selectedIndex].text;

        if (type === 'Weapon') {
            newItem.stats = {
                diff: document.getElementById('inv-diff').value || 6,
                dmg: document.getElementById('inv-dmg').value || "",
                range: document.getElementById('inv-range').value || "",
                rate: document.getElementById('inv-rate').value || "",
                clip: document.getElementById('inv-clip').value || ""
            };
        } else if (type === 'Armor') {
            newItem.stats = { rating: document.getElementById('inv-rating').value || 0, penalty: document.getElementById('inv-penalty').value || 0 };
        } else if (type === 'Vehicle') {
            newItem.stats = { safe: document.getElementById('inv-safe').value || "", max: document.getElementById('inv-max').value || "", man: document.getElementById('inv-man').value || "" };
        }

        if (!window.state.inventory) window.state.inventory = [];
        window.state.inventory.push(newItem);
        document.getElementById('inv-name').value = "";
        baseSelect.value = "";
        renderInventoryList();
        window.showNotification("Item Added");
    };
}

export function renderInventoryList() {
    const listCarried = document.getElementById('inv-list-carried');
    const listOwned = document.getElementById('inv-list-owned');
    const listVehicles = document.getElementById('vehicle-list');
    
    if(listCarried) listCarried.innerHTML = '';
    if(listOwned) listOwned.innerHTML = '';
    if(listVehicles) listVehicles.innerHTML = '';
    
    if(!listCarried || !listOwned || !listVehicles || !window.state || !window.state.inventory) return;
    
    window.state.inventory.forEach((item, idx) => {
        const d = document.createElement('div');
        d.className = "flex justify-between items-center bg-black/40 border border-[#333] p-1 text-[10px] mb-1";
        let displayName = item.displayName || item.name;
        if(item.type === 'Weapon' && item.baseType && item.baseType !== displayName) displayName += ` <span class="text-gray-500">[${item.baseType}]</span>`;
        let details = "";
        if(item.type === 'Weapon') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Diff:${item.stats.diff} Dmg:${item.stats.dmg} Rng:${item.stats.range}</div>`;
        else if(item.type === 'Armor') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Rating:${item.stats.rating} Penalty:${item.stats.penalty}</div>`;
        else if(item.type === 'Vehicle') details = `<div class="text-gray-400 text-[9px] mt-0.5 ml-1">Safe:${item.stats.safe} Max:${item.stats.max} Man:${item.stats.man}</div>`;
        const statusColor = item.status === 'carried' ? 'text-green-400' : 'text-gray-500';
        const statusLabel = item.status === 'carried' ? 'CARRIED' : 'OWNED';
        d.innerHTML = `
            <div class="flex-1 overflow-hidden mr-2"><div class="font-bold text-white uppercase truncate" title="${item.displayName || item.name}">${displayName}</div>${details}</div>
            <div class="flex items-center gap-2 flex-shrink-0">
                ${item.type !== 'Vehicle' ? `<button class="${statusColor} font-bold text-[8px] border border-[#333] px-1 hover:bg-[#222]" onclick="window.toggleInvStatus(${idx})">${statusLabel}</button>` : ''}
                <button class="text-red-500 font-bold px-1 hover:text-red-300" onclick="window.removeInventory(${idx})">&times;</button>
            </div>`;
        if (item.type === 'Vehicle') listVehicles.appendChild(d);
        else { if (item.status === 'carried') listCarried.appendChild(d); else listOwned.appendChild(d); }
    });
    window.updatePools();
}

window.removeInventory = (idx) => { window.state.inventory.splice(idx, 1); renderInventoryList(); };
window.toggleInvStatus = (idx) => { const item = window.state.inventory[idx]; item.status = item.status === 'carried' ? 'owned' : 'carried'; renderInventoryList(); };

window.clearPool = function() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    const hint = document.getElementById('specialty-hint'); if(hint) hint.innerHTML = '';
    const cb = document.getElementById('use-specialty'); if(cb) cb.checked = false;
    // Don't close tray automatically on clear, allow manual control
    // document.getElementById('dice-tray').classList.remove('open');
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
    } else {
        window.clearPool();
    }
};

window.rollPool = function() {
    const poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0);
    if (poolSize <= 0) { window.showNotification("Pool Empty"); return; }
    const diff = parseInt(document.getElementById('roll-diff').value) || 6;
    const isSpec = document.getElementById('use-specialty').checked;
    let results = [], ones = 0, rawSuccesses = 0;
    for(let i=0; i<poolSize; i++) {
        const die = Math.floor(Math.random() * 10) + 1;
        results.push(die);
        if (die === 1) ones++;
        if (die >= diff) { if (isSpec && die === 10) rawSuccesses += 2; else rawSuccesses += 1; }
    }
    let net = rawSuccesses - ones;
    let outcome = "", outcomeClass = "";
    if (rawSuccesses === 0 && ones > 0) { outcome = "BOTCH"; outcomeClass = "dice-botch"; } 
    else if (net <= 0) { outcome = "FAILURE"; outcomeClass = "text-gray-400"; } 
    else { outcome = `${net} SUCCESS${net > 1 ? 'ES' : ''}`; outcomeClass = "dice-success"; }
    const tray = document.getElementById('roll-results');
    const row = document.createElement('div');
    row.className = 'bg-black/60 p-2 border border-[#333] text-[10px] mb-2 animate-in fade-in slide-in-from-right-4 duration-300';
    const diceRender = results.map(d => {
        let c = 'text-gray-500';
        if (d === 1) c = 'text-[#ff0000] font-bold';
        else if (d >= diff) { c = 'text-[#d4af37] font-bold'; if (d === 10 && isSpec) c = 'text-[#4ade80] font-black'; }
        return `<span class="${c} text-3xl mx-1">${d}</span>`;
    }).join(' ');
    row.innerHTML = `<div class="flex justify-between border-b border-[#444] pb-1 mb-1"><span class="text-gray-400">Diff ${diff}${isSpec ? '*' : ''}</span><span class="${outcomeClass} font-black text-sm">${outcome}</span></div><div class="tracking-widest flex flex-wrap justify-center py-2">${diceRender}</div>`;
    tray.insertBefore(row, tray.firstChild);
};

// --- UPDATED COMBAT ROLL FUNCTION ---
window.rollCombat = function(name, diff, attr, ability) {
    window.clearPool();
    
    // 1. Add Attribute
    const attrVal = window.state.dots.attr[attr] || 1;
    window.state.activePool.push({name: attr, val: attrVal});
    
    // 2. Add Ability
    const abilVal = window.state.dots.abil[ability] || 0;
    window.state.activePool.push({name: ability, val: abilVal});

    // 3. Highlight Traits UI
    document.querySelectorAll('.trait-label').forEach(el => {
        if (el.innerText === attr || el.innerText === ability) el.classList.add('selected');
        else el.classList.remove('selected');
    });

    // 4. Set Difficulty
    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = diff;

    // 5. Update Pool Display
    const display = document.getElementById('pool-display');
    if (display) setSafeText('pool-display', `${attr} (${attrVal}) + ${ability} (${abilVal})`);

    // 6. Ensure Tray is Open
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');
};

window.toggleDiceTray = function() {
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.toggle('open');
}

window.updatePools = function() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
    const bW = (window.state.dots.virt?.Courage || 1);

    if (!window.state.freebieMode && !window.state.isPlayMode) {
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
         const totalSpent = calculateTotalFreebiesSpent(window.state);
         setSafeText('f-total-top', totalSpent); 
         let attrDots = 0; Object.keys(ATTRIBUTES).forEach(cat => ATTRIBUTES[cat].forEach(a => attrDots += (window.state.dots.attr[a] || 1)));
         setSafeText('sb-attr', Math.max(0, attrDots - 24) * 5);
         let abilDots = 0; Object.keys(ABILITIES).forEach(cat => { ABILITIES[cat].forEach(a => abilDots += (window.state.dots.abil[a] || 0)); if (window.state.customAbilityCategories) { Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { if (c === cat && window.state.dots.abil[name]) abilDots += window.state.dots.abil[name]; }); } });
         setSafeText('sb-abil', Math.max(0, abilDots - 27) * 2);
         setSafeText('sb-disc', Math.max(0, discSpent - 3) * 7);
         setSafeText('sb-back', Math.max(0, backSpent - 5) * 1);
         setSafeText('sb-virt', Math.max(0, (virtTotalDots-3) - 7) * 2);
         const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
         const bW = (window.state.dots.virt?.Courage || 1);
         const cH = window.state.status.humanity !== undefined ? window.state.status.humanity : bH;
         const cW = window.state.status.willpower !== undefined ? window.state.status.willpower : bW;
         setSafeText('sb-human', Math.max(0, cH - bH) * 2);
         setSafeText('sb-will', Math.max(0, cW - bW) * 1);
         let mfCost = 0, mfBonus = 0;
         if (window.state.merits) window.state.merits.forEach(m => mfCost += (parseInt(m.val) || 0));
         if (window.state.flaws) window.state.flaws.forEach(f => mfBonus += (parseInt(f.val) || 0));
         const cappedBonus = Math.min(mfBonus, 7);
         setSafeText('sb-merit', mfCost);
         setSafeText('sb-flaw', `+${cappedBonus}`);
         const limit = parseInt(document.getElementById('c-freebie-total')?.value) || 15;
         setSafeText('sb-total', limit - totalSpent);
         document.getElementById('freebie-sidebar').classList.add('active'); 
    } else {
         document.getElementById('freebie-sidebar').classList.remove('active');
    }

    const fbBtn = document.getElementById('toggle-freebie-btn');
    if (fbBtn) {
        const complete = checkCreationComplete(window.state);
        if (!window.state.freebieMode) fbBtn.disabled = !complete.complete; else fbBtn.disabled = false; 
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
        p8h.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Humanity', 'status', parseInt(e.target.dataset.v), 1, 10); };
    }
    const p8w = document.getElementById('phase8-willpower-dots');
    if(p8w) {
        p8w.innerHTML = renderDots(curW, 10);
        p8w.onclick = (e) => { if (window.state.freebieMode && e.target.dataset.v) setDots('Willpower', 'status', parseInt(e.target.dataset.v), 1, 10); };
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
    
    const weaknessCont = document.getElementById('weakness-play-container');
    if (weaknessCont) {
        weaknessCont.innerHTML = '';
        const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
        const weaknessText = CLAN_WEAKNESSES[clan] || "Select a Clan to see weakness.";
        const customNote = window.state.textFields['custom-weakness'] || "";
        weaknessCont.innerHTML = `
            <div class="section-title">Weakness</div>
            <div class="bg-[#111] p-3 border border-[#333] h-full flex flex-col mt-2">
                <div class="text-[11px] text-gray-300 italic mb-3 leading-snug flex-1">${weaknessText}</div>
                <div class="text-[9px] font-bold text-gray-500 mb-1 uppercase">Specifics / Notes</div>
                <textarea id="custom-weakness-input" class="w-full h-16 bg-black border border-[#444] text-[10px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="e.g. 'Only Brunettes'">${customNote}</textarea>
            </div>
        `;
        const ta = document.getElementById('custom-weakness-input');
        if(ta) {
            ta.addEventListener('blur', (e) => {
                if(!window.state.textFields) window.state.textFields = {};
                window.state.textFields['custom-weakness'] = e.target.value;
            });
        }
    }

    const xpCont = document.getElementById('experience-play-container');
    if (xpCont) {
        xpCont.innerHTML = '';
        const xpVal = window.state.textFields['xp-points'] || "";
        xpCont.innerHTML = `
            <div class="section-title mt-6">Experience</div>
            <textarea id="xp-points-input" class="w-full h-24 mt-2 bg-[#111] border border-[#333] text-[11px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="Log experience points here...">${xpVal}</textarea>
        `;
        const xpTa = document.getElementById('xp-points-input');
        if(xpTa) {
            xpTa.addEventListener('blur', (e) => {
                if(!window.state.textFields) window.state.textFields = {};
                window.state.textFields['xp-points'] = e.target.value;
            });
        }
    }

    const bptInput = document.getElementById('blood-per-turn-input');
    if (bptInput) {
        const savedBPT = window.state.status.blood_per_turn || 1;
        bptInput.value = savedBPT;
        bptInput.onchange = (e) => {
            window.state.status.blood_per_turn = parseInt(e.target.value) || 1;
        };
    }

    // --- PERMANENT DICE ROLLER TOGGLE ---
    const topBar = document.querySelector('.top-bar-right');
    if (topBar && !document.getElementById('dice-toggle-btn')) {
        const diceBtn = document.createElement('button');
        diceBtn.id = 'dice-toggle-btn';
        diceBtn.className = 'top-btn hidden'; // Hidden by default, shown in Play Mode
        diceBtn.innerHTML = '<i class="fas fa-dice"></i> Roller';
        diceBtn.onclick = window.toggleDiceTray;
        topBar.insertBefore(diceBtn, topBar.firstChild);
    }

    window.changeStep(1); 
    
    // Initial Toggle State Check
    if (window.state.isPlayMode) {
        const btn = document.getElementById('dice-toggle-btn');
        if (btn) btn.classList.remove('hidden');
    }
};

window.hydrateInputs = hydrateInputs;
window.renderSocialProfile = renderSocialProfile;
window.setupInventoryListeners = setupInventoryListeners;
window.renderInventoryList = renderInventoryList;
window.refreshTraitRow = refreshTraitRow;
window.renderRow = renderRow;
window.setDots = setDots;
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;
window.renderDynamicTraitRow = renderDynamicTraitRow;
window.renderBloodBondRow = renderBloodBondRow;
window.renderDerangementsList = renderDerangementsList;
window.renderDynamicHavenRow = renderDynamicHavenRow;
window.updateWalkthrough = updateWalkthrough;

// --- EXPORT ROLL COMBAT ---
window.rollCombat = function(name, diff, attr, ability) {
    window.clearPool();
    
    // 1. Add Attribute
    const attrVal = window.state.dots.attr[attr] || 1;
    window.state.activePool.push({name: attr, val: attrVal});
    
    // 2. Add Ability
    const abilVal = window.state.dots.abil[ability] || 0;
    window.state.activePool.push({name: ability, val: abilVal});

    // 3. Highlight Traits UI
    document.querySelectorAll('.trait-label').forEach(el => {
        if (el.innerText === attr || el.innerText === ability) el.classList.add('selected');
        else el.classList.remove('selected');
    });

    // 4. Set Difficulty
    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = diff;

    // 5. Update Pool Display
    const display = document.getElementById('pool-display');
    if (display) setSafeText('pool-display', `${attr} (${attrVal}) + ${ability} (${abilVal})`);

    // 6. Ensure Tray is Open
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');
};

// --- EXPORT TOGGLE DICE TRAY ---
window.toggleDiceTray = function() {
    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.toggle('open');
};

window.togglePlayMode = function() {
    window.state.isPlayMode = !window.state.isPlayMode;
    document.body.classList.toggle('play-mode', window.state.isPlayMode);
    const pBtn = document.getElementById('play-mode-btn'); const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = window.state.isPlayMode ? "Edit" : "Play";
    
    // Toggle Dice Button Visibility
    const diceBtn = document.getElementById('dice-toggle-btn');
    if (diceBtn) {
        if (window.state.isPlayMode) diceBtn.classList.remove('hidden');
        else diceBtn.classList.add('hidden');
    }

    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value', 'custom-weakness-input', 'xp-points-input', 'blood-per-turn-input'].includes(el.id)) return;
        el.disabled = window.state.isPlayMode;
    });

    const playSheet = document.getElementById('play-mode-sheet');
    const phases = document.querySelectorAll('.step-container');

    if (window.state.isPlayMode) {
        phases.forEach(el => el.classList.add('hidden'));
        phases.forEach(el => el.classList.remove('active')); 

        if (playSheet) {
            playSheet.classList.remove('hidden');
            playSheet.style.display = 'block'; 
        }

        const row = document.getElementById('play-concept-row');
        if (row) {
            const getVal = (id) => document.getElementById(id)?.value || '';
            row.innerHTML = `
                <div><span class="label-text">Name:</span> <span class="text-white font-bold">${getVal('c-name')}</span></div>
                <div><span class="label-text">Player:</span> <span class="text-white font-bold">${getVal('c-player')}</span></div>
                <div><span class="label-text">Chronicle:</span> <span class="text-white font-bold">${getVal('c-chronicle')}</span></div>
                <div><span class="label-text">Nature:</span> <span class="text-white font-bold">${getVal('c-nature')}</span></div>
                <div><span class="label-text">Demeanor:</span> <span class="text-white font-bold">${getVal('c-demeanor')}</span></div>
                <div><span class="label-text">Concept:</span> <span class="text-white font-bold">${getVal('c-concept')}</span></div>
                <div><span class="label-text">Clan:</span> <span class="text-white font-bold">${getVal('c-clan')}</span></div>
                <div><span class="label-text">Generation:</span> <span class="text-white font-bold">${getVal('c-gen')}</span></div>
                <div><span class="label-text">Sire:</span> <span class="text-white font-bold">${getVal('c-sire')}</span></div>
            `;
        }
        
        const ra = document.getElementById('play-row-attr'); 
        if (ra) {
            ra.innerHTML = '';
            Object.entries(ATTRIBUTES).forEach(([c,l]) => { 
                const s = document.createElement('div'); 
                s.className='sheet-section !mt-0'; 
                s.innerHTML=`<div class="column-title">${c}</div>`; 
                ra.appendChild(s); 
                l.forEach(a=>renderRow(s,a,'attr',1)); 
            });
        }
        
        const rb = document.getElementById('play-row-abil'); 
        if (rb) {
            rb.innerHTML = '';
            Object.entries(ABILITIES).forEach(([c,l]) => { 
                const s = document.createElement('div'); 
                s.className='sheet-section !mt-0'; 
                s.innerHTML=`<div class="column-title">${c}</div>`; 
                rb.appendChild(s);
                l.forEach(a=>renderRow(s,a,'abil',0)); 
            });
        }
        
        const rc = document.getElementById('play-row-adv'); 
        if (rc) {
            rc.innerHTML = '';
            const ds = document.createElement('div'); ds.className='sheet-section !mt-0'; ds.innerHTML='<div class="column-title">Disciplines</div>';
            rc.appendChild(ds);
            Object.entries(window.state.dots.disc).forEach(([n,v]) => { if(v>0) renderRow(ds,n,'disc',0); }); 
            
            const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
            rc.appendChild(bs);
            Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) renderRow(bs,n,'back',0); }); 
            
            const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
            rc.appendChild(vs);
            VIRTUES.forEach(v => renderRow(vs, v, 'virt', 1)); 
        }
        
        const pg = document.getElementById('play-social-grid'); if(pg) {
            pg.innerHTML = ''; BACKGROUNDS.forEach(s => { const dots = window.state.dots.back[s] || 0; const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); const el = document.getElementById(safeId); const txt = el ? el.value : ""; if(dots || txt) pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`; });
        }

        const pb = document.getElementById('play-blood-bonds'); if(pb) {
            pb.innerHTML = ''; window.state.bloodBonds.forEach(b => { const label = b.type === 'Bond' ? (b.rating == 3 ? 'Full Bond' : `Drink ${b.rating}`) : `Vinculum ${b.rating}`; pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; });
        }

        const mf = document.getElementById('merit-flaw-rows-play'); if(mf) {
            mf.innerHTML = ''; if(window.state.merits) window.state.merits.forEach(m => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${m.name}</span><span class="text-red-400 font-bold">${m.val}</span></div>`; }); if(window.state.flaws) window.state.flaws.forEach(f => { mf.innerHTML += `<div class="flex justify-between text-xs py-1 border-b border-[#222]"><span>${f.name}</span><span class="text-green-400 font-bold">${f.val}</span></div>`; });
        }

        const ot = document.getElementById('other-traits-rows-play'); if(ot) {
            ot.innerHTML = ''; Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) renderRow(ot, n, 'other', 0); });
        }
        
        const plv = document.getElementById('play-vitals-list'); if(plv) {
            plv.innerHTML = ''; VIT.forEach(v => { const val = document.getElementById('bio-' + v)?.value; if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; });
        }

        const cp = document.getElementById('combat-rows-play'); 
        if(cp) {
            cp.innerHTML = ''; 
            // V20 Official Combat Maneuvers
            const standards = [
                {n:'Bite', diff:6, dmg:'Str+1(A)', attr:'Dexterity', abil:'Brawl'},
                {n:'Block', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Brawl'},
                {n:'Claw', diff:6, dmg:'Str+1(A)', attr:'Dexterity', abil:'Brawl'},
                {n:'Clinch', diff:6, dmg:'Str(C)', attr:'Strength', abil:'Brawl'},
                {n:'Disarm', diff:7, dmg:'Special', attr:'Dexterity', abil:'Melee'},
                {n:'Dodge', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Athletics'},
                {n:'Hold', diff:6, dmg:'None (C)', attr:'Strength', abil:'Brawl'},
                {n:'Kick', diff:7, dmg:'Str+1', attr:'Dexterity', abil:'Brawl'},
                {n:'Parry', diff:6, dmg:'None (R)', attr:'Dexterity', abil:'Melee'},
                {n:'Strike', diff:6, dmg:'Str', attr:'Dexterity', abil:'Brawl'},
                {n:'Sweep', diff:7, dmg:'Str(K)', attr:'Dexterity', abil:'Brawl'},
                {n:'Tackle', diff:7, dmg:'Str+1(K)', attr:'Strength', abil:'Brawl'},
                {n:'Weapon Strike', diff:6, dmg:'Weapon', attr:'Dexterity', abil:'Melee'},
                // Ranged Combat Maneuvers
                {n:'Auto Fire', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
                {n:'Multi Shot', diff:6, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
                {n:'Strafing', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
                {n:'3-Rnd Burst', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
                {n:'Two Weapons', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'}
            ];

            const firearms = ['Pistol', 'Revolver', 'Rifle', 'SMG', 'Shotgun', 'Crossbow'];

            standards.forEach(s => { 
                const r = document.createElement('tr'); 
                r.className='border-b border-[#222] text-[10px] text-gray-500 hover:bg-[#1a1a1a]'; 
                r.innerHTML = `
                    <td class="p-2 font-bold text-white flex items-center gap-2">
                        <button class="bg-[#8b0000] hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold" onclick="window.rollCombat('${s.n}', ${s.diff}, '${s.attr}', '${s.abil}')" title="Roll ${s.n}">
                            <i class="fas fa-dice-d10"></i>
                        </button>
                        ${s.n}
                    </td>
                    <td class="p-2">${s.diff}</td>
                    <td class="p-2">${s.dmg}</td>
                    <td class="p-2 text-center">-</td>
                    <td class="p-2 text-center">-</td>
                    <td class="p-2 text-center">-</td>
                `; 
                cp.appendChild(r); 
            });

            if(window.state.inventory) { 
                window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { 
                    let display = w.displayName || w.name;
                    // Determine Ability: Default Melee, check name/baseType for Firearms
                    const isFirearm = firearms.some(f => (w.name && w.name.includes(f)) || (w.baseType && w.baseType.includes(f)));
                    const ability = isFirearm ? 'Firearms' : 'Melee';

                    const r = document.createElement('tr'); 
                    r.className='border-b border-[#222] text-[10px] hover:bg-[#1a1a1a]'; 
                    r.innerHTML = `
                        <td class="p-2 font-bold text-gold flex items-center gap-2">
                             <button class="bg-[#8b0000] hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold" onclick="window.rollCombat('${display}', ${w.stats.diff}, 'Dexterity', '${ability}')" title="Roll ${display}">
                                <i class="fas fa-dice-d10"></i>
                            </button>
                            ${display}
                        </td>
                        <td class="p-2 text-white">${w.stats.diff}</td>
                        <td class="p-2 text-white">${w.stats.dmg}</td>
                        <td class="p-2 text-center">${w.stats.range}</td>
                        <td class="p-2 text-center">${w.stats.rate}</td>
                        <td class="p-2 text-center">${w.stats.clip}</td>
                    `; 
                    cp.appendChild(r); 
                }); 
            }
        }

        if(document.getElementById('rituals-list-play')) document.getElementById('rituals-list-play').innerText = document.getElementById('rituals-list-create-ta').value;
        let carried = []; let owned = []; if(window.state.inventory) { window.state.inventory.forEach(i => { const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; if(i.status === 'carried') carried.push(str); else owned.push(str); }); }
        setSafeText('play-gear-carried', carried.join(', ')); setSafeText('play-gear-owned', owned.join(', '));
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc').value;
        if(document.getElementById('play-derangements')) { const pd = document.getElementById('play-derangements'); pd.innerHTML = window.state.derangements.length > 0 ? window.state.derangements.map(d => `<div>• ${d}</div>`).join('') : '<span class="text-gray-500 italic">None</span>'; }
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages').value;
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st').value;
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt').value;
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history').value;
        const feedSrc = document.getElementById('inv-feeding-grounds'); if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        if(document.getElementById('armor-rating-play')) { let totalA = 0; let totalP = 0; let names = []; if(window.state.inventory) { window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); }); } setSafeText('armor-rating-play', totalA); setSafeText('armor-penalty-play', totalP); setSafeText('armor-desc-play', names.join(', ')); }
        if (document.getElementById('play-vehicles')) { const pv = document.getElementById('play-vehicles'); pv.innerHTML = ''; if (window.state.inventory) { window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { let display = v.displayName || v.name; pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; }); } }
        if (document.getElementById('play-havens-list')) { const ph = document.getElementById('play-havens-list'); ph.innerHTML = ''; window.state.havens.forEach(h => { ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; }); }
        
        const weaknessCont = document.getElementById('weakness-play-container');
        if (weaknessCont) {
            weaknessCont.innerHTML = '';
            const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
            const weaknessText = CLAN_WEAKNESSES[clan] || "Select a Clan to see weakness.";
            const customNote = window.state.textFields['custom-weakness'] || "";
            weaknessCont.innerHTML = `
                <div class="section-title">Weakness</div>
                <div class="bg-[#111] p-3 border border-[#333] h-full flex flex-col mt-2">
                    <div class="text-[11px] text-gray-300 italic mb-3 leading-snug flex-1">${weaknessText}</div>
                    <div class="text-[9px] font-bold text-gray-500 mb-1 uppercase">Specifics / Notes</div>
                    <textarea id="custom-weakness-input" class="w-full h-16 bg-black border border-[#444] text-[10px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="e.g. 'Only Brunettes'">${customNote}</textarea>
                </div>
            `;
            const ta = document.getElementById('custom-weakness-input');
            if(ta) {
                ta.addEventListener('blur', (e) => {
                    if(!window.state.textFields) window.state.textFields = {};
                    window.state.textFields['custom-weakness'] = e.target.value;
                });
            }
        }

        const xpCont = document.getElementById('experience-play-container');
        if (xpCont) {
            xpCont.innerHTML = '';
            const xpVal = window.state.textFields['xp-points'] || "";
            xpCont.innerHTML = `
                <div class="section-title mt-6">Experience</div>
                <textarea id="xp-points-input" class="w-full h-24 mt-2 bg-[#111] border border-[#333] text-[11px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="Log experience points here...">${xpVal}</textarea>
            `;
            const xpTa = document.getElementById('xp-points-input');
            if(xpTa) {
                xpTa.addEventListener('blur', (e) => {
                    if(!window.state.textFields) window.state.textFields = {};
                    window.state.textFields['xp-points'] = e.target.value;
                });
            }
        }

        const bptInput = document.getElementById('blood-per-turn-input');
        if (bptInput) {
            const savedBPT = window.state.status.blood_per_turn || 1;
            bptInput.value = savedBPT;
            bptInput.onchange = (e) => {
                window.state.status.blood_per_turn = parseInt(e.target.value) || 1;
            };
        }

        window.changeStep(1); 
    } else {
        if (playSheet) {
            playSheet.classList.add('hidden');
            playSheet.style.display = 'none'; 
        }
        const current = window.state.currentPhase || 1;
        const currentPhaseEl = document.getElementById(`phase-${current}`);
        if (currentPhaseEl) {
            currentPhaseEl.classList.remove('hidden');
            currentPhaseEl.classList.add('active');
        }
        window.changeStep(window.state.furthestPhase || 1);
    }
};

window.hydrateInputs = hydrateInputs;
window.renderSocialProfile = renderSocialProfile;
window.setupInventoryListeners = setupInventoryListeners;
window.renderInventoryList = renderInventoryList;
window.refreshTraitRow = refreshTraitRow;
window.renderRow = renderRow;
window.setDots = setDots;
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;
window.renderDynamicTraitRow = renderDynamicTraitRow;
window.renderBloodBondRow = renderBloodBondRow;
window.renderDerangementsList = renderDerangementsList;
window.renderDynamicHavenRow = renderDynamicHavenRow;
window.updateWalkthrough = updateWalkthrough;
