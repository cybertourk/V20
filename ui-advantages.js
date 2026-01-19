import { 
    DERANGEMENTS, SPECIALTY_EXAMPLES
} from "./data.js";

import { THAUMATURGY_DATA } from "./thaumaturgy-data.js";
import { NECROMANCY_DATA } from "./necromancy-data.js";

import { 
    renderDots, showNotification 
} from "./ui-common.js";

import { 
    updatePools, setDots 
} from "./ui-mechanics.js";

// Import from future modules (Circular dependency handled by module system or window attachment)
import { renderPrintSheet } from "./ui-print.js";
import { updateRitualsPlayView } from "./ui-play.js";

// --- DYNAMIC ADVANTAGES (Disciplines, Backgrounds, etc.) ---

export function renderDynamicAdvantageRow(containerId, type, list, isAbil = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    let existingItems = [];
    if (type === 'abil') {
        let category = '';
        if (containerId === 'custom-talents') category = 'Talents';
        else if (containerId === 'custom-skills') category = 'Skills';
        else if (containerId === 'custom-knowledges') category = 'Knowledges';
        if (window.state.customAbilityCategories) { existingItems = Object.keys(window.state.dots.abil).filter(k => window.state.customAbilityCategories[k] === category); }
    } else { if (window.state.dots[type]) existingItems = Object.keys(window.state.dots[type]); }

    // --- THAUMATURGY / NECROMANCY HELPER ---
    // Identify if a discipline name corresponds to a known path
    const isMagicPath = (name) => {
        if (!name) return false;
        const n = name.toLowerCase();
        // Check Data files
        if (THAUMATURGY_DATA && Object.keys(THAUMATURGY_DATA).some(k => k.toLowerCase() === n)) return 'thaum';
        if (NECROMANCY_DATA && Object.keys(NECROMANCY_DATA).some(k => k.toLowerCase() === n)) return 'necro';
        // Heuristics
        if (n.includes('path') || n.includes('lure of') || n.includes('gift of') || n.includes('weather control') || n.includes('movement of the mind')) return 'thaum'; 
        return false;
    };

    // --- PARENT ROW BUILDER (For Thaumaturgy/Necromancy Headers) ---
    const buildParentRow = (label, primaryKey, allChildKeys) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center mb-1 advantage-row parent-row bg-[#111] p-1 rounded border border-[#333]';

        // Title Section
        const titleDiv = document.createElement('div');
        titleDiv.className = 'flex-1 font-cinzel font-bold text-[#d4af37] text-sm flex items-center gap-2';
        titleDiv.innerHTML = `<i class="fas fa-book-open text-[10px]"></i> ${label}`;
        
        // Dots (Linked to Primary Path)
        const dotCont = document.createElement('div');
        dotCont.className = 'dot-row flex-shrink-0';
        const val = primaryKey ? (window.state.dots.disc[primaryKey] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        dotCont.dataset.n = primaryKey; // Link clicks to primary path
        dotCont.dataset.t = type;
        
        // Click Logic for Parent Dots (Edits Primary Path)
        dotCont.onclick = (e) => {
            if (!primaryKey || !e.target.dataset.v) return;
            // Pass through to setDots targeting the primary key
            setDots(primaryKey, type, parseInt(e.target.dataset.v), 0, 5);
        };

        // Remove Button (Deletes ALL paths of this type)
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn flex-shrink-0 ml-2 text-red-500 hover:text-red-300 cursor-pointer';
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.title = "Remove Discipline and all Paths";
        
        if (window.state.xpMode) removeBtn.style.visibility = 'hidden'; // Hard to calculate refund for bulk delete, safer to hide
        
        removeBtn.onclick = () => {
            if (confirm(`Remove ${label} and all learned paths?`)) {
                allChildKeys.forEach(k => delete window.state.dots.disc[k]);
                // Clear Primary Preference
                if (label === 'Thaumaturgy') delete window.state.primaryThaumPath;
                if (label === 'Necromancy') delete window.state.primaryNecroPath;
                
                updatePools();
                if(renderPrintSheet) renderPrintSheet();
                renderDynamicAdvantageRow(containerId, type, list, isAbil);
            }
        };

        row.appendChild(titleDiv);
        row.appendChild(dotCont);
        row.appendChild(removeBtn);
        container.appendChild(row);
    };

    const buildRow = (name = null, isChild = false) => {
        const row = document.createElement('div');
        
        // Standard Row Classes
        row.className = 'flex justify-between items-center mb-1 advantage-row';
        
        // Child Indentation Styles
        if (isChild) {
            row.classList.add('ml-6', 'pl-2', 'border-l', 'border-[#444]', 'pr-1');
            row.style.width = "calc(100% - 1.5rem)";
        }

        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mr-2 relative';

        let inputField;
        let selectField = null;

        // Visual check for Primary
        const isPrimaryThaum = type === 'disc' && name && window.state.primaryThaumPath === name;
        const isPrimaryNecro = type === 'disc' && name && window.state.primaryNecroPath === name;

        // --- DROPDOWN VS INPUT LOGIC ---
        if (list && list.length > 0) {
            selectField = document.createElement('select');
            selectField.className = 'w-full bg-[#111] border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            if (isChild) selectField.classList.add('text-gray-300', 'italic'); 
            if (isPrimaryThaum || isPrimaryNecro) selectField.classList.add('text-[#d4af37]', 'not-italic');

            let html = `<option value="">-- Select --</option>`;
            list.forEach(item => {
                const val = typeof item === 'string' ? item : item.name;
                const isSelected = name === val;
                html += `<option value="${val}" ${isSelected ? 'selected' : ''}>${val}</option>`;
            });
            const isCustom = name && !list.includes(name);
            html += `<option value="Custom" ${isCustom ? 'selected' : ''}>-- Custom / Write-in --</option>`;
            selectField.innerHTML = html;

            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            if (isChild) inputField.classList.add('text-gray-300', 'italic');
            if (isPrimaryThaum || isPrimaryNecro) inputField.classList.add('text-[#d4af37]', 'not-italic');
            
            inputField.placeholder = "Name...";
            inputField.value = name || "";
            
            if (isCustom) {
                selectField.style.display = 'none';
                inputField.style.display = 'block';
            } else {
                selectField.style.display = 'block';
                inputField.style.display = 'none';
            }
            
            if (window.state.isPlayMode) {
                selectField.disabled = true;
                inputField.disabled = true;
            }

            specWrapper.appendChild(selectField);
            specWrapper.appendChild(inputField);

        } else {
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            inputField.placeholder = "Name...";
            inputField.value = name || "";
            if (window.state.isPlayMode) inputField.disabled = true;
            if (isPrimaryThaum || isPrimaryNecro) inputField.classList.add('text-[#d4af37]');

            specWrapper.appendChild(inputField);
        }

        if (isPrimaryThaum) (selectField || inputField).title = "Primary Thaumaturgy Path";
        if (isPrimaryNecro) (selectField || inputField).title = "Primary Necromancy Path";

        // Specialty Logic
        if (isAbil && name) {
            const hasSpec = window.state.specialties && window.state.specialties[name];
            if (hasSpec || (window.state.dots.abil[name] >= 4) || SPECIALTY_EXAMPLES[name]) {
                const specBtn = document.createElement('div');
                specBtn.className = "absolute right-0 top-0 text-[9px] cursor-pointer hover:text-gold";
                specBtn.className += hasSpec ? " text-gold" : " text-gray-600";
                specBtn.innerHTML = '<i class="fas fa-star"></i>';
                specBtn.title = hasSpec ? `Specialty: ${hasSpec}` : "Add Specialty";
                
                specBtn.onclick = () => {
                     if(window.openSpecialtyModal) window.openSpecialtyModal(name);
                     else {
                         const s = prompt(`Enter specialty for ${name}:`, hasSpec || "");
                         if(s) { window.state.specialties[name] = s; renderDynamicAdvantageRow(containerId, type, list, isAbil); }
                     }
                };
                specWrapper.appendChild(specBtn);
            }
        }

        const dotCont = document.createElement('div'); 
        dotCont.className = 'dot-row flex-shrink-0';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }

        const removeBtn = document.createElement('div'); 
        removeBtn.className = 'remove-btn flex-shrink-0 ml-1'; 
        removeBtn.innerHTML = '&times;';
        if (!name || (window.state.xpMode && val > 0)) removeBtn.style.visibility = 'hidden';

        let curName = name;
        let category = null;
        if (containerId === 'custom-talents') category = 'Talents'; else if (containerId === 'custom-skills') category = 'Skills'; else if (containerId === 'custom-knowledges') category = 'Knowledges';
        
        const onUpdate = (newVal) => {
            if (!newVal) return;

            // --- THAUMATURGY & NECROMANCY DROPDOWN INTERCEPTOR ---
            // Allows user to pick a path from a sub-menu instead of a prompt
            if (type === 'disc' && selectField && selectField.style.display !== 'none') {
                const lower = newVal.toLowerCase();
                
                // Switch to Thaumaturgy Paths
                if (lower === 'thaumaturgy') {
                    const paths = THAUMATURGY_DATA ? Object.keys(THAUMATURGY_DATA) : ["The Path of Blood", "Lure of Flames", "Movement of the Mind", "The Path of Conjuring", "Hands of Destruction"];
                    
                    let html = `<option value="">-- Select Path --</option>`;
                    paths.forEach(p => html += `<option value="${p}">${p}</option>`);
                    html += `<option value="BACK_TO_MAIN">-- Back to Disciplines --</option>`;
                    
                    selectField.innerHTML = html;
                    selectField.classList.add('text-[#d4af37]', 'border-[#d4af37]');
                    selectField.value = ""; // Reset value to wait for user selection
                    return; // Stop processing, wait for next change event
                }

                // Switch to Necromancy Paths
                if (lower === 'necromancy') {
                    const paths = NECROMANCY_DATA ? Object.keys(NECROMANCY_DATA) : ["The Sepulchre Path", "The Bone Path", "The Ash Path"];
                    
                    let html = `<option value="">-- Select Path --</option>`;
                    paths.forEach(p => html += `<option value="${p}">${p}</option>`);
                    html += `<option value="BACK_TO_MAIN">-- Back to Disciplines --</option>`;
                    
                    selectField.innerHTML = html;
                    selectField.classList.add('text-[#d4af37]', 'border-[#d4af37]');
                    selectField.value = "";
                    return;
                }

                // Handle Back Button
                if (newVal === 'BACK_TO_MAIN') {
                    let html = `<option value="">-- Select --</option>`;
                    list.forEach(item => {
                        const val = typeof item === 'string' ? item : item.name;
                        html += `<option value="${val}">${val}</option>`;
                    });
                    html += `<option value="Custom">-- Custom / Write-in --</option>`;
                    selectField.innerHTML = html;
                    selectField.classList.remove('text-[#d4af37]', 'border-[#d4af37]');
                    selectField.value = "";
                    return;
                }
            }

            // --- PRIMARY PATH AUTO-ASSIGNMENT ---
            if (type === 'disc') {
                const magicType = isMagicPath(newVal);
                
                if (magicType === 'thaum') {
                    if (!window.state.primaryThaumPath) {
                        window.state.primaryThaumPath = newVal;
                        showNotification(`Primary Path set: ${newVal}`);
                        
                        // Auto-add free ritual (Defense of Sacred Haven)
                        if (!window.state.rituals) window.state.rituals = [];
                        if (!window.state.rituals.some(r => r.level === 1)) {
                             window.state.rituals.push({ name: "Defense of the Sacred Haven", level: 1 });
                             showNotification("Learned: Defense of the Sacred Haven (Free)");
                        }
                    }
                } else if (magicType === 'necro') {
                    if (!window.state.primaryNecroPath) {
                        window.state.primaryNecroPath = newVal;
                        showNotification(`Primary Necromancy Path set: ${newVal}`);
                    }
                }
            }

            if (window.state.xpMode && !curName) {
                let baseCost = 0;
                let costType = '';
                
                if (type === 'disc') { 
                    const isThaumPath = isMagicPath(newVal) === 'thaum';
                    const isNecroPath = isMagicPath(newVal) === 'necro';
                    const hasPathName = newVal.toLowerCase().includes('path');

                    if (isThaumPath || isNecroPath || hasPathName) {
                        baseCost = 7;
                        costType = 'New Path';
                    } else {
                        baseCost = 10; 
                        costType = 'New Discipline'; 
                    }
                }
                else if (isAbil) { 
                    baseCost = 3; 
                    costType = 'New Ability'; 
                }
                
                const totalXP = parseInt(document.getElementById('c-xp-total')?.value) || 0;
                let spentXP = window.state.xpLog ? window.state.xpLog.reduce((acc, log) => acc + log.cost, 0) : 0;
                
                if (baseCost > (totalXP - spentXP)) {
                    showNotification(`Need ${baseCost} XP for ${costType}.`);
                    if(selectField) selectField.value = "";
                    inputField.value = ""; 
                    return;
                }

                if (!confirm(`Spend ${baseCost} XP to learn ${newVal}?`)) {
                    if(selectField) selectField.value = "";
                    inputField.value = "";
                    return;
                }
                
                 if (!window.state.xpLog) window.state.xpLog = [];
                 window.state.xpLog.push({
                    trait: newVal,
                    old: 0,
                    new: 1, 
                    cost: baseCost,
                    type: type,
                    date: new Date().toISOString()
                });
                
                 window.state.dots[type][newVal] = 1; 
                 showNotification(`Learned ${newVal} (${baseCost} XP)`);
            }
            else if (curName && curName !== newVal) { 
                const dots = window.state.dots[type][curName]; delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName];
                if (newVal) window.state.dots[type][newVal] = dots || 0; 
                
                if (window.state.primaryThaumPath === curName) window.state.primaryThaumPath = newVal;
                if (window.state.primaryNecroPath === curName) window.state.primaryNecroPath = newVal;
                
                if(window.state.specialties[curName]) { window.state.specialties[newVal] = window.state.specialties[curName]; delete window.state.specialties[curName]; }
            } else if (!curName && newVal && !window.state.xpMode) {
                 window.state.dots[type][newVal] = 0; 
            }
            
            curName = newVal;
            if (newVal) { 
                if (window.state.dots[type][newVal] === undefined) window.state.dots[type][newVal] = window.state.xpMode ? 1 : 0;

                dotCont.innerHTML = renderDots(window.state.dots[type][newVal], 5);
                dotCont.dataset.n = newVal; dotCont.dataset.t = type;
                if (category) { if (!window.state.customAbilityCategories) window.state.customAbilityCategories = {}; window.state.customAbilityCategories[newVal] = category; }
                
                if (row === container.lastElementChild) { 
                    removeBtn.style.visibility = window.state.xpMode ? 'hidden' : 'visible'; 
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                }
            }
            updatePools();
            if(renderPrintSheet) renderPrintSheet();
        };
        
        if (selectField) {
            selectField.onchange = (e) => {
                const val = e.target.value;
                if (val === 'Custom') {
                    selectField.style.display = 'none';
                    inputField.style.display = 'block';
                    inputField.focus();
                    inputField.value = ""; 
                } else if (val) {
                    onUpdate(val);
                }
            };
            inputField.onblur = (e) => {
                const val = e.target.value;
                if (!val && !curName) {
                    inputField.style.display = 'none';
                    selectField.style.display = 'block';
                    selectField.value = "";
                } else {
                    onUpdate(val);
                }
            };
        } else {
            if (isAbil) inputField.onblur = (e) => onUpdate(e.target.value); 
            else inputField.onchange = (e) => onUpdate(e.target.value);
        }

        removeBtn.onclick = () => { 
            if (curName) { 
                delete window.state.dots[type][curName]; 
                if (window.state.customAbilityCategories && window.state.customAbilityCategories[curName]) delete window.state.customAbilityCategories[curName]; 
                if (window.state.primaryThaumPath === curName) delete window.state.primaryThaumPath;
                if (window.state.primaryNecroPath === curName) delete window.state.primaryNecroPath;
            } 
            row.remove(); 
            updatePools(); 
            if(type==='back') renderSocialProfile(); 
            if(renderPrintSheet) renderPrintSheet(); 
            renderDynamicAdvantageRow(containerId, type, list, isAbil);
        };
        
        dotCont.onclick = (e) => { 
            if (!curName || !e.target.dataset.v) return; 
            const newDots = parseInt(e.target.dataset.v);
            
            if (type === 'disc') {
                const isThaum = isMagicPath(curName) === 'thaum';
                if (isThaum && window.state.primaryThaumPath) {
                    const primaryName = window.state.primaryThaumPath;
                    const primaryRating = window.state.dots.disc[primaryName] || 0;
                    
                    if (curName !== primaryName) {
                        if (primaryRating < 5 && newDots >= primaryRating) {
                            showNotification("Secondary Path cannot equal or exceed Primary Path.");
                            return; 
                        }
                    }
                }
            }

            setDots(curName, type, newDots, 0, 5);
        };

        row.appendChild(specWrapper);
        row.appendChild(dotCont);
        row.appendChild(removeBtn);
        container.appendChild(row);
    };

    // --- SORTING AND GROUPING LOGIC ---
    if (type === 'disc') {
        const standardDiscs = [];
        const thaumPaths = [];
        const necroPaths = [];

        existingItems.forEach(item => {
            const check = isMagicPath(item);
            if (check === 'thaum') thaumPaths.push(item);
            else if (check === 'necro') necroPaths.push(item);
            else standardDiscs.push(item);
        });

        standardDiscs.forEach(item => buildRow(item));

        if (thaumPaths.length > 0) {
            if (!window.state.primaryThaumPath || !thaumPaths.includes(window.state.primaryThaumPath)) {
                window.state.primaryThaumPath = thaumPaths[0];
            }
            const prim = window.state.primaryThaumPath;
            buildParentRow("Thaumaturgy", prim, thaumPaths);
            const sortedThaum = [prim, ...thaumPaths.filter(p => p !== prim)];
            sortedThaum.forEach(path => buildRow(path, true)); 
        }

        if (necroPaths.length > 0) {
             if (!window.state.primaryNecroPath || !necroPaths.includes(window.state.primaryNecroPath)) {
                window.state.primaryNecroPath = necroPaths[0];
            }
            const prim = window.state.primaryNecroPath;
            buildParentRow("Necromancy", prim, necroPaths);
            const sortedNecro = [prim, ...necroPaths.filter(p => p !== prim)];
            sortedNecro.forEach(path => buildRow(path, true));
        }

    } else {
        existingItems.forEach(item => buildRow(item));
    }
    buildRow(); 
}
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;

