import { ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS } from "./data.js";
import { renderDots } from "./ui-common.js";

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';

// --- INITIALIZER ---
export function openGhoulCreator(dataOrEvent = null, index = null) {
    console.log("Creating/Editing Ghoul...", dataOrEvent); // Debug Log

    // 1. Handle Arguments
    // Detect if the first argument is a browser Event (click) or actual Data
    let incomingData = null;
    
    // Check if it's an event (has type and target) or just empty
    const isEvent = dataOrEvent && (dataOrEvent instanceof Event || !!dataOrEvent.target || !!dataOrEvent.type);
    
    if (dataOrEvent && !isEvent) {
        incomingData = dataOrEvent;
    }

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1'; 
    
    // 2. Initialize Data
    if (incomingData) {
        console.log("Loading existing ghoul...");
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        
        // Patch missing objects
        ['attributes', 'abilities', 'disciplines', 'backgrounds'].forEach(k => {
            if (!activeGhoul[k]) activeGhoul[k] = {};
        });
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        
        initBaseDots(activeGhoul);
    } else {
        console.log("Initializing new ghoul...");
        activeGhoul = {
            name: "",
            player: "",
            chronicle: "",
            type: "Ghoul", 
            concept: "",
            domitor: "",
            attributes: {},
            abilities: {},
            disciplines: { Potence: 1 }, 
            backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            humanity: 6,
            willpower: 3,
            bloodPool: 10 
        };
        initBaseDots(activeGhoul);
    }

    renderEditorModal();
    switchTab('step1');
    updateTracker();
}

// --- HELPER: BASE DOTS ---
function initBaseDots(ghoul) {
    if (ATTRIBUTES) Object.values(ATTRIBUTES).flat().forEach(a => { if (ghoul.attributes[a] === undefined) ghoul.attributes[a] = 1; });
    if (ABILITIES) Object.values(ABILITIES).flat().forEach(a => { if (ghoul.abilities[a] === undefined) ghoul.abilities[a] = 0; });
}

