import { 
    ATTRIBUTES, ABILITIES, VIRTUES, BACKGROUNDS, 
    CLAN_WEAKNESSES, VIT, CLAN_DISCIPLINES,
    ARCHETYPE_RULES
} from "./data.js";

import { DISCIPLINES_DATA } from "./disciplines-data.js";

import { 
    renderDots, setSafeText, showNotification 
} from "./ui-common.js";

import { 
    renderRow, rollCombat, rollFrenzy, rollRotschreck, rollDiscipline, rollInitiative, toggleStat
} from "./ui-mechanics.js";

import { openNpcCreator, openNpcSheet } from "./npc-creator.js";

// --- WINDOW BINDINGS ---
window.openNpcCreator = openNpcCreator;
window.openNpcSheet = openNpcSheet;

// --- PLAY MODE MAIN TOGGLE ---

export function togglePlayMode() {
    console.log("Toggling Play Mode...");

    // 1. Sync Text Fields to State before switching
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

    // 2. Validate Generation
    let gen = parseInt(window.state.textFields['c-gen']);
    if (isNaN(gen) || gen < 3 || gen > 15) {
        console.warn("Invalid Generation detected (" + gen + "), defaulting to 13");
        gen = 13;
        window.state.textFields['c-gen'] = "13";
    }

    // 3. Toggle Mode State
    window.state.isPlayMode = !window.state.isPlayMode;
    document.body.classList.toggle('play-mode', window.state.isPlayMode);
    
    // Handle Cross-Module Toggles
    if (window.state.isPlayMode) {
        if (window.state.freebieMode && window.toggleFreebieMode) window.toggleFreebieMode();
        if (window.state.xpMode && window.toggleXpMode) window.toggleXpMode();
    }
    
    // Update Button Text
    const pBtnText = document.getElementById('play-btn-text');
    if(pBtnText) pBtnText.innerText = window.state.isPlayMode ? "Edit" : "Play";
    
    // Toggle Walkthrough/Phase Info Button Visibility
    const guideBtn = document.getElementById('phase-info-btn');
    if(guideBtn) {
        if(window.state.isPlayMode) guideBtn.classList.add('hidden');
        else guideBtn.classList.remove('hidden');
    }
    
    // Disable Inputs
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (['save-filename', 'char-select', 'roll-diff', 'use-specialty', 'c-path-name', 'c-path-name-create', 'c-bearing-name', 'c-bearing-value', 'custom-weakness-input', 'xp-points-input', 'blood-per-turn-input', 'custom-dice-input', 'spend-willpower', 'c-xp-total', 'frenzy-diff', 'rotschreck-diff', 'play-merit-notes', 'dmg-input-val', 'tray-use-armor',
        // Journal Inputs Exemption
        'log-sess-num', 'log-date', 'log-game-date', 'log-title', 'log-effects', 'log-scene1', 'log-scene2', 'log-scene3', 'log-obj', 'log-clues', 'log-secrets', 'log-downtime'
        ].includes(el.id) || el.classList.contains('merit-flaw-desc') || el.closest('#active-log-form')) {
            el.disabled = false;
            return;
        }
        el.disabled = window.state.isPlayMode;
    });

    const playSheet = document.getElementById('play-mode-sheet');
    const phases = document.querySelectorAll('.step-container');

    if (window.state.isPlayMode) {
        phases.forEach(el => el.classList.add('hidden'));
        phases.forEach(el => el.classList.remove('active')); 

        if (playSheet) {
            playSheet.classList.remove('hidden');
            playSheet.style.display = 'block'; 
        }

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
        
        // Inject Info Buttons
        injectWillpowerInfo();
        injectHumanityInfo();
        injectBloodInfo(); // Added Blood/Hunting Button

        let carried = []; let owned = []; 
        if(window.state.inventory) { 
            window.state.inventory.forEach(i => { 
                const str = `${i.displayName || i.name} ${i.type === 'Armor' ? `(R:${i.stats.rating} P:${i.stats.penalty})` : ''}`; 
                if(i.status === 'carried') carried.push(str); else owned.push(str); 
            }); 
        }
        setSafeText('play-gear-carried', carried.join(', ')); 
        setSafeText('play-gear-owned', owned.join(', '));
        
        if(document.getElementById('play-bio-desc')) document.getElementById('play-bio-desc').innerText = document.getElementById('bio-desc')?.value || "";
        
        renderPlayModeDerangements();
        
        if(document.getElementById('play-languages')) document.getElementById('play-languages').innerText = document.getElementById('bio-languages')?.value || "";
        if(document.getElementById('play-goals-st')) document.getElementById('play-goals-st').innerText = document.getElementById('bio-goals-st')?.value || "";
        if(document.getElementById('play-goals-lt')) document.getElementById('play-goals-lt').innerText = document.getElementById('bio-goals-lt')?.value || "";
        if(document.getElementById('play-history')) document.getElementById('play-history').innerText = document.getElementById('char-history')?.value || "";
        
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
        
        // --- CHECK PLAY MODE TUTORIAL ---
        if (!localStorage.getItem('v20_play_tutorial_complete')) {
            setTimeout(() => {
                if (window.startTutorial) window.startTutorial('play');
            }, 1000);
        }
        
    } else {
        // Exit Play Mode
        if (playSheet) {
            playSheet.classList.add('hidden');
            playSheet.style.display = 'none'; 
        }
        const current = window.state.currentPhase || 1;
        const currentPhaseEl = document.getElementById(`phase-${current}`);
        if (currentPhaseEl) {
            currentPhaseEl.classList.remove('hidden');
            currentPhaseEl.classList.add('active');
        }
        if(window.changeStep) window.changeStep(window.state.furthestPhase || 1);
    }
}
window.togglePlayMode = togglePlayMode;

