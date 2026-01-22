import { 
    BACKGROUNDS, ATTRIBUTES, ABILITIES, VIRTUES, 
    V20_WEAPONS_LIST, V20_ARMOR_LIST, V20_VEHICLES_LIST, SPECIALTY_EXAMPLES,
    HEALTH_STATES // FIX: Added missing import
} from "./data.js";

import { 
    renderDots, renderBoxes, setSafeText, showNotification 
} from "./ui-common.js";

import { 
    setDots 
} from "./ui-mechanics.js";

import { renderPrintSheet } from "./ui-print.js";

// --- EXPORT HELPERS (Re-exporting for main.js access) ---
export { renderDots, renderBoxes, setDots };

// --- INPUT HYDRATION (Populates Text Fields from State) ---
export function hydrateInputs() {
    if (!window.state || !window.state.textFields) return;
    
    Object.entries(window.state.textFields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = val;
            if (el.tagName === 'SELECT' && !val) {
                el.selectedIndex = 0;
            }
        }
    });

    const gen = window.state.textFields['c-gen'];
    if(gen) {
        const genDots = 13 - parseInt(gen);
        const row = document.querySelector(`.dot-row[data-n="Generation"]`);
        if(row) row.innerHTML = renderDots(genDots, 5);
    }
}
window.hydrateInputs = hydrateInputs;

// --- SOCIAL PROFILE (Background Descriptions) ---
export function renderSocialProfile() {
    const container = document.getElementById('social-profile-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    BACKGROUNDS.forEach(bg => {
        const dots = window.state.dots.back[bg] || 0;
        if (dots > 0) {
            const safeId = 'desc-' + bg.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const storedVal = window.state.textFields[safeId] || "";
            
            const div = document.createElement('div');
            div.className = "flex flex-col gap-1 animate-in fade-in";
            div.innerHTML = `
                <div class="flex justify-between items-end">
                    <label class="text-[10px] font-bold text-gold uppercase tracking-wider">${bg}</label>
                    <span class="text-[9px] text-gray-500 font-bold">${renderDots(dots, 5)}</span>
                </div>
                <textarea id="${safeId}" class="w-full h-16 bg-[#111] border border-[#333] text-gray-300 p-2 text-xs rounded focus:border-gold outline-none resize-none placeholder-gray-700" placeholder="Describe your ${bg}...">${storedVal}</textarea>
            `;
            
            container.appendChild(div);
            
            const area = div.querySelector('textarea');
            area.addEventListener('blur', (e) => {
                window.state.textFields[safeId] = e.target.value;
                if(renderPrintSheet) renderPrintSheet();
            });
        }
    });

    if (container.children.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-600 italic text-xs py-4">Select Backgrounds in the Advantages tab to add descriptions here.</div>';
    }
}
window.renderSocialProfile = renderSocialProfile;

// --- GENERIC ROW RENDERER (Attributes/Abilities) ---