export function renderDynamicTraitRow(containerId, type, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stateArray = type === 'Merit' ? (window.state.merits || []) : (window.state.flaws || []);
    container.innerHTML = '';
    
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";

    const appendRow = (data = null) => {
        const row = document.createElement('div'); row.className = 'flex gap-2 items-center mb-2 trait-row';
        let options = `<option value="">-- Select ${type} --</option>`;
        
        list.forEach(item => { 
            let disabledAttr = "";
            let styleAttr = "";
            
            if (type === 'Merit' && clan === "Caitiff" && item.n === "Additional Discipline") {
                disabledAttr = "disabled";
                styleAttr = "color: #555; font-style: italic;";
            }
            
            options += `<option value="${item.n}" data-val="${item.v}" data-var="${item.variable||false}" ${disabledAttr} style="${styleAttr}">${item.n} (${item.range ? item.range + 'pt' : item.v + 'pt'})</option>`; 
        });
        
        options += '<option value="Custom">-- Custom / Write-in --</option>';
        row.innerHTML = `<div class="flex-1 relative"><select class="w-full text-[11px] font-bold uppercase bg-[#111] text-white border-b border-[#444]">${options}</select><input type="text" placeholder="Custom Name..." class="hidden w-full text-[11px] font-bold uppercase border-b border-[#444] bg-transparent text-white"></div><input type="number" class="w-10 text-center text-[11px] !border !border-[#444] font-bold" min="1"><div class="remove-btn">&times;</div>`;
        container.appendChild(row);
        
        const selectEl = row.querySelector('select');
        const textEl = row.querySelector('input[type="text"]');
        const numEl = row.querySelector('input[type="number"]');
        const removeBtn = row.querySelector('.remove-btn');
        const isLocked = !window.state.freebieMode;
        
        selectEl.disabled = isLocked; textEl.disabled = isLocked; numEl.disabled = isLocked;
        if(isLocked) { selectEl.classList.add('opacity-50'); textEl.classList.add('opacity-50'); numEl.classList.add('opacity-50'); }
        
        if (data) {
            const exists = list.some(l => l.n === data.name);
            if (exists) {
                selectEl.value = data.name; numEl.value = data.val;
                const itemData = list.find(l => l.n === data.name);
                if (itemData && !itemData.variable) { numEl.disabled = true; numEl.classList.add('opacity-50'); }
            } else { selectEl.value = "Custom"; selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.value = data.name; numEl.value = data.val; }
        } else { numEl.value = ""; removeBtn.style.visibility = 'hidden'; }
        
        const syncState = () => {
            const allRows = container.querySelectorAll('.trait-row');
            const newState = [];
            allRows.forEach(r => {
                const s = r.querySelector('select');
                const t = r.querySelector('input[type="text"]');
                const n = r.querySelector('input[type="number"]');
                let name = s.value === 'Custom' ? t.value : s.value;
                let val = parseInt(n.value) || 0;
                let desc = "";
                const existing = (type === 'Merit' ? window.state.merits : window.state.flaws).find(i => i.name === name);
                if (existing) desc = existing.desc || "";

                if (name && name !== 'Custom') newState.push({ name, val, desc });
            });
            if (type === 'Merit') window.state.merits = newState; else window.state.flaws = newState;
            updatePools();
            if(renderPrintSheet) renderPrintSheet();
        };
        
        selectEl.addEventListener('change', () => {
            if (selectEl.value === 'Custom') { selectEl.classList.add('hidden'); textEl.classList.remove('hidden'); textEl.focus(); numEl.value = 1; numEl.disabled = false; numEl.classList.remove('opacity-50'); } 
            else if (selectEl.value) {
                const opt = selectEl.options[selectEl.selectedIndex];
                numEl.value = opt.dataset.val;
                if (opt.dataset.var !== "true") { numEl.disabled = true; numEl.classList.add('opacity-50'); } else { numEl.disabled = false; numEl.classList.remove('opacity-50'); }
                if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); }
            }
            syncState();
        });
        textEl.addEventListener('blur', () => { if (textEl.value === "") { textEl.classList.add('hidden'); selectEl.classList.remove('hidden'); selectEl.value = ""; } else { if (row === container.lastElementChild) { removeBtn.style.visibility = 'visible'; appendRow(); } } syncState(); });
        numEl.addEventListener('change', syncState);
        removeBtn.addEventListener('click', () => { row.remove(); syncState(); });
    };
    if (stateArray.length > 0) stateArray.forEach(d => appendRow(d));
    appendRow();
}
window.renderDynamicTraitRow = renderDynamicTraitRow;

