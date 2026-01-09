import { ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES } from "./data.js";
import { renderDots } from "./ui-common.js";

// --- STATE FOR LOCAL EDITOR ---
let activeGhoul = null;
let activeIndex = null;

// --- INITIALIZER ---
export function openGhoulCreator(dataOrEvent = null, index = null) {
    // FIX: Detect if the first argument is a browser Event (click) or actual Data
    // If it is an event (has .target or .type), treat it as null (New Creator)
    let incomingData = null;
    if (dataOrEvent && !dataOrEvent.target && !dataOrEvent.type && !dataOrEvent.bubbles) {
        incomingData = dataOrEvent;
    }

    activeIndex = (typeof index === 'number') ? index : null;
    
    // Initialize or Clone Data
    if (incomingData) {
        // Deep Clone existing data
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        
        // Ensure structure is robust even on existing items (legacy patch)
        if (!activeGhoul.attributes) activeGhoul.attributes = {};
        if (!activeGhoul.abilities) activeGhoul.abilities = {};
        if (!activeGhoul.disciplines) activeGhoul.disciplines = {};
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        
        // Re-run init to fill any missing holes
        initBaseDots(activeGhoul);
        
    } else {
        // Create Fresh
        activeGhoul = {
            name: "New Retainer",
            player: "",
            chronicle: "",
            type: "Ghoul",
            concept: "",
            domitor: "",
            attributes: {},
            abilities: {},
            disciplines: {},
            backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            humanity: 6,
            willpower: 3,
            bloodPool: 10 
        };
        // Init Base Dots
        initBaseDots(activeGhoul);
    }

    renderEditorModal();
}

// --- HELPER: INIT DOTS ---
function initBaseDots(ghoul) {
    if (!ghoul.attributes) ghoul.attributes = {};
    if (!ghoul.abilities) ghoul.abilities = {};

    Object.values(ATTRIBUTES).flat().forEach(a => {
        if (ghoul.attributes[a] === undefined) ghoul.attributes[a] = 1;
    });
    Object.values(ABILITIES).flat().forEach(a => {
        if (ghoul.abilities[a] === undefined) ghoul.abilities[a] = 0;
    });
}