export function refreshTraitRow(label, type, targetEl) {
    let rowDiv = targetEl;
    if (!rowDiv) {
        const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
        rowDiv = document.getElementById(safeId);
    }
    
    if(!rowDiv) return;

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    let min = (type === 'attr') ? 1 : 0;
    
    if (clan === "Nosferatu" && label === "Appearance") min = 0;

    let val = window.state.dots[type][label];
    if (val === undefined) val = min;
    
    if (val < min) {
        val = min;
        window.state.dots[type][label] = val; 
    }

    const max = 5;

    let showSpecialty = false;
    let warningMsg = "";

    if (type !== 'virt') {
        if (type === 'attr') {
            if (val >= 4) showSpecialty = true;
        } else if (type === 'abil') {
            if (val >= 1) {
                showSpecialty = true;
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
            if (SPECIALTY_EXAMPLES && SPECIALTY_EXAMPLES[label]) {
                optionsHTML = SPECIALTY_EXAMPLES[label].map(s => `<option value="${s}">`).join('');
            }
            specInputHTML = `<div class="flex-1 mx-2 relative"><input type="text" list="${listId}" class="specialty-input w-full text-[10px] italic bg-transparent border-b border-gray-700 text-[#d4af37] text-center" placeholder="Specialty..." value="${specVal}"><datalist id="${listId}">${optionsHTML}</datalist></div>`;
        }
    } else { specInputHTML = '<div class="flex-1"></div>'; }

    let styleOverride = "";
    let pointerEvents = "auto";
    let titleMsg = "";
    
    if (clan === "Nosferatu" && label === "Appearance") {
        styleOverride = "text-decoration: line-through; color: #666; cursor: not-allowed; opacity: 0.5;";
        pointerEvents = "none"; 
        titleMsg = "Nosferatu Weakness: Appearance 0";
    }

    rowDiv.innerHTML = `
        <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap cursor-pointer hover:text-gold" style="${styleOverride}" title="${titleMsg}">
            ${label}
        </span>
        ${specInputHTML}
        <div class="dot-row flex-shrink-0" data-n="${label}" data-t="${type}" style="pointer-events: ${pointerEvents}; opacity: ${clan === "Nosferatu" && label === "Appearance" ? '0.3' : '1'}">
            ${renderDots(val, max)}
        </div>`;

    rowDiv.querySelector('.trait-label').onclick = () => { 
        if(window.state.isPlayMode && !(clan === "Nosferatu" && label === "Appearance")) {
            if(window.handleTraitClick) window.handleTraitClick(label, type);
        }
    };
    
    rowDiv.querySelector('.dot-row').onclick = (e) => { 
        if (e.target.dataset.v) setDots(label, type, parseInt(e.target.dataset.v), min, max); 
    };
    
    if(showSpecialty && (!window.state.isPlayMode || (window.state.isPlayMode && window.state.specialties[label]))) {
        const input = rowDiv.querySelector('input');
        if(input) {
            input.onblur = (e) => { 
                window.state.specialties[label] = e.target.value; 
                if(renderPrintSheet) renderPrintSheet(); 
            };
            input.disabled = window.state.isPlayMode;
        }
    }
}
window.refreshTraitRow = refreshTraitRow;

export function renderRow(contId, label, type, min, max = 5) {
    const cont = typeof contId === 'string' ? document.getElementById(contId) : contId;
    if (!cont) return;
    
    if(cont.querySelector(`div[id^="trait-row-${type}-${label.replace(/[^a-zA-Z0-9]/g, '')}"]`)) return;

    const div = document.createElement('div'); 
    div.id = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
    div.className = 'flex items-center justify-between w-full py-1';
    cont.appendChild(div);
    refreshTraitRow(label, type, div); 
}
window.renderRow = renderRow;

// --- INVENTORY SYSTEM ---

export function setupInventoryListeners() {
    const typeSel = document.getElementById('inv-type');
    const baseWrap = document.getElementById('inv-base-wrapper');
    const baseSel = document.getElementById('inv-base-select');
    
    if (typeSel) {
        typeSel.addEventListener('change', () => {
            const type = typeSel.value;
            document.getElementById('inv-stats-row').classList.toggle('hidden', type !== 'Weapon');
            document.getElementById('inv-armor-row').classList.toggle('hidden', type !== 'Armor');
            document.getElementById('inv-vehicle-row').classList.toggle('hidden', type !== 'Vehicle');
            
            baseSel.innerHTML = '<option value="">-- Custom --</option>';
            let list = [];
            if (type === 'Weapon') list = V20_WEAPONS_LIST;
            else if (type === 'Armor') list = V20_ARMOR_LIST;
            else if (type === 'Vehicle') list = V20_VEHICLES_LIST;
            
            if (list.length > 0) {
                baseWrap.classList.remove('hidden');
                list.forEach(item => {
                    baseSel.add(new Option(item.name, item.name));
                });
            } else {
                baseWrap.classList.add('hidden');
            }
        });
    }
    
    if (baseSel) {
        baseSel.addEventListener('change', () => {
            const type = typeSel.value;
            const name = baseSel.value;
            let item = null;
            
            if (type === 'Weapon') item = V20_WEAPONS_LIST.find(i => i.name === name);
            else if (type === 'Armor') item = V20_ARMOR_LIST.find(i => i.name === name);
            else if (type === 'Vehicle') item = V20_VEHICLES_LIST.find(i => i.name === name);
            
            if (item) {
                document.getElementById('inv-name').value = item.name;
                if (type === 'Weapon') {
                    document.getElementById('inv-diff').value = item.diff;
                    document.getElementById('inv-dmg').value = item.dmg;
                    document.getElementById('inv-range').value = item.range || '';
                    document.getElementById('inv-rate').value = item.rate || '';
                    document.getElementById('inv-clip').value = item.clip || '';
                } else if (type === 'Armor') {
                    document.getElementById('inv-rating').value = item.rating;
                    document.getElementById('inv-penalty').value = item.penalty;
                } else if (type === 'Vehicle') {
                    document.getElementById('inv-safe').value = item.safe;
                    document.getElementById('inv-max').value = item.max;
                    document.getElementById('inv-man').value = item.man;
                }
            }
        });
    }
    
    const addBtn = document.getElementById('add-inv-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            const type = typeSel.value;
            const name = document.getElementById('inv-name').value || "Unnamed Item";
            const carried = document.getElementById('inv-carried').checked;
            
            const newItem = {
                id: Date.now(),
                type: type,
                name: name,
                status: carried ? 'carried' : 'owned',
                stats: {}
            };
            
            if (type === 'Weapon') {
                newItem.stats = {
                    diff: document.getElementById('inv-diff').value || 6,
                    dmg: document.getElementById('inv-dmg').value || '',
                    range: document.getElementById('inv-range').value || '',
                    rate: document.getElementById('inv-rate').value || '',
                    clip: document.getElementById('inv-clip').value || ''
                };
            } else if (type === 'Armor') {
                newItem.stats = {
                    rating: document.getElementById('inv-rating').value || 0,
                    penalty: document.getElementById('inv-penalty').value || 0
                };
            } else if (type === 'Vehicle') {
                newItem.stats = {
                    safe: document.getElementById('inv-safe').value || '',
                    max: document.getElementById('inv-max').value || '',
                    man: document.getElementById('inv-man').value || ''
                };
            }
            
            if (!window.state.inventory) window.state.inventory = [];
            window.state.inventory.push(newItem);
            
            renderInventoryList();
            if(renderPrintSheet) renderPrintSheet();
            showNotification(`Added ${name}`);
            
            // Clear Inputs
            document.getElementById('inv-name').value = '';
        };
    }
}
window.setupInventoryListeners = setupInventoryListeners;