// --- WILLPOWER REGAIN INFO INJECTION ---
function injectWillpowerInfo() {
    const sections = document.querySelectorAll('#play-mode-sheet .section-title');
    let wpTitleEl = null;
    
    sections.forEach(el => {
        // Robust check: Is this the parent of the willpower dots container?
        if (el.parentNode.querySelector('#willpower-dots-play')) {
            wpTitleEl = el;
        }
    });

    if (wpTitleEl) {
        wpTitleEl.style.display = 'flex';
        wpTitleEl.style.justifyContent = 'center';
        wpTitleEl.style.alignItems = 'center';
        wpTitleEl.style.gap = '8px';
        
        // ADDED ROLL BUTTON
        wpTitleEl.innerHTML = `
            <button onclick="window.toggleStat('Willpower', window.state.status.willpower, 'willpower')" class="hover:text-white text-[#d4af37] transition-colors uppercase font-bold flex items-center gap-2" title="Roll Willpower">
                Willpower <i class="fas fa-dice-d20 text-[10px]"></i>
            </button> 
            <i id="wp-info-btn" class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Regaining Willpower" onclick="window.showWillpowerInfo(event)"></i>
        `;
    }
}

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

// --- HUMANITY INFO INJECTION ---
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
            Humanity / Path
            <i class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Hierarchy of Sins" onclick="window.showHumanityInfo(event)"></i>
        `;
    }
}

export function showHumanityInfo(e) {
    if(e) e.stopPropagation();
    document.getElementById('humanity-info-modal').classList.add('active');
}
window.showHumanityInfo = showHumanityInfo;

// --- BLOOD/FEEDING INJECTION (NEW) ---
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
            Blood Pool
            <button onclick="window.setupHunting()" class="bg-[#8b0000] hover:bg-red-700 text-white text-[9px] font-bold px-2 py-0.5 rounded border border-[#d4af37]/50 flex items-center gap-1 shadow-sm uppercase tracking-wider transition-all" title="Roll Hunting Pool">
                <i class="fas fa-tint"></i> Hunt
            </button>
            <i class="fas fa-info-circle text-[10px] text-gray-500 hover:text-white cursor-pointer transition-colors" title="Feeding Rules" onclick="window.showBloodInfo(event)"></i>
        `;
    }
}

export function showBloodInfo(e) {
    if(e) e.stopPropagation();
    document.getElementById('blood-info-modal').classList.add('active');
}
window.showBloodInfo = showBloodInfo;

