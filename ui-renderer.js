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
    BROAD_ABILITIES,
    getXpCost 
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

// --- MISSING FUNCTIONS ADDED BELOW ---

export function renderRow(containerId, name, type, min = 1) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = "flex justify-between items-center h-6";
    const val = window.state.dots[type][name] || min;
    
    // Check for specialty
    let specialtyIndicator = "";
    if (val >= 4) {
        const spec = window.state.specialties[name] || "";
        specialtyIndicator = `<span class="text-[9px] text-[#d4af37] ml-2 italic tracking-tighter">${spec}</span>`;
    }

    div.innerHTML = `
        <span class="trait-label cursor-pointer hover:text-white transition-colors" onclick="window.handleTraitClick('${name}', '${type}')">${name}${specialtyIndicator}</span>
        <div class="dot-row flex" data-n="${name}" data-t="${type}">
            ${renderDots(val, 5)}
        </div>
    `;
    
    // Add click listeners to dots
    const dots = div.querySelectorAll('.dot');
    dots.forEach(d => {
        d.onclick = (e) => {
            const v = parseInt(e.target.dataset.v);
            window.setDots(name, type, v, min);
        };
    });
    
    // Specialty Input logic
    if (val >= 4) {
        div.querySelector('.trait-label').onclick = (e) => {
            if(window.state.isPlayMode) window.handleTraitClick(name, type);
            else promptSpecialty(name);
        };
    }

    container.appendChild(div);
}

function promptSpecialty(name) {
    if (!window.state.specialties) window.state.specialties = {};
    const current = window.state.specialties[name] || "";
    const newSpec = prompt(`Specialty for ${name}:`, current);
    if (newSpec !== null) {
        window.state.specialties[name] = newSpec;
        refreshTraitRow(name, Object.keys(window.state.dots.attr).includes(name) ? 'attr' : 'abil');
    }
}

