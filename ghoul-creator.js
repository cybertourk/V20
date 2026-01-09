import { ATTRIBUTES, ABILITIES, DISCIPLINES, VIRTUES, BACKGROUNDS } from "./data.js";
import { renderDots } from "./ui-common.js";

// --- STATE ---
let activeGhoul = null;
let activeIndex = null;
let currentTab = 'step1';

// Priority State Checkers
const PRIO_CONFIG = {
    attr: [6, 4, 3],
    abil: [11, 7, 4]
};

let localPriorities = {
    attr: { Physical: null, Social: null, Mental: null },
    abil: { Talents: null, Skills: null, Knowledges: null }
};

// --- INITIALIZER ---
export function openGhoulCreator(dataOrEvent = null, index = null) {
    console.log("Creating/Editing Ghoul...", dataOrEvent); 

    let incomingData = null;
    const isEvent = dataOrEvent && (dataOrEvent instanceof Event || !!dataOrEvent.target || !!dataOrEvent.type);
    
    if (dataOrEvent && !isEvent) {
        incomingData = dataOrEvent;
    }

    activeIndex = (typeof index === 'number') ? index : null;
    currentTab = 'step1';
    
    localPriorities = {
        attr: { Physical: null, Social: null, Mental: null },
        abil: { Talents: null, Skills: null, Knowledges: null }
    };

    if (incomingData) {
        activeGhoul = JSON.parse(JSON.stringify(incomingData));
        ['attributes', 'abilities', 'disciplines', 'backgrounds'].forEach(k => { if (!activeGhoul[k]) activeGhoul[k] = {}; });
        if (!activeGhoul.virtues) activeGhoul.virtues = { Conscience: 1, "Self-Control": 1, Courage: 1 };
        initBaseDots(activeGhoul);
    } else {
        activeGhoul = {
            name: "", player: "", chronicle: "", type: "Ghoul", concept: "", domitor: "",
            attributes: {}, abilities: {}, disciplines: { Potence: 1 }, backgrounds: {}, 
            virtues: { Conscience: 1, "Self-Control": 1, Courage: 1 },
            humanity: 6, willpower: 3, bloodPool: 10 
        };
        initBaseDots(activeGhoul);
    }

    renderEditorModal();
    switchTab('step1');
}

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
        modal.className = 'fixed inset-0 bg-black/90 z-[100] flex items-center justify-center hidden';
        document.body.appendChild(modal);
    }

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
                <button id="close-ghoul-modal" class="text-gray-400 hover:text-white text-xl px-2"><i class="fas fa-times"></i></button>
            </div>

            <!-- TABS -->
            <div class="flex border-b border-[#333] bg-[#111] text-[10px] uppercase font-bold text-gray-400 tracking-wider overflow-x-auto no-scrollbar shrink-0">
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step1">1. Concept</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step2">2. Attributes</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step3">3. Abilities</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step4">4. Advantages</button>
                <button class="ghoul-tab px-6 py-3 hover:bg-[#222] border-r border-[#333] transition-colors" data-tab="step5">5. Finishing</button>
            </div>

            <!-- CONTENT -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar relative bg-[#050505]">
                
                <!-- STEP 1: IDENTITY -->
                <div id="step1" class="ghoul-step hidden">
                    <div class="sheet-section !mt-0">
                        <div class="section-title">Character Concept</div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div><label class="label-text">Name</label><input type="text" id="g-name" value="${activeGhoul.name || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                <div><label class="label-text">Domitor</label><input type="text" id="g-domitor" value="${activeGhoul.domitor || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                <div><label class="label-text">Chronicle</label><input type="text" id="g-chronicle" value="${activeGhoul.chronicle || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                            </div>
                            <div class="space-y-4">
                                <div><label class="label-text">Concept</label><input type="text" id="g-concept" value="${activeGhoul.concept || ''}" class="w-full bg-black/30 border-b border-[#333] text-white p-2 text-xs focus:border-[#8b0000] outline-none"></div>
                                <div>
                                    <label class="label-text">Ghoul Type</label>
                                    <select id="g-type" class="w-full bg-[#111] border border-[#333] text-white p-2 text-xs">
                                        <option value="Vassal" ${activeGhoul.type === 'Vassal' ? 'selected' : ''}>Vassal</option>
                                        <option value="Independent" ${activeGhoul.type === 'Independent' ? 'selected' : ''}>Independent</option>
                                        <option value="Revenant" ${activeGhoul.type === 'Revenant' ? 'selected' : ''}>Revenant</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: ATTRIBUTES (PRIORITY SYSTEM) -->
                <div id="step2" class="ghoul-step hidden">
                    <div class="sheet-section !mt-0">
                        <div class="section-title">Attributes</div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div id="col-attr-phys">
                                <h3 class="column-title">Physical <span id="cnt-attr-Physical" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('attr', 'Physical')}
                                </div>
                                <div id="g-attr-phys"></div>
                            </div>
                            <div id="col-attr-soc">
                                <h3 class="column-title">Social <span id="cnt-attr-Social" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('attr', 'Social')}
                                </div>
                                <div id="g-attr-soc"></div>
                            </div>
                            <div id="col-attr-men">
                                <h3 class="column-title">Mental <span id="cnt-attr-Mental" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('attr', 'Mental')}
                                </div>
                                <div id="g-attr-men"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- STEP 3: ABILITIES (PRIORITY SYSTEM) -->
                <div id="step3" class="ghoul-step hidden">
                    <div class="sheet-section !mt-0">
                        <div class="section-title">Abilities</div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div id="col-abil-tal">
                                <h3 class="column-title">Talents <span id="cnt-abil-Talents" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('abil', 'Talents')}
                                </div>
                                <div id="g-abil-tal"></div>
                            </div>
                            <div id="col-abil-ski">
                                <h3 class="column-title">Skills <span id="cnt-abil-Skills" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('abil', 'Skills')}
                                </div>
                                <div id="g-abil-ski"></div>
                            </div>
                            <div id="col-abil-kno">
                                <h3 class="column-title">Knowledges <span id="cnt-abil-Knowledges" class="text-[10px] text-gray-500 ml-1"></span></h3>
                                <div class="flex justify-center gap-2 mb-4 bg-black/40 p-1 rounded">
                                    ${renderPrioButtons('abil', 'Knowledges')}
                                </div>
                                <div id="g-abil-kno"></div>
                            </div>
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
                                    Spend Freebies on Attributes (5), Abilities (2), Disciplines (10), etc.
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

            <!-- FOOTER -->
            <div class="p-4 border-t border-[#444] bg-[#111] flex justify-between items-center shrink-0">
                <div class="text-[10px] text-gray-500 italic">
                    <span class="text-[#d4af37]">Note:</span> Priority selections cap your dots. Freebies are calculated automatically.
                </div>
                <div class="flex gap-4">
                    <button id="cancel-ghoul" class="border border-[#444] text-gray-300 px-6 py-2 uppercase font-bold text-xs hover:bg-[#222] transition">Cancel</button>
                    <button id="save-ghoul" class="bg-[#8b0000] text-white px-8 py-2 uppercase font-bold text-xs hover:bg-red-700 shadow-lg tracking-widest transition flex items-center gap-2">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    renderDotGroups();
    renderDynamicLists();
    updatePriorityUI(); 
    
    setupNavListeners(modal);
    setupActionListeners(modal);
    bindDotClicks(modal);
}