// --- RENDER UI ---
function renderEditorModal() {
    // 1. Create Modal Container if missing
    let modal = document.getElementById('ghoul-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ghoul-modal';
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    // 2. Build Mini-Sheet HTML
    modal.innerHTML = `
        <div class="w-[95%] max-w-6xl h-[90%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-4 border-b border-[#444] flex justify-between items-center shrink-0">
                <h2 class="text-2xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase">
                    <i class="fas fa-user-plus mr-3"></i>Retainer Creator
                </h2>
                <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- SCROLLABLE CONTENT AREA -->
            <div class="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar">
                
                <!-- TOP FIELDS -->
                <div class="sheet-section !mt-0">
                    <div class="section-title">Identity</div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div><label class="label-text">Name</label><input type="text" id="g-name" value="${activeGhoul.name}" class="w-full bg-black/30 border-b border-[#333] text-white p-1 focus:border-[#8b0000] outline-none"></div>
                        <div><label class="label-text">Concept</label><input type="text" id="g-concept" value="${activeGhoul.concept}" class="w-full bg-black/30 border-b border-[#333] text-white p-1 focus:border-[#8b0000] outline-none"></div>
                        <div><label class="label-text">Domitor</label><input type="text" id="g-domitor" value="${activeGhoul.domitor}" class="w-full bg-black/30 border-b border-[#333] text-white p-1 focus:border-[#8b0000] outline-none"></div>
                        <div>
                            <label class="label-text">Type</label>
                            <select id="g-type" class="w-full bg-black/30 border-b border-[#333] text-white p-1">
                                <option value="Ghoul" ${activeGhoul.type === 'Ghoul' ? 'selected' : ''}>Ghoul</option>
                                <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''}>Revenant</option>
                                <option value="Mortal" ${activeGhoul.type === 'Mortal' ? 'selected' : ''}>Mortal</option>
                                <option value="Animal" ${activeGhoul.type === 'Animal' ? 'selected' : ''}>Animal</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- ATTRIBUTES -->
                <div class="sheet-section">
                    <div class="section-title">Attributes</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div id="g-attr-phys"></div>
                        <div id="g-attr-soc"></div>
                        <div id="g-attr-men"></div>
                    </div>
                </div>

                <!-- ABILITIES -->
                <div class="sheet-section">
                    <div class="section-title">Abilities</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div id="g-abil-tal"></div>
                        <div id="g-abil-ski"></div>
                        <div id="g-abil-kno"></div>
                    </div>
                </div>

                <!-- ADVANTAGES -->
                <div class="sheet-section">
                    <div class="section-title">Advantages</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        <!-- DISCIPLINES (Dynamic) -->
                        <div>
                            <h3 class="column-title">Disciplines</h3>
                            <div id="g-disc-list" class="space-y-2 mt-2"></div>
                            <div class="mt-3 flex gap-2">
                                <select id="g-disc-select" class="bg-[#111] border border-[#444] text-xs text-gray-300 p-1 flex-1 uppercase font-bold">
                                    <option value="">+ Add Discipline</option>
                                    ${DISCIPLINES.map(d => `<option value="${d}">${d}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- VIRTUES & POOLS -->
                        <div>
                            <h3 class="column-title">Virtues & Status</h3>
                            <div id="g-virt-list" class="space-y-2 mt-2 mb-4"></div>
                            
                            <div class="border-t border-[#333] pt-2 flex flex-col gap-2">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="font-bold text-gray-400 uppercase">Humanity</span>
                                    <div class="dot-row" id="g-humanity-dots">${renderDots(activeGhoul.humanity, 10)}</div>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="font-bold text-gray-400 uppercase">Willpower</span>
                                    <div class="dot-row" id="g-willpower-dots">${renderDots(activeGhoul.willpower, 10)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- FOOTER ACTIONS -->
            <div class="p-4 border-t border-[#444] bg-[#111] flex justify-end gap-4 shrink-0">
                <button id="cancel-ghoul" class="border border-[#444] text-gray-300 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] transition">
                    Cancel
                </button>
                <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition">
                    <i class="fas fa-save mr-2"></i>Save Retainer
                </button>
            </div>
        </div>
    `;

    // 3. Render Dot Rows
    // Attributes
    renderGroup('g-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
    renderGroup('g-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
    renderGroup('g-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');

    // Abilities
    renderGroup('g-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
    renderGroup('g-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
    renderGroup('g-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');

    // Virtues
    renderGroup('g-virt-list', null, VIRTUES, 'virtues');

    // Disciplines
    renderDisciplines();

    // 4. Attach Listeners
    setupListeners(modal);

    // 5. Show Modal
    modal.classList.remove('hidden');
}

// --- RENDER HELPERS ---

function renderGroup(containerId, title, list, type) {
    const el = document.getElementById(containerId);
    if (!el) return;
    
    let html = title ? `<h3 class="column-title">${title}</h3>` : '';
    
    // Safety check for data existence
    if (!activeGhoul[type]) activeGhoul[type] = {};

    list.forEach(item => {
        const val = activeGhoul[type][item] || 0;
        // We add data-key and data-type to the row for the click handler
        html += `
            <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="${type}" data-key="${item}">
                <span class="text-[10px] uppercase font-bold text-gray-300">${item}</span>
                <div class="dot-row cursor-pointer hover:opacity-80 transition-opacity">
                    ${renderDots(val, 5)}
                </div>
            </div>
        `;
    });
    el.innerHTML = html;
}

function renderDisciplines() {
    const el = document.getElementById('g-disc-list');
    if (!el) return;
    el.innerHTML = '';

    if (!activeGhoul.disciplines) activeGhoul.disciplines = {};

    Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center mb-1 dot-row-interactive group";
        row.dataset.type = "disciplines";
        row.dataset.key = name;
        
        row.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onclick="window.removeGhoulDisc('${name}')">&times;</span>
                <span class="text-[10px] uppercase font-bold text-white">${name}</span>
            </div>
            <div class="dot-row cursor-pointer hover:opacity-80 transition-opacity">
                ${renderDots(val, 5)}
            </div>
        `;
        el.appendChild(row);
    });
}