export function renderInventoryList() {
    const carriedList = document.getElementById('inv-list-carried');
    const ownedList = document.getElementById('inv-list-owned');
    const vehicleList = document.getElementById('vehicle-list');
    
    if (!carriedList || !ownedList) return;
    
    carriedList.innerHTML = '';
    ownedList.innerHTML = '';
    if (vehicleList) vehicleList.innerHTML = '';
    
    if (!window.state.inventory) window.state.inventory = [];
    
    window.state.inventory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs border-b border-[#222] py-1 bg-[#111]/50 px-2 rounded mb-1 group";
        
        let statsTxt = "";
        if (item.type === 'Weapon') statsTxt = `Diff:${item.stats.diff} Dmg:${item.stats.dmg}`;
        else if (item.type === 'Armor') statsTxt = `Rating:${item.stats.rating}`;
        else if (item.type === 'Vehicle') statsTxt = `Safe:${item.stats.safe}`;
        
        div.innerHTML = `
            <div class="flex-1">
                <span class="font-bold text-white">${item.name}</span>
                <span class="text-[9px] text-gray-500 ml-2 uppercase">${item.type}</span>
                <div class="text-[9px] text-gold italic">${statsTxt}</div>
            </div>
            <div class="flex gap-2">
                <button class="text-[9px] text-blue-400 hover:text-white uppercase font-bold" onclick="window.toggleInvStatus(${index})">${item.status === 'carried' ? 'Store' : 'Carry'}</button>
                <button class="text-red-500 hover:text-red-300" onclick="window.removeInvItem(${index})">&times;</button>
            </div>
        `;
        
        if (item.type === 'Vehicle' && vehicleList) {
            vehicleList.appendChild(div);
        } else if (item.status === 'carried') {
            carriedList.appendChild(div);
        } else {
            ownedList.appendChild(div);
        }
    });
}
window.renderInventoryList = renderInventoryList;

