import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    CLAN_WEAKNESSES, VIT,
    ARCHETYPE_RULES
} from "./data.js";

import { DISCIPLINES_DATA } from "./disciplines-data.js";

import { 
    renderDots, setSafeText, showNotification 
} from "./ui-common.js";

import { 
    renderRow, rollCombat, rollFrenzy, rollRotschreck, rollDiscipline, rollInitiative, toggleStat
} from "./ui-mechanics.js";

// FIREBASE IMPORTS (Added auth for ID checks)
import { db, doc, getDoc, collection, getDocs, query, auth } from "./firebase-config.js";
import { combatState } from "./combat-tracker.js";

// --- INFO MODAL HANDLERS ---

export function showWillpowerInfo(e) {
    if(e) e.stopPropagation();
    
    const nature = window.state.textFields['c-nature'] || document.getElementById('c-nature')?.value || "None";
    
    let rule = "Standard rules apply. See V20 Core Rules p. 267.";
    if (ARCHETYPE_RULES && ARCHETYPE_RULES[nature]) {
        rule = ARCHETYPE_RULES[nature];
    }
    
    const modal = document.getElementById('willpower-info-modal');
    if (modal) {
        const ruleContainer = document.getElementById('wp-nature-rule');
        if (ruleContainer) {
            ruleContainer.innerHTML = `
                <div class="text-[10px] font-bold text-blue-300 uppercase mb-1">Nature: ${nature}</div>
                <div class="text-xs text-white italic">"${rule}"</div>
            `;
        }
        modal.classList.add('active');
    }
}
window.showWillpowerInfo = showWillpowerInfo; 

export function showHumanityInfo(e) {
    if(e) e.stopPropagation();
    const modal = document.getElementById('humanity-info-modal');
    if (modal) modal.classList.add('active');
}
window.showHumanityInfo = showHumanityInfo;

export function showBloodInfo(e) {
    if(e) e.stopPropagation();
    const modal = document.getElementById('blood-info-modal');
    if (modal) modal.classList.add('active');
}
window.showBloodInfo = showBloodInfo;

export function setupHunting() {
    window.clearPool();
    
    const per = window.state.dots.attr['Perception'] || 1;
    const str = window.state.dots.abil['Streetwise'] || 0;
    
    window.toggleStat('Perception', per, 'attribute');
    if (str > 0) window.toggleStat('Streetwise', str, 'ability');
    
    const diffInput = document.getElementById('roll-diff');
    if(diffInput) diffInput.value = 6;
    
    showNotification("Hunting Pool Loaded (Per + Streetwise).");
}
window.setupHunting = setupHunting;


// --- INJECTION HELPERS ---

function injectWillpowerInfo() {
    const sections = document.querySelectorAll('#play-mode-sheet .section-title');
    let wpTitleEl = null;
    
    sections.forEach(el => {
        if (el.parentNode.querySelector('#willpower-dots-play')) {
            wpTitleEl = el;
        }
    });

    if (wpTitleEl) {
        wpTitleEl.style.display = 'flex';
        wpTitleEl.style.justifyContent = 'center';
        wpTitleEl.style.alignItems = 'center';
        wpTitleEl.style.gap = '8px';
        
        wpTitleEl.innerHTML = `
            <button onclick="window.toggleStat('Willpower', window.state.status.willpower, 'willpower')" class="hover:text-white text-[#d4af37] transition-colors uppercase font-bold flex items-center gap-2" title="Roll Willpower">
                Willpower <i class="fas fa-dice-d20 text-[10px]"></i>
            </button> 
            <i class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Regaining Willpower" onclick="window.showWillpowerInfo(event)"></i>
        `;
    }
}

function injectHumanityInfo() {
    const sections = document.querySelectorAll('#play-mode-sheet .section-title');
    let humTitleEl = null;
    
    sections.forEach(el => {
        if (el.parentNode.querySelector('#humanity-dots-play') || el.parentNode.querySelector('#c-path-name')) {
            humTitleEl = el;
        }
    });

    if (humTitleEl) {
        humTitleEl.style.display = 'flex';
        humTitleEl.style.justifyContent = 'center';
        humTitleEl.style.alignItems = 'center';
        humTitleEl.style.gap = '8px';
        
        humTitleEl.innerHTML = `
            <button onclick="window.toggleStat('Humanity', window.state.status.humanity, 'humanity')" class="hover:text-white text-[#d4af37] transition-colors uppercase font-bold flex items-center gap-2" title="Roll Humanity">
                Humanity / Path <i class="fas fa-dice-d20 text-[10px]"></i>
            </button>
            <i class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Hierarchy of Sins" onclick="window.showHumanityInfo(event)"></i>
        `;
    }
}

function injectBloodInfo() {
    const sections = document.querySelectorAll('#play-mode-sheet .section-title');
    let bloodTitleEl = null;
    
    sections.forEach(el => {
        if (el.parentNode.querySelector('#blood-boxes-play')) {
            bloodTitleEl = el;
        }
    });

    if (bloodTitleEl) {
        bloodTitleEl.style.display = 'flex';
        bloodTitleEl.style.justifyContent = 'center';
        bloodTitleEl.style.alignItems = 'center';
        bloodTitleEl.style.gap = '8px';
        
        bloodTitleEl.innerHTML = `
            <span>Blood Pool</span>
            <button onclick="window.setupHunting()" class="bg-[#8b0000] hover:bg-red-700 text-white text-[9px] font-bold px-2 py-0.5 rounded border border-[#d4af37]/50 flex items-center gap-1 shadow-sm uppercase tracking-wider transition-all" title="Roll Hunting Pool">
                <i class="fas fa-tint"></i> Hunt
            </button>
            <i class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Feeding Rules" onclick="window.showBloodInfo(event)"></i>
        `;
    }
}

// --- COMBAT INTEGRATION FOR PLAYERS ---
function checkCombatStatus() {
    // Rely on WINDOW.stState to avoid circular dependency
    const stState = window.stState;
    if (stState && stState.activeChronicleId && combatState.isActive) {
        // Show floating combat indicator
        showPlayerCombatFloat();
    }
}

export function togglePlayerCombatView() {
    const float = document.getElementById('player-combat-float');
    if (!float) return;
    
    const isExpanded = float.classList.contains('expanded');
    
    if (isExpanded) {
        float.classList.remove('expanded');
        float.innerHTML = `<i class="fas fa-swords text-2xl"></i>`;
    } else {
        float.classList.add('expanded');
        renderPlayerCombatOverlay(float);
    }
}
window.togglePlayerCombatView = togglePlayerCombatView;

export function updatePlayerCombatView() {
    const float = document.getElementById('player-combat-float');
    if (!float) return;
    
    if (float.classList.contains('expanded')) {
        renderPlayerCombatOverlay(float);
    }
}
window.updatePlayerCombatView = updatePlayerCombatView;

function showPlayerCombatFloat() {
    let float = document.getElementById('player-combat-float');
    if (!float) {
        float = document.createElement('button');
        float.id = 'player-combat-float';
        float.className = 'fixed top-20 right-4 z-50 bg-[#8b0000] text-white w-12 h-12 rounded-full shadow-[0_0_15px_red] border-2 border-[#d4af37] flex items-center justify-center transition-all animate-pulse hover:scale-110';
        float.onclick = togglePlayerCombatView;
        float.innerHTML = `<i class="fas fa-swords text-2xl"></i>`;
        document.body.appendChild(float);
    }
    float.style.display = 'flex';
}