// --- MAIN RENDER ---
function renderEditorModal() {
    let modal = document.getElementById('ghoul-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ghoul-modal';
        // Ensure z-index is high enough and fixed positioning works
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

    // Safety for Backgrounds in case data.js is older version
    const bgOptions = (BACKGROUNDS || []).map(b => `<option value="${b}">${b}</option>`).join('');
    const discOptions = (DISCIPLINES || []).map(d => `<option value="${d}">${d}</option>`).join('');

    modal.innerHTML = `
        <div class="w-[95%] max-w-7xl h-[95%] bg-[#0a0a0a] border-2 border-[#8b0000] shadow-[0_0_50px_rgba(139,0,0,0.5)] flex flex-col relative">
            
            <!-- HEADER -->
            <div class="bg-[#1a0505] p-3 border-b border-[#444] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-xl font-cinzel text-[#d4af37] font-bold tracking-widest uppercase">
                        <i class="fas fa-user-plus mr-2"></i>Retainer Creator
                    </h2>
                </div>
                <div class="flex gap-2">
                    <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- TAB NAVIGATION -->
            <div class="flex border-b border-[#333] bg-[#111] text-[10px] uppercase font-bold text-gray-400 tracking-wider overflow-x-auto no-scrollbar shrink-0">
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step1">1. Concept</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step2">2. Attributes</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step3">3. Abilities</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step4">4. Advantages</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step5">5. Finishing</button>
            </div>

            <!-- MAIN CONTENT + SIDEBAR -->
            <div class="flex flex-1 overflow-hidden">
                
                <!-- CONTENT AREA -->
                <div class="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar relative bg-[#050505]">
                    
                    <!-- STEP 1: IDENTITY -->
                    <div id="step1" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Character Concept</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div><label class="label-text">Name</label><input type="text" id="g-name" value="${activeGhoul.name || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                    <div><label class="label-text">Domitor (Master)</label><input type="text" id="g-domitor" value="${activeGhoul.domitor || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                    <div><label class="label-text">Chronicle</label><input type="text" id="g-chronicle" value="${activeGhoul.chronicle || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                </div>
                                <div class="space-y-4">
                                    <div><label class="label-text">Concept</label><input type="text" id="g-concept" value="${activeGhoul.concept || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                    <div>
                                        <label class="label-text">Ghoul Type</label>
                                        <select id="g-type" class="w-full bg-[#111] border border-[#333] text-white p-2 text-xs">
                                            <option value="Vassal" ${activeGhoul.type === 'Vassal' ? 'selected' : ''}>Vassal (Bound Servant)</option>
                                            <option value="Independent" ${activeGhoul.type === 'Independent' ? 'selected' : ''}>Independent (Masterless)</option>
                                            <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''}>Revenant (Born)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6 text-gray-500 text-xs italic">
                                <p class="mb-2"><strong class="text-gold">Vassal:</strong> Bound to a specific master. Loyal, usually stable supply of vitae.</p>
                                <p class="mb-2"><strong class="text-gold">Independent:</strong> No master. Must hunt for vitae. Dangerous existence.</p>
                                <p><strong class="text-gold">Revenant:</strong> Born into a ghoul family (e.g. Grimaldi, Zantosa). Natural vitae generation.</p>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: ATTRIBUTES -->
                    <div id="step2" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Attributes (Prioritize 6 / 4 / 3)</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div id="g-attr-phys"></div>
                                <div id="g-attr-soc"></div>
                                <div id="g-attr-men"></div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: ABILITIES -->
                    <div id="step3" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Abilities (Prioritize 11 / 7 / 4)</div>
                            <div class="text-[10px] text-gray-500 italic mb-4 text-center">Max 3 dots during initial creation.</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div id="g-abil-tal"></div>
                                <div id="g-abil-ski"></div>
                                <div id="g-abil-kno"></div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: ADVANTAGES -->
                    <div id="step4" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Advantages</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 class="column-title">Disciplines (1 + Potence)</h3>
                                    <div id="g-disc-list" class="space-y-1 mt-2"></div>
                                    <div class="mt-3">
                                        <select id="g-disc-select" class="w-full bg-[#111] border border-[#444] text-[10px] text-gray-300 p-1 uppercase font-bold">
                                            <option value="">+ Add Discipline</option>
                                            ${discOptions}
                                        </select>
                                    </div>
                                    <div class="mt-6">
                                        <h3 class="column-title">Backgrounds (5)</h3>
                                        <div id="g-back-list" class="space-y-1 mt-2"></div>
                                        <div class="mt-3">
                                            <select id="g-back-select" class="w-full bg-[#111] border border-[#444] text-[10px] text-gray-300 p-1 uppercase font-bold">
                                                <option value="">+ Add Background</option>
                                                ${bgOptions}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="column-title">Virtues (7)</h3>
                                    <div id="g-virt-list" class="space-y-1 mt-2 mb-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 5: FINISHING -->
                    <div id="step5" class="ghoul-step hidden">
                        <div class="sheet-section !mt-0">
                            <div class="section-title">Finishing Touches</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 class="column-title">Status</h3>
                                    <div class="border border-[#333] bg-[#111] p-4 space-y-4">
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-gray-400 uppercase">Humanity</span>
                                            <div class="dot-row" id="g-humanity-dots">${renderDots(activeGhoul.humanity, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="font-bold text-gray-400 uppercase">Willpower</span>
                                            <div class="dot-row" id="g-willpower-dots">${renderDots(activeGhoul.willpower, 10)}</div>
                                        </div>
                                        <div class="flex justify-between items-center text-xs pt-2 border-t border-[#333]">
                                            <span class="font-bold text-gray-400 uppercase">Blood Pool</span>
                                            <input type="number" id="g-blood" value="${activeGhoul.bloodPool}" class="w-12 bg-black border border-[#444] text-center text-white p-1">
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 class="column-title">Freebie Points (21)</h3>
                                    <div class="text-xs text-gray-400 p-2">
                                        Use Freebie points to round out your character. Attributes cost 5, Abilities 2, Disciplines 10, Backgrounds 1, Virtues 2, Humanity 1, Willpower 1.
                                    </div>
                                    <div class="mt-4 p-4 border border-green-900/30 bg-green-900/10 rounded text-center">
                                        <div class="uppercase text-[9px] font-bold text-green-500">Points Remaining</div>
                                        <div id="final-freebie-disp" class="text-3xl font-black text-white mt-1">21</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- TRACKER SIDEBAR (Visible Always) -->
                <div class="w-56 bg-[#0f0f0f] border-l border-[#333] p-4 overflow-y-auto hidden md:block shrink-0">
                    <h3 class="text-[#d4af37] font-bold text-xs uppercase border-b border-[#333] pb-1 mb-4 text-center tracking-widest">Creation Log</h3>
                    
                    <div class="space-y-6 text-[10px]">
                        
                        <div>
                            <div class="flex justify-between items-center bg-black/50 p-2 border border-[#333] rounded mb-2">
                                <span class="text-gray-500 font-bold uppercase">Freebies</span>
                                <span id="trk-freebies" class="text-lg font-bold text-green-400">21</span>
                            </div>
                        </div>

                        <div>
                            <div class="font-bold text-[#d4af37] mb-1 uppercase tracking-wide border-b border-[#333] pb-1">Attributes</div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Physical</span><span id="trk-attr-phys" class="text-white">0</span></div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Social</span><span id="trk-attr-soc" class="text-white">0</span></div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Mental</span><span id="trk-attr-men" class="text-white">0</span></div>
                            <div class="text-[9px] text-gray-600 italic text-right mt-1">Target: 6 / 4 / 3</div>
                        </div>

                        <div>
                            <div class="font-bold text-[#d4af37] mb-1 uppercase tracking-wide border-b border-[#333] pb-1">Abilities</div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Talents</span><span id="trk-abil-tal" class="text-white">0</span></div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Skills</span><span id="trk-abil-ski" class="text-white">0</span></div>
                            <div class="flex justify-between py-0.5"><span class="text-gray-400">Knowl.</span><span id="trk-abil-kno" class="text-white">0</span></div>
                            <div class="text-[9px] text-gray-600 italic text-right mt-1">Target: 11 / 7 / 4</div>
                        </div>

                        <div>
                            <div class="font-bold text-[#d4af37] mb-1 uppercase tracking-wide border-b border-[#333] pb-1">Advantages</div>
                            <div class="flex justify-between py-0.5">
                                <span class="text-gray-400">Disciplines</span>
                                <span id="trk-disc" class="text-white">1</span>
                            </div>
                            <div class="flex justify-between py-0.5">
                                <span class="text-gray-400">Backgrounds</span>
                                <span id="trk-back" class="text-white">0 / 5</span>
                            </div>
                            <div class="flex justify-between py-0.5">
                                <span class="text-gray-400">Virtues</span>
                                <span id="trk-virt" class="text-white">0 / 7</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#111] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">
                    <span class="text-[#d4af37]">Tip:</span> Click dots to assign. Values update in sidebar.
                </div>
                <div class="flex gap-4">
                    <button id="cancel-ghoul" class="border border-[#444] text-gray-300 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] transition">Cancel</button>
                    <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2">
                        <i class="fas fa-save"></i> Save Character
                    </button>
                </div>
            </div>
        </div>
    `;

    // Force visibility via style property to override any hidden class conflicts
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Initialize Components
    renderDotGroups();
    renderDynamicLists();
    
    // Listeners
    setupNavListeners(modal);
    setupActionListeners(modal);
    
    // Bind Clicks (The core mechanic)
    bindDotClicks(modal);
}

// --- TAB LOGIC ---
function switchTab(tabId) {
    currentTab = tabId;
    // Hide all
    document.querySelectorAll('.ghoul-step').forEach(el => el.classList.add('hidden'));
    // Show active
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');
    
    // Update Buttons
    document.querySelectorAll('.ghoul-tab').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('bg-[#8b0000]', 'text-white', 'border-b-2', 'border-b-white');
            btn.classList.remove('text-gray-400', 'hover:bg-[#222]');
        } else {
            btn.classList.remove('bg-[#8b0000]', 'text-white', 'border-b-2', 'border-b-white');
            btn.classList.add('text-gray-400', 'hover:bg-[#222]');
        }
    });
}