window.toggleInvStatus = function(index) {
    const item = window.state.inventory[index];
    item.status = item.status === 'carried' ? 'owned' : 'carried';
    renderInventoryList();
    updatePools(); // Update Armor pool if needed
    if(renderPrintSheet) renderPrintSheet();
};

window.removeInvItem = function(index) {
    if(confirm("Delete item?")) {
        window.state.inventory.splice(index, 1);
        renderInventoryList();
        updatePools();
        if(renderPrintSheet) renderPrintSheet();
    }
};

// --- BOX CLICK HANDLER (Willpower, Blood, Health) ---
export function handleBoxClick(type, val, element) {
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
    if(window.updatePools) window.updatePools();
    if(window.renderPrintSheet) window.renderPrintSheet(); 
}
window.handleBoxClick = handleBoxClick;


// --- STATE MANAGEMENT & POOL UPDATES (UPDATED) ---

export function updatePools() {
    if (!window.state.status) window.state.status = { humanity: 7, willpower: 5, tempWillpower: 5, health_states: [0,0,0,0,0,0,0], blood: 0 };
    if (window.state.status.tempWillpower === undefined) window.state.status.tempWillpower = window.state.status.willpower || 5;
    if (window.state.status.health_states === undefined || !Array.isArray(window.state.status.health_states)) window.state.status.health_states = [0,0,0,0,0,0,0];

    // --- CALCULATE XP ADJUSTMENTS (To exclude from Freebie/Creation counts) ---
    const xpAdj = { attr: {}, abil: {}, disc: {}, back: {}, virt: {}, status: {} };
    
    // DEBUG: Track XP Log processing
    // console.log("Processing XP Log for Freebie Calc:", window.state.xpLog);

    if (window.state.xpLog && Array.isArray(window.state.xpLog)) {
        window.state.xpLog.forEach(l => {
            // FIX: Force integers to avoid string math issues
            const newVal = parseInt(l.new || 0);
            const oldVal = parseInt(l.old || 0);
            const delta = newVal - oldVal;
            
            if (delta > 0) {
                if (l.type === 'attr') xpAdj.attr[l.trait] = (xpAdj.attr[l.trait] || 0) + delta;
                else if (l.type === 'abil') xpAdj.abil[l.trait] = (xpAdj.abil[l.trait] || 0) + delta;
                else if (l.type === 'disc' || l.type === 'path') xpAdj.disc[l.trait] = (xpAdj.disc[l.trait] || 0) + delta;
                else if (l.type === 'back') xpAdj.back[l.trait] = (xpAdj.back[l.trait] || 0) + delta;
                else if (l.type === 'virt') xpAdj.virt[l.trait] = (xpAdj.virt[l.trait] || 0) + delta;
                else if (l.type === 'humanity') xpAdj.status['Humanity'] = (xpAdj.status['Humanity'] || 0) + delta;
                else if (l.type === 'willpower') xpAdj.status['Willpower'] = (xpAdj.status['Willpower'] || 0) + delta;
            }
        });
    }

    // DEBUG: See what the app thinks you bought with XP
    // console.log("XP Adjustments (Points to subtract from Freebie Calc):", xpAdj);

    const getEffectiveVal = (type, name, actual) => {
        const adj = (type === 'status') 
            ? (xpAdj.status[name] || 0) 
            : (xpAdj[type] && xpAdj[type][name] ? xpAdj[type][name] : 0);
        return Math.max(0, actual - adj);
    };

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
    const lim = (window.GEN_LIMITS && window.GEN_LIMITS[gen]) ? window.GEN_LIMITS[gen] : { m: 10, pt: 1 };

    Object.keys(ATTRIBUTES).forEach(cat => {
        let cs = 0; 
        ATTRIBUTES[cat].forEach(a => cs += (getEffectiveVal('attr', a, window.state.dots.attr[a] || 1) - 1));
        const targetId = (cat === 'Social') ? 'p-social' : (cat === 'Mental') ? 'p-mental' : 'p-phys';
        setSafeText(targetId, `[${Math.max(0, (window.state.prios.attr[cat] || 0) - cs)}]`);
    });
    
    Object.keys(ABILITIES).forEach(cat => {
        let cs = 0; 
        ABILITIES[cat].forEach(a => cs += getEffectiveVal('abil', a, window.state.dots.abil[a] || 0));
        if (window.state.customAbilityCategories) { 
            Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => { 
                if (c === cat && window.state.dots.abil[name]) cs += getEffectiveVal('abil', name, window.state.dots.abil[name]); 
            }); 
        }
        setSafeText('p-' + cat.toLowerCase().slice(0,3), `[${Math.max(0, (window.state.prios.abil[cat] || 0) - cs)}]`);
    });
    
    const discSpent = Object.entries(window.state.dots.disc || {}).reduce((a, [k, v]) => a + getEffectiveVal('disc', k, v), 0);
    setSafeText('p-disc', `[${Math.max(0, 3 - discSpent)}]`);
    
    const backSpent = Object.entries(window.state.dots.back || {}).reduce((a, [k, v]) => a + getEffectiveVal('back', k, v), 0);
    setSafeText('p-back', `[${Math.max(0, 5 - backSpent)}]`);
    
    const virtTotalDots = VIRTUES.reduce((a, v) => a + getEffectiveVal('virt', v, window.state.dots.virt[v] || 1), 0);
    setSafeText('p-virt', `[${Math.max(0, 7 - (virtTotalDots - 3))}]`);

    if (window.state.freebieMode) {
         const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
         if (clan === "Caitiff" && window.state.merits) {
             const forbiddenIndex = window.state.merits.findIndex(m => m.name === "Additional Discipline");
             if (forbiddenIndex > -1) {
                 window.state.merits.splice(forbiddenIndex, 1);
                 showNotification("Restriction: Caitiff cannot take Additional Discipline.");
                 if(window.renderMeritsFlaws) window.renderMeritsFlaws(); 
             }
         }

         const logEntries = [];
         let totalFreebieCost = 0;
         let totalFlawBonus = 0;

         const attrCats = { Physical: 0, Social: 0, Mental: 0 };
         let attrCost = 0;
         Object.keys(ATTRIBUTES).forEach(cat => {
             ATTRIBUTES[cat].forEach(a => attrCats[cat] += Math.max(0, getEffectiveVal('attr', a, window.state.dots.attr[a] || 1) - 1));
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
             ABILITIES[cat].forEach(a => abilCats[cat] += getEffectiveVal('abil', a, window.state.dots.abil[a] || 0));
             if (window.state.customAbilityCategories) {
                 Object.entries(window.state.customAbilityCategories).forEach(([name, c]) => {
                     if (c === cat && window.state.dots.abil[name]) abilCats[cat] += getEffectiveVal('abil', name, window.state.dots.abil[name]);
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

         const effConscience = getEffectiveVal('virt', 'Conscience', window.state.dots.virt['Conscience'] || 1);
         const effSelfControl = getEffectiveVal('virt', 'Self-Control', window.state.dots.virt['Self-Control'] || 1);
         const effBaseH = effConscience + effSelfControl;
         const effCurrentH = getEffectiveVal('status', 'Humanity', curH);
         
         const hDiff = Math.max(0, effCurrentH - effBaseH); 
         const hCost = hDiff * 1;
         setSafeText('sb-human', hCost);
         totalFreebieCost += hCost;
         if(hCost > 0) logEntries.push(`Humanity (+${hDiff}): ${hCost} pts`);

         const effCourage = getEffectiveVal('virt', 'Courage', window.state.dots.virt['Courage'] || 1);
         const effBaseW = effCourage;
         const effCurrentW = getEffectiveVal('status', 'Willpower', curW);
         
         const wDiff = Math.max(0, effCurrentW - effBaseW); 
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
            if(window.handleBoxClick) window.handleBoxClick(t, v, b);
        };
    });

    if(typeof updateClanMechanicsUI === 'function') updateClanMechanicsUI();
    
    if(renderPrintSheet) renderPrintSheet();
}
window.updatePools = updatePools;