export function refreshTraitRow(name, type) {
    const dotRows = document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`);
    dotRows.forEach(row => {
        const val = window.state.dots[type][name] || 0;
        row.innerHTML = renderDots(val, 5);
        
        row.querySelectorAll('.dot').forEach(d => {
            d.onclick = (e) => window.setDots(name, type, parseInt(e.target.dataset.v), 0);
        });

        const label = row.parentElement.querySelector('.trait-label');
        if(label) {
            let specHtml = "";
            if (val >= 4) {
                if (!window.state.specialties) window.state.specialties = {};
                const spec = window.state.specialties[name] || "";
                specHtml = ` <span class="text-[9px] text-[#d4af37] ml-2 italic tracking-tighter">${spec}</span>`;
                
                if (!window.state.isPlayMode) {
                   label.onclick = () => promptSpecialty(name);
                }
            } else {
                 if (!window.state.isPlayMode) label.onclick = null; 
            }
            label.innerHTML = `${name}${specHtml}`;
        }
    });
}

export function renderDynamicAdvantageRow(containerId, type, sourceList, isCustom = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const collection = window.state.dots[type] || {};
    
    Object.entries(collection).forEach(([name, val]) => {
        // Skip if standard ability (handled by initUI static rendering)
        if (type === 'abil' && !isCustom) return; 

        const div = document.createElement('div');
        div.className = "flex justify-between items-center mb-1";
        div.innerHTML = `
            <div class="flex items-center gap-2">
                ${isCustom || type === 'disc' || type === 'back' ? `<i class="fas fa-minus-circle text-[#500] cursor-pointer text-[10px] hover:text-red-500" onclick="window.removeDynamic('${name}', '${type}')"></i>` : ''}
                <span class="trait-label cursor-pointer" onclick="window.handleTraitClick('${name}', '${type}')">${name}</span>
            </div>
            <div class="dot-row" data-n="${name}" data-t="${type}">
                ${renderDots(val, 5)}
            </div>
        `;
        
        div.querySelectorAll('.dot').forEach(d => {
            d.onclick = (e) => window.setDots(name, type, parseInt(e.target.dataset.v), 1);
        });
        
        container.appendChild(div);
    });

    const controls = document.createElement('div');
    controls.className = "flex gap-1 mt-2";
    
    if (sourceList && sourceList.length > 0) {
        const select = document.createElement('select');
        select.className = "text-[10px] bg-[#111] border border-[#333] text-gray-400 flex-1";
        select.innerHTML = `<option value="">+ Add ${type === 'disc' ? 'Discipline' : 'Background'}</option>`;
        sourceList.forEach(item => {
            if (!window.state.dots[type][item]) {
                select.add(new Option(item, item));
            }
        });
        select.onchange = (e) => {
            if(e.target.value) {
                window.state.dots[type][e.target.value] = 1;
                if(type==='back') renderSocialProfile();
                renderDynamicAdvantageRow(containerId, type, sourceList, isCustom);
                window.updatePools();
            }
        };
        controls.appendChild(select);
    } 
    
    if (isCustom || type === 'disc' || type === 'back') {
         const input = document.createElement('input');
         input.type = "text";
         input.placeholder = "Custom...";
         input.className = "w-20 text-[10px] bg-[#111] border border-[#333] text-gray-400 px-1";
         const btn = document.createElement('button');
         btn.innerHTML = '<i class="fas fa-plus"></i>';
         btn.className = "text-gray-400 hover:text-white px-2 border border-[#333] text-[10px]";
         btn.onclick = () => {
             const val = input.value.trim();
             if(val) {
                 window.state.dots[type][val] = 1;
                 if(type === 'abil' && isCustom) {
                     let cat = "Talents";
                     if(containerId.includes('skills')) cat = "Skills";
                     if(containerId.includes('knowledges')) cat = "Knowledges";
                     if(!window.state.customAbilityCategories) window.state.customAbilityCategories = {};
                     window.state.customAbilityCategories[val] = cat;
                 }
                 if(type==='back') renderSocialProfile();
                 renderDynamicAdvantageRow(containerId, type, sourceList, isCustom);
                 window.updatePools();
             }
         };
         controls.appendChild(input);
         controls.appendChild(btn);
    }
    
    container.appendChild(controls);
}

window.removeDynamic = function(name, type) {
    if(confirm(`Remove ${name}?`)) {
        delete window.state.dots[type][name];
        if(window.state.customAbilityCategories) delete window.state.customAbilityCategories[name];
        window.fullRefresh(); 
    }
};

export function renderDynamicTraitRow(containerId, typeLabel, sourceList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const list = typeLabel === 'Merit' ? window.state.merits : window.state.flaws;
    if(!list) return;

    list.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs border-b border-[#222] pb-1";
        div.innerHTML = `
            <span class="text-gray-300">${item.n}</span>
            <div class="flex items-center gap-2">
                <span class="${typeLabel === 'Merit' ? 'text-gold' : 'text-red-400'} font-bold">${item.val}</span>
                <i class="fas fa-times text-gray-600 hover:text-red-500 cursor-pointer" onclick="window.removeMF('${typeLabel}', ${idx})"></i>
            </div>
        `;
        container.appendChild(div);
    });

    const controls = document.createElement('div');
    controls.className = "mt-2 flex flex-col gap-1";
    
    const select = document.createElement('select');
    select.className = "w-full bg-[#111] border border-[#333] text-[10px] text-gray-400";
    select.innerHTML = `<option value="">Select ${typeLabel}...</option>`;
    sourceList.forEach(s => select.add(new Option(`${s.n} (${s.v})`, JSON.stringify(s))));
    
    select.onchange = (e) => {
        if(!e.target.value) return;
        const data = JSON.parse(e.target.value);
        if (typeLabel === 'Merit') window.state.merits.push({ n: data.n, val: data.v });
        else window.state.flaws.push({ n: data.n, val: data.v });
        
        renderDynamicTraitRow(containerId, typeLabel, sourceList);
        window.updatePools();
        e.target.value = "";
    };
    
    controls.appendChild(select);
    container.appendChild(controls);
}

window.removeMF = (type, idx) => {
    if(type === 'Merit') window.state.merits.splice(idx, 1);
    else window.state.flaws.splice(idx, 1);
    window.fullRefresh();
}

export function renderBloodBondRow() {
    const c = document.getElementById('blood-bond-list');
    if(!c) return;
    c.innerHTML = '';
    
    if(!window.state.bloodBonds) window.state.bloodBonds = [];
    
    window.state.bloodBonds.forEach((b, i) => {
        const d = document.createElement('div');
        d.className = "flex gap-2 mb-2 items-center";
        d.innerHTML = `
            <input type="text" value="${b.regnant}" class="bg-[#111] border-b border-[#444] text-xs text-white flex-1 p-1" onchange="window.updateBond(${i}, 'regnant', this.value)" placeholder="Regnant Name">
            <select class="bg-[#111] text-xs text-red-400 border border-[#333] p-1" onchange="window.updateBond(${i}, 'level', this.value)">
                <option value="1" ${b.level == 1 ? 'selected' : ''}>1 - Taste</option>
                <option value="2" ${b.level == 2 ? 'selected' : ''}>2 - Bound</option>
                <option value="3" ${b.level == 3 ? 'selected' : ''}>3 - Thrall</option>
            </select>
            <i class="fas fa-trash text-gray-600 hover:text-red-500 cursor-pointer text-xs" onclick="window.removeBond(${i})"></i>
        `;
        c.appendChild(d);
    });
    
    const btn = document.createElement('button');
    btn.className = "text-[10px] bg-[#222] text-gray-300 px-2 py-1 mt-1 rounded border border-[#444] hover:bg-[#333]";
    btn.innerText = "+ Add Bond";
    btn.onclick = () => {
        window.state.bloodBonds.push({ regnant: "", level: 1 });
        renderBloodBondRow();
    };
    c.appendChild(btn);
}
window.updateBond = (i, f, v) => { window.state.bloodBonds[i][f] = v; };
window.removeBond = (i) => { window.state.bloodBonds.splice(i, 1); renderBloodBondRow(); };

export function renderDerangementsList() {
    const c = document.getElementById('derangements-list');
    if(!c) return;
    c.innerHTML = '';
    if(!window.state.derangements) window.state.derangements = [];
    
    window.state.derangements.forEach((d, i) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs border-b border-[#222] py-1";
        div.innerHTML = `<span class="text-red-300 italic">${d.name}</span><i class="fas fa-trash text-[9px] cursor-pointer hover:text-red-500" onclick="window.removeDerangement(${i})"></i>`;
        c.appendChild(div);
    });
    
    const inp = document.createElement('div');
    inp.className = "flex gap-1 mt-2";
    inp.innerHTML = `
        <input type="text" id="new-derangement" placeholder="New Derangement" class="flex-1 bg-[#111] border border-[#333] text-[10px] px-1 text-white">
        <button class="bg-[#333] text-white px-2 text-[10px]" onclick="window.addDerangement()">Add</button>
    `;
    c.appendChild(inp);
}
window.addDerangement = () => {
    const el = document.getElementById('new-derangement');
    if(el && el.value) {
        window.state.derangements.push({ name: el.value });
        renderDerangementsList();
    }
}
window.removeDerangement = (i) => {
    window.state.derangements.splice(i, 1);
    renderDerangementsList();
}

export function renderDynamicHavenRow() {
    const c = document.getElementById('multi-haven-list');
    if(!c) return;
    c.innerHTML = '';
    
    if(!window.state.havens) window.state.havens = [];
    
    window.state.havens.forEach((h, i) => {
        const d = document.createElement('div');
        d.className = "bg-black/40 border border-[#333] p-2 mb-2";
        d.innerHTML = `
            <div class="flex justify-between mb-1">
                <input type="text" class="bg-transparent font-bold text-gold text-xs border-b border-[#444] w-2/3" value="${h.name}" placeholder="Haven Name" onchange="window.updateHaven(${i}, 'name', this.value)">
                <i class="fas fa-trash text-gray-600 hover:text-red-500 cursor-pointer" onclick="window.removeHaven(${i})"></i>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
                <div><label class="text-[9px] uppercase text-gray-500">Location</label><input type="text" class="w-full bg-[#111] text-[10px] text-gray-300 border-none" value="${h.location || ''}" onchange="window.updateHaven(${i}, 'location', this.value)"></div>
                <div><label class="text-[9px] uppercase text-gray-500">Description</label><input type="text" class="w-full bg-[#111] text-[10px] text-gray-300 border-none" value="${h.desc || ''}" onchange="window.updateHaven(${i}, 'desc', this.value)"></div>
            </div>
        `;
        c.appendChild(d);
    });
    
    const btn = document.createElement('button');
    btn.className = "text-[10px] bg-[#222] text-gray-300 px-2 py-1 mt-1 rounded border border-[#444] hover:bg-[#333]";
    btn.innerText = "+ Add Haven";
    btn.onclick = () => {
        window.state.havens.push({ name: "New Haven", location: "", desc: "" });
        renderDynamicHavenRow();
    };
    c.appendChild(btn);
}
window.updateHaven = (i, f, v) => { window.state.havens[i][f] = v; };
window.removeHaven = (i) => { window.state.havens.splice(i, 1); renderDynamicHavenRow(); };

export function updateWalkthrough() {
    const el = document.getElementById('guide-message');
    if(!el) return;
    
    let msg = "Welcome, Neonate.";
    const step = window.state.currentPhase;
    
    if(step === 1) msg = "Step 1: Define your Concept & Clan.";
    else if(step === 2) msg = "Step 2: Assign Attribute dots (7/5/3).";
    else if(step === 3) msg = "Step 3: Assign Ability dots (13/9/5).";
    else if(step === 4) msg = "Step 4: Advantages (Disc 3, Back 5, Virt 7).";
    else if(step === 5) msg = "Step 5: Details & Possessions.";
    else if(step === 6) msg = "Step 6: Merits & Flaws.";
    else if(step === 7) msg = "Step 7: Flesh out your history.";
    else if(step === 8) msg = "Final Review. Ready to Embrace?";
    
    el.innerText = msg;
    
    const complete = checkStepComplete(step, window.state);
    const icon = document.getElementById('guide-icon');
    if(icon) {
        if(complete) icon.classList.add('ready');
        else icon.classList.remove('ready');
    }
}

window.nextStep = () => {
    const cur = window.state.currentPhase;
    if (checkStepComplete(cur, window.state)) {
        if(cur < 8) {
            window.changeStep(cur + 1);
            if(cur + 1 > window.state.furthestPhase) window.state.furthestPhase = cur + 1;
        } else {
            window.togglePlayMode();
        }
    } else {
        window.showNotification("Complete current step first.");
    }
};

window.removeInventory = (idx) => { window.state.inventory.splice(idx, 1); renderInventoryList(); };
window.toggleInvStatus = (idx) => { const item = window.state.inventory[idx]; item.status = item.status === 'carried' ? 'owned' : 'carried'; renderInventoryList(); };

window.clearPool = function() {
    window.state.activePool = [];
    document.querySelectorAll('.trait-label').forEach(el => el.classList.remove('selected'));
    setSafeText('pool-display', "Select traits to build pool...");
    const hint = document.getElementById('specialty-hint'); if(hint) hint.innerHTML = '';
    const cb = document.getElementById('use-specialty'); if(cb) cb.checked = false;
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

window.updatePools = function() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    // Ensure state synchronization if NOT in special modes
    if (!window.state.freebieMode && !window.state.isPlayMode && !window.state.xpMode) {
        const bH = (window.state.dots.virt?.Conscience || 1) + (window.state.dots.virt?.["Self-Control"] || 1);
        const bW = (window.state.dots.virt?.Courage || 1);
        
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
        fbBtn.disabled = false; 
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

    const playSheet = document.getElementById('play-mode-sheet');
    
    // --- PLAY MODE UPDATES ---
    if (window.state.isPlayMode) {

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
                <div class="flex justify-between items-center mt-6 mb-1">
                    <div class="section-title !mt-0">Experience</div>
                    <button id="toggle-xp-mode-btn" class="bg-[#333] text-white px-2 py-0.5 text-[9px] border border-[#555] hover:bg-gold hover:text-black uppercase font-bold transition-colors">
                        ${window.state.xpMode ? "EXIT XP MODE" : "SPEND XP"}
                    </button>
                </div>
                <textarea id="xp-points-input" class="w-full h-24 bg-[#111] border ${window.state.xpMode ? 'border-gold' : 'border-[#333]'} text-[11px] text-white p-2 focus:border-gold outline-none resize-none" placeholder="Log experience points here...">${xpVal}</textarea>
            `;
            const xpTa = document.getElementById('xp-points-input');
            if(xpTa) {
                xpTa.addEventListener('blur', (e) => {
                    if(!window.state.textFields) window.state.textFields = {};
                    window.state.textFields['xp-points'] = e.target.value;
                });
            }
            const btn = document.getElementById('toggle-xp-mode-btn');
            if(btn) {
                btn.onclick = () => {
                    window.state.xpMode = !window.state.xpMode;
                    window.updatePools(); 
                };
                if(window.state.xpMode) {
                    btn.style.backgroundColor = '#d4af37';
                    btn.style.color = '#000';
                }
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

        if (playSheet) {
            playSheet.classList.remove('hidden');
            playSheet.style.display = 'block';
        }
        document.querySelectorAll('.step-container').forEach(el => {
            if (!el.id.startsWith('play-mode-')) {
                el.classList.remove('active');
                el.classList.add('hidden');
            }
        });
        
        window.changeStep(1); 
        
    } else {
        if (playSheet) {
            playSheet.classList.add('hidden');
            playSheet.style.display = 'none'; 
        }
        
        document.querySelectorAll('.step-container').forEach(el => {
            if (el.id.startsWith('play-mode-')) {
                el.classList.remove('active');
                el.classList.add('hidden');
            }
        });

        const current = window.state.currentPhase || 1;
        const currentPhaseEl = document.getElementById(`phase-${current}`);
        if (currentPhaseEl) {
            currentPhaseEl.classList.remove('hidden');
            currentPhaseEl.classList.add('active');
        }
        window.changeStep(window.state.furthestPhase || 1);
    }
};