function setupNavListeners(modal) {
    const tabs = modal.querySelectorAll('.ghoul-tab');
    tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));
}

// --- RENDERING GROUPS ---
function renderDotGroups() {
    // Attributes
    if(ATTRIBUTES) {
        renderGroup('g-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('g-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('g-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    
    // Abilities
    if(ABILITIES) {
        renderGroup('g-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('g-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('g-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    
    // Virtues
    if(VIRTUES) renderGroup('g-virt-list', null, VIRTUES, 'virtues');
}

function renderGroup(id, title, list, type) {
    const el = document.getElementById(id);
    if(!el) return;
    let html = title ? `<h3 class="column-title mb-2">${title}</h3>` : '';
    if (list) {
        list.forEach(item => {
            const val = activeGhoul[type][item] || 0;
            // Attributes start at 1 visually
            const dispVal = (type === 'attributes' && val < 1) ? 1 : val;
            
            html += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="${type}" data-key="${item}">
                    <span class="text-[10px] uppercase font-bold text-gray-300 tracking-tight">${item}</span>
                    <div class="dot-row cursor-pointer hover:opacity-80 transition-opacity">
                        ${renderDots(dispVal, 5)}
                    </div>
                </div>
            `;
        });
    }
    el.innerHTML = html;
}

function renderDynamicLists() {
    renderDisciplines();
    renderBackgrounds();
}

function renderDisciplines() {
    const el = document.getElementById('g-disc-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.disciplines) {
        Object.entries(activeGhoul.disciplines).forEach(([name, val]) => {
            const isAuto = name === 'Potence';
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="disciplines" data-key="${name}">
                    <div class="flex items-center gap-2">
                        ${!isAuto ? `<span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('disciplines','${name}')">&times;</span>` : '<span class="w-2"></span>'}
                        <span class="text-[10px] uppercase font-bold ${isAuto ? 'text-[#d4af37]' : 'text-white'}">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

function renderBackgrounds() {
    const el = document.getElementById('g-back-list');
    if(!el) return;
    el.innerHTML = '';
    
    if(activeGhoul.backgrounds) {
        Object.entries(activeGhoul.backgrounds).forEach(([name, val]) => {
            el.innerHTML += `
                <div class="flex justify-between items-center mb-1 dot-row-interactive" data-type="backgrounds" data-key="${name}">
                    <div class="flex items-center gap-2">
                        <span class="text-red-500 cursor-pointer hover:text-red-300" onclick="window.removeGhoulItem('backgrounds','${name}')">&times;</span>
                        <span class="text-[10px] uppercase font-bold text-white">${name}</span>
                    </div>
                    <div class="dot-row cursor-pointer hover:opacity-80">${renderDots(val, 5)}</div>
                </div>
            `;
        });
    }
}

// --- GLOBAL REMOVE HANDLER ---
window.removeGhoulItem = function(type, key) {
    if (type === 'disciplines' && key === 'Potence') return;
    if (activeGhoul[type] && activeGhoul[type][key] !== undefined) {
        delete activeGhoul[type][key];
        renderDynamicLists();
        updateTracker();
        // Re-bind is tricky, simpler to re-bind modal
        bindDotClicks(document.getElementById('ghoul-modal'));
    }
};

// --- LOGIC & CALC ---
function setupActionListeners(modal) {
    const close = () => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    };
    
    document.getElementById('close-ghoul-modal').onclick = close;
    document.getElementById('cancel-ghoul').onclick = close;
    
    document.getElementById('save-ghoul').onclick = () => {
        // Harvest Inputs
        activeGhoul.name = document.getElementById('g-name').value;
        activeGhoul.domitor = document.getElementById('g-domitor').value;
        activeGhoul.concept = document.getElementById('g-concept').value;
        activeGhoul.chronicle = document.getElementById('g-chronicle').value;
        activeGhoul.type = document.getElementById('g-type').value;
        activeGhoul.bloodPool = parseInt(document.getElementById('g-blood').value) || 10;

        // Save
        if (!window.state.retainers) window.state.retainers = [];
        if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = activeGhoul;
        else window.state.retainers.push(activeGhoul);

        if(window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
        if(window.performSave) window.performSave(true);
        
        close();
    };

    // Add Dropdowns
    const setupDrop = (id, type, renderFn) => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.onchange = (e) => {
            const val = e.target.value;
            if(val) {
                if(!activeGhoul[type]) activeGhoul[type] = {};
                if(activeGhoul[type][val] === undefined) {
                    activeGhoul[type][val] = 1;
                    renderFn();
                    updateTracker();
                    bindDotClicks(modal);
                }
                e.target.value = "";
            }
        };
    };
    setupDrop('g-disc-select', 'disciplines', renderDisciplines);
    setupDrop('g-back-select', 'backgrounds', renderBackgrounds);
}

function bindDotClicks(modal) {
    const rows = modal.querySelectorAll('.dot-row-interactive');
    rows.forEach(row => {
        row.onclick = null; // Clear old
        row.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const type = row.dataset.type;
            const key = row.dataset.key;
            const newVal = parseInt(e.target.dataset.v);
            
            if (!activeGhoul[type]) activeGhoul[type] = {};
            
            // Logic: Toggle down if clicking current
            let currentVal = activeGhoul[type][key] || 0;
            // Adjust for Base 1 items
            if ((type === 'attributes' || type === 'virtues') && activeGhoul[type][key] === undefined) currentVal = 1;

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            
            // Minima
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;
            
            activeGhoul[type][key] = finalVal;
            
            // Render specific row
            row.querySelector('.dot-row').innerHTML = renderDots(finalVal, 5);
            
            // Special Humanity Calc
            if (type === 'virtues') {
                const c = activeGhoul.virtues.Conscience || 1;
                const sc = activeGhoul.virtues["Self-Control"] || 1;
                const cour = activeGhoul.virtues.Courage || 1;
                activeGhoul.humanity = c + sc;
                activeGhoul.willpower = cour;
                const hDots = document.getElementById('g-humanity-dots');
                const wDots = document.getElementById('g-willpower-dots');
                if(hDots) hDots.innerHTML = renderDots(activeGhoul.humanity, 10);
                if(wDots) wDots.innerHTML = renderDots(activeGhoul.willpower, 10);
            }

            updateTracker();
        };
    });
}

function updateTracker() {
    let spent = {
        attr: { Physical: 0, Social: 0, Mental: 0 },
        abil: { Talents: 0, Skills: 0, Knowledges: 0 },
        disc: 0, back: 0, virt: 0,
        freebies: 21
    };

    if(ATTRIBUTES) {
        ATTRIBUTES.Physical.forEach(a => spent.attr.Physical += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Social.forEach(a => spent.attr.Social += Math.max(0, (activeGhoul.attributes[a]||1)-1));
        ATTRIBUTES.Mental.forEach(a => spent.attr.Mental += Math.max(0, (activeGhoul.attributes[a]||1)-1));
    }

    if(ABILITIES) {
        ABILITIES.Talents.forEach(a => spent.abil.Talents += (activeGhoul.abilities[a]||0));
        ABILITIES.Skills.forEach(a => spent.abil.Skills += (activeGhoul.abilities[a]||0));
        ABILITIES.Knowledges.forEach(a => spent.abil.Knowledges += (activeGhoul.abilities[a]||0));
    }

    // Disciplines (1 free + Potence free)
    let discDots = 0;
    if(activeGhoul.disciplines) {
        Object.keys(activeGhoul.disciplines).forEach(k => {
            if(k !== 'Potence') discDots += activeGhoul.disciplines[k];
            else discDots += Math.max(0, activeGhoul.disciplines[k] - 1); // Potence 1 is free
        });
    }
    spent.disc = discDots;

    if(activeGhoul.backgrounds) Object.values(activeGhoul.backgrounds).forEach(v => spent.back += v);
    if(VIRTUES && activeGhoul.virtues) VIRTUES.forEach(v => spent.virt += Math.max(0, (activeGhoul.virtues[v]||1)-1));

    // Update UI
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    
    setTxt('trk-attr-phys', spent.attr.Physical);
    setTxt('trk-attr-soc', spent.attr.Social);
    setTxt('trk-attr-men', spent.attr.Mental);
    
    setTxt('trk-abil-tal', spent.abil.Talents);
    setTxt('trk-abil-ski', spent.abil.Skills);
    setTxt('trk-abil-kno', spent.abil.Knowledges);
    
    setTxt('trk-disc', spent.disc + " (Excl. Pot 1)");
    setTxt('trk-back', spent.back + " / 5");
    setTxt('trk-virt', spent.virt + " / 7");

    let freebieCost = 0;
    if(spent.back > 5) freebieCost += (spent.back - 5) * 1;
    if(spent.virt > 7) freebieCost += (spent.virt - 7) * 2;
    
    const totalAbil = spent.abil.Talents + spent.abil.Skills + spent.abil.Knowledges;
    if(totalAbil > 22) freebieCost += (totalAbil - 22) * 2;

    const totalAttr = spent.attr.Physical + spent.attr.Social + spent.attr.Mental;
    if(totalAttr > 13) freebieCost += (totalAttr - 13) * 5;
    
    if(spent.disc > 1) freebieCost += (spent.disc - 1) * 10;

    const remaining = 21 - freebieCost;
    const fbEl = document.getElementById('final-freebie-disp');
    const fbElTrk = document.getElementById('trk-freebies');
    if(fbEl) {
        fbEl.innerText = remaining;
        fbEl.className = remaining >= 0 ? "text-3xl font-black text-white mt-1" : "text-3xl font-black text-red-500 mt-1";
    }
    if(fbElTrk) fbElTrk.innerText = remaining;
}
