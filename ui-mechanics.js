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


// --- CLAN MECHANICS UI HELPER ---
function updateClanMechanicsUI() {
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    
    // --- 1. FOLLOWERS OF SET: SUNLIGHT DAMAGE TOGGLE ---
    const dmgInput = document.getElementById('dmg-input-val');
    if (dmgInput && dmgInput.parentNode) {
        let sunWrapper = document.getElementById('setite-sunlight-wrapper');
        
        if (clan === "Followers of Set") {
            if (!sunWrapper) {
                sunWrapper = document.createElement('div');
                sunWrapper.id = 'setite-sunlight-wrapper';
                sunWrapper.className = "flex items-center gap-1 mt-2 justify-center animate-in fade-in bg-orange-900/50 p-1 rounded border border-orange-800/50 relative z-20";
                sunWrapper.innerHTML = `
                    <input type="checkbox" id="setite-sunlight-toggle" class="accent-orange-500 w-3 h-3 cursor-pointer pointer-events-auto">
                    <label for="setite-sunlight-toggle" class="text-[9px] text-orange-400 font-bold uppercase cursor-pointer select-none">Sunlight Exposure (+2 Dmg)</label>
                `;
                dmgInput.parentNode.appendChild(sunWrapper);
            }
            sunWrapper.style.display = 'flex';
        } else {
            if (sunWrapper) sunWrapper.style.display = 'none';
        }
    }

    // --- 2. FOLLOWERS OF SET: BRIGHT LIGHT PENALTY (Dice Tray) ---
    const tray = document.getElementById('dice-tray');
    if (tray) {
        let lightWrapper = document.getElementById('setite-light-wrapper');
        
        if (clan === "Followers of Set") {
            if (!lightWrapper) {
                lightWrapper = document.createElement('div');
                lightWrapper.id = 'setite-light-wrapper';
                lightWrapper.className = "flex items-center gap-2 mb-2 px-3 py-2 bg-yellow-900/60 border border-yellow-500/50 rounded flex animate-in fade-in relative z-20 shadow-sm";
                lightWrapper.innerHTML = `
                    <input type="checkbox" id="setite-light-toggle" class="accent-yellow-500 w-4 h-4 cursor-pointer pointer-events-auto ring-1 ring-yellow-500/50">
                    <label for="setite-light-toggle" class="text-[10px] text-yellow-300 font-bold uppercase cursor-pointer select-none tracking-tight hover:text-white">Bright Light (-1 Die)</label>
                `;
                
                const rollBtn = document.getElementById('roll-btn');
                if (rollBtn) {
                     const row = rollBtn.closest('.flex'); 
                     if(row) tray.insertBefore(lightWrapper, row);
                     else tray.appendChild(lightWrapper);
                } else {
                    tray.appendChild(lightWrapper);
                }
            }
            lightWrapper.style.display = 'flex';
        } else {
            if (lightWrapper) lightWrapper.style.display = 'none';
        }
    }

    // --- 3. GANGREL: BEAST TRAITS PANEL ---
    let gangrelPanel = document.getElementById('gangrel-beast-panel');
    const healthCont = document.getElementById('health-chart-play');

    if (clan === "Gangrel") {
        if (!gangrelPanel) {
            gangrelPanel = document.createElement('div');
            gangrelPanel.id = 'gangrel-beast-panel';
            gangrelPanel.className = "mt-4 p-3 bg-[#1a1a1a] border border-[#8b0000] rounded shadow-lg animate-in fade-in";
            
            if(healthCont && healthCont.parentNode) {
                healthCont.parentNode.appendChild(gangrelPanel);
            } else if (tray && tray.parentNode) {
                tray.parentNode.appendChild(gangrelPanel);
            }
        }
        gangrelPanel.style.display = 'block';
        renderGangrelPanel(gangrelPanel);
    } else {
        if (gangrelPanel) gangrelPanel.style.display = 'none';
    }

    // --- 4. NOSFERATU: APPEARANCE ENFORCEMENT & VISUALS ---
    // Always refresh Appearance row to ensure styles (strikethrough) and dots (0 vs 1) match current clan
    refreshTraitRow("Appearance", "attr");

    // Force data consistency
    if (clan === "Nosferatu") {
        if (window.state.dots.attr["Appearance"] > 0) {
            window.state.dots.attr["Appearance"] = 0;
            refreshTraitRow("Appearance", "attr");
        }
    }
}