export function renderBloodBondRow() {
    const cont = document.getElementById('blood-bond-list'); 
    if (!cont) return;
    cont.innerHTML = ''; 

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    if (clan === "Tremere") {
        const wDiv = document.createElement('div');
        wDiv.className = "text-[#a855f7] text-[9px] font-bold mb-2 uppercase border border-[#a855f7]/50 p-1 rounded bg-[#a855f7]/10 text-center";
        wDiv.innerHTML = "<i class='fas fa-flask mr-1'></i> Weakness: 1st Drink = Step 2 Bond";
        cont.appendChild(wDiv);
    }

    const buildRow = (data = null) => {
        const row = document.createElement('div'); 
        row.className = 'flex gap-2 items-center border-b border-[#222] pb-2 advantage-row';
        
        const typeVal = data ? data.type : "Bond";
        const nameVal = data ? data.name : "";
        const ratVal = data ? data.rating : "";

        row.innerHTML = `
            <select class="w-24 text-[10px] uppercase font-bold mr-2 border-b border-[#333] bg-transparent">
                <option value="Bond" ${typeVal === 'Bond' ? 'selected' : ''}>Bond</option>
                <option value="Vinculum" ${typeVal === 'Vinculum' ? 'selected' : ''}>Vinculum</option>
            </select>
            <input type="text" placeholder="Bound to..." class="flex-1 text-xs" value="${nameVal}">
            <input type="number" placeholder="Lvl" class="w-10 text-center text-xs" min="1" max="3" value="${ratVal}">
            <div class="remove-btn">&times;</div>
        `;
        
        const typeSel = row.querySelector('select'); 
        const nI = row.querySelector('input[type="text"]'); 
        const rI = row.querySelector('input[type="number"]'); 
        const del = row.querySelector('.remove-btn');
        if (!data) del.style.visibility = 'hidden';

        const onUpd = () => {
            if (typeSel.value === 'Bond') { rI.max = 3; if(parseInt(rI.value) > 3) rI.value = 3; }
            if (typeSel.value === 'Vinculum') { rI.max = 10; if(parseInt(rI.value) > 10) rI.value = 10; }
            
            window.state.bloodBonds = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ 
                type: r.querySelector('select').value, 
                name: r.querySelector('input[type="text"]').value, 
                rating: r.querySelector('input[type="number"]').value 
            })).filter(b => b.name);
            
            if (cont.lastElementChild === row && nI.value !== "") { del.style.visibility = 'visible'; buildRow(); }
            
            updatePools(); 
            if(renderPrintSheet) renderPrintSheet();
        };
        
        typeSel.onchange = onUpd; nI.onblur = onUpd; rI.onblur = onUpd; 
        del.onclick = () => { row.remove(); if(cont.children.length === 0) buildRow(); onUpd(); };
        cont.appendChild(row);
    };

    if(window.state.bloodBonds && Array.isArray(window.state.bloodBonds)) { window.state.bloodBonds.forEach(b => buildRow(b)); }
    buildRow();
}
window.renderBloodBondRow = renderBloodBondRow;