window.changeStep = function(step) {
    const isPlay = window.state.isPlayMode;
    const prefix = isPlay ? 'play-mode-' : 'phase-';
    
    document.querySelectorAll('.step-container').forEach(el => {
        if (el.id.startsWith(prefix)) {
            el.classList.remove('active');
        }
    });

    const targetEl = document.getElementById(prefix + step);
    if(targetEl) {
        targetEl.classList.add('active');
        if (!isPlay) window.state.currentPhase = step;
    }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.getElementById('nav-' + step);
    if(navItem) navItem.classList.add('active');
    
    window.scrollTo(0,0);
};

window.togglePlayMode = function() {
    window.state.isPlayMode = !window.state.isPlayMode;
    
    const btn = document.getElementById('play-mode-btn');
    const txt = document.getElementById('play-btn-text');
    
    if (window.state.isPlayMode) {
        window.state.freebieMode = false; 
        if(btn) {
            btn.classList.add('bg-[#d4af37]', 'text-black');
            btn.classList.remove('text-[#d4af37]');
            if(txt) txt.innerText = "EDIT";
        }
        window.showNotification("Entered Play Mode");
    } else {
        window.state.xpMode = false;
        if(btn) {
            btn.classList.remove('bg-[#d4af37]', 'text-black');
            btn.classList.add('text-[#d4af37]');
            if(txt) txt.innerText = "PLAY";
        }
        window.showNotification("Edit Mode");
    }
    
    window.updatePools();
};