// --- PRIORITY HELPERS ---
function renderPrioButtons(cat, group) {
    const vals = PRIO_CONFIG[cat];
    return vals.map(v => `
        <button type="button" 
            class="w-6 h-6 rounded-full border border-gray-600 text-[9px] font-bold text-gray-400 hover:text-white hover:border-white transition-colors ghoul-prio-btn"
            data-cat="${cat}" data-group="${group}" data-val="${v}">
            ${v}
        </button>
    `).join('');
}

function handlePrioClick(e) {
    const btn = e.target;
    const { cat, group, val } = btn.dataset;
    const v = parseInt(val);

    const currentAssignment = Object.entries(localPriorities[cat]).find(([g, assignedVal]) => assignedVal === v);
    
    if (currentAssignment) {
        const [otherGroup, otherVal] = currentAssignment;
        localPriorities[cat][otherGroup] = null;
    }

    if (localPriorities[cat][group] === v) {
        localPriorities[cat][group] = null;
    } else {
        localPriorities[cat][group] = v;
    }

    updatePriorityUI();
    updateCounters();
}

function updatePriorityUI() {
    document.querySelectorAll('.ghoul-prio-btn').forEach(btn => {
        const { cat, group, val } = btn.dataset;
        const v = parseInt(val);
        
        if (localPriorities[cat][group] === v) {
            btn.classList.add('bg-[#8b0000]', 'text-white', 'border-[#8b0000]');
            btn.classList.remove('border-gray-600', 'text-gray-400');
        } else {
            const isTaken = Object.values(localPriorities[cat]).includes(v);
            
            btn.classList.remove('bg-[#8b0000]', 'text-white', 'border-[#8b0000]');
            if (isTaken) {
                btn.classList.add('opacity-20', 'cursor-not-allowed', 'border-gray-800');
                btn.classList.remove('border-gray-600', 'hover:border-white', 'hover:text-white');
            } else {
                btn.classList.add('border-gray-600', 'text-gray-400', 'hover:border-white', 'hover:text-white');
                btn.classList.remove('opacity-20', 'cursor-not-allowed', 'border-gray-800');
            }
        }
        btn.onclick = handlePrioClick;
    });
}