export function renderDerangementsList() {
    const cont = document.getElementById('derangements-list'); if (!cont) return;
    cont.innerHTML = '';
    
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    const isMalk = clan === "Malkavian";

    window.state.derangements.forEach((d, idx) => {
        const row = document.createElement('div'); row.className = "flex justify-between items-center text-xs text-white border-b border-[#333] py-1";
        
        let labelHTML = `<span>${d}</span>`;
        let deleteBtnHTML = `<span class="remove-btn text-red-500" onclick="window.state.derangements.splice(${idx}, 1); renderDerangementsList(); window.updatePools(); if(window.renderPrintSheet) window.renderPrintSheet();">&times;</span>`;
        
        if (isMalk && idx === 0) {
            labelHTML = `<span class="text-[#a855f7] font-bold" title="Incurable Weakness">${d}</span>`;
            deleteBtnHTML = `<span class="text-[#a855f7] text-[10px]"><i class="fas fa-lock"></i></span>`;
        }

        row.innerHTML = `${labelHTML}${deleteBtnHTML}`;
        cont.appendChild(row);
    });
    
    const addRow = document.createElement('div'); addRow.className = "flex gap-2 mt-2";
    let options = `<option value="">+ Add Derangement</option>` + DERANGEMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    addRow.innerHTML = `<select id="derangement-select" class="flex-1 text-[10px] uppercase font-bold bg-black/40 border border-[#444] text-white p-1">${options}<option value="Custom">Custom...</option></select><input type="text" id="derangement-custom" class="hidden flex-1 text-[10px] bg-black/40 border border-[#444] text-white p-1" placeholder="Type name..."><button id="add-derangement-btn" class="bg-[#8b0000] text-white px-2 py-1 text-[10px] font-bold hover:bg-red-700">ADD</button>`;
    cont.appendChild(addRow);
    const sel = document.getElementById('derangement-select'); const inp = document.getElementById('derangement-custom'); const btn = document.getElementById('add-derangement-btn');
    sel.onchange = () => { if (sel.value === 'Custom') { sel.classList.add('hidden'); inp.classList.remove('hidden'); inp.focus(); } };
    btn.onclick = () => {
        let val = sel.value === 'Custom' ? inp.value : sel.value;
        if (val && val !== 'Custom') { window.state.derangements.push(val); renderDerangementsList(); updatePools(); if(renderPrintSheet) renderPrintSheet(); }
    };
}
window.renderDerangementsList = renderDerangementsList;