export function setupHunting() {
    window.clearPool();
    
    // Default Pool: Perception + Streetwise (Urban)
    // Could alternatively be Perception + Survival (Wild)
    const per = window.state.dots.attr['Perception'] || 1;
    const str = window.state.dots.abil['Streetwise'] || 0;
    
    window.toggleStat('Perception', per, 'attribute');
    if (str > 0) window.toggleStat('Streetwise', str, 'ability');
    
    // Set Difficulty (Variable, usually 4-8, default 6)
    const diffInput = document.getElementById('roll-diff');
    if(diffInput) diffInput.value = 6;
    
    showNotification("Hunting Pool Loaded (Per + Streetwise).");
}
window.setupHunting = setupHunting;


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
        
        // --- Disciplines (NON-ROLLABLE SUMMARY) ---
        const ds = document.createElement('div'); 
        ds.className='sheet-section !mt-0'; 
        ds.innerHTML='<div class="column-title">Disciplines</div>';
        rc.appendChild(ds);
        
        Object.entries(window.state.dots.disc).forEach(([n,v]) => { 
            if(v > 0) {
                // Manually create row WITHOUT generic click handler
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
                    <span class="${valueColor} font-bold text-[10px]">${item.val} pts</span>
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

// --- DEDICATED MOVEMENT RENDERER ---

export function renderMovementSection() {
    if (!window.state.isPlayMode) return;
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let moveSection = document.getElementById('play-movement-section');
    if (!moveSection) {
        moveSection = document.createElement('div');
        moveSection.id = 'play-movement-section';
        moveSection.className = 'sheet-section mt-6';
        
        // Ensure inserted before combat maneuvers if possible
        const combatSection = pm2.querySelector('.sheet-section:last-child');
        if(combatSection && combatSection.parentNode === pm2) pm2.insertBefore(moveSection, combatSection);
        else pm2.appendChild(moveSection);
    }
    
    // Calculate Movement
    const dex = window.state.dots.attr['Dexterity'] || 1;
    const dmgBoxes = (window.state.status.health_states || []).filter(x => x > 0).length;
    
    let w = 7;
    let j = 12 + dex;
    let r = 20 + (3 * dex);
    let note = "Normal Movement";
    let noteColor = "text-gray-500";
    
    // Health Penalties (V20 p.282)
    if (dmgBoxes === 4) { // Wounded
        r = 0; 
        note = "Wounded: Cannot Run"; 
        noteColor = "text-orange-400";
    } else if (dmgBoxes === 5) { // Mauled
        j = 0; r = 0;
        if(w > 3) w = 3;
        note = "Mauled: Max 3 yds/turn";
        noteColor = "text-red-400";
    } else if (dmgBoxes === 6) { // Crippled
        w = 1; j = 0; r = 0;
        note = "Crippled: Crawl 1 yd/turn";
        noteColor = "text-red-600 font-bold";
    } else if (dmgBoxes >= 7) { // Incapacitated
        w = 0; j = 0; r = 0;
        note = "Incapacitated: Immobile";
        noteColor = "text-red-700 font-black";
    }

    // Render with Units
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

// --- NEW FUNCTION: RENDER DETAILED DISCIPLINES (PHASE 2) ---
function renderDetailedDisciplines() {
    const pm2 = document.getElementById('play-mode-2');
    if (!pm2) return;

    let container = document.getElementById('detailed-disciplines-list');
    if (!container) {
        // Create the wrapper section if it doesn't exist
        const section = document.createElement('div');
        section.className = 'sheet-section !mt-0 mb-8';
        section.innerHTML = '<div class="section-title">Disciplines & Powers</div>';
        
        container = document.createElement('div');
        container.id = 'detailed-disciplines-list';
        // CHANGE 1: Grid Layout (2 Columns)
        container.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 mt-4';
        
        section.appendChild(container);
        
        // Insert at the VERY TOP of Phase 2
        pm2.insertBefore(section, pm2.firstChild);
    }

    container.innerHTML = '';
    
    // Safety check for data
    const safeData = typeof DISCIPLINES_DATA !== 'undefined' ? DISCIPLINES_DATA : {};

    // Get learned disciplines
    const learned = Object.entries(window.state.dots.disc).filter(([name, val]) => val > 0);

    if (learned.length === 0) {
        container.innerHTML = '<div class="col-span-1 md:col-span-2 text-gray-500 italic text-xs text-center py-4">No Disciplines learned.</div>';
        return;
    }

    learned.forEach(([name, val]) => {
        // Normalize lookup
        const cleanName = name.trim();
        let data = safeData[cleanName];
        
        // Case-insensitive fallback
        if (!data) {
             const key = Object.keys(safeData).find(k => k.toLowerCase() === cleanName.toLowerCase());
             if(key) data = safeData[key];
        }

        const discBlock = document.createElement('div');
        discBlock.className = 'bg-black/40 border border-[#333] p-3 rounded flex flex-col h-fit';
        
        // Header (Name + Dots)
        discBlock.innerHTML = `
            <div class="flex justify-between items-center border-b border-[#555] pb-2 mb-2">
                <h3 class="text-base text-[#d4af37] font-cinzel font-bold uppercase tracking-widest truncate mr-2">${name}</h3>
                <div class="text-white font-bold text-xs bg-[#8b0000] px-2 py-0.5 rounded flex-shrink-0">${val} Dots</div>
            </div>
        `;

        // Powers List
        if (data) {
            const listContainer = document.createElement('div');
            listContainer.className = "space-y-1";

            for (let i = 1; i <= val; i++) {
                const power = data[i];
                if (power) {
                    const pDiv = document.createElement('div');
                    pDiv.className = 'border border-[#333] bg-[#111] rounded overflow-hidden';
                    
                    // Power Header (Always Visible)
                    const pHeader = document.createElement('div');
                    pHeader.className = "flex justify-between items-center p-2 cursor-pointer hover:bg-[#222] transition-colors";
                    
                    // Roll Button Logic
                    let rollHtml = '';
                    if (power.roll) {
                         const poolStr = JSON.stringify(power.roll.pool).replace(/"/g, "'");
                         // Note: e.stopPropagation() is crucial here so clicking roll doesn't toggle accordion
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

                    // Power Details (Hidden by Default)
                    const pDetails = document.createElement('div');
                    pDetails.className = "hidden p-2 border-t border-[#333] bg-black/50 text-[10px]";
                    pDetails.innerHTML = `
                        <div class="text-gray-300 italic leading-snug mb-2">${power.desc}</div>
                        <div class="text-gray-500 font-mono"><span class="text-[#d4af37] font-bold">System:</span> ${power.system}</div>
                    `;

                    // Toggle Logic
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

// --- NPC TAB RENDERER (Was Retainers) ---

export function renderNpcTab() {
    const container = document.getElementById('play-mode-6');
    if (!container) return;
    
    // Ensure data exists
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
        // Safely handle potentially missing fields
        const name = npc.name || "Unnamed";
        
        let displayType = "Unknown";
        if (npc.template === 'animal') {
            displayType = npc.ghouled ? "Ghouled Animal" : "Animal";
            if (npc.species) displayType += ` (${npc.species})`;
        } else if (npc.template === 'mortal') {
            displayType = "Mortal";
        } else {
            // Default/Ghoul
            displayType = npc.type || "Ghoul";
        }
        
        const concept = npc.concept || "";
        
        // Removed Quick stats for summary per user request
        
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
window.renderNpcTab = renderNpcTab; // Assign to window for call by changeStep
// Backwards compatibility alias if needed by other modules
window.renderRetainersTab = renderNpcTab; 

// --- NPC HELPERS ---
window.editNpc = function(index) {
    if (window.state.retainers && window.state.retainers[index]) {
        // Pass the actual object and the index
        // Default to 'ghoul' template if not specified (backward compatibility)
        const npc = window.state.retainers[index];
        const type = npc.template || 'ghoul';
        if(window.openNpcCreator) window.openNpcCreator(type, npc, index);
    }
};
// Backward compat alias
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
            // Re-render
            renderNpcTab();
            // Trigger auto-save if available
            if(window.performSave) window.performSave(true); 
        }
    }
};
// Backward compat alias
window.deleteRetainer = window.deleteNpc;

// --- RITUALS PLAY VIEW (INTERACTIVE) ---

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
                // Lookup Data
                let rData = null;
                if (window.RITUALS_DATA) {
                    if (window.RITUALS_DATA.Thaumaturgy && window.RITUALS_DATA.Thaumaturgy[lvl] && window.RITUALS_DATA.Thaumaturgy[lvl][name]) {
                        rData = window.RITUALS_DATA.Thaumaturgy[lvl][name];
                    } else if (window.RITUALS_DATA.Necromancy && window.RITUALS_DATA.Necromancy[lvl] && window.RITUALS_DATA.Necromancy[lvl][name]) {
                        rData = window.RITUALS_DATA.Necromancy[lvl][name];
                    }
                }

                if (rData) {
                    // INTERACTIVE RENDER
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
                    // FALLBACK (No data found, maybe custom)
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