function updateCounters() {
    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            const el = document.getElementById(`cnt-${cat}-${group}`);
            if(!el) return;
            
            let spent = 0;
            let list = (cat === 'attr') ? ATTRIBUTES[group] : 
                       (group === 'Talents' ? ABILITIES.Talents : 
                        group === 'Skills' ? ABILITIES.Skills : ABILITIES.Knowledges);
            
            list.forEach(item => {
                const val = (cat === 'attr') ? activeGhoul.attributes[item] : activeGhoul.abilities[item];
                if (cat === 'attr') spent += Math.max(0, (val||1) - 1);
                else spent += (val||0);
            });

            if (limit) {
                const color = spent > limit ? 'text-red-500' : (spent === limit ? 'text-green-500' : 'text-gray-500');
                el.innerHTML = `<span class="${color}">${spent} / ${limit}</span>`;
            } else {
                el.innerHTML = `<span class="text-gray-600">[${spent}]</span>`;
            }
        });
    });
    updateTracker();
}

// --- TABS ---
function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.ghoul-step').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');
    
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

// --- RENDER HELPERS ---
function renderDotGroups() {
    if(ATTRIBUTES) {
        renderGroup('g-attr-phys', 'Physical', ATTRIBUTES.Physical, 'attributes');
        renderGroup('g-attr-soc', 'Social', ATTRIBUTES.Social, 'attributes');
        renderGroup('g-attr-men', 'Mental', ATTRIBUTES.Mental, 'attributes');
    }
    if(ABILITIES) {
        renderGroup('g-abil-tal', 'Talents', ABILITIES.Talents, 'abilities');
        renderGroup('g-abil-ski', 'Skills', ABILITIES.Skills, 'abilities');
        renderGroup('g-abil-kno', 'Knowledges', ABILITIES.Knowledges, 'abilities');
    }
    if(VIRTUES) renderGroup('g-virt-list', null, VIRTUES, 'virtues');
}