export function renderDynamicHavenRow() {
    const container = document.getElementById('multi-haven-list'); 
    if (!container) return;
    container.innerHTML = ''; 
    const buildRow = (data = null) => {
        const row = document.createElement('div'); 
        row.className = 'border-b border-[#222] pb-4 advantage-row';
        const nameVal = data ? data.name : "";
        const locVal = data ? data.loc : "";
        const descVal = data ? data.desc : "";
        row.innerHTML = `<div class="flex justify-between items-center mb-2"><input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]" value="${nameVal}"><div class="remove-btn">&times;</div></div><input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]" value="${locVal}"><textarea class="h-16 text-xs" placeholder="Details...">${descVal}</textarea>`;
        const nameIn = row.querySelectorAll('input')[0]; const locIn = row.querySelectorAll('input')[1]; const descIn = row.querySelector('textarea'); const del = row.querySelector('.remove-btn');
        if (!data) del.style.visibility = 'hidden';
        const onUpd = () => {
            window.state.havens = Array.from(container.querySelectorAll('.advantage-row')).map(r => ({ name: r.querySelectorAll('input')[0].value, loc: r.querySelectorAll('input')[1].value, desc: r.querySelector('textarea').value })).filter(h => h.name || h.loc);
            if (container.lastElementChild === row && nameIn.value !== "") { del.style.visibility = 'visible'; renderDynamicHavenRow(); }
            updatePools(); if(renderPrintSheet) renderPrintSheet();
        };
        [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); 
        del.onclick = () => { row.remove(); if(container.children.length === 0) buildRow(); onUpd(); };
        container.appendChild(row);
    };
    if (window.state.havens && Array.isArray(window.state.havens)) { window.state.havens.forEach(h => buildRow(h)); }
    buildRow();
}
window.renderDynamicHavenRow = renderDynamicHavenRow;