// --- GLOBAL HANDLER FOR REMOVING DISCIPLINES ---
window.removeGhoulDisc = function(name) {
    if (activeGhoul && activeGhoul.disciplines && activeGhoul.disciplines[name] !== undefined) {
        delete activeGhoul.disciplines[name];
        renderDisciplines();
    }
};

// --- EVENT LISTENERS ---

function setupListeners(modal) {
    // A. Close / Cancel
    const close = () => modal.classList.add('hidden');
    document.getElementById('close-ghoul-modal').onclick = close;
    document.getElementById('cancel-ghoul').onclick = close;

    // B. Save
    document.getElementById('save-ghoul').onclick = () => {
        // Capture Text Inputs
        activeGhoul.name = document.getElementById('g-name').value || "Unnamed";
        activeGhoul.concept = document.getElementById('g-concept').value;
        activeGhoul.domitor = document.getElementById('g-domitor').value;
        activeGhoul.type = document.getElementById('g-type').value;

        // Push to Main State
        if (!window.state.retainers) window.state.retainers = [];
        
        if (activeIndex !== null && activeIndex >= 0) {
            window.state.retainers[activeIndex] = activeGhoul;
        } else {
            window.state.retainers.push(activeGhoul);
        }

        // Trigger Main App Refresh
        if (window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
        if (window.performSave) window.performSave(true); // Auto-save

        close();
    };

    // C. Add Discipline
    const discSelect = document.getElementById('g-disc-select');
    discSelect.onchange = (e) => {
        const val = e.target.value;
        if (val) {
            if (!activeGhoul.disciplines) activeGhoul.disciplines = {};
            if (activeGhoul.disciplines[val] === undefined) {
                activeGhoul.disciplines[val] = 1; // Start at 1
                renderDisciplines();
                // Re-bind listeners for the new row
                bindDotClicks(modal); 
            }
            e.target.value = "";
        }
    };

    // D. Global Dot Click Delegation
    bindDotClicks(modal);
}

function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    rows.forEach(row => {
        // Prevent stacking listeners
        row.onclick = null; 
        
        row.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            
            const type = row.dataset.type;
            const key = row.dataset.key;
            const newVal = parseInt(e.target.dataset.v);
            
            // Ensure object exists
            if (!activeGhoul[type]) activeGhoul[type] = {};

            // Logic: Toggle off if clicking current value, otherwise set value
            let currentVal = 0;
            if (type === 'attributes' || type === 'abilities' || type === 'disciplines') {
                currentVal = activeGhoul[type][key] || 0;
            } else if (type === 'virtues') {
                currentVal = activeGhoul.virtues[key] || 1;
            }

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1; // Toggle down
            
            // Minima constraints
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;
            
            // Update Data
            if (type === 'virtues') activeGhoul.virtues[key] = finalVal;
            else activeGhoul[type][key] = finalVal;

            // Re-render just this row's dots
            const dotContainer = row.querySelector('.dot-row');
            dotContainer.innerHTML = renderDots(finalVal, 5);
        };
    });

    // Special Handling for Humanity/Willpower (IDs)
    const handleSpec = (id, field) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const v = parseInt(e.target.dataset.v);
            activeGhoul[field] = v;
            el.innerHTML = renderDots(v, 10);
        };
    };
    handleSpec('g-humanity-dots', 'humanity');
    handleSpec('g-willpower-dots', 'willpower');
}