// --- GANGREL HELPER FUNCTIONS ---
function renderGangrelPanel(container) {
    if (!window.state.beastTraits) window.state.beastTraits = [];
    
    const traits = window.state.beastTraits;
    
    let listHTML = `<div class="text-[#d4af37] font-bold text-xs uppercase mb-2 border-b border-[#333] pb-1 flex justify-between items-center">
        <span>Gangrel Beast Traits</span>
        <span class="text-[9px] text-gray-400">Weakness</span>
    </div>`;
    
    if (traits.length === 0) {
        listHTML += `<div class="text-gray-500 text-[10px] italic text-center py-2">No animal traits acquired... yet.</div>`;
    } else {
        listHTML += `<div class="space-y-2 mb-3">`;
        traits.forEach((t, idx) => {
            const isPerm = t.type === 'Permanent';
            listHTML += `
            <div class="bg-black/40 p-2 rounded border ${isPerm ? 'border-red-900' : 'border-gray-700'} relative group">
                <div class="flex justify-between items-start">
                    <span class="text-[#d4af37] font-bold text-[11px]">${t.name}</span>
                    <span class="text-[9px] ${isPerm ? 'text-red-500 font-bold' : 'text-gray-400'} uppercase">${t.type}</span>
                </div>
                <div class="text-gray-300 text-[10px] mt-1 italic">${t.effect}</div>
                <button onclick="window.removeBeastTrait(${idx})" class="absolute top-1 right-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        });
        listHTML += `</div>`;
    }
    
    listHTML += `
    <div class="mt-2 pt-2 border-t border-[#333]">
        <div class="text-[9px] text-gray-400 mb-1">Add New Trait (Frenzy Result)</div>
        <div class="grid grid-cols-1 gap-2">
            <input type="text" id="gt-name" placeholder="Trait (e.g. Wolf Ears)" class="w-full bg-black/50 border border-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded focus:border-[#d4af37] outline-none">
            <input type="text" id="gt-effect" placeholder="Effect (e.g. -1 Social)" class="w-full bg-black/50 border border-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded focus:border-[#d4af37] outline-none">
            <div class="flex gap-2">
                <select id="gt-type" class="bg-black/50 border border-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded focus:border-[#d4af37] outline-none flex-1">
                    <option value="Temporary">Temporary</option>
                    <option value="Permanent">Permanent</option>
                </select>
                <button onclick="window.addBeastTrait()" class="bg-[#8b0000] hover:bg-[#a00000] text-white text-[10px] font-bold px-3 py-1 rounded transition-colors">ADD</button>
            </div>
        </div>
    </div>`;
    
    container.innerHTML = listHTML;
}

window.addBeastTrait = function() {
    const name = document.getElementById('gt-name')?.value;
    const effect = document.getElementById('gt-effect')?.value;
    const type = document.getElementById('gt-type')?.value;
    
    if(!name || !effect) {
        showNotification("Please enter Name and Effect.");
        return;
    }
    
    window.state.beastTraits.push({ name, effect, type });
    showNotification("Beast Trait Added.");
    
    const panel = document.getElementById('gangrel-beast-panel');
    if(panel) renderGangrelPanel(panel);
    if(window.renderPrintSheet) window.renderPrintSheet();
};

window.removeBeastTrait = function(idx) {
    if(confirm("Remove this Beast Trait?")) {
        window.state.beastTraits.splice(idx, 1);
        const panel = document.getElementById('gangrel-beast-panel');
        if(panel) renderGangrelPanel(panel);
        if(window.renderPrintSheet) window.renderPrintSheet();
    }
};

// --- DERANGEMENT MANAGEMENT (Shared + Malkavian Logic) ---

window.addDerangement = function() {
    // Attempt to find input from various possible IDs depending on where it's rendered
    const input = document.getElementById('derangement-input') || document.getElementById('malk-new-d');
    const val = input?.value;
    if (!val) {
        showNotification("Enter a Derangement name.");
        return;
    }
    
    if (!window.state.derangements) window.state.derangements = [];
    window.state.derangements.push(val);
    
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    if (clan === "Malkavian" && window.state.derangements.length === 1) {
        showNotification("Primary Incurable Derangement Set.");
    } else {
        showNotification("Derangement Added.");
    }
    
    if(input) input.value = '';
    
    // Refresh relevant views
    if(window.renderSocialProfile) window.renderSocialProfile(); 
    if(window.renderPrintSheet) window.renderPrintSheet();
    if(window.renderBioTab) window.renderBioTab();
};

window.removeDerangement = function(idx) {
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    
    // Malkavian Weakness: Cannot remove the first derangement
    if (clan === "Malkavian" && idx === 0) {
        showNotification("Malkavian Weakness: Cannot remove the original Incurable Derangement!");
        return;
    }
    
    if(confirm("Remove this Derangement?")) {
        window.state.derangements.splice(idx, 1);
        if(window.renderSocialProfile) window.renderSocialProfile();
        if(window.renderPrintSheet) window.renderPrintSheet();
        if(window.renderBioTab) window.renderBioTab();
    }
};

window.suppressDerangement = function() {
    if ((window.state.status.tempWillpower || 0) > 0) {
        window.state.status.tempWillpower--;
        updatePools(); // Update WP dots/boxes
        showNotification("Spent 1 WP: Derangements suppressed for 1 Scene.");
    } else {
        showNotification("Not enough Willpower!");
    }
};


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
    
    // --- RESET DICE TRAY UI (Standard Mode) ---
    // Show Willpower & Reset State (Fix for Brujah Curse persistence)
    const wpCont = document.getElementById('willpower-spend-container');
    if(wpCont) {
        wpCont.style.display = 'flex';
        const wpCheck = document.getElementById('spend-willpower');
        if(wpCheck) {
            wpCheck.checked = false;
            wpCheck.disabled = false;
        }
        const wpLabel = document.querySelector('label[for="spend-willpower"]');
        if(wpLabel) wpLabel.innerText = "Spend Willpower (Auto Success)";
    }
    
    // Hide Tray Armor Toggle if it exists
    const armorCont = document.getElementById('tray-armor-toggle-container');
    if(armorCont) armorCont.style.display = 'none';

    // Reset Setite Light Toggle if exists
    const lightToggle = document.getElementById('setite-light-toggle');
    if (lightToggle) lightToggle.checked = false;

    // Refresh Clan UI Elements
    updateClanMechanicsUI();

    document.getElementById('dice-tray').classList.remove('open');
}
window.clearPool = clearPool;


export function handleTraitClick(name, type) {
    // If we were in a special mode (Soak), clear first to reset UI
    const armorCont = document.getElementById('tray-armor-toggle-container');
    if(armorCont && armorCont.style.display !== 'none') {
        window.clearPool();
    }

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
        updateClanMechanicsUI(); // Ensure toggle is visible and updated
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
    let poolSize = window.state.activePool.reduce((a,b) => a + b.val, 0) + custom;
    
    // --- CLAN WEAKNESS: FOLLOWERS OF SET (Bright Light) ---
    const clan = window.state.textFields['c-clan'] || "None";
    const lightToggle = document.getElementById('setite-light-toggle');
    if (clan === "Followers of Set" && lightToggle && lightToggle.checked) {
        poolSize -= 1;
        // Do not return here, we proceed with reduced pool
    }

    if (poolSize <= 0 && autoSuccesses === 0) { 
        window.showNotification("Pool Empty (or reduced to 0)"); 
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
    if (autoSuccesses > 0) extras += `<div class="text-[9px] text-blue-300 font-bold mt-1 text-center border-t border-[#333] pt-1 uppercase">Willpower Applied (+1 Success)</div>`;
    
    if (clan === "Followers of Set" && lightToggle && lightToggle.checked) {
        extras += `<div class="text-[9px] text-yellow-500 font-bold mt-1 text-center border-t border-[#333] pt-1 uppercase">Bright Light Penalty (-1 Die)</div>`;
    }

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
    if (tray.classList.contains('open')) {
        updateClanMechanicsUI();
    }
}
window.toggleDiceTray = toggleDiceTray;


// --- FRENZY & RÖTSCHRECK ---

export function rollFrenzy() {
    window.clearPool();
    const traitName = window.state.dots.virt["Instincts"] ? "Instincts" : "Self-Control";
    const traitVal = window.state.dots.virt[traitName] || 1;
    
    window.state.activePool.push({name: traitName, val: traitVal});

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    
    // 1. Determine Base Difficulty
    let difficulty = 6; 
    let diffMsg = "";

    const diffInputOverride = document.getElementById('frenzy-diff');
    if (diffInputOverride && diffInputOverride.value) {
        difficulty = parseInt(diffInputOverride.value) || 6;
        diffMsg = " (Custom)";
    }

    // 2. Apply Brujah Weakness regardless of custom input
    if (clan === "Brujah") {
        difficulty += 2;
        diffMsg += " (Brujah Curse)";
        
        // --- BRUJAH CURSE IMPLEMENTATION: NO WP TO AVOID FRENZY ---
        const wpCheck = document.getElementById('spend-willpower');
        if (wpCheck) {
            wpCheck.checked = false;
            wpCheck.disabled = true;
        }
        const wpLabel = document.querySelector('label[for="spend-willpower"]');
        if (wpLabel) {
            wpLabel.innerHTML = `<span class="text-red-500 font-black animate-pulse">BRUJAH: CANNOT SPEND WP</span>`;
        }
        window.showNotification("Brujah: +2 Diff, No Willpower");
    }
    
    // 3. Gangrel Frenzy Notification
    if (clan === "Gangrel") {
        window.showNotification("GANGREL: If Frenzy occurs, you gain a Beast Trait!");
        diffMsg += " (Gangrel: Beast Trait Risk)";
    }

    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = difficulty;

    const display = document.getElementById('pool-display');
    if (display) {
        setSafeText('pool-display', `Frenzy Check: ${traitName} (${traitVal})`);
        display.classList.add('text-red-500');
    }

    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');

    showNotification(`Frenzy Pool Ready (Diff ${difficulty}${diffMsg}). Roll when ready.`);
}
window.rollFrenzy = rollFrenzy;


export function rollRotschreck() {
    window.clearPool();
    const traitName = "Courage";
    const traitVal = window.state.dots.virt[traitName] || 1;
    
    window.state.activePool.push({name: traitName, val: traitVal});
    
    let difficulty = 6;
    const diffInputOverride = document.getElementById('rotschreck-diff');
    if (diffInputOverride && diffInputOverride.value) {
        difficulty = parseInt(diffInputOverride.value) || 6;
    }

    const diffInput = document.getElementById('roll-diff');
    if (diffInput) diffInput.value = difficulty;
    
    const display = document.getElementById('pool-display');
    if (display) {
        setSafeText('pool-display', `Rötschreck Check: ${traitName} (${traitVal})`);
        display.classList.add('text-orange-500');
    }

    const tray = document.getElementById('dice-tray');
    if (tray) tray.classList.add('open');

    showNotification(`Fear Pool Ready (Diff ${difficulty}). Roll when ready.`);
}
window.rollRotschreck = rollRotschreck;


// --- DAMAGE HANDLING & SOAK ---

export function applyDamage(typeStr) {
    const typeMap = { 'Bashing': 1, 'Lethal': 2, 'Aggravated': 3 };
    const val = typeMap[typeStr];
    if(!val) return;

    let amount = parseInt(document.getElementById('dmg-input-val')?.value) || 1;
    
    // --- CLAN WEAKNESS: FOLLOWERS OF SET (Sunlight) ---
    const clan = window.state.textFields['c-clan'] || "None";
    const sunlightToggle = document.getElementById('setite-sunlight-toggle');
    if (clan === "Followers of Set" && sunlightToggle && sunlightToggle.checked) {
        amount += 2;
        window.showNotification("Sunlight: +2 Health Levels (Setite Weakness)");
    }

    // Ensure health_states exists
    let currentHealth = (window.state.status.health_states && Array.isArray(window.state.status.health_states)) 
        ? [...window.state.status.health_states] 
        : [0,0,0,0,0,0,0];
    
    // 1. Flatten existing damage to list
    let damageList = currentHealth.filter(x => x > 0);
    
    // 2. Add new damage
    for(let i=0; i<amount; i++) {
        damageList.push(val);
    }
    
    // 3. Sort: Agg (3) > Lethal (2) > Bash (1)
    damageList.sort((a,b) => b - a);
    
    // 4. Handle Overflow (Limit to 7)
    while(damageList.length > 7) {
        damageList.pop();
        window.showNotification("Health Track Full! Check Torpor/Death rules.");
    }

    // 5. Re-fill array
    let newStates = [0,0,0,0,0,0,0];
    for(let i=0; i<7; i++) {
        if(i < damageList.length) newStates[i] = damageList[i];
        else newStates[i] = 0;
    }
    
    window.state.status.health_states = newStates;
    
    // Update UI
    if(window.renderPrintSheet) window.renderPrintSheet();
    updatePools(); // Refresh health boxes
}
window.applyDamage = applyDamage;

export function setupSoak() {
    // 1. Manipulate UI: Hide Willpower, Show Armor Toggle in Dice Tray
    const wpCont = document.getElementById('willpower-spend-container');
    if(wpCont) wpCont.style.display = 'none';

    let trayArmorContainer = document.getElementById('tray-armor-toggle-container');
    if (!trayArmorContainer) {
        const tray = document.getElementById('dice-tray');
        trayArmorContainer = document.createElement('div');
        trayArmorContainer.id = 'tray-armor-toggle-container';
        trayArmorContainer.className = "items-center gap-2 mb-4 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded flex animate-in fade-in";
        trayArmorContainer.innerHTML = `
            <input type="checkbox" id="tray-use-armor" class="w-4 h-4 cursor-pointer accent-gray-500">
            <label for="tray-use-armor" class="text-[10px] uppercase font-black text-gray-300 cursor-pointer tracking-tight">Add Armor to Soak</label>
        `;
        // Insert before Roll Button wrapper (or roll btn itself)
        const rollBtn = document.getElementById('roll-btn');
        if(rollBtn && rollBtn.parentNode) {
            // Find the flex container wrapping diff and roll btn
            const rollRow = rollBtn.parentNode;
            tray.insertBefore(trayArmorContainer, rollRow);
        } else {
            tray.appendChild(trayArmorContainer);
        }
        
        // Add Listener
        const trayToggle = trayArmorContainer.querySelector('input');
        trayToggle.onchange = () => window.setupSoak();
    }
    trayArmorContainer.style.display = 'flex';

    // 2. Sync Logic between Health Toggle and Tray Toggle
    const healthToggle = document.getElementById('soak-armor-toggle');
    const trayToggle = document.getElementById('tray-use-armor');
    
    // If Health Toggle triggered this, update Tray Toggle
    if (healthToggle && document.activeElement === healthToggle) {
        if(trayToggle) trayToggle.checked = healthToggle.checked;
    }
    // If Tray Toggle triggered this, update Health Toggle
    else if (trayToggle && document.activeElement === trayToggle) {
        if(healthToggle) healthToggle.checked = trayToggle.checked;
    }
    // Initial / Default
    else if (healthToggle && trayToggle) {
        trayToggle.checked = healthToggle.checked;
    }

    // 3. Clear Active Pool (but don't trigger UI reset via clearPool() standard)
    window.state.activePool = [];
    
    // 4. Calculate Values
    const stam = window.state.dots.attr['Stamina'] || 1;
    const fort = window.state.dots.disc['Fortitude'] || 0;
    
    let armorRating = 0;
    const isArmorActive = trayToggle ? trayToggle.checked : false;
    
    if (isArmorActive && window.state.inventory && Array.isArray(window.state.inventory)) {
        const armors = window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried');
        armors.forEach(a => {
            // Robust parsing
            let r = 0;
            if (a.stats && a.stats.rating) r = parseInt(a.stats.rating);
            if (!isNaN(r)) armorRating += r;
        });
    }
    
    // 5. Build Pool
    window.state.activePool.push({name: 'Stamina', val: stam});
    if(fort > 0) window.state.activePool.push({name: 'Fortitude', val: fort});
    if(armorRating > 0) window.state.activePool.push({name: 'Armor', val: armorRating});
    
    // 6. Update Text
    const armorText = armorRating > 0 ? ` + Armor (${armorRating})` : '';
    setSafeText('pool-display', `Soak Roll: Stamina (${stam}) ${fort>0 ? `+ Fortitude (${fort})` : ''}${armorText}`);
    
    // 7. Open Tray
    document.getElementById('dice-tray').classList.add('open');
    showNotification("Soak Pool Ready.");
}
window.setupSoak = setupSoak;

export function healOneLevel() {
    let currentHealth = (window.state.status.health_states && Array.isArray(window.state.status.health_states)) 
        ? [...window.state.status.health_states] 
        : [0,0,0,0,0,0,0];
        
    let damageList = currentHealth.filter(x => x > 0);
    
    if(damageList.length === 0) {
        showNotification("No damage to heal.");
        return;
    }
    
    // Get the "least severe" or "last marked" wound
    const lastWound = damageList[damageList.length - 1];
    
    if(lastWound === 3) {
        showNotification("Aggravated damage requires 5 BP + Rest.");
        return;
    }
    
    // Check Blood
    const curBlood = window.state.status.blood || 0;
    if(curBlood < 1) {
        showNotification("Not enough Blood (Need 1 BP).");
        return;
    }
    
    // Spend Blood
    window.state.status.blood = curBlood - 1;
    
    // Heal (Remove last item)
    damageList.pop();
    
    // Rebuild State
    let newStates = [0,0,0,0,0,0,0];
    for(let i=0; i<7; i++) {
        if(i < damageList.length) newStates[i] = damageList[i];
        else newStates[i] = 0;
    }
    window.state.status.health_states = newStates;
    
    if(window.renderPrintSheet) window.renderPrintSheet();
    updatePools();
    showNotification("Healed 1 wound level (1 BP).");
}
window.healOneLevel = healOneLevel;


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

    // --- CLAN MECHANICS UPDATE ---
    updateClanMechanicsUI();
}
window.updatePools = updatePools;

export function refreshTraitRow(label, type, targetEl) {
    let rowDiv = targetEl;
    if (!rowDiv) {
        const safeId = 'trait-row-' + type + '-' + label.replace(/[^a-zA-Z0-9]/g, '');
        rowDiv = document.getElementById(safeId);
    }
    
    if(!rowDiv) return;

    // --- UPDATED MIN VALUE LOGIC ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    let min = (type === 'attr') ? 1 : 0;
    
    // Override min for Nosferatu Appearance
    if (clan === "Nosferatu" && label === "Appearance") min = 0;

    let val = window.state.dots[type][label];
    if (val === undefined) val = min;
    
    // Ensure value respects min (e.g. switching away from Nosferatu 0 -> 1)
    if (val < min) {
        val = min;
        window.state.dots[type][label] = val; // Sync state
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

    let styleOverride = "";
    let pointerEvents = "auto";
    let titleMsg = "";
    
    // --- NOSFERATU VISUAL STYLING ---
    if (clan === "Nosferatu" && label === "Appearance") {
        styleOverride = "text-decoration: line-through; color: #666; cursor: not-allowed; opacity: 0.5;";
        pointerEvents = "none"; // Disable dots
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

    rowDiv.querySelector('.trait-label').onclick = () => { if(window.state.isPlayMode && !(clan === "Nosferatu" && label === "Appearance")) window.handleTraitClick(label, type); };
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

    // --- NOSFERATU BLOCK ---
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    if (clan === "Nosferatu" && name === "Appearance") {
        window.showNotification("Nosferatu Weakness: Appearance is 0.");
        return;
    }

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