export function renderRitualsEdit() {
    const container = document.getElementById('rituals-list-create');
    if (!container) return;

    if (container.querySelector('textarea')) {
        container.innerHTML = '<div id="dynamic-rituals-list" class="space-y-2"></div>';
        if (!window.state.rituals) window.state.rituals = [];
    }

    const listCont = document.getElementById('dynamic-rituals-list');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (!window.state.rituals) window.state.rituals = [];

    const buildRow = (data = null) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 border-b border-[#333] pb-1 mb-1 ritual-row';
        const nameVal = data ? data.name : "";
        const lvlVal = data ? data.level : 1;

        row.innerHTML = `
            <div class="flex-1">
                <input type="text" placeholder="Ritual Name..." class="w-full text-xs bg-transparent border-none text-white focus:border-gold" value="${nameVal}">
            </div>
            <div class="w-12">
                <input type="number" min="1" max="10" class="w-full text-center text-xs bg-[#111] border border-[#333] text-gold font-bold" value="${lvlVal}" title="Level">
            </div>
            <div class="remove-btn cursor-pointer text-red-500 hover:text-red-300">&times;</div>
        `;

        const nameInput = row.querySelector('input[type="text"]');
        const lvlInput = row.querySelector('input[type="number"]');
        const delBtn = row.querySelector('.remove-btn');

        if (!data) delBtn.style.visibility = 'hidden';

        const sync = () => {
            const rows = listCont.querySelectorAll('.ritual-row');
            const newData = [];
            rows.forEach(r => {
                const n = r.querySelector('input[type="text"]').value;
                const l = parseInt(r.querySelector('input[type="number"]').value) || 1;
                if (n) newData.push({ name: n, level: l });
            });
            window.state.rituals = newData;
            
            if (row === listCont.lastElementChild && nameInput.value !== "") {
                delBtn.style.visibility = 'visible';
                buildRow();
            }
            
            if(renderPrintSheet) renderPrintSheet();
            if(updateRitualsPlayView) updateRitualsPlayView();
        };

        nameInput.onblur = sync; lvlInput.onchange = sync;
        delBtn.onclick = () => { row.remove(); if(listCont.children.length === 0) buildRow(); sync(); };
        listCont.appendChild(row);
    };

    window.state.rituals.forEach(r => buildRow(r));
    buildRow();
}
window.renderRitualsEdit = renderRitualsEdit;
