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

// Import from future modules
import { renderPrintSheet } from "./ui-print.js";
import { updateRitualsPlayView } from "./ui-play.js";

// --- DYNAMIC ADVANTAGES (Disciplines, Backgrounds, etc.) ---

export function renderDynamicAdvantageRow(containerId, type, list, isAbil = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    // 1. Gather Existing Items from State
    let existingItems = [];
    if (type === 'abil') {
        let category = '';
        if (containerId === 'custom-talents') category = 'Talents';
        else if (containerId === 'custom-skills') category = 'Skills';
        else if (containerId === 'custom-knowledges') category = 'Knowledges';
        if (window.state.customAbilityCategories) { 
            existingItems = Object.keys(window.state.dots.abil).filter(k => window.state.customAbilityCategories[k] === category); 
        }
    } else { 
        if (window.state.dots[type]) existingItems = Object.keys(window.state.dots[type]); 
    }

    // --- HELPER: Identify Magic Paths ---
    const isMagicPath = (name) => {
        if (!name) return false;
        const n = name.toLowerCase();
        // Explicit Generics
        if (n === 'thaumaturgy') return 'thaum';
        if (n === 'necromancy') return 'necro';
        
        // Check Data Files
        if (THAUMATURGY_DATA && Object.keys(THAUMATURGY_DATA).some(k => k.toLowerCase() === n)) return 'thaum';
        if (NECROMANCY_DATA && Object.keys(NECROMANCY_DATA).some(k => k.toLowerCase() === n)) return 'necro';
        
        // Fallback Heuristics
        if (n.includes('path') || n.includes('lure of') || n.includes('gift of') || n.includes('weather control') || n.includes('movement of the mind')) return 'thaum'; 
        if (n.includes('sepulchre') || n.includes('bone') || n.includes('ash') || n.includes('cenotaph') || n.includes('vitreous')) return 'necro';
        
        return false;
    };

    // --- ROW BUILDER (Generic) ---
    const buildRow = (name = null, isChild = false, parentType = null) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center mb-1 advantage-row';
        if (isChild) {
            // Standard indentation for non-magic children (if any)
            row.classList.add('ml-4', 'pl-3', 'border-l-2', 'border-[#333]', 'pr-1');
            row.style.width = "calc(100% - 1rem)";
        }

        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mr-2 relative';

        let inputField;
        let selectField = null;

        if (list && list.length > 0) {
            selectField = document.createElement('select');
            selectField.className = 'w-full bg-[#111] border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            
            let html = `<option value="">-- Select --</option>`;
            list.forEach(item => {
                const val = typeof item === 'string' ? item : item.name;
                // Don't show generic magic headers in standard dropdown if already selected
                if ((val === 'Thaumaturgy' || val === 'Necromancy') && window.state.dots.disc[val]) return;
                const isSelected = name === val;
                html += `<option value="${val}" ${isSelected ? 'selected' : ''}>${val}</option>`;
            });
            html += '<option value="Custom">-- Custom / Write-in --</option>';
            selectField.innerHTML = html;

            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            inputField.placeholder = "Name...";
            inputField.value = name || "";

            if (name && !list.map(i => typeof i==='string'?i:i.name).includes(name)) {
                selectField.style.display = 'none';
                inputField.style.display = 'block';
            } else {
                selectField.style.display = 'block';
                inputField.style.display = 'none';
            }
            specWrapper.appendChild(selectField);
            specWrapper.appendChild(inputField);
        } else {
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            inputField.placeholder = "Name...";
            inputField.value = name || "";
            specWrapper.appendChild(inputField);
        }

        // Specialties Logic
        if (isAbil && name) {
            const hasSpec = window.state.specialties && window.state.specialties[name];
            if (hasSpec || (window.state.dots.abil[name] >= 4) || SPECIALTY_EXAMPLES[name]) {
                const specBtn = document.createElement('div');
                specBtn.className = "absolute right-0 top-0 text-[9px] cursor-pointer hover:text-gold";
                specBtn.className += hasSpec ? " text-gold" : " text-gray-600";
                specBtn.innerHTML = '<i class="fas fa-star"></i>';
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
        if (!name) removeBtn.style.visibility = 'hidden';

        // Event Handlers
        const onUpdate = (newVal) => {
            if (!newVal) return;
            if (name && name !== newVal) {
                const oldVal = window.state.dots[type][name];
                delete window.state.dots[type][name];
                if (window.state.customAbilityCategories?.[name]) delete window.state.customAbilityCategories[name];
                window.state.dots[type][newVal] = oldVal;
            } else if (!name) {
                window.state.dots[type][newVal] = window.state.xpMode ? 1 : 0;
            }

            if (isAbil) {
                let category = null;
                if (containerId === 'custom-talents') category = 'Talents';
                else if (containerId === 'custom-skills') category = 'Skills';
                else if (containerId === 'custom-knowledges') category = 'Knowledges';
                if (category) {
                     if (!window.state.customAbilityCategories) window.state.customAbilityCategories = {};
                     window.state.customAbilityCategories[newVal] = category;
                }
            }
            renderDynamicAdvantageRow(containerId, type, list, isAbil);
            updatePools();
        };

        if (selectField) {
            selectField.onchange = (e) => {
                if (e.target.value === 'Custom') {
                    selectField.style.display = 'none';
                    inputField.style.display = 'block';
                    inputField.focus();
                } else {
                    onUpdate(e.target.value);
                }
            };
            inputField.onblur = (e) => {
                if (!e.target.value && selectField) {
                    inputField.style.display = 'none';
                    selectField.style.display = 'block';
                    selectField.value = "";
                } else {
                    onUpdate(e.target.value);
                }
            };
        } else {
            inputField.onblur = (e) => onUpdate(e.target.value);
        }

        dotCont.onclick = (e) => {
            if (!name || !e.target.dataset.v) return;
            const clickVal = parseInt(e.target.dataset.v);
            setDots(name, type, clickVal, 0, 5);
            dotCont.innerHTML = renderDots(window.state.dots[type][name], 5);
        };

        removeBtn.onclick = () => {
            if (name) {
                delete window.state.dots[type][name];
                if (window.state.customAbilityCategories?.[name]) delete window.state.customAbilityCategories[name];
            }
            renderDynamicAdvantageRow(containerId, type, list, isAbil);
            updatePools();
        };

        row.appendChild(specWrapper);
        row.appendChild(dotCont);
        row.appendChild(removeBtn);
        container.appendChild(row);
    };

    // --- MAGIC SECTION RENDERER (Strictly Indented, No Box) ---
    const renderMagicSection = (magicType, ownedPaths) => {
        const isThaum = magicType === 'thaum';
        const label = isThaum ? "Thaumaturgy" : "Necromancy";
        const primaryKey = isThaum ? window.state.primaryThaumPath : window.state.primaryNecroPath;
        const dataObj = isThaum ? THAUMATURGY_DATA : NECROMANCY_DATA;
        
        // --- Custom XP Logic for Primary Path (Discipline Rating) ---
        const handlePrimaryClick = (e) => {
             if (!primaryKey) {
                showNotification("Select a Primary Path first.");
                return;
            }
            if (!e.target.dataset.v) return;
            const newVal = parseInt(e.target.dataset.v);
            const currentVal = window.state.dots.disc[primaryKey] || 0;
            
            // If in XP mode and raising logic
            if (window.state.xpMode && newVal > currentVal) {
                if (!window.state.xp) window.state.xp = { current: 0, spent: 0, total: 0, log: [] };

                // Determine Multiplier
                // V20: In-Clan x5, Out-of-Clan x7, Caitiff x6
                const clan = window.state.textFields['c-clan'] || "None";
                let multiplier = 7; // Default Out-of-Clan
                
                if (clan === "Caitiff") {
                    multiplier = 6;
                } else if ((isThaum && clan === "Tremere") || (!isThaum && clan === "Giovanni")) {
                    // Basic check. Ideally we'd check window.state.clanDisciplines if available.
                    multiplier = 5;
                }
                // Note: If user has 'Additional Discipline' merit for this, it's not caught here 
                // without access to Merits list, but this covers 95% of cases.

                let totalCost = 0;
                for (let v = currentVal + 1; v <= newVal; v++) {
                    // Level 1 of a Discipline (Primary Path IS the Discipline) is 10 XP
                    if (v === 1) totalCost += 10;
                    else totalCost += (v - 1) * multiplier;
                }

                if (window.state.xp.current < totalCost) {
                    showNotification(`Not enough XP. Cost: ${totalCost}`);
                    return;
                }

                if (!confirm(`Spend ${totalCost} XP to raise ${label} (Primary: ${primaryKey}) to ${newVal}?`)) return;

                window.state.xp.current -= totalCost;
                window.state.xp.spent += totalCost;
                if (!window.state.xpLog) window.state.xpLog = [];
                window.state.xpLog.push({
                    date: new Date().toLocaleString(),
                    // Use "Discipline" keyword so tracker categorizes it correctly
                    entry: `Raised Discipline ${label} (${primaryKey}) to ${newVal}`,
                    cost: totalCost
                });

                window.state.dots.disc[primaryKey] = newVal;
                renderDynamicAdvantageRow(containerId, type, list, isAbil);
                updatePools();
                return;
            }

            // Fallback for non-XP mode or lowering
            setDots(primaryKey, type, newVal, 0, 5);
            renderDynamicAdvantageRow(containerId, type, list, isAbil);
        };

        // 1. The HEADER Row (Thaumaturgy/Necromancy)
        const headerRow = document.createElement('div');
        headerRow.className = "flex justify-between items-center mb-1 advantage-row";
        
        // Label
        const headerLabel = document.createElement('div');
        headerLabel.className = "flex-1 font-cinzel font-bold text-[#d4af37] text-sm";
        headerLabel.innerHTML = `<i class="fas fa-book-open text-[10px] mr-2"></i>${label}`;
        
        // Dots (Controls Primary Path)
        // V20 Rules: "The rating in the primary path is always the character's rating in the Discipline"
        const headerDots = document.createElement('div');
        headerDots.className = "dot-row cursor-pointer flex-shrink-0";
        const primaryVal = primaryKey ? (window.state.dots.disc[primaryKey] || 0) : 0;
        headerDots.innerHTML = renderDots(primaryVal, 5);
        
        headerDots.onclick = handlePrimaryClick;

        // Remove (Clears all)
        const headerRemove = document.createElement('div');
        headerRemove.className = "remove-btn flex-shrink-0 ml-1 text-red-500 hover:text-red-300";
        headerRemove.innerHTML = "&times;";
        headerRemove.onclick = () => {
            if(confirm(`Delete ${label} and all associated paths?`)) {
                ownedPaths.forEach(p => delete window.state.dots.disc[p]);
                if(isThaum) { delete window.state.primaryThaumPath; if(window.state.dots.disc['Thaumaturgy']) delete window.state.dots.disc['Thaumaturgy']; }
                else { delete window.state.primaryNecroPath; if(window.state.dots.disc['Necromancy']) delete window.state.dots.disc['Necromancy']; }
                renderDynamicAdvantageRow(containerId, type, list, isAbil);
                updatePools();
            }
        };

        headerRow.appendChild(headerLabel);
        headerRow.appendChild(headerDots);
        headerRow.appendChild(headerRemove);
        container.appendChild(headerRow);

        // 2. Primary Path Row (Indented)
        const primaryRow = document.createElement('div');
        // Indent Level 1
        primaryRow.className = "flex justify-between items-center mb-1 advantage-row ml-5 border-l-2 border-[#333] pl-2";
        
        if (!primaryKey) {
            // Select Primary
            const pSelect = document.createElement('select');
            pSelect.className = "w-full bg-[#111] text-gold border-b border-gold text-xs font-bold uppercase animate-pulse";
            let pOpts = `<option value="">-- Select Primary Path --</option>`;
            const avail = dataObj ? Object.keys(dataObj) : [];
            avail.forEach(p => {
                if (!window.state.dots.disc[p]) pOpts += `<option value="${p}">${p}</option>`;
            });
            pSelect.innerHTML = pOpts;
            pSelect.onchange = (e) => {
                const newPath = e.target.value;
                if(newPath) {
                    if (isThaum) window.state.primaryThaumPath = newPath;
                    else window.state.primaryNecroPath = newPath;
                    // Primary Path usually comes with the discipline dot, so 1 is appropriate here.
                    window.state.dots.disc[newPath] = 1;
                    // Clean generic key
                    const generic = isThaum ? 'Thaumaturgy' : 'Necromancy';
                    if(window.state.dots.disc[generic]) delete window.state.dots.disc[generic];
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                    updatePools();
                }
            };
            primaryRow.appendChild(pSelect);
        } else {
            // Display Primary
            const pLabel = document.createElement('div');
            pLabel.className = "flex-1 text-gold text-xs font-bold uppercase";
            pLabel.innerHTML = `<i class="fas fa-star text-[9px] mr-1"></i> ${primaryKey} <span class="text-gray-500 text-[9px] lowercase italic">(primary)</span>`;
            
            const pDots = document.createElement('div');
            pDots.className = "dot-row cursor-pointer flex-shrink-0";
            pDots.innerHTML = renderDots(window.state.dots.disc[primaryKey] || 0, 5);
            
            pDots.onclick = handlePrimaryClick;
            
            // Allow changing/resetting primary
            const pReset = document.createElement('div');
            pReset.className = "remove-btn flex-shrink-0 ml-1 text-gray-500 hover:text-white";
            pReset.innerHTML = "<i class='fas fa-sync'></i>";
            pReset.title = "Change Primary Path";
            pReset.onclick = () => {
                if(confirm("Change Primary Path? This will reset the current primary path selection.")) {
                    if(isThaum) window.state.primaryThaumPath = null;
                    else window.state.primaryNecroPath = null;
                    // Note: We don't delete the dots of the old path, it just stops being primary. 
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                }
            };

            primaryRow.appendChild(pLabel);
            primaryRow.appendChild(pDots);
            primaryRow.appendChild(pReset);
        }
        container.appendChild(primaryRow);

        // 3. Secondary Paths (Further Indented)
        if (primaryKey) {
            const secondaryPaths = ownedPaths.filter(p => p !== primaryKey && p !== label);
            
            secondaryPaths.forEach(secPath => {
                const secRow = document.createElement('div');
                // Indent Level 2
                secRow.className = "flex justify-between items-center mb-1 advantage-row ml-10 border-l border-[#444] pl-2";
                
                const sLabel = document.createElement('div');
                sLabel.className = "flex-1 text-gray-300 text-xs font-bold uppercase";
                sLabel.innerText = secPath;

                const sDots = document.createElement('div');
                sDots.className = "dot-row cursor-pointer flex-shrink-0";
                sDots.innerHTML = renderDots(window.state.dots.disc[secPath] || 0, 5);

                sDots.onclick = (e) => {
                    if(!e.target.dataset.v) return;
                    const newVal = parseInt(e.target.dataset.v);
                    const currentVal = window.state.dots.disc[secPath] || 0;
                    const primaryRating = window.state.dots.disc[primaryKey] || 0;
                    
                    // --- Validation Checks ---
                    if (isThaum) {
                        let limit = (primaryRating === 5) ? 5 : (primaryRating - 1);
                        if (newVal > limit) {
                            if (primaryRating === 5) showNotification(`Secondary Path cannot exceed Primary Path (5).`);
                            else showNotification(`Secondary Path must be lower than Primary Path until mastered.`);
                            return;
                        }
                    } else {
                        if (newVal > primaryRating) {
                            showNotification(`Secondary Path cannot exceed Primary Path rating (${primaryRating}).`);
                            return;
                        }
                    }

                    // --- XP Mode Logic Override for Secondary Paths ---
                    // Rule: New Path = 7 XP. Raise Path = Current Rating * 4.
                    if (window.state.xpMode && newVal > currentVal) {
                        // FIX: Ensure state.xp exists before accessing it
                        if (!window.state.xp) window.state.xp = { current: 0, spent: 0, total: 0, log: [] };

                        let totalCost = 0;
                        for (let v = currentVal + 1; v <= newVal; v++) {
                            // If target is level 1, it's a NEW path = 7 XP
                            if (v === 1) totalCost += 7;
                            // Else it's raising a path = (Target Level - 1) * 4
                            // Example: Raise to 2. Cost = (2-1)*4 = 4.
                            else totalCost += (v - 1) * 4;
                        }

                        if (window.state.xp.current < totalCost) {
                            showNotification(`Not enough XP. Cost: ${totalCost}`);
                            return;
                        }
                        
                        if (!confirm(`Spend ${totalCost} XP to raise ${secPath} to ${newVal}?`)) return;

                        window.state.xp.current -= totalCost;
                        window.state.xp.spent += totalCost;
                        if (!window.state.xpLog) window.state.xpLog = [];
                        window.state.xpLog.push({
                            date: new Date().toLocaleString(),
                            entry: `Raised Secondary Path ${secPath} to ${newVal}`,
                            cost: totalCost
                        });

                        // Manually update state and bypass generic setDots logic
                        window.state.dots.disc[secPath] = newVal;
                        updatePools();
                        renderDynamicAdvantageRow(containerId, type, list, isAbil);
                        return;
                    }

                    // Fallback to standard setDots for Freebie/Edit/Lowering logic
                    setDots(secPath, type, newVal, 0, 5);
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                };

                const sDel = document.createElement('div');
                sDel.className = "remove-btn flex-shrink-0 ml-1";
                sDel.innerHTML = "&times;";
                sDel.onclick = () => {
                    delete window.state.dots.disc[secPath];
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                    updatePools();
                };

                secRow.appendChild(sLabel);
                secRow.appendChild(sDots);
                secRow.appendChild(sDel);
                container.appendChild(secRow);
            });

            // 4. "Add Secondary" Dropdown (Indented Level 2)
            const addRow = document.createElement('div');
            addRow.className = "flex justify-between items-center mb-1 advantage-row ml-10 border-l border-[#444] pl-2 opacity-75 hover:opacity-100";
            
            const addSel = document.createElement('select');
            addSel.className = "w-full bg-transparent text-gray-400 border-b border-[#333] text-[10px] uppercase font-bold focus:border-gold outline-none";
            
            let addOpts = `<option value="">+ Select Additional Path</option>`;
            const avail = dataObj ? Object.keys(dataObj) : [];
            avail.forEach(p => {
                if (!window.state.dots.disc[p]) addOpts += `<option value="${p}">${p}</option>`;
            });
            addSel.innerHTML = addOpts;
            
            addSel.onchange = (e) => {
                const p = e.target.value;
                if(p) {
                    const primaryRating = window.state.dots.disc[primaryKey] || 0;
                    const secondaryCount = secondaryPaths.length;

                    // VALIDATION LOGIC SPLIT
                    if (isThaum) {
                        if (primaryRating < 2) {
                             showNotification(`Must have Primary Thaumaturgy Path rating of 2 or higher to learn a Secondary Path.`);
                             addSel.value = "";
                             return;
                        }
                    } else {
                        if (secondaryCount === 0 && primaryRating < 3) {
                            showNotification(`Must have Primary Necromancy Path rating of 3 or higher to learn a Secondary Path.`);
                            addSel.value = "";
                            return;
                        }
                        if (secondaryCount >= 1 && primaryRating < 5) {
                             showNotification(`Must master Primary Necromancy Path (5 dots) before learning a third Path.`);
                             addSel.value = "";
                             return;
                        }
                    }

                    // Set to 0 so user clicks dot to trigger XP deduction
                    window.state.dots.disc[p] = 0;
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                    updatePools();
                }
            };
            
            addRow.appendChild(addSel);
            container.appendChild(addRow);
        }
    };


    // --- MAIN EXECUTION LOGIC ---

    if (type === 'disc') {
        const standardDiscs = [];
        const thaumPaths = [];
        const necroPaths = [];

        // 1. Sort Items
        existingItems.forEach(item => {
            const check = isMagicPath(item);
            if (check === 'thaum') thaumPaths.push(item);
            else if (check === 'necro') necroPaths.push(item);
            else standardDiscs.push(item);
        });

        // 2. Render Magic Sections
        if (thaumPaths.length > 0 || window.state.primaryThaumPath) {
            renderMagicSection('thaum', thaumPaths);
        }
        if (necroPaths.length > 0 || window.state.primaryNecroPath) {
            renderMagicSection('necro', necroPaths);
        }

        // 3. Render Standard Disciplines
        standardDiscs.forEach(d => buildRow(d));

        // 4. Render "Add New" Row (Standard)
        buildRow();
    } else {
        // Non-discipline rendering
        existingItems.forEach(item => buildRow(item));
        buildRow();
    }
}
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;

// --- RITUALS SELECTOR LOGIC (Unchanged from your preferred version) ---
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

    let maxThaum = 0;
    let maxNecro = 0;
    
    if (window.state.primaryThaumPath && window.state.dots.disc[window.state.primaryThaumPath]) {
        maxThaum = window.state.dots.disc[window.state.primaryThaumPath];
    }
    if (window.state.primaryNecroPath && window.state.dots.disc[window.state.primaryNecroPath]) {
        maxNecro = window.state.dots.disc[window.state.primaryNecroPath];
    }
    
    let loopMax = Math.max(maxThaum, maxNecro);

    if (loopMax === 0) {
        const info = document.createElement('div');
        info.className = "text-gray-500 italic text-[10px] text-center mb-2";
        info.innerText = "Learn Thaumaturgy or Necromancy to access Rituals.";
        listCont.appendChild(info);
    } else {
        const info = document.createElement('div');
        info.className = "text-[#d4af37] font-bold text-[10px] uppercase text-center mb-2 border-b border-[#333] pb-1";
        info.innerText = `Max Levels - Thaum: ${maxThaum}, Necro: ${maxNecro}`;
        listCont.appendChild(info);
    }

    const buildRow = (data = null) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 border-b border-[#333] pb-1 mb-1 ritual-row';
        
        const nameVal = data ? data.name : "";
        const lvlVal = data ? data.level : 1;

        let ritualOptions = `<option value="">-- Select Ritual --</option>`;
        if (window.RITUALS_DATA) {
            for (let i = 1; i <= loopMax; i++) {
                if (i <= maxThaum && window.RITUALS_DATA.Thaumaturgy && window.RITUALS_DATA.Thaumaturgy[i]) {
                    ritualOptions += `<optgroup label="Thaumaturgy Level ${i}">`;
                    Object.values(window.RITUALS_DATA.Thaumaturgy[i]).forEach(r => {
                        const sel = nameVal === r.name ? 'selected' : '';
                        ritualOptions += `<option value="${r.name}" data-lvl="${i}" ${sel}>${r.name}</option>`;
                    });
                    ritualOptions += `</optgroup>`;
                }
                
                if (i <= maxNecro && window.RITUALS_DATA.Necromancy && window.RITUALS_DATA.Necromancy[i]) {
                    ritualOptions += `<optgroup label="Necromancy Level ${i}">`;
                    Object.values(window.RITUALS_DATA.Necromancy[i]).forEach(r => {
                        const sel = nameVal === r.name ? 'selected' : '';
                        ritualOptions += `<option value="${r.name}" data-lvl="${i}" ${sel}>${r.name}</option>`;
                    });
                    ritualOptions += `</optgroup>`;
                }
            }
        }
        ritualOptions += `<option value="Custom" ${nameVal && !isKnownRitual(nameVal) ? 'selected' : ''}>-- Custom / Write-in --</option>`;

        const select = document.createElement('select');
        select.className = "flex-1 text-xs bg-[#111] border-b border-[#333] text-white focus:border-gold outline-none";
        select.innerHTML = ritualOptions;
        
        const input = document.createElement('input');
        input.type = "text";
        input.className = "flex-1 text-xs bg-transparent border-b border-[#333] text-white focus:border-gold outline-none hidden";
        input.placeholder = "Custom Name...";
        input.value = nameVal;

        if (nameVal && !isKnownRitual(nameVal)) {
            select.style.display = 'none';
            input.style.display = 'block';
        }

        row.appendChild(select);
        row.appendChild(input);

        const lvlInput = document.createElement('input');
        lvlInput.type = "number";
        lvlInput.min = 1;
        lvlInput.max = 10;
        lvlInput.className = "w-10 text-center text-xs bg-[#111] border border-[#333] text-gold font-bold";
        lvlInput.value = lvlVal;
        lvlInput.disabled = (nameVal && isKnownRitual(nameVal)); 
        
        row.appendChild(lvlInput);

        const delBtn = document.createElement('div');
        delBtn.className = "remove-btn cursor-pointer text-red-500 hover:text-red-300";
        delBtn.innerHTML = "&times;";
        if (!data) delBtn.style.visibility = 'hidden';
        
        row.appendChild(delBtn);

        const sync = () => {
            const rows = listCont.querySelectorAll('.ritual-row');
            const newData = [];
            rows.forEach(r => {
                const s = r.querySelector('select');
                const i = r.querySelector('input[type="text"]');
                const l = r.querySelector('input[type="number"]');
                
                let n = s.value === 'Custom' ? i.value : s.value;
                let lvl = parseInt(l.value) || 1;
                
                if (n) newData.push({ name: n, level: lvl });
            });
            window.state.rituals = newData;
            
            if (row === listCont.lastElementChild && (select.value !== "" || input.value !== "")) {
                delBtn.style.visibility = 'visible';
                buildRow();
            }
            
            if(renderPrintSheet) renderPrintSheet();
            if(updateRitualsPlayView) updateRitualsPlayView();
        };

        select.onchange = (e) => {
            const val = e.target.value;
            if (val === 'Custom') {
                select.style.display = 'none';
                input.style.display = 'block';
                input.focus();
                lvlInput.disabled = false;
            } else if (val) {
                const opt = select.options[select.selectedIndex];
                const lvl = opt.getAttribute('data-lvl');
                if (lvl) {
                    lvlInput.value = lvl;
                    lvlInput.disabled = true;
                }
            }
            sync();
        };

        input.onblur = (e) => {
            if (!e.target.value) {
                input.style.display = 'none';
                select.style.display = 'block';
                select.value = "";
            }
            sync();
        };
        
        lvlInput.onchange = sync;
        delBtn.onclick = () => { row.remove(); if(listCont.children.length === 0) buildRow(); sync(); };

        listCont.appendChild(row);
    };

    window.state.rituals.forEach(r => buildRow(r));
    if (loopMax > 0) buildRow(); 
}
window.renderRitualsEdit = renderRitualsEdit;