function renderPlayerCombatOverlay(container) {
    const turn = combatState.turn;
    const combatants = combatState.combatants || [];
    
    container.innerHTML = `
        <div class="absolute top-0 right-0 w-64 bg-[#1a0505] border border-red-500 rounded p-4 shadow-xl text-left cursor-default" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-2 border-b border-red-900 pb-1">
                <h3 class="text-red-500 font-bold font-cinzel">Combat - Round ${turn}</h3>
                <button class="text-gray-500 hover:text-white" onclick="window.togglePlayerCombatView()">&times;</button>
            </div>
            <div class="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                ${combatants.length === 0 ? '<div class="text-gray-500 italic text-[10px]">Waiting for combatants...</div>' : ''}
                ${combatants.map(c => `
                    <div class="flex justify-between text-xs items-center p-1 rounded ${c.active ? 'bg-[#d4af37]/20 border border-[#d4af37]/50' : 'opacity-80'} ${c.status === 'done' ? 'opacity-30 line-through' : ''}">
                        <div class="flex items-center gap-2 overflow-hidden">
                            ${c.active ? '<i class="fas fa-caret-right text-[#d4af37]"></i>' : ''}
                            <span class="text-[#d4af37] font-bold w-6 text-center">${c.init}</span>
                            <span class="text-gray-300 truncate w-32 ${c.active ? 'text-white font-bold' : ''}">${c.name}</span>
                        </div>
                        <span class="text-[8px] text-gray-500 uppercase">${c.type}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}


// --- PLAY MODE LOGIC ---

export function applyPlayModeUI() {
    const isPlay = window.state.isPlayMode;
    document.body.classList.toggle('play-mode', isPlay);
    
    const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = isPlay ? "Edit" : "Play";
    
    const guideBtn = document.getElementById('phase-info-btn');
    if(guideBtn) {
        if(isPlay) guideBtn.classList.add('hidden');
        else guideBtn.classList.remove('hidden');
    }

    const diceBtn = document.getElementById('dice-toggle-btn');
    if (diceBtn) {
        if (isPlay) diceBtn.classList.remove('hidden');
        else diceBtn.classList.add('hidden');
    }
    
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value', 'custom-weakness-input', 'xp-points-input', 'blood-per-turn-input', 'custom-dice-input', 'spend-willpower', 'c-xp-total', 'frenzy-diff', 'rotschreck-diff', 'play-merit-notes', 'dmg-input-val', 'tray-use-armor',
        'log-sess-num', 'log-date', 'log-game-date', 'log-title', 'log-effects', 'log-scene1', 'log-scene2', 'log-scene3', 'log-scene-outcome', 'log-xp-gain',
        'log-obj', 'log-clues', 'log-secrets', 'log-downtime',
        'chronicle-chat-input'
        ].includes(el.id) || el.classList.contains('merit-flaw-desc') || el.closest('#active-log-form')) {
            el.disabled = false;
            return;
        }
        el.disabled = isPlay;
    });

    const playSheet = document.getElementById('play-mode-sheet');
    const editPhases = document.querySelectorAll('div[id^="phase-"]');

    if (isPlay) {
        editPhases.forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });

        if (playSheet) {
            playSheet.classList.remove('hidden');
            playSheet.style.display = 'block'; 
        }
        
        document.querySelectorAll('div[id^="play-mode-"]').forEach(el => {
            el.classList.remove('hidden');
        });

        renderPlayModeHeader();
        renderPlayModeAttributes();
        renderPlayModeAbilities();
        renderPlayModeAdvantages();
        renderPlayModeSocial();
        renderPlayModeBloodBonds();
        renderPlayModeMeritsFlaws();
        renderPlayModeOtherTraits();
        renderPlayModeCombat();
        
        renderMovementSection();
        renderDetailedDisciplines();
        updateRitualsPlayView();
        
        // AUTO-RENDER CHRONICLE & NPC TABS
        ensureChronicleTabContainer();
        renderChronicleTab();
        renderNpcTab();
        
        checkCombatStatus();
        
        setTimeout(() => {
            injectWillpowerInfo();
            injectHumanityInfo();
            injectBloodInfo(); 
        }, 50);

        let carried = []; let owned = []; 
        if(window.state.inventory) { 
            window.state.inventory.forEach(i => { 
                const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; 
                if(i.status === 'carried') carried.push(str); else owned.push(str); 
            }); 
        }
        setSafeText('play-gear-carried', carried.join(', ')); 
        setSafeText('play-gear-owned', owned.join(', '));
        
        const bioDescEl = document.getElementById('play-bio-desc');
        if(bioDescEl) {
            bioDescEl.innerText = document.getElementById('bio-desc')?.value || "";
        }
        
        const bioHistoryEl = document.getElementById('play-history');
        if(bioHistoryEl) {
            bioHistoryEl.innerText = document.getElementById('char-history')?.value || "";
            
            if (window.state.characterImage) {
                const histContainer = bioHistoryEl.closest('.sheet-section');
                
                if (histContainer && histContainer.parentNode) {
                    let portraitContainer = document.getElementById('play-mode-portrait-container');
                    
                    if (!portraitContainer) {
                        portraitContainer = document.createElement('div');
                        portraitContainer.id = 'play-mode-portrait-container';
                        portraitContainer.className = 'sheet-section mt-4';
                        portraitContainer.innerHTML = `<div class="section-title">Portrait</div>`;
                        
                        const innerBox = document.createElement('div');
                        innerBox.className = "w-full flex justify-center mt-2 bg-[#111] p-4 border border-[#333]";
                        innerBox.innerHTML = `
                            <div class="w-80 h-80 max-w-full border-2 border-[#af0000] rounded-lg shadow-lg overflow-hidden bg-black bg-cover bg-center bg-no-repeat transition-transform hover:scale-105 duration-300"
                                 style="background-image: url('${window.state.characterImage}'); box-shadow: 0 0 15px rgba(175, 0, 0, 0.3);">
                            </div>
                        `;
                        portraitContainer.appendChild(innerBox);
                        histContainer.parentNode.insertBefore(portraitContainer, histContainer.nextSibling);
                    } else {
                        const imgDiv = portraitContainer.querySelector('.bg-cover');
                        if(imgDiv) imgDiv.style.backgroundImage = `url('${window.state.characterImage}')`;
                        portraitContainer.style.display = 'block';
                    }
                }
            } else {
                const portraitContainer = document.getElementById('play-mode-portrait-container');
                if (portraitContainer) portraitContainer.style.display = 'none';
            }
        }
        
        renderPlayModeDerangements();
        
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages')?.value || "";
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st')?.value || "";
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt')?.value || "";
        
        const feedSrc = document.getElementById('inv-feeding-grounds'); 
        if (feedSrc) setSafeText('play-feeding-grounds', feedSrc.value);
        
        if(document.getElementById('armor-rating-play')) { 
            let totalA = 0; let totalP = 0; let names = []; 
            if(window.state.inventory) { 
                window.state.inventory.filter(i => i.type === 'Armor' && i.status === 'carried').forEach(a => { 
                    totalA += parseInt(a.stats?.rating)||0; totalP += parseInt(a.stats?.penalty)||0; names.push(a.displayName || a.name); 
                }); 
            } 
            setSafeText('armor-rating-play', totalA); 
            setSafeText('armor-penalty-play', totalP); 
            setSafeText('armor-desc-play', names.join(', ')); 
        }
        
        if (document.getElementById('play-vehicles')) { 
            const pv = document.getElementById('play-vehicles'); 
            pv.innerHTML = ''; 
            if (window.state.inventory) { 
                window.state.inventory.filter(i => i.type === 'Vehicle').forEach(v => { 
                    let display = v.displayName || v.name; 
                    pv.innerHTML += `<div class="mb-2 border-b border-[#333] pb-1"><div class="font-bold text-white uppercase text-[10px]">${display}</div><div class="text-[9px] text-gray-400">Safe:${v.stats.safe} | Max:${v.stats.max} | Man:${v.stats.man}</div></div>`; 
                }); 
            } 
        }
        
        if (document.getElementById('play-havens-list')) { 
            const ph = document.getElementById('play-havens-list'); 
            ph.innerHTML = ''; 
            if (window.state.havens) {
                window.state.havens.forEach(h => { 
                    ph.innerHTML += `<div class="border-l-2 border-gold pl-4 mb-4"><div class="flex justify-between"><div><div class="font-bold text-white uppercase text-[10px]">${h.name}</div><div class="text-[9px] text-gold italic">${h.loc}</div></div></div><div class="text-xs text-gray-400 mt-1">${h.desc}</div></div>`; 
                }); 
            }
        }
        
        renderPlayModeWeakness();
        renderPlayModeBeast();
        renderPlayModeXp();
        
        const bptInput = document.getElementById('blood-per-turn-input');
        if (bptInput) {
            const savedBPT = window.state.status.blood_per_turn || 1;
            bptInput.value = savedBPT;
            bptInput.onchange = (e) => {
                window.state.status.blood_per_turn = parseInt(e.target.value) || 1;
            };
        }

        if(window.changeStep) window.changeStep(1); 
        
        if (!localStorage.getItem('v20_play_tutorial_complete')) {
            setTimeout(() => {
                if (window.startTutorial) window.startTutorial('play');
            }, 1000);
        }
        
    } else {
        if (playSheet) {
            playSheet.classList.add('hidden');
            playSheet.style.display = 'none'; 
        }
        
        editPhases.forEach(el => el.classList.remove('hidden'));

        const current = window.state.currentPhase || 1;
        const currentPhaseEl = document.getElementById(`phase-${current}`);
        if (currentPhaseEl) {
            currentPhaseEl.classList.remove('hidden');
            currentPhaseEl.classList.add('active');
        }
        if(window.changeStep) window.changeStep(window.state.furthestPhase || 1);
    }
}
window.applyPlayModeUI = applyPlayModeUI;