window.toggleFreebieMode = function() {
    window.state.freebieMode = !window.state.freebieMode;
    const btn = document.getElementById('toggle-freebie-btn');
    const txt = document.getElementById('freebie-btn-text');
    
    if (window.state.freebieMode) {
        if(btn) {
            btn.classList.add('border-green-400', 'text-green-400');
            if(txt) txt.innerText = "Freebies ON";
        }
    } else {
        if(btn) {
            btn.classList.remove('border-green-400', 'text-green-400');
            if(txt) txt.innerText = "Freebies";
        }
    }
    window.updatePools();
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

export function setDots(name, type, val, min, max = 5) {
    if (window.state.xpMode) {
        const currentVal = (type === 'status') 
            ? (name === 'Humanity' ? window.state.status.humanity : window.state.status.willpower)
            : (window.state.dots[type][name] || min);
            
        if (val === currentVal) return;
        
        const isUpgrade = val > currentVal;
        
        if (isUpgrade) {
             if (val > currentVal + 1) {
                 window.showNotification("XP Buy: Can only increase by 1 dot at a time.");
                 return;
             }

             const isCaitiff = (window.state.textFields['c-clan'] || "") === "Caitiff";
             let typeKey = type;
             if (type === 'status') typeKey = name.toLowerCase(); 
             
             let cost = 0;
             if (type === 'back') cost = 0; 
             else cost = getXpCost(currentVal, typeKey, false, isCaitiff);
             
             const label = type === 'back' ? `${cost} XP (Roleplay Reward?)` : `${cost} XP`;
             
             if (confirm(`Experience Expenditure:\nIncrease ${name} (${currentVal} -> ${val})?\nCost: ${label}`)) {
                 const logEl = document.getElementById('xp-points-input');
                 if (logEl) {
                    const date = new Date().toLocaleDateString();
                    const logEntry = `\n[${date}] Spent ${label} to raise ${name} to ${val}.`;
                    logEl.value += logEntry;
                    if(!window.state.textFields) window.state.textFields = {};
                    window.state.textFields['xp-points'] = logEl.value;
                 }
             } else return;

        } else {
             if (!confirm(`Reduce ${name} to ${val}?\nWARNING: No XP is refunded automatically.`)) return;
             const logEl = document.getElementById('xp-points-input');
             if (logEl) {
                const date = new Date().toLocaleDateString();
                const logEntry = `\n[${date}] Reduced ${name} to ${val} (Manual Adjustment).`;
                logEl.value += logEntry;
                if(!window.state.textFields) window.state.textFields = {};
                window.state.textFields['xp-points'] = logEl.value;
             }
        }

        if (type === 'status') {
            if (name === 'Humanity') window.state.status.humanity = val;
            if (name === 'Willpower') { window.state.status.willpower = val; window.state.status.tempWillpower = val; }
        } else {
            window.state.dots[type][name] = val;
        }

        if (type === 'attr' || type === 'abil') refreshTraitRow(name, type);
        else if (type === 'status') window.updatePools(); 
        else document.querySelectorAll(`.dot-row[data-n="${name}"][data-t="${type}"]`).forEach(el => el.innerHTML = renderDots(val, max));
        
        window.updatePools();
        return;
    }

    if (window.state.isPlayMode && !window.state.xpMode) return;
    
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
        window.updatePools(); return;
    }

    const currentVal = window.state.dots[type][name] || min;
    let newVal = val;
    if (val === currentVal) newVal = val - 1;
    if (newVal < min) newVal = min;

    if (window.state.freebieMode) {
    } else {
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
    
    if (type === 'virt' && !window.state.isPlayMode && !window.state.freebieMode) {
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
}
window.setDots = setDots;