function isKnownRitual(name) {
    if (!window.RITUALS_DATA) return false;
    if (window.RITUALS_DATA.Thaumaturgy) {
        for (const lvl in window.RITUALS_DATA.Thaumaturgy) {
            if (window.RITUALS_DATA.Thaumaturgy[lvl][name]) return true;
        }
    }
    if (window.RITUALS_DATA.Necromancy) {
        for (const lvl in window.RITUALS_DATA.Necromancy) {
            if (window.RITUALS_DATA.Necromancy[lvl][name]) return true;
        }
    }
    return false;
}

// --- STANDARD TRAIT/BOND/DERANGEMENT/HAVEN RENDERERS (Unchanged) ---
export function renderDynamicTraitRow(containerId, type, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const stateArray = type === 'Merit' ? (window.state.merits || []) : (window.state.flaws || []);
    container.innerHTML = '';
    
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    
    const appendRow = (data = null) => {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center mb-2 trait-row';
        
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
        
        row.innerHTML = `
            <div class="flex-1 relative">
                <select class="w-full text-[11px] font-bold uppercase bg-[#111] text-white border-b border-[#444]">${options}</select>
                <input type="text" placeholder="Custom Name..." class="hidden w-full text-[11px] font-bold uppercase border-b border-[#444] bg-transparent text-white">
            </div>
            <input type="number" class="w-10 text-center text-[11px] !border !border-[#444] font-bold" min="1">
            <div class="remove-btn">&times;</div>
        `;
        
        container.appendChild(row);
        
        const selectEl = row.querySelector('select'); 
        const textEl = row.querySelector('input[type="text"]'); 
        const numEl = row.querySelector('input[type="number"]'); 
        const removeBtn = row.querySelector('.remove-btn'); 
        
        const isLocked = !window.state.freebieMode;
        selectEl.disabled = isLocked; 
        textEl.disabled = isLocked; 
        numEl.disabled = isLocked;
        
        if(isLocked) { 
            selectEl.classList.add('opacity-50'); 
            textEl.classList.add('opacity-50'); 
            numEl.classList.add('opacity-50'); 
        }
        
        if (data) {
            const exists = list.some(l => l.n === data.name);
            if (exists) { 
                selectEl.value = data.name; 
                numEl.value = data.val; 
                const itemData = list.find(l => l.n === data.name); 
                if (itemData && !itemData.variable) { 
                    numEl.disabled = true; 
                    numEl.classList.add('opacity-50'); 
                } 
            } else { 
                selectEl.value = "Custom"; 
                selectEl.classList.add('hidden'); 
                textEl.classList.remove('hidden'); 
                textEl.value = data.name; 
                numEl.value = data.val; 
            }
        } else { 
            numEl.value = ""; 
            removeBtn.style.visibility = 'hidden'; 
        }
        
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
            if (type === 'Merit') window.state.merits = newState; 
            else window.state.flaws = newState;
            updatePools(); 
            renderPrintSheet();
        };
        
        selectEl.addEventListener('change', () => { 
            if (selectEl.value === 'Custom') { 
                selectEl.classList.add('hidden'); 
                textEl.classList.remove('hidden'); 
                textEl.focus(); 
                numEl.value = 1; 
                numEl.disabled = false; 
                numEl.classList.remove('opacity-50'); 
            } else if (selectEl.value) { 
                const opt = selectEl.options[selectEl.selectedIndex]; 
                numEl.value = opt.dataset.val; 
                if (opt.dataset.var !== "true") { 
                    numEl.disabled = true; 
                    numEl.classList.add('opacity-50'); 
                } else { 
                    numEl.disabled = false; 
                    numEl.classList.remove('opacity-50'); 
                } 
                if (row === container.lastElementChild) { 
                    removeBtn.style.visibility = 'visible'; 
                    appendRow(); 
                } 
            } 
            syncState(); 
        });
        
        textEl.addEventListener('blur', () => { 
            if (textEl.value === "") { 
                textEl.classList.add('hidden'); 
                selectEl.classList.remove('hidden'); 
                selectEl.value = ""; 
            } else { 
                if (row === container.lastElementChild) { 
                    removeBtn.style.visibility = 'visible'; 
                    appendRow(); 
                } 
            } 
            syncState(); 
        });
        
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
            if (typeSel.value === 'Bond') { 
                rI.max = 3; 
                if(parseInt(rI.value) > 3) rI.value = 3; 
            } 
            if (typeSel.value === 'Vinculum') { 
                rI.max = 10; 
                if(parseInt(rI.value) > 10) rI.value = 10; 
            } 
            window.state.bloodBonds = Array.from(cont.querySelectorAll('.advantage-row')).map(r => ({ 
                type: r.querySelector('select').value, 
                name: r.querySelector('input[type="text"]').value, 
                rating: r.querySelector('input[type="number"]').value 
            })).filter(b => b.name); 
            
            if (cont.lastElementChild === row && nI.value !== "") { 
                del.style.visibility = 'visible'; 
                buildRow(); 
            } 
            updatePools(); 
            renderPrintSheet(); 
        };
        
        typeSel.onchange = onUpd; 
        nI.onblur = onUpd; 
        rI.onblur = onUpd; 
        del.onclick = () => { row.remove(); if(cont.children.length === 0) buildRow(); onUpd(); }; 
        cont.appendChild(row);
    };
    
    if(window.state.bloodBonds && Array.isArray(window.state.bloodBonds)) { 
        window.state.bloodBonds.forEach(b => buildRow(b)); 
    } 
    buildRow();
}
window.renderBloodBondRow = renderBloodBondRow;