// 2. Toggle Mode
export function togglePlayMode() {
    const safeVal = (id) => {
        const el = document.getElementById(id);
        if (el) return el.value;
        return window.state.textFields[id] || "";
    };

    const fieldsToSync = [
        'c-name', 'c-nature', 'c-demeanor', 'c-clan', 'c-gen', 
        'c-player', 'c-concept', 'c-sire', 'c-chronicle', 
        'c-path-name', 'c-path-rating', 'c-xp-total', 'c-freebie-total'
    ];

    fieldsToSync.forEach(id => {
        window.state.textFields[id] = safeVal(id);
    });

    const wEl = document.getElementById('c-clan-weakness');
    if (wEl) window.state.textFields['c-clan-weakness'] = wEl.value;

    let gen = parseInt(window.state.textFields['c-gen']);
    if (isNaN(gen) || gen < 3 || gen > 15) {
        console.warn("Invalid Generation detected (" + gen + "), defaulting to 13");
        gen = 13;
        window.state.textFields['c-gen'] = "13";
    }

    window.state.isPlayMode = !window.state.isPlayMode;
    
    if (window.state.isPlayMode) {
        if (window.state.freebieMode && window.toggleFreebieMode) window.toggleFreebieMode();
        if (window.state.xpMode && window.toggleXpMode) window.toggleXpMode();
    }
    
    applyPlayModeUI();
}
window.togglePlayMode = togglePlayMode;


// --- RENDER HELPERS ---

function renderPlayModeHeader() {
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
}

function renderPlayModeAttributes() {
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
}

function renderPlayModeAbilities() {
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
}

function renderPlayModeAdvantages() {
    const rc = document.getElementById('play-row-adv'); 
    if (rc) {
        rc.innerHTML = '';
        
        const ds = document.createElement('div'); 
        ds.className='sheet-section !mt-0'; 
        ds.innerHTML='<div class="column-title">Disciplines</div>';
        rc.appendChild(ds);
        
        Object.entries(window.state.dots.disc).forEach(([n,v]) => { 
            if(v > 0) {
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between w-full py-1';
                row.innerHTML = `
                    <span class="trait-label font-bold uppercase text-[11px] whitespace-nowrap text-gray-400 cursor-default">${n}</span>
                    <div class="dot-row flex-shrink-0 pointer-events-none">${renderDots(v, 5)}</div>
                `;
                ds.appendChild(row);
            } 
        }); 
        
        const bs = document.createElement('div'); bs.className='sheet-section !mt-0'; bs.innerHTML='<div class="column-title">Backgrounds</div>';
        rc.appendChild(bs);
        Object.entries(window.state.dots.back).forEach(([n,v]) => { if(v>0) renderRow(bs,n,'back',0); }); 
        
        const vs = document.createElement('div'); vs.className='sheet-section !mt-0'; vs.innerHTML='<div class="column-title">Virtues</div>';
        rc.appendChild(vs);
        VIRTUES.forEach(v => renderRow(vs, v, 'virt', 1)); 
    }
}

function renderPlayModeSocial() {
    const pg = document.getElementById('play-social-grid'); 
    if(pg) {
        pg.innerHTML = ''; 
        BACKGROUNDS.forEach(s => { 
            const dots = window.state.dots.back[s] || 0; 
            const safeId = 'desc-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'); 
            const el = document.getElementById(safeId); 
            const txt = el ? el.value : ""; 
            if(dots || txt) {
                pg.innerHTML += `<div class="border-l-2 border-[#333] pl-4 mb-4"><div class="flex justify-between items-center"><label class="label-text text-gold">${s}</label><div class="text-[8px] font-bold text-white">${renderDots(dots,5)}</div></div><div class="text-xs text-gray-200 mt-1">${txt || "No description."}</div></div>`;
            }
        });
    }
}