function renderGroup(id, title, list, type) {
    const el = document.getElementById(id);
    if(!el) return;
    let html = ''; 
    if (list) {
        list.forEach(item => {
            const val = activeGhoul[type][item] || 0;
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

window.removeGhoulItem = function(type, key) {
    if (type === 'disciplines' && key === 'Potence') return;
    if (activeGhoul[type] && activeGhoul[type][key] !== undefined) {
        delete activeGhoul[type][key];
        renderDynamicLists();
        updateCounters();
        bindDotClicks(document.getElementById('ghoul-modal'));
    }
};

function setupActionListeners(modal) {
    const close = () => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    };
    
    document.getElementById('close-ghoul-modal').onclick = close;
    document.getElementById('cancel-ghoul').onclick = close;
    
    document.getElementById('save-ghoul').onclick = () => {
        activeGhoul.name = document.getElementById('g-name').value;
        activeGhoul.domitor = document.getElementById('g-domitor').value;
        activeGhoul.concept = document.getElementById('g-concept').value;
        activeGhoul.chronicle = document.getElementById('g-chronicle').value;
        activeGhoul.type = document.getElementById('g-type').value;
        activeGhoul.bloodPool = parseInt(document.getElementById('g-blood').value) || 10;

        if (!window.state.retainers) window.state.retainers = [];
        if (activeIndex !== null && activeIndex >= 0) window.state.retainers[activeIndex] = activeGhoul;
        else window.state.retainers.push(activeGhoul);

        if(window.renderRetainersTab) window.renderRetainersTab(document.getElementById('play-content'));
        
        // FIXED: Only trigger auto-save if character exists/is named
        if(window.performSave && window.state.textFields['c-name']) {
            window.performSave(true);
        } else if (window.showNotification) {
            window.showNotification("Retainer added to current session.");
        }
        
        close();
    };

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
                    updateCounters();
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
        row.onclick = null; 
        row.onclick = (e) => {
            if (!e.target.classList.contains('dot')) return;
            const type = row.dataset.type;
            const key = row.dataset.key;
            const newVal = parseInt(e.target.dataset.v);
            
            if (!activeGhoul[type]) activeGhoul[type] = {};
            
            let currentVal = activeGhoul[type][key] || 0;
            if ((type === 'attributes' || type === 'virtues') && activeGhoul[type][key] === undefined) currentVal = 1;

            let finalVal = newVal;
            if (newVal === currentVal) finalVal = newVal - 1;
            
            if (type === 'attributes' && finalVal < 1) finalVal = 1;
            if (type === 'virtues' && finalVal < 1) finalVal = 1;
            
            activeGhoul[type][key] = finalVal;
            row.querySelector('.dot-row').innerHTML = renderDots(finalVal, 5);
            
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

            updateCounters();
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

    let freebieCost = 0;

    ['attr', 'abil'].forEach(cat => {
        Object.entries(localPriorities[cat]).forEach(([group, limit]) => {
            let s = 0;
            if (cat === 'attr') {
                if(group === 'Physical') s = spent.attr.Physical;
                if(group === 'Social') s = spent.attr.Social;
                if(group === 'Mental') s = spent.attr.Mental;
            } else {
                if(group === 'Talents') s = spent.abil.Talents;
                if(group === 'Skills') s = spent.abil.Skills;
                if(group === 'Knowledges') s = spent.abil.Knowledges;
            }
            
            const cap = limit || 0; 
            if (s > cap) {
                const multiplier = (cat === 'attr') ? 5 : 2;
                freebieCost += (s - cap) * multiplier;
            }
        });
    });

    let discDots = 0;
    if(activeGhoul.disciplines) {
        Object.keys(activeGhoul.disciplines).forEach(k => {
            discDots += activeGhoul.disciplines[k];
        });
    }
    
    let freeDiscDots = 1; 
    if (activeGhoul.disciplines['Potence']) freeDiscDots += 1;
    
    if (discDots > freeDiscDots) {
        freebieCost += (discDots - freeDiscDots) * 10;
    }

    let backDots = 0;
    if(activeGhoul.backgrounds) Object.values(activeGhoul.backgrounds).forEach(v => backDots += v);
    if (backDots > 5) freebieCost += (backDots - 5) * 1;

    let virtDots = 0;
    if(VIRTUES && activeGhoul.virtues) VIRTUES.forEach(v => virtDots += Math.max(0, (activeGhoul.virtues[v]||1)-1));
    if (virtDots > 7) freebieCost += (virtDots - 7) * 2;

    const remaining = 21 - freebieCost;
    const fbEl = document.getElementById('final-freebie-disp');
    if(fbEl) {
        fbEl.innerText = remaining;
        fbEl.className = remaining >= 0 ? "text-3xl font-black text-white mt-1" : "text-3xl font-black text-red-500 mt-1";
    }
}
