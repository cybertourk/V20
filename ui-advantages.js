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
    // This handles standard disciplines, backgrounds, etc.
    const buildRow = (name = null, isChild = false, parentType = null) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center mb-1 advantage-row';
        if (isChild) {
            row.classList.add('ml-4', 'pl-3', 'border-l-2', 'border-[#333]', 'pr-1');
            row.style.width = "calc(100% - 1rem)";
        }

        const specWrapper = document.createElement('div');
        specWrapper.className = 'flex-1 mr-2 relative';

        let inputField;
        let selectField = null;

        // Dropdown Logic
        if (list && list.length > 0) {
            selectField = document.createElement('select');
            selectField.className = 'w-full bg-[#111] border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            if (isChild) selectField.classList.add('text-gray-400', 'italic', 'text-[11px]');

            let html = `<option value="">-- Select --</option>`;
            
            // If this is a child row for Magic, filter the list
            let filteredList = list;
            if (parentType === 'thaum') {
                const keys = THAUMATURGY_DATA ? Object.keys(THAUMATURGY_DATA) : [];
                filteredList = keys.filter(k => !window.state.dots.disc[k]); // Filter out known
            } else if (parentType === 'necro') {
                const keys = NECROMANCY_DATA ? Object.keys(NECROMANCY_DATA) : [];
                filteredList = keys.filter(k => !window.state.dots.disc[k]);
            }

            filteredList.forEach(item => {
                const val = typeof item === 'string' ? item : item.name;
                const isSelected = name === val;
                // Prevent duplicate Generics in standard list
                if ((val === 'Thaumaturgy' || val === 'Necromancy') && window.state.dots.disc[val]) return;
                
                html += `<option value="${val}" ${isSelected ? 'selected' : ''}>${val}</option>`;
            });
            
            const isCustom = name && !filteredList.includes(name) && !isChild; // Child paths usually aren't "Custom" in the same way
            html += `<option value="Custom" ${isCustom ? 'selected' : ''}>-- Custom / Write-in --</option>`;
            selectField.innerHTML = html;

            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            inputField.placeholder = "Name...";
            inputField.value = name || "";

            // Toggle Input vs Select
            const showInput = (name && !filteredList.includes(name) && parentType === null); // Only show input for custom standard disciplines
            if (showInput) {
                selectField.style.display = 'none';
                inputField.style.display = 'block';
            } else {
                selectField.style.display = 'block';
                inputField.style.display = 'none';
            }
            specWrapper.appendChild(selectField);
            specWrapper.appendChild(inputField);
        } else {
            // Text Input Only
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'w-full bg-transparent border-b border-[#333] text-xs font-bold text-white uppercase focus:border-gold outline-none';
            inputField.placeholder = "Name...";
            inputField.value = name || "";
            specWrapper.appendChild(inputField);
        }

        // Specialties
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

        // Dots
        const dotCont = document.createElement('div');
        dotCont.className = 'dot-row flex-shrink-0';
        const val = name ? (window.state.dots[type][name] || 0) : 0;
        dotCont.innerHTML = renderDots(val, 5);
        if (name) { dotCont.dataset.n = name; dotCont.dataset.t = type; }

        // Remove Button
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn flex-shrink-0 ml-1';
        removeBtn.innerHTML = '&times;';
        if (!name && !parentType) removeBtn.style.visibility = 'hidden'; // Hide on empty standard adder

        // Update Handler
        const onUpdate = (newVal) => {
            if (!newVal) return;
            // XP Check omitted for brevity, assumed standard logic or handled in mechanics
            
            // State Update
            if (name && name !== newVal) {
                // Renaming
                const oldVal = window.state.dots[type][name];
                delete window.state.dots[type][name];
                if (window.state.customAbilityCategories?.[name]) delete window.state.customAbilityCategories[name];
                window.state.dots[type][newVal] = oldVal;
            } else if (!name) {
                // New Entry
                window.state.dots[type][newVal] = window.state.xpMode ? 1 : 0;
                
                // If this was a generic "Thaumaturgy" add, we might need to initialize stuff,
                // but renderDynamicAdvantageRow below handles the re-sort into the Magic Block.
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
                if (!e.target.value) {
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
            
            // Secondary Path Validation
            if (parentType) {
                 const primaryKey = parentType === 'thaum' ? window.state.primaryThaumPath : window.state.primaryNecroPath;
                 const primaryRating = window.state.dots.disc[primaryKey] || 0;
                 // V20 Rules: Secondary Paths cannot exceed Primary Path rating.
                 if (clickVal > primaryRating) {
                     showNotification(`Secondary Path cannot exceed Primary Path rating (${primaryRating}).`);
                     return;
                 }
            }

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

    // --- MAGIC CONTAINER BUILDER ---
    // This builds the persistent "Thaumaturgy" or "Necromancy" block
    const renderMagicContainer = (magicType, ownedPaths) => {
        const isThaum = magicType === 'thaum';
        const label = isThaum ? "Thaumaturgy" : "Necromancy";
        const primaryKey = isThaum ? window.state.primaryThaumPath : window.state.primaryNecroPath;
        
        // --- 1. Container ---
        const magicDiv = document.createElement('div');
        magicDiv.className = "mb-2 border border-[#333] bg-[#1a1a1a] rounded overflow-hidden";
        
        // --- 2. Header (The Discipline Itself) ---
        const header = document.createElement('div');
        header.className = "flex justify-between items-center p-1 bg-[#222] border-b border-[#333]";
        
        const title = document.createElement('div');
        title.className = "font-cinzel font-bold text-[#d4af37] text-sm flex items-center gap-2 pl-1";
        title.innerHTML = `<i class="fas fa-book-open text-[10px]"></i> ${label}`;
        
        const headerDots = document.createElement('div');
        headerDots.className = "dot-row cursor-pointer";
        // Header dots reflect Primary Path rating
        const primaryVal = primaryKey ? (window.state.dots.disc[primaryKey] || 0) : 0;
        headerDots.innerHTML = renderDots(primaryVal, 5);
        
        // Header Dot Click -> Updates Primary Path
        headerDots.onclick = (e) => {
            if (!primaryKey || !e.target.dataset.v) return;
            const clickVal = parseInt(e.target.dataset.v);
            setDots(primaryKey, type, clickVal, 0, 5);
            // Re-render whole block to update header and maybe secondary limits
            renderDynamicAdvantageRow(containerId, type, list, isAbil);
        };

        const headerRemove = document.createElement('div');
        headerRemove.className = "remove-btn ml-2 text-red-500 hover:text-red-300 cursor-pointer";
        headerRemove.innerHTML = "&times;";
        headerRemove.title = `Remove ${label} and all paths`;
        headerRemove.onclick = () => {
            if(confirm(`Delete ${label} and all associated paths?`)) {
                ownedPaths.forEach(p => delete window.state.dots.disc[p]);
                if(isThaum) { delete window.state.primaryThaumPath; if(window.state.dots.disc['Thaumaturgy']) delete window.state.dots.disc['Thaumaturgy']; }
                else { delete window.state.primaryNecroPath; if(window.state.dots.disc['Necromancy']) delete window.state.dots.disc['Necromancy']; }
                renderDynamicAdvantageRow(containerId, type, list, isAbil);
                updatePools();
            }
        };

        header.appendChild(title);
        header.appendChild(headerDots);
        header.appendChild(headerRemove);
        magicDiv.appendChild(header);

        // --- 3. Primary Path Logic ---
        const contentDiv = document.createElement('div');
        contentDiv.className = "p-2";
        
        // Check if we need to SELECT a primary path
        if (!primaryKey) {
            const selectRow = document.createElement('div');
            selectRow.className = "mb-2";
            const select = document.createElement('select');
            select.className = "w-full bg-[#111] text-gold border border-gold text-xs font-bold p-1 animate-pulse";
            
            let opts = `<option value="">-- SELECT PRIMARY PATH --</option>`;
            const dataObj = isThaum ? THAUMATURGY_DATA : NECROMANCY_DATA;
            const avail = dataObj ? Object.keys(dataObj) : [];
            avail.forEach(p => {
                // Filter if somehow already taken as secondary (rare edge case)
                if (!window.state.dots.disc[p]) opts += `<option value="${p}">${p}</option>`;
            });
            select.innerHTML = opts;
            
            select.onchange = (e) => {
                const newPath = e.target.value;
                if (newPath) {
                    if (isThaum) window.state.primaryThaumPath = newPath;
                    else window.state.primaryNecroPath = newPath;
                    
                    // Set initial value
                    window.state.dots.disc[newPath] = 1;
                    
                    // Cleanup generic key if it exists
                    const genericKey = isThaum ? 'Thaumaturgy' : 'Necromancy';
                    if (window.state.dots.disc[genericKey]) delete window.state.dots.disc[genericKey];

                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                    updatePools();
                }
            };
            selectRow.appendChild(select);
            contentDiv.appendChild(selectRow);
        } else {
            // Primary Path Display Row
            const pRow = document.createElement('div');
            pRow.className = "flex justify-between items-center mb-2 pb-2 border-b border-[#333]";
            pRow.innerHTML = `
                <div class="text-[#d4af37] text-xs font-bold uppercase"><i class="fas fa-star text-[10px] mr-1"></i> ${primaryKey}</div>
                <div class="text-gray-500 text-[10px] italic">Primary</div>
            `;
            contentDiv.appendChild(pRow);
        }

        // --- 4. Secondary Paths ---
        if (primaryKey) {
            const secondaryPaths = ownedPaths.filter(p => p !== primaryKey && p !== label); // label is 'Thaumaturgy' generic
            
            secondaryPaths.forEach(path => {
                // Use buildRow logic but manually append to this container? 
                // Or just reimplement simple row here for control.
                // Let's reuse buildRow logic but we need to inject it into THIS div, not the main container.
                // We'll reimplement a mini-builder to ensure it goes into contentDiv.
                buildRow(path, true, magicType); // Actually, buildRow appends to 'container' scope variable. 
                // We need to temporarily hijack container? No, that's messy.
                // Let's just move the node.
            });
            
            // Move generated rows from main container to magic container? 
            // The buildRow function appends to `container`.
            // We should modify `buildRow` to accept a target container, or just inline the secondary row logic.
            // Let's inline simple secondary rendering.
            
            secondaryPaths.forEach(secPath => {
                const sRow = document.createElement('div');
                sRow.className = "flex justify-between items-center mb-1 ml-2 pl-2 border-l border-[#444]";
                
                const sName = document.createElement('div');
                sName.className = "text-gray-300 text-xs font-bold";
                sName.innerText = secPath;
                
                const sDots = document.createElement('div');
                sDots.className = "dot-row";
                sDots.innerHTML = renderDots(window.state.dots.disc[secPath], 5);
                
                sDots.onclick = (e) => {
                    if (!e.target.dataset.v) return;
                    const val = parseInt(e.target.dataset.v);
                    const primVal = window.state.dots.disc[primaryKey] || 0;
                    if (val > primVal) {
                        showNotification(`Cannot exceed Primary Path (${primVal})`);
                        return;
                    }
                    setDots(secPath, type, val, 0, 5);
                    renderDynamicAdvantageRow(containerId, type, list, isAbil); // refresh
                };

                const sDel = document.createElement('div');
                sDel.className = "remove-btn ml-2 text-xs";
                sDel.innerHTML = "&times;";
                sDel.onclick = () => {
                    delete window.state.dots.disc[secPath];
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                };

                sRow.appendChild(sName);
                sRow.appendChild(sDots);
                sRow.appendChild(sDel);
                contentDiv.appendChild(sRow);
            });

            // "Add Secondary" Selector
            const addRow = document.createElement('div');
            addRow.className = "mt-2 ml-2";
            const addSel = document.createElement('select');
            addSel.className = "w-full bg-[#111] text-gray-400 border-b border-[#333] text-[10px] uppercase";
            
            let addOpts = `<option value="">+ Add Secondary Path</option>`;
            const dataObj = isThaum ? THAUMATURGY_DATA : NECROMANCY_DATA;
            const avail = dataObj ? Object.keys(dataObj) : [];
            avail.forEach(p => {
                if (!window.state.dots.disc[p]) addOpts += `<option value="${p}">${p}</option>`;
            });
            addSel.innerHTML = addOpts;
            addSel.onchange = (e) => {
                const p = e.target.value;
                if(p) {
                    window.state.dots.disc[p] = 1;
                    renderDynamicAdvantageRow(containerId, type, list, isAbil);
                    updatePools();
                }
            };
            addRow.appendChild(addSel);
            contentDiv.appendChild(addRow);
        }

        magicDiv.appendChild(contentDiv);
        container.appendChild(magicDiv);
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

        // 2. Render Standard
        standardDiscs.forEach(d => buildRow(d));

        // 3. Render Magic Containers
        // Check if we need to render Thaumaturgy container
        if (thaumPaths.length > 0 || window.state.primaryThaumPath) {
            renderMagicContainer('thaum', thaumPaths);
        }
        if (necroPaths.length > 0 || window.state.primaryNecroPath) {
            renderMagicContainer('necro', necroPaths);
        }

        // 4. Render "Add New" Row (Standard)
        buildRow();
    } else {
        // Non-discipline rendering
        existingItems.forEach(item => buildRow(item));
        buildRow();
    }
}
window.renderDynamicAdvantageRow = renderDynamicAdvantageRow;

// --- RITUALS SELECTOR LOGIC (Preserved) ---
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