function renderPlayModeBloodBonds() {
    const pb = document.getElementById('play-blood-bonds'); 
    if(pb) {
        pb.innerHTML = ''; 
        const clan = window.state.textFields['c-clan'] || "None";
        const isTremere = clan === "Tremere";

        if (isTremere) {
            pb.innerHTML += `<div class="text-[#a855f7] text-[9px] font-bold mb-2 uppercase border-b border-[#a855f7]/30 pb-1 italic"><i class="fas fa-flask mr-1"></i> Weakness: 1st Drink = 2 Steps</div>`;
        }

        if(window.state.bloodBonds) {
            window.state.bloodBonds.forEach(b => { 
                let label = "";
                if (b.type === 'Bond') {
                    let r = parseInt(b.rating) || 0;
                    if (isTremere) {
                        if (r === 1) label = `<span class="text-[#a855f7]">Step 2</span> (1 Drink)`;
                        else if (r >= 2) label = `<span class="text-[#a855f7] font-black">Full Bond</span>`; 
                        else label = `Step ${r}`;
                    } else {
                        if (r >= 3) label = 'Full Bond';
                        else label = `Drink ${r}`;
                    }
                } else {
                    label = `Vinculum ${b.rating}`;
                }
                pb.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 text-xs"><span>${b.name}</span><span class="text-gold font-bold">${label}</span></div>`; 
            });
        }
    }
}

function renderPlayModeMeritsFlaws() {
    const mf = document.getElementById('merit-flaw-rows-play'); 
    if(mf) {
        mf.innerHTML = ''; 
        
        const renderMFRow = (item, type, index) => {
            const row = document.createElement('div');
            row.className = "flex flex-col border-b border-[#222] py-2 mb-1";
            const valueColor = type === 'Merit' ? 'text-red-400' : 'text-green-400'; 
            
            row.innerHTML = `
                <div class="flex justify-between text-xs mb-1">
                    <span class="font-bold text-white">${item.name}</span>
                    <span class="text-[10px] ${valueColor} font-bold">${item.val} pts</span>
                </div>
                <textarea class="merit-flaw-desc bg-transparent border-none text-[10px] text-gray-400 w-full italic focus:text-white focus:not-italic resize-none overflow-hidden" 
                        placeholder="Description / Note..." rows="1" style="min-height: 20px;">${item.desc || ''}</textarea>
            `;
            
            const input = row.querySelector('textarea');
            const resize = () => { input.style.height = 'auto'; input.style.height = (input.scrollHeight) + 'px'; };
            requestAnimationFrame(resize);
            input.oninput = resize;
            input.onblur = (e) => {
                const arr = type === 'Merit' ? window.state.merits : window.state.flaws;
                if(arr[index]) arr[index].desc = e.target.value;
            };
            mf.appendChild(row);
        };

        if(window.state.merits) window.state.merits.forEach((m, i) => renderMFRow(m, 'Merit', i));
        if(window.state.flaws) window.state.flaws.forEach((f, i) => renderMFRow(f, 'Flaw', i));
        
        if (!window.state.merits?.length && !window.state.flaws?.length) {
            mf.innerHTML = '<div class="text-[10px] text-gray-600 italic text-center">No Merits or Flaws selected.</div>';
        }
    }
}

function renderPlayModeOtherTraits() {
    const ot = document.getElementById('other-traits-rows-play'); 
    if(ot) {
        ot.innerHTML = ''; 
        Object.entries(window.state.dots.other).forEach(([n,v]) => { if(v>0) renderRow(ot, n, 'other', 0); });
        
        const plv = document.getElementById('play-vitals-list'); 
        if(plv) {
            plv.innerHTML = ''; 
            VIT.forEach(v => { 
                const val = document.getElementById('bio-' + v)?.value; 
                if(val) plv.innerHTML += `<div class="flex justify-between border-b border-[#222] py-1 font-bold"><span class="text-gray-400">${v.replace('-',' ')}:</span> <span>${val}</span></div>`; 
            });
        }
    }
}