export function renderDerangementsList() {
    const cont = document.getElementById('derangements-list'); 
    if (!cont) return; 
    cont.innerHTML = '';
    
    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None"; 
    const isMalk = clan === "Malkavian";
    
    window.state.derangements.forEach((d, idx) => {
        const row = document.createElement('div'); 
        row.className = "flex justify-between items-center text-xs text-white border-b border-[#333] py-1";
        let labelHTML = `<span>${d}</span>`; 
        let deleteBtnHTML = `<span class="remove-btn text-red-500" onclick="window.state.derangements.splice(${idx}, 1); renderDerangementsList(); window.updatePools(); if(window.renderPrintSheet) window.renderPrintSheet();">&times;</span>`;
        
        if (isMalk && idx === 0) { 
            labelHTML = `<span class="text-[#a855f7] font-bold" title="Incurable Weakness">${d}</span>`; 
            deleteBtnHTML = `<span class="text-[#a855f7] text-[10px]"><i class="fas fa-lock"></i></span>`; 
        }
        
        row.innerHTML = `${labelHTML}${deleteBtnHTML}`; 
        cont.appendChild(row);
    });
    
    const addRow = document.createElement('div'); 
    addRow.className = "flex gap-2 mt-2"; 
    let options = `<option value="">+ Add Derangement</option>` + DERANGEMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
    
    addRow.innerHTML = `
        <select id="derangement-select" class="flex-1 text-[10px] uppercase font-bold bg-black/40 border border-[#444] text-white p-1">
            ${options}<option value="Custom">Custom...</option>
        </select>
        <input type="text" id="derangement-custom" class="hidden flex-1 text-[10px] bg-black/40 border border-[#444] text-white p-1" placeholder="Type name...">
        <button id="add-derangement-btn" class="bg-[#8b0000] text-white px-2 py-1 text-[10px] font-bold hover:bg-red-700">ADD</button>
    `;
    
    cont.appendChild(addRow); 
    const sel = document.getElementById('derangement-select'); 
    const inp = document.getElementById('derangement-custom'); 
    const btn = document.getElementById('add-derangement-btn');
    
    sel.onchange = () => { 
        if (sel.value === 'Custom') { 
            sel.classList.add('hidden'); 
            inp.classList.remove('hidden'); 
            inp.focus(); 
        } 
    };
    
    btn.onclick = () => { 
        let val = sel.value === 'Custom' ? inp.value : sel.value; 
        if (val && val !== 'Custom') { 
            window.state.derangements.push(val); 
            renderDerangementsList(); 
            updatePools(); 
            if(renderPrintSheet) renderPrintSheet(); 
        } 
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
        
        row.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <input type="text" placeholder="Haven Title..." class="flex-1 text-[10px] font-bold text-gold uppercase !border-b !border-[#333]" value="${nameVal}">
                <div class="remove-btn">&times;</div>
            </div>
            <input type="text" placeholder="Location..." class="text-xs mb-2 !border-b !border-[#333]" value="${locVal}">
            <textarea class="h-16 text-xs" placeholder="Details...">${descVal}</textarea>
        `;
        
        const nameIn = row.querySelectorAll('input')[0]; 
        const locIn = row.querySelectorAll('input')[1]; 
        const descIn = row.querySelector('textarea'); 
        const del = row.querySelector('.remove-btn');
        
        if (!data) del.style.visibility = 'hidden';
        
        const onUpd = () => { 
            window.state.havens = Array.from(container.querySelectorAll('.advantage-row')).map(r => ({ 
                name: r.querySelectorAll('input')[0].value, 
                loc: r.querySelectorAll('input')[1].value, 
                desc: r.querySelector('textarea').value 
            })).filter(h => h.name || h.loc); 
            
            if (container.lastElementChild === row && nameIn.value !== "") { 
                del.style.visibility = 'visible'; 
                renderDynamicHavenRow(); 
            } 
            updatePools(); 
            if(renderPrintSheet) renderPrintSheet(); 
        };
        
        [nameIn, locIn, descIn].forEach(el => el.onblur = onUpd); 
        del.onclick = () => { 
            row.remove(); 
            if(container.children.length === 0) buildRow(); 
            onUpd(); 
        }; 
        container.appendChild(row);
    };
    
    if (window.state.havens && Array.isArray(window.state.havens)) { 
        window.state.havens.forEach(h => buildRow(h)); 
    } 
    buildRow();
}
window.renderDynamicHavenRow = renderDynamicHavenRow;