function renderPlayModeCombat() {
    const cp = document.getElementById('combat-rows-play'); 
    if(cp) {
        cp.innerHTML = ''; 
        
        // Initiative
        const dexVal = window.state.dots.attr['Dexterity'] || 1;
        const witsVal = window.state.dots.attr['Wits'] || 1;
        const initRating = dexVal + witsVal;
        
        const initRow = document.createElement('tr');
        initRow.className = 'bg-[#222] border-b border-[#444]';
        initRow.innerHTML = `
            <td colspan="6" class="p-2 text-center">
                <button class="bg-[#d97706] hover:bg-[#b45309] text-white text-[10px] font-bold py-1 px-6 rounded uppercase tracking-wider flex items-center justify-center mx-auto gap-2 transition-all" onclick="window.rollInitiative(${initRating})">
                    <i class="fas fa-bolt text-yellow-200"></i> Roll Initiative (Rating: ${initRating})
                </button>
            </td>
        `;
        cp.appendChild(initRow);

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
            {n:'Auto Fire', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
            {n:'Multi Shot', diff:6, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
            {n:'Strafing', diff:8, dmg:'Special', attr:'Dexterity', abil:'Firearms'},
            {n:'3-Rnd Burst', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'},
            {n:'Two Weapons', diff:7, dmg:'Weapon', attr:'Dexterity', abil:'Firearms'}
        ];
        
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

        // Inventory Weapons
        const firearms = ['Pistol', 'Revolver', 'Rifle', 'SMG', 'Shotgun', 'Crossbow'];
        if(window.state.inventory) { 
            window.state.inventory.filter(i => i.type === 'Weapon' && i.status === 'carried').forEach(w => { 
                let display = w.displayName || w.name;
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
}

function renderPlayModeDerangements() {
    if(document.getElementById('play-derangements')) { 
        const pd = document.getElementById('play-derangements'); 
        const clan = window.state.textFields['c-clan'] || "None";
        const isMalk = clan === "Malkavian";
        
        let contentHtml = window.state.derangements.length > 0 
            ? window.state.derangements.map((d, i) => {
                if (isMalk && i === 0) return `<div class="text-[#a855f7] font-bold"><i class="fas fa-lock text-[8px] mr-1"></i>${d} (Incurable)</div>`;
                return `<div>• ${d}</div>`;
            }).join('') 
            : '<span class="text-gray-500 italic">None</span>';
            
        if (isMalk) {
            contentHtml += `
                <div class="mt-2 pt-2 border-t border-[#333] flex items-center justify-between">
                    <span class="text-[9px] text-[#a855f7] uppercase font-bold">Weakness</span>
                    <button onclick="window.suppressDerangement()" class="bg-[#a855f7] hover:bg-[#c084fc] text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1">
                        <i class="fas fa-power-off"></i> Suppress (1 WP)
                    </button>
                </div>
            `;
        }
        pd.innerHTML = contentHtml; 
    }
}

function renderPlayModeWeakness() {
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
}

function renderPlayModeBeast() {
    let weaknessCont = document.getElementById('weakness-play-container');
    if (weaknessCont && weaknessCont.parentNode) {
        let beastCont = document.getElementById('beast-play-container');
        if (!beastCont) {
            beastCont = document.createElement('div');
            beastCont.id = 'beast-play-container';
            beastCont.className = 'sheet-section';
            weaknessCont.parentNode.insertBefore(beastCont, weaknessCont);
        }
        
        beastCont.innerHTML = `
            <div class="section-title">The Beast</div>
            <div class="bg-[#111] p-3 border border-[#333] mt-2 space-y-4">
                <!-- Frenzy -->
                <div>
                    <div class="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                        <span>Frenzy Check</span>
                        <input type="number" id="frenzy-diff" placeholder="Diff (Auto)" class="w-16 bg-black border border-[#444] text-center text-white p-1 text-[10px]">
                    </div>
                    <button onclick="window.rollFrenzy()" class="w-full bg-[#8b0000] hover:bg-red-700 text-white font-bold py-1 text-[10px] uppercase transition-colors flex items-center justify-center">
                        <i class="fas fa-bolt mr-1"></i> Check Frenzy
                    </button>
                </div>
                <!-- Rötschreck -->
                <div class="border-t border-[#333] pt-2">
                    <div class="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                        <span>Rötschreck (Fire/Sun)</span>
                        <input type="number" id="rotschreck-diff" placeholder="Diff (6)" value="6" class="w-16 bg-black border border-[#444] text-center text-white p-1 text-[10px]">
                    </div>
                    <button onclick="window.rollRotschreck()" class="w-full bg-[#d97706] hover:bg-orange-600 text-white font-bold py-1 text-[10px] uppercase transition-colors flex items-center justify-center">
                        <i class="fas fa-fire mr-1"></i> Check Fear
                    </button>
                </div>
            </div>
        `;
    }
}

function renderPlayModeXp() {
    const xpCont = document.getElementById('experience-play-container');
    if (xpCont) {
        xpCont.innerHTML = '';
        const xpVal = document.getElementById('c-xp-total')?.value || 0;
        const log = window.state.xpLog || [];
        const spent = log.reduce((a,b)=>a+b.cost,0);
        
        xpCont.innerHTML = `
            <div class="section-title mt-6">Experience</div>
            <div class="bg-[#111] p-2 border border-[#333] mt-2">
                <div class="flex justify-between text-[10px] mb-1"><span>Earned:</span> <span class="text-purple-400 font-bold">${xpVal}</span></div>
                <div class="flex justify-between text-[10px] mb-1"><span>Spent:</span> <span class="text-gray-400 font-bold">${spent}</span></div>
                <div class="flex justify-between text-[10px] border-t border-[#333] pt-1 mt-1"><span>Remain:</span> <span class="text-white font-bold">${xpVal - spent}</span></div>
            </div>
        `;
    }
}

function renderMovementSection() {
    if (!window.state.isPlayMode) return;
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let moveSection = document.getElementById('play-movement-section');
    if (!moveSection) {
        moveSection = document.createElement('div');
        moveSection.id = 'play-movement-section';
        moveSection.className = 'sheet-section mt-6';
        
        const combatSection = pm2.querySelector('.sheet-section:last-child');
        if(combatSection && combatSection.parentNode === pm2) pm2.insertBefore(moveSection, combatSection);
        else pm2.appendChild(moveSection);
    }
    
    const dex = window.state.dots.attr['Dexterity'] || 1;
    const dmgBoxes = (window.state.status.health_states || []).filter(x => x > 0).length;
    
    let w = 7;
    let j = 12 + dex;
    let r = 20 + (3 * dex);
    let note = "Normal Movement";
    let noteColor = "text-gray-500";
    
    if (dmgBoxes === 4) { 
        r = 0; 
        note = "Wounded: Cannot Run"; 
        noteColor = "text-orange-400";
    } else if (dmgBoxes === 5) {
        j = 0; r = 0;
        if(w > 3) w = 3;
        note = "Mauled: Max 3 yds/turn";
        noteColor = "text-red-400";
    } else if (dmgBoxes === 6) {
        w = 1; j = 0; r = 0;
        note = "Crippled: Crawl 1 yd/turn";
        noteColor = "text-red-600 font-bold";
    } else if (dmgBoxes >= 7) {
        w = 0; j = 0; r = 0;
        note = "Incapacitated: Immobile";
        noteColor = "text-red-700 font-black";
    }

    moveSection.innerHTML = `
        <div class="section-title">Movement (Yards/Turn)</div>
        <div class="grid grid-cols-3 gap-4 text-center mt-2">
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Walk</div>
                <div class="text-xl font-bold text-white">${w > 0 ? w : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Jog</div>
                <div class="text-xl font-bold text-gold">${j > 0 ? j : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
            <div>
                <div class="text-[10px] uppercase font-bold text-gray-400">Run</div>
                <div class="text-xl font-bold text-red-500">${r > 0 ? r : '-'} <span class="text-[9px] text-gray-500 font-normal">yds</span></div>
            </div>
        </div>
        <div class="text-[10px] text-center mt-2 border-t border-[#333] pt-1 ${noteColor} font-bold uppercase">${note}</div>
    `;
}
window.renderMovementSection = renderMovementSection;

function renderDetailedDisciplines() {
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let container = document.getElementById('detailed-disciplines-list');
    if (!container) {
        const section = document.createElement('div');
        section.className = 'sheet-section !mt-0 mb-8';
        section.innerHTML = '<div class="section-title">Disciplines & Powers</div>';
        
        container = document.createElement('div');
        container.id = 'detailed-disciplines-list';
        container.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 mt-4';
        
        section.appendChild(container);
        pm2.insertBefore(section, pm2.firstChild);
    }

    container.innerHTML = '';
    const safeData = typeof DISCIPLINES_DATA !== 'undefined' ? DISCIPLINES_DATA : {};
    const learned = Object.entries(window.state.dots.disc).filter(([name, val]) => val > 0);

    if (learned.length === 0) {
        container.innerHTML = '<div class="col-span-1 md:col-span-2 text-gray-500 italic text-xs text-center py-4">No Disciplines learned.</div>';
        return;
    }

    learned.forEach(([name, val]) => {
        const cleanName = name.trim();
        let data = safeData[cleanName];
        if (!data) {
             const key = Object.keys(safeData).find(k => k.toLowerCase() === cleanName.toLowerCase());
             if(key) data = safeData[key];
        }

        const discBlock = document.createElement('div');
        discBlock.className = 'bg-black/40 border border-[#333] p-3 rounded flex flex-col h-fit';
        
        discBlock.innerHTML = `
            <div class="flex justify-between items-center border-b border-[#555] pb-2 mb-2">
                <h3 class="text-base text-[#d4af37] font-cinzel font-bold uppercase tracking-widest truncate mr-2">${name}</h3>
                <div class="text-white font-bold text-xs bg-[#8b0000] px-2 py-0.5 rounded flex-shrink-0">${val} Dots</div>
            </div>
        `;

        if (data) {
            const listContainer = document.createElement('div');
            listContainer.className = "space-y-1";

            for (let i = 1; i <= val; i++) {
                const power = data[i];
                if (power) {
                    const pDiv = document.createElement('div');
                    pDiv.className = 'border border-[#333] bg-[#111] rounded overflow-hidden';
                    
                    const pHeader = document.createElement('div');
                    pHeader.className = "flex justify-between items-center p-2 cursor-pointer hover:bg-[#222] transition-colors";
                    
                    let rollHtml = '';
                    if (power.roll) {
                         const poolStr = JSON.stringify(power.roll.pool).replace(/"/g, "'");
                         rollHtml = `<button onclick="event.stopPropagation(); window.rollDiscipline('${power.name}', ${poolStr}, ${power.roll.defaultDiff})" class="bg-[#333] border border-gray-600 text-gray-300 hover:text-white hover:border-[#d4af37] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-all shadow-sm hover:shadow-gold flex-shrink-0 ml-2"><i class="fas fa-dice-d20"></i></button>`;
                    }

                    pHeader.innerHTML = `
                        <div class="flex items-center gap-2 overflow-hidden">
                            <i class="fas fa-chevron-right text-[9px] text-gray-500 transition-transform duration-200 chevron"></i>
                            <div class="font-bold text-white text-xs truncate">
                                <span class="text-[#8b0000] text-[10px] mr-1">●${i}</span> ${power.name}
                            </div>
                        </div>
                        ${rollHtml}
                    `;

                    const pDetails = document.createElement('div');
                    pDetails.className = "hidden p-2 border-t border-[#333] bg-black/50 text-[10px]";
                    pDetails.innerHTML = `
                        <div class="text-gray-300 italic leading-snug mb-2">${power.desc}</div>
                        <div class="text-gray-500 font-mono"><span class="text-[#d4af37] font-bold">System:</span> ${power.system}</div>
                    `;

                    pHeader.onclick = () => {
                        const isHidden = pDetails.classList.contains('hidden');
                        if (isHidden) {
                            pDetails.classList.remove('hidden');
                            pHeader.querySelector('.chevron').classList.add('rotate-90');
                            pHeader.querySelector('.chevron').classList.replace('text-gray-500', 'text-gold');
                        } else {
                            pDetails.classList.add('hidden');
                            pHeader.querySelector('.chevron').classList.remove('rotate-90');
                            pHeader.querySelector('.chevron').classList.replace('text-gold', 'text-gray-500');
                        }
                    };

                    pDiv.appendChild(pHeader);
                    pDiv.appendChild(pDetails);
                    listContainer.appendChild(pDiv);
                }
            }
            discBlock.appendChild(listContainer);
        } else {
            discBlock.innerHTML += `<div class="text-xs text-gray-500 italic">Detailed data not available.</div>`;
        }
        
        container.appendChild(discBlock);
    });
}

export function renderNpcTab() {
    const container = document.getElementById('play-mode-6');
    if (!container) return;
    
    const retainers = window.state.retainers || [];

    let html = `
        <div class="max-w-3xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-serif text-red-500">NPCs & Retainers</h2>
                <button onclick="window.openNpcCreator('ghoul')" class="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                    <span>+</span> Add NPC
                </button>
            </div>
    `;

    if (retainers.length === 0) {
        html += `
            <div class="text-center p-8 border border-dashed border-gray-700 rounded bg-gray-900/50">
                <p class="text-gray-400 mb-4">You have no recorded NPCs or Retainers.</p>
                <button onclick="window.openNpcCreator('ghoul')" class="text-red-400 hover:text-red-300 underline">Add one now</button>
            </div>
        </div>`;
        container.innerHTML = html;
        return;
    }

    html += `<div class="grid grid-cols-1 gap-4">`;

    retainers.forEach((npc, index) => {
        const name = npc.name || "Unnamed";
        
        let displayType = "Unknown";
        if (npc.template === 'animal') {
            displayType = npc.ghouled ? "Ghouled Animal" : "Animal";
            if (npc.species) displayType += ` (${npc.species})`;
        } else if (npc.template === 'mortal') {
            displayType = "Mortal";
        } else {
            displayType = npc.type || "Ghoul";
        }
        
        const concept = npc.concept || "";
        
        html += `
            <div class="bg-gray-900 border border-gray-700 rounded p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-red-900/50 transition-colors">
                <div class="flex-grow">
                    <h3 class="text-xl font-bold text-gray-200">${name} <span class="text-xs text-gray-500 font-normal ml-2 uppercase tracking-wider border border-gray-700 px-1 rounded">${displayType}</span></h3>
                    <div class="text-sm text-gray-400 mt-1 flex flex-wrap gap-4">
                        <span>Concept: <span class="text-gray-300">${concept || 'N/A'}</span></span>
                    </div>
                </div>
                
                <div class="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button onclick="window.viewNpc(${index})" 
                        class="flex-1 md:flex-none bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 border border-blue-800 px-3 py-1 rounded text-sm font-bold">
                        <i class="fas fa-eye mr-1"></i> View Sheet
                    </button>
                    <button onclick="window.editNpc(${index})" 
                        class="flex-1 md:flex-none bg-yellow-900/40 hover:bg-yellow-900/60 text-yellow-200 border border-yellow-700 px-3 py-1 rounded text-sm font-bold">
                        <i class="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button onclick="window.deleteNpc(${index})" 
                        class="flex-1 md:flex-none bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-900/30 px-3 py-1 rounded text-sm" title="Delete">
                        &times;
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}
window.renderNpcTab = renderNpcTab; 
window.renderRetainersTab = renderNpcTab; 

window.editNpc = function(index) {
    if (window.state.retainers && window.state.retainers[index]) {
        const npc = window.state.retainers[index];
        const type = npc.template || 'ghoul';
        if(window.openNpcCreator) window.openNpcCreator(type, npc, index);
    }
};
window.editRetainer = window.editNpc;

window.viewNpc = function(index) {
    if (window.state.retainers && window.state.retainers[index]) {
        const npc = window.state.retainers[index];
        if(window.openNpcSheet) window.openNpcSheet(npc, index);
        else console.error("openNpcSheet not found on window object.");
    }
}

window.deleteNpc = function(index) {
    if(confirm("Permanently release this NPC? This cannot be undone.")) {
        if(window.state.retainers) {
            window.state.retainers.splice(index, 1);
            renderNpcTab();
            if(window.performSave) window.performSave(true); 
        }
    }
};
window.deleteRetainer = window.deleteNpc;

export function updateRitualsPlayView() {
    const playCont = document.getElementById('rituals-list-play');
    if (!playCont) return;
    
    if (!window.state.rituals || window.state.rituals.length === 0) {
        playCont.innerHTML = '<span class="text-gray-500 italic">No Rituals learned.</span>';
        return;
    }

    const byLevel = {};
    window.state.rituals.forEach(r => {
        if (!byLevel[r.level]) byLevel[r.level] = [];
        byLevel[r.level].push(r.name);
    });

    let html = '<div class="flex flex-col gap-4 mt-2">';
    
    Object.keys(byLevel).sort((a,b) => a-b).forEach(lvl => {
        if (lvl > 0) {
            html += `
            <div class="bg-black/30 border border-[#333] rounded p-2">
                <div class="text-[#d4af37] font-bold text-[10px] uppercase border-b border-[#333] pb-1 mb-1">
                    Level ${lvl} Rituals
                </div>
                <div class="space-y-1">`;
                
            byLevel[lvl].forEach(name => {
                let rData = null;
                if (window.RITUALS_DATA) {
                    if (window.RITUALS_DATA.Thaumaturgy && window.RITUALS_DATA.Thaumaturgy[lvl] && window.RITUALS_DATA.Thaumaturgy[lvl][name]) {
                        rData = window.RITUALS_DATA.Thaumaturgy[lvl][name];
                    } else if (window.RITUALS_DATA.Necromancy && window.RITUALS_DATA.Necromancy[lvl] && window.RITUALS_DATA.Necromancy[lvl][name]) {
                        rData = window.RITUALS_DATA.Necromancy[lvl][name];
                    }
                }

                if (rData) {
                    const diff = Math.min(9, 3 + parseInt(lvl));
                    const uid = `rit-${name.replace(/[^a-zA-Z0-9]/g, '')}`;

                    html += `
                    <div class="border border-[#333] bg-[#111] rounded overflow-hidden mb-1">
                        <div class="flex justify-between items-center p-1.5 cursor-pointer hover:bg-[#222] transition-colors" onclick="document.getElementById('${uid}').classList.toggle('hidden');">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <i class="fas fa-chevron-right text-[8px] text-gray-500"></i>
                                <div class="font-bold text-gray-300 text-[10px] truncate">${name}</div>
                            </div>
                            <button onclick="event.stopPropagation(); window.rollDiscipline('${name.replace(/'/g, "\\'")}', ['Intelligence', 'Occult'], ${diff})" class="bg-[#333] border border-gray-600 text-gray-400 hover:text-white hover:border-[#d4af37] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-all" title="Roll Int+Occult (Diff ${diff})">
                                <i class="fas fa-dice-d20"></i>
                            </button>
                        </div>
                        <div id="${uid}" class="hidden p-2 border-t border-[#333] bg-black/50 text-[10px]">
                            <div class="text-gray-400 italic leading-snug mb-1">${rData.desc || "No description."}</div>
                            <div class="text-gray-500 font-mono"><span class="text-[#d4af37] font-bold">System:</span> ${rData.system || "See rulebook."}</div>
                        </div>
                    </div>`;

                } else {
                    html += `<div class="text-xs text-gray-400 ml-2 flex items-start py-1"><span class="text-gold mr-1">•</span> ${name}</div>`;
                }
            });
            
            html += `</div></div>`;
        }
    });
    html += '</div>';
    
    playCont.innerHTML = html;
    playCont.className = "";
}
window.updateRitualsPlayView = updateRitualsPlayView;

// --- AUTO-CREATION HELPER ---
function ensureChronicleTabContainer() {
    let container = document.getElementById('play-mode-chronicle');
    
    if (!container) {
        const parent = document.getElementById('play-mode-sheet');
        if (parent) {
            container = document.createElement('div');
            container.id = 'play-mode-chronicle';
            parent.appendChild(container);
        }
    }
    
    if (container) {
        container.classList.remove('h-full', 'min-h-[75vh]', 'overflow-y-auto'); 
        container.classList.add('w-full', 'overflow-hidden');
        container.style.height = 'calc(100vh - 140px)'; 
    }
}

// --- NEW FUNCTION: RENDER CHRONICLE TAB (WITH SUB-TABS) ---
export async function renderChronicleTab() {
    ensureChronicleTabContainer();
    
    let container = document.getElementById('play-mode-chronicle');
    if (!container) return;

    const chronicleId = localStorage.getItem('v20_last_chronicle_id') || (window.stState && window.stState.activeChronicleId);
    
    if (!chronicleId) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-500">
                <i class="fas fa-book-dead text-4xl mb-4 opacity-50"></i>
                <p>Not connected to a Chronicle.</p>
                <p class="text-xs mt-2">Join a game via the "Chronicles" menu to access chat & lore.</p>
            </div>`;
        return;
    }

    if (!window.state.chronicleSubTab) window.state.chronicleSubTab = 'info';

    container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gold"><i class="fas fa-circle-notch fa-spin text-2xl mb-2"></i><span class="text-xs uppercase tracking-widest">Connecting to Chronicle...</span></div>`;

    try {
        const docRef = doc(db, 'chronicles', chronicleId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            container.innerHTML = `<div class="text-center text-red-500 mt-10">Chronicle Not Found.</div>`;
            return;
        }

        const data = snap.data();
        const currentTab = window.state.chronicleSubTab;
        const activeClass = "border-b-2 border-[#d4af37] text-[#d4af37] font-bold";
        const inactiveClass = "text-gray-500 hover:text-white transition-colors";

        container.innerHTML = `
            <div class="flex flex-col h-full relative">
                <div class="flex gap-6 border-b border-[#333] pb-2 mb-4 px-2 shrink-0">
                    <button id="tab-chron-info" class="text-xs uppercase tracking-wider px-2 pb-1 ${currentTab==='info'?activeClass:inactiveClass}">
                        <i class="fas fa-info-circle mr-2"></i>Info & Lore
                    </button>
                    <button id="tab-chron-chat" class="text-xs uppercase tracking-wider px-2 pb-1 ${currentTab==='chat'?activeClass:inactiveClass}">
                        <i class="fas fa-comments mr-2"></i>Chat / Log
                    </button>
                </div>

                <div id="chronicle-content-area" class="flex-1 overflow-hidden relative h-full">
                    <!-- Views injected here -->
                </div>
            </div>
        `;

        document.getElementById('tab-chron-info').onclick = () => {
            window.state.chronicleSubTab = 'info';
            renderChronicleTab(); 
        };
        document.getElementById('tab-chron-chat').onclick = () => {
            window.state.chronicleSubTab = 'chat';
            renderChronicleTab();
        };

        const contentArea = document.getElementById('chronicle-content-area');

        if (currentTab === 'info') {
            renderChronicleInfoView(contentArea, data);
        } else {
            renderChronicleChatView(contentArea, chronicleId);
        }

    } catch (e) {
        console.error("Chronicle Render Error:", e);
        container.innerHTML = `<div class="text-center text-red-500 mt-10">Error loading chronicle data. Check connection.</div>`;
    }
}
window.renderChronicleTab = renderChronicleTab;

// --- SUB-VIEW: INFO ---
function renderChronicleInfoView(container, data) {
    container.innerHTML = `
        <div class="overflow-y-auto h-full custom-scrollbar pr-2 space-y-6 pb-20">
            <div class="border-b border-[#af0000] pb-4 text-center">
                <h2 class="text-3xl font-cinzel text-[#af0000] font-bold tracking-widest uppercase text-shadow-md">${data.name || "Untitled"}</h2>
                <div class="text-xs text-gold font-serif italic uppercase tracking-widest mt-1">${data.timePeriod || "Modern Nights"}</div>
            </div>

            <div class="bg-[#111] p-6 border border-[#333] relative group hover:border-[#af0000] transition-colors shadow-lg">
                <div class="absolute -top-2 left-4 bg-black px-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-[#af0000] transition-colors">Synopsis</div>
                <div class="text-sm text-gray-300 font-serif leading-relaxed whitespace-pre-wrap">${data.synopsis || "No synopsis provided."}</div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-[#1a0505] p-4 border border-red-900/30 relative shadow-lg h-fit">
                    <div class="absolute -top-2 left-4 bg-black px-2 text-[10px] text-red-500 font-bold uppercase tracking-wider">House Rules</div>
                    <div class="text-xs text-gray-400 font-serif leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">${data.houseRules || "Standard V20 Rules apply."}</div>
                </div>

                <div class="bg-[#0a0a0a] p-4 border border-[#d4af37]/30 relative shadow-lg h-fit">
                    <div class="absolute -top-2 left-4 bg-black px-2 text-[10px] text-[#d4af37] font-bold uppercase tracking-wider">Lore & Setting</div>
                    <div class="text-xs text-gray-400 font-serif leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">${data.lore || "No specific setting details available."}</div>
                </div>
            </div>
        </div>
    `;
}

// --- SUB-VIEW: CHAT (UPDATED FOR MULTI-WHISPER) ---
async function renderChronicleChatView(container, chronicleId) {
    // 1. Fetch Players for Dropdown (Async)
    let players = [];
    let stUID = null;
    
    try {
        const q = query(collection(db, 'chronicles', chronicleId, 'players'));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const data = doc.data();
            if (!doc.id.startsWith('journal_')) {
                players.push({ id: doc.id, ...data });
            }
        });
        
        const cSnap = await getDoc(doc(db, 'chronicles', chronicleId));
        if (cSnap.exists()) {
            stUID = cSnap.data().storyteller_uid;
        }
    } catch(e) { console.error("Player fetch error", e); }

    // Build options HTML for checkbox list
    let optionsHtml = '';
    
    if (stUID && (!auth.currentUser || stUID !== auth.currentUser.uid)) {
        optionsHtml += `
        <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer">
            <input type="checkbox" class="pl-recipient-checkbox accent-[#d4af37]" value="${stUID}">
            <span class="text-xs text-[#d4af37] font-bold">Storyteller (Private)</span>
        </label>`;
    }
    
    players.forEach(p => {
        // Exclude self
        if (auth.currentUser && p.id === auth.currentUser.uid) return;
        // Also exclude if this player IS the ST (already added above)
        if (p.id === stUID) return;
        
        optionsHtml += `
        <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer">
            <input type="checkbox" class="pl-recipient-checkbox accent-[#d4af37]" value="${p.id}">
            <span class="text-xs text-gray-300">${p.character_name} (${p.player_name || 'Player'})</span>
        </label>`;
    });

    // COMPACT LAYOUT FOR PLAYER CHAT TOO
    container.innerHTML = `
        <div class="flex flex-col h-full bg-[#0a0a0a] border border-[#333] shadow-lg relative">
            <div class="bg-[#111] p-3 border-b border-[#333] flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2">
                    <i class="fas fa-comments text-[#d4af37]"></i>
                    <h3 class="text-[#d4af37] font-cinzel font-bold text-sm uppercase tracking-widest">Chronicle Chat</h3>
                </div>
                <div class="text-[9px] text-gray-500 font-mono">ID: <span class="text-white">${chronicleId}</span></div>
            </div>
            
            <div class="flex-1 overflow-y-auto min-h-0 space-y-3 p-4 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] custom-scrollbar" id="chronicle-chat-history">
                <div class="text-center text-gray-500 italic text-xs mt-10">Connecting...</div>
            </div>
            
            <div class="mt-auto border-t border-[#333] p-3 bg-[#111] space-y-2 shrink-0 relative">
                <!-- Row 1: Recipient Selector -->
                <div class="relative">
                    <button id="pl-chat-recipient-btn" class="w-full md:w-auto bg-[#050505] border border-[#333] text-gray-300 text-xs px-3 py-1.5 text-left flex justify-between items-center gap-4 hover:border-[#d4af37] transition-colors rounded" onclick="document.getElementById('pl-chat-recipients-dropdown').classList.toggle('hidden')">
                        <span id="pl-chat-recipient-label">Everyone (Public)</span>
                        <i class="fas fa-chevron-down text-[10px]"></i>
                    </button>
                    <div id="pl-chat-recipients-dropdown" class="hidden absolute bottom-full left-0 w-64 bg-[#1a1a1a] border border-[#333] shadow-xl p-2 max-h-48 overflow-y-auto custom-scrollbar z-50 rounded">
                        <label class="flex items-center gap-2 p-1 hover:bg-[#222] cursor-pointer border-b border-[#333] mb-1 pb-1">
                            <input type="checkbox" id="pl-chat-all-checkbox" class="accent-[#d4af37]" checked>
                            <span class="text-xs text-gold font-bold">Broadcast to Everyone</span>
                        </label>
                        <div id="pl-chat-player-list" class="space-y-1">
                            ${optionsHtml}
                        </div>
                    </div>
                </div>
                
                <!-- Row 2: Input -->
                <div class="flex gap-2">
                    <input type="text" id="chronicle-chat-input" class="flex-1 bg-[#050505] border border-[#333] text-white px-3 py-2 text-sm outline-none focus:border-[#d4af37] rounded" placeholder="Send a message...">
                    <button id="chronicle-chat-send" class="bg-[#d4af37] text-black font-bold uppercase px-4 py-2 hover:bg-[#fcd34d] transition-colors text-xs rounded hover:scale-105">Send</button>
                </div>
            </div>
        </div>
    `;

    // Bind Logic
    const sendBtn = document.getElementById('chronicle-chat-send');
    const input = document.getElementById('chronicle-chat-input');
    const allCheck = document.getElementById('pl-chat-all-checkbox');
    const label = document.getElementById('pl-chat-recipient-label');
    const dropdown = document.getElementById('pl-chat-recipients-dropdown');
    
    // Auto-update label and checkboxes
    const updateSelection = () => {
        const checks = document.querySelectorAll('.pl-recipient-checkbox');
        if (allCheck.checked) {
            checks.forEach(c => { c.checked = false; c.disabled = true; });
            label.innerText = "Everyone (Public)";
            label.className = "text-gray-300 text-xs";
        } else {
            checks.forEach(c => c.disabled = false);
            const selected = Array.from(checks).filter(c => c.checked);
            if (selected.length === 0) {
                label.innerText = "Select Recipients..."; 
                label.className = "text-red-500 font-bold text-xs";
            } else {
                label.innerText = `Whisper to ${selected.length} Person(s)`;
                label.className = "text-purple-400 font-bold text-xs";
            }
        }
    };

    allCheck.onchange = updateSelection;
    document.querySelectorAll('.pl-recipient-checkbox').forEach(c => c.onchange = updateSelection);

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        const btn = document.getElementById('pl-chat-recipient-btn');
        const menu = document.getElementById('pl-chat-recipients-dropdown');
        if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
    
    const sendHandler = () => {
        const txt = input.value.trim();
        if (txt && window.sendChronicleMessage) {
            const isAll = allCheck.checked;
            const selected = Array.from(document.querySelectorAll('.pl-recipient-checkbox:checked')).map(c => c.value);
            
            if (!isAll && selected.length === 0) {
                showNotification("Select at least one recipient.", "error");
                return;
            }

            const options = {};
            if (!isAll) {
                options.recipients = selected;
                options.isWhisper = true;
            }
            
            window.sendChronicleMessage('chat', txt, null, options);
            input.value = '';
            dropdown.classList.add('hidden');
        }
    };
    
    if(sendBtn) sendBtn.onclick = sendHandler;
    if(input) input.onkeydown = (e) => { if(e.key === 'Enter') sendHandler(); };

    if (window.startChatListener) {
        window.startChatListener(chronicleId);
    } else {
        console.warn("startChatListener not found on window object.");
    }
}
