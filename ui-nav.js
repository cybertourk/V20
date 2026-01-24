import { 
    STEPS_CONFIG, CLAN_DISCIPLINES
} from "./data.js";

import { checkStepComplete } from "./v20-rules.js";

import { 
    showNotification 
} from "./ui-common.js";

import { 
    updatePools 
} from "./ui-renderer.js";

import { renderJournalTab } from "./ui-journal.js";
import { renderPrintSheet } from "./ui-print.js";
import { renderNpcTab } from "./ui-play.js"; 
import { renderRitualsEdit } from "./ui-advantages.js";

// --- NAVIGATION & STEPS ---

export function updateWalkthrough() {
    if (!window.state) return;
    
    const nav = document.getElementById('sheet-nav');
    if (nav && !window.state.isPlayMode) {
         const current = window.state.currentPhase;
         const furthest = window.state.furthestPhase || 1;
         
         if (checkStepComplete(current, window.state)) {
             if (current === furthest && current < 8) {
                 window.state.furthestPhase = current + 1;
                 changeStep(current);
             }
         }
         
         const guideMsg = document.getElementById('guide-message');
         const guideIcon = document.getElementById('guide-icon');
         if (guideMsg && guideIcon) {
             const isComplete = checkStepComplete(current, window.state);
             if (isComplete) {
                 guideMsg.innerText = "Step Complete! Proceed...";
                 guideMsg.classList.add('text-green-400');
                 guideIcon.classList.add('ready');
             } else {
                 guideMsg.classList.remove('text-green-400');
                 guideIcon.classList.remove('ready');
                 if (current === 1) guideMsg.innerText = "Enter Name & Clan...";
                 else if (current === 2) guideMsg.innerText = "Select Attributes...";
                 else guideMsg.innerText = "Complete Requirements...";
             }
         }
    }
    if (renderPrintSheet) renderPrintSheet();
    
    // Update Walkthrough Modal content if open
    if (document.getElementById('walkthrough-modal') && !document.getElementById('walkthrough-modal').classList.contains('hidden')) {
        renderWalkthroughModalContent();
    }
}
window.updateWalkthrough = updateWalkthrough;

export function nextStep() {
    const current = window.state.currentPhase;
    const furthest = window.state.furthestPhase || 1;
    if (current < furthest) changeStep(furthest);
    else if (checkStepComplete(current, window.state)) { if (current < 8) changeStep(current + 1); else showNotification("Character Ready!"); } 
    else showNotification("Complete current step first!");
}
window.nextStep = nextStep;

export function changeStep(s) {
    if (!window.state.furthestPhase || s > window.state.furthestPhase) { if (s > (window.state.furthestPhase || 0)) window.state.furthestPhase = s; }
    document.querySelectorAll('.step-container').forEach(c => c.classList.remove('active'));
    
    const prefix = window.state.isPlayMode ? 'play-mode-' : 'phase-';
    
    // --- SPECIAL JOURNAL INJECTION FOR PLAY MODE ---
    if (window.state.isPlayMode && s === 5) {
        let pm5 = document.getElementById('play-mode-5');
        if (!pm5) {
            pm5 = document.createElement('div');
            pm5.id = 'play-mode-5';
            pm5.className = 'step-container p-4 hidden'; 
            document.getElementById('play-mode-sheet').appendChild(pm5);
        }
        renderJournalTab();
    }

    // --- SPECIAL NPC INJECTION FOR PLAY MODE ---
    if (window.state.isPlayMode && s === 6) {
        let pm6 = document.getElementById('play-mode-6');
        if (!pm6) {
            pm6 = document.createElement('div');
            pm6.id = 'play-mode-6';
            pm6.className = 'step-container p-4 hidden';
            document.getElementById('play-mode-sheet').appendChild(pm6);
        }
        renderNpcTab();
    }
    
    // --- SPECIAL: RITUALS INJECTION FOR PHASE 6 (EDIT MODE) ---
    if (!window.state.isPlayMode && s === 6) {
        renderRitualsEdit();
    }

    const target = document.getElementById(prefix + s);
    if (target) { target.classList.add('active'); window.state.currentPhase = s; }
    
    // Update Nav
    const nav = document.getElementById('sheet-nav');
    if (nav) {
        nav.innerHTML = '';
        if (window.state.isPlayMode) {
             const steps = ["Sheet", "Traits", "Social", "Biography", "Journal", "NPCs"];
             steps.forEach((text, i) => {
                 const it = document.createElement('div'); it.className = `nav-item ${window.state.currentPhase === (i+1) ? 'active' : ''}`;
                 it.innerHTML = `<i class="fas fa-scroll"></i><span style="display:block; font-size:9px; margin-top:2px;">${text}</span>`;
                 it.onclick = () => { if(window.changeStep) changeStep(i+1); };
                 nav.appendChild(it);
             });
        } else {
            const furthest = window.state.furthestPhase || 1;
            STEPS_CONFIG.forEach(step => {
                const it = document.createElement('div'); let statusClass = '';
                if (step.id === s) statusClass = 'active'; else if (step.id < s) statusClass = 'completed'; else if (step.id <= furthest) statusClass = 'unlocked'; else statusClass = 'locked';
                it.className = `nav-item ${statusClass}`;
                it.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full"><i class="fas ${step.icon}"></i><span style="display:block !important; font-size:7px; text-transform:uppercase; margin-top:2px; opacity:1;">${step.label}</span></div>`;
                it.onclick = () => { if (step.id <= furthest) changeStep(step.id); };
                nav.appendChild(it);
            });
        }
    }
    if (updatePools) updatePools();
    updateWalkthrough();
}
window.changeStep = changeStep;

// --- XP MODE LOGIC ---

export function toggleXpMode() {
    window.state.xpMode = !window.state.xpMode;
    document.body.classList.toggle('xp-mode', window.state.xpMode);
    
    const btn = document.getElementById('toggle-xp-btn');
    if(btn) {
        btn.classList.toggle('bg-purple-900/40', window.state.xpMode);
        btn.classList.toggle('border-purple-500', window.state.xpMode);
        btn.classList.toggle('text-purple-200', window.state.xpMode);
        const txt = document.getElementById('xp-btn-text');
        if(txt) txt.innerText = window.state.xpMode ? "Exit Experience" : "Experience";
    }

    if (window.state.xpMode && window.state.freebieMode) toggleFreebieMode();

    const sb = document.getElementById('xp-sidebar');
    if(sb) {
        if(window.state.xpMode) {
            sb.classList.remove('hidden');
            setTimeout(() => sb.classList.add('open'), 10);
            renderXpSidebar();
        } else {
            sb.classList.remove('open');
            setTimeout(() => sb.classList.add('hidden'), 300);
        }
    }
    
    if(window.fullRefresh) window.fullRefresh();
}
window.toggleXpMode = toggleXpMode;

export function renderXpSidebar() {
    if (!window.state.xpMode) return;
    
    const log = window.state.xpLog || [];
    let buckets = {
        newAbil: 0, newDisc: 0, newPath: 0,
        attr: 0, abil: 0,
        clanDisc: 0, otherDisc: 0, caitiffDisc: 0,
        secPath: 0, virt: 0, humanity: 0, willpower: 0
    };

    const clan = window.state.textFields['c-clan'] || document.getElementById('c-clan')?.value || "None";
    const isCaitiff = clan === "Caitiff";
    const clanDiscs = CLAN_DISCIPLINES[clan] || [];

    const primThaum = window.state.primaryThaumPath;
    const primNecro = window.state.primaryNecroPath;

    log.forEach(entry => {
        const isNew = entry.old === 0;
        const name = entry.trait || "";
        const type = entry.type;
        const cost = entry.cost;

        if (type === 'abil') {
            if (isNew) buckets.newAbil += cost; else buckets.abil += cost;
        } 
        else if (type === 'attr') {
            buckets.attr += cost;
        }
        else if (type === 'disc') {
            const isPrimary = (name === primThaum || name === primNecro);
            const isPathName = name.toLowerCase().includes('path');
            
            if (isPathName && !isPrimary) {
                if (isNew) buckets.newPath += cost; else buckets.secPath += cost; 
            } else {
                if (isNew) buckets.newDisc += cost;
                else {
                    let checkName = name;
                    if (name === primThaum) checkName = 'Thaumaturgy';
                    if (name === primNecro) checkName = 'Necromancy';

                    if (isCaitiff) buckets.caitiffDisc += cost;
                    else if (clanDiscs.includes(checkName)) buckets.clanDisc += cost;
                    else buckets.otherDisc += cost;
                }
            }
        }
        else if (type === 'virt') buckets.virt += cost;
        else if (type === 'humanity' || (type === 'status' && name === 'Humanity')) buckets.humanity += cost;
        else if (type === 'willpower' || (type === 'status' && name === 'Willpower')) buckets.willpower += cost;
        else if (type === 'path') buckets.secPath += cost;
    });

    const sb = document.getElementById('xp-sidebar');
    if (!sb) return;

    const toggleBtn = document.getElementById('xp-sb-toggle-btn');
    sb.innerHTML = '';
    if (toggleBtn) sb.appendChild(toggleBtn);

    const title = document.createElement('h3');
    title.className = "heading text-purple-400 text-sm border-b border-purple-500 pb-2 mb-4 text-center";
    title.innerText = "Experience Ledger";
    sb.appendChild(title);

    const listDiv = document.createElement('div');
    listDiv.className = "space-y-2 text-xs";

    const addRow = (label, val, highlight = false) => {
        const row = document.createElement('div');
        row.className = "cost-row";
        const valClass = highlight ? "text-purple-300 font-bold" : "text-gray-400 font-bold";
        row.innerHTML = `<span class="text-gray-400">${label}</span><span class="cost-val ${valClass} bg-black/95 z-10 shrink-0">${val}</span>`;
        listDiv.appendChild(row);
    };

    addRow("New Ability (3)", buckets.newAbil);
    addRow("New Discipline (10)", buckets.newDisc);
    addRow("New Path (7)", buckets.newPath);
    addRow("Attribute (Cur x4)", buckets.attr);
    addRow("Ability (Cur x2)", buckets.abil);
    
    if (isCaitiff) {
        addRow("Discipline (Cur x6)*", buckets.caitiffDisc, true);
    } else {
        addRow("Clan Disc (Cur x5)*", buckets.clanDisc);
        addRow("Other Disc (Cur x7)*", buckets.otherDisc);
    }
    
    addRow("Sec. Path (Cur x4)", buckets.secPath);
    addRow("Virtue (Cur x2)**", buckets.virt);
    addRow("Humanity/Path (Cur x2)", buckets.humanity);
    addRow("Willpower (Cur x1)", buckets.willpower);

    const totalSpent = Object.values(buckets).reduce((a,b) => a+b, 0);
    const totalEarned = parseInt(document.getElementById('c-xp-total')?.value) || 0;
    
    const divTotal = document.createElement('div');
    divTotal.className = "mt-4 pt-2 border-t border-[#444] flex justify-between font-bold text-sm";
    divTotal.innerHTML = `<span>Total Spent:</span><span class="text-purple-400">${totalSpent}</span>`;
    listDiv.appendChild(divTotal);

    const divRemain = document.createElement('div');
    divRemain.className = "flex justify-between font-bold text-sm";
    divRemain.innerHTML = `<span>Remaining:</span><span class="text-white">${totalEarned - totalSpent}</span>`;
    listDiv.appendChild(divRemain);

    sb.appendChild(listDiv);

    const logContainer = document.createElement('div');
    logContainer.className = "mt-4";
    logContainer.innerHTML = `<h4 class="text-[9px] uppercase text-gray-500 font-bold mb-1 tracking-wider">Session Log</h4>`;
    const logInner = document.createElement('div');
    logInner.id = "xp-log-recent";
    logInner.className = "text-[9px] text-gray-400 h-24 overflow-y-auto border border-[#333] p-1 font-mono bg-white/5";
    
    if(log.length > 0) {
        logInner.innerHTML = log.slice().reverse().map(l => {
            const d = new Date(l.date).toLocaleDateString();
            return `<div>[${d}] ${l.trait} -> ${l.new} (${l.cost}xp)</div>`;
        }).join('');
    }
    logContainer.appendChild(logInner);
    sb.appendChild(logContainer);

    const footer = document.createElement('div');
    footer.className = "mt-4 pt-2 border-t border-[#444] text-[8px] text-gray-500 italic leading-tight";
    let footerText = `<div>** Virtues do not raise Traits.</div>`;
    if (isCaitiff) footerText += `<div class="mt-1 text-purple-400">* Caitiff cost is x6 (Curse/Blessing).</div>`;
    else footerText += `<div class="mt-1">* In-Clan/Out-of-Clan multiplier.</div>`;
    footer.innerHTML = footerText;
    sb.appendChild(footer);
}
window.renderXpSidebar = renderXpSidebar;

export function toggleXpSidebarLedger() {
    document.getElementById('xp-sidebar').classList.toggle('open');
}
window.toggleXpSidebarLedger = toggleXpSidebarLedger;

// --- FREEBIE MODE LOGIC ---

export function toggleFreebieMode() {
     window.state.freebieMode = !window.state.freebieMode;
     
     if (window.state.freebieMode && window.state.xpMode) toggleXpMode();
     
     document.body.classList.toggle('freebie-mode', window.state.freebieMode);
     const fbBtn = document.getElementById('toggle-freebie-btn');
     const fbBtnText = document.getElementById('freebie-btn-text');
     if (fbBtnText) fbBtnText.innerText = window.state.freebieMode ? "Exit Freebies" : "Freebies";
     if (fbBtn) { fbBtn.classList.toggle('bg-blue-900/40', window.state.freebieMode); fbBtn.classList.toggle('border-blue-500', window.state.freebieMode); fbBtn.classList.toggle('text-blue-200', window.state.freebieMode); }
     const mMsg = document.getElementById('merit-locked-msg'); const fMsg = document.getElementById('flaw-locked-msg');
     if(mMsg) mMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     if(fMsg) fMsg.style.display = window.state.freebieMode ? 'none' : 'block';
     
     if(window.fullRefresh) window.fullRefresh();
}
window.toggleFreebieMode = toggleFreebieMode;

export function toggleSidebarLedger() { document.getElementById('freebie-sidebar').classList.toggle('open'); }
window.toggleSidebarLedger = toggleSidebarLedger;


// --- WALKTHROUGH / GUIDE SYSTEM ---

const STEP_FOUR_TEXT = `
    <p>Advantages make the vampire a contender in the hierarchy of the night.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Disciplines (3 Dots)</h4>
    <p>Each character begins with <strong>3 dots</strong> of Disciplines. These must be from your Clan Disciplines (unless Caitiff). You may spend all three on one, or spread them out.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Backgrounds (5 Dots)</h4>
    <p>A starting character has <strong>5 dots</strong> worth of Backgrounds to distribute at your discretion.</p>
    <p class="mt-2 text-sm italic">Optional: At Storyteller discretion, Sabbat vampires may take 4 dots in Disciplines instead of Backgrounds.</p>
    <h4 class="text-gold mt-2 font-bold uppercase">Virtues (7 Dots)</h4>
    <p>Virtues determine how well the character resists the Beast. Every character starts with 1 dot in Conscience and Self-Control (or Conviction/Instinct for Sabbat). You have <strong>7 additional dots</strong>.</p>
`;

const GUIDE_TEXT = {
    1: { 
        title: "Step One: Character Concept",
        body: `
            <p>Concept is the birthing chamber for who a character will become. It only needs to be a general idea — brute; slick mobster; manic Malkavian kidnapper.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Concept</h4>
            <p>Refers to who the character was before becoming a vampire.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Clan</h4>
            <p>A character’s Clan is her vampire “family.” Vampires are always of the same Clan as their sires.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Nature & Demeanor</h4>
            <ul class="list-disc pl-4 mt-1"><li><strong>Demeanor:</strong> The mask worn for the world.</li><li><strong>Nature:</strong> The character's true self.</li></ul>
        `
    },
    2: { 
        title: "Step Two: Select Attributes",
        body: `
            <p>Attributes are the natural abilities. Prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1"><li><strong>Primary:</strong> 7 dots</li><li><strong>Secondary:</strong> 5 dots</li><li><strong>Tertiary:</strong> 3 dots</li></ul>
            <p class="mt-2 text-sm italic">Note: All characters start with one dot in each Attribute automatically.</p>
        `
    },
    3: { 
        title: "Step Three: Select Abilities",
        body: `
            <p>Prioritize your categories:</p>
            <ul class="list-disc pl-4 mt-1"><li><strong>Primary:</strong> 13 dots</li><li><strong>Secondary:</strong> 9 dots</li><li><strong>Tertiary:</strong> 5 dots</li></ul>
            <p class="mt-2 text-sm italic">Note: No Ability may be purchased above 3 dots during this stage.</p>
        `
    },
    4: { title: "Step Four: Advantages", body: STEP_FOUR_TEXT },
    
    5: { 
        title: "Step Five: Supernatural & Traits", 
        body: `
            <p>Flesh out the supernatural quirks and bonds of your character.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Merits & Flaws</h4>
            <p>Use the <strong>Freebie Mode</strong> toggle to purchase Merits or add Flaws (which give extra points).</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Rituals & Bonds</h4>
            <p>If you have Thaumaturgy or Necromancy, add your rituals here. Record Blood Bonds or Vinculum ratings if applicable.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Derangements</h4>
            <p>Add specific mental afflictions here. Malkavians start with one incurable derangement.</p>
        `
    },
    
    6: { 
        title: "Step Six: Gear & Assets", 
        body: `
            <p>Manage your physical assets, combat capabilities, and safehouses.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Inventory & Combat</h4>
            <p>Add Weapons, Armor, and Vehicles. Toggling items to <strong>"Carried"</strong> will automatically add their attacks to your Play Sheet and apply Armor ratings to soak rolls.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Havens</h4>
            <p>Describe your safehouses, their locations, and security measures.</p>
        `
    },
    
    7: { 
        title: "Step Seven: Biography", 
        body: `
            <p>Bring the character to life with details.</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Background Descriptions</h4>
            <p>Provide specific details for your chosen Backgrounds (e.g., who is your Mentor? What is your Domain?).</p>
            <h4 class="text-gold mt-2 font-bold uppercase">Vitals & Goals</h4>
            <p>Record physical description, apparent age, and set your character's Short and Long Term goals.</p>
        `
    },
    
    8: { 
        title: "Step Eight: Final Touches",
        body: `
            <h4 class="text-gold mt-2 font-bold uppercase">Calculated Traits</h4>
            <p>Review your derived stats. These are calculated automatically but can be adjusted.</p>
            <ul class="list-disc pl-4 mt-1">
                <li><strong>Humanity:</strong> Sum of Conscience + Self-Control.</li>
                <li><strong>Willpower:</strong> Equal to Courage rating.</li>
                <li><strong>Blood Pool:</strong> Determined by Generation.</li>
            </ul>
            <h4 class="text-gold mt-2 font-bold uppercase">Freebie Points</h4>
            <p>Use <strong>Freebie Mode</strong> (15 pts) at any time to finalize dots.</p>
        `
    }
};

function createWalkthroughButton() {
    if (document.getElementById('walkthrough-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'walkthrough-btn';
    btn.className = "fixed bottom-5 left-5 z-[100] w-10 h-10 rounded-full bg-[#333] border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-all flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.8)]";
    btn.innerHTML = '<i class="fas fa-question text-lg"></i>';
    btn.title = "Character Creation Walkthrough";
    btn.onclick = window.toggleWalkthrough;
    document.body.appendChild(btn);
}

function createWalkthroughModal() {
    if (document.getElementById('walkthrough-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'walkthrough-modal';
    modal.className = "fixed inset-0 bg-black/80 z-[101] hidden flex items-center justify-center p-4 backdrop-blur-sm";
    modal.innerHTML = `
        <div class="bg-[#1a1a1a] border-2 border-[#d4af37] rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <div class="p-3 border-b border-[#333] flex justify-between items-center bg-[#111]">
                <h3 id="wt-title" class="text-gold font-serif font-bold text-lg uppercase tracking-wider">Walkthrough</h3>
                <button onclick="window.toggleWalkthrough()" class="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <div id="wt-body" class="p-5 overflow-y-auto text-gray-300 text-sm leading-relaxed flex-1 font-serif"></div>
            <div class="p-3 border-t border-[#333] bg-[#111] flex justify-between items-center">
                <span class="text-[10px] text-gray-500 italic">V20 Core Rules</span>
                <button onclick="window.toggleWalkthrough()" class="px-4 py-1 bg-[#8b0000] hover:bg-red-700 text-white text-xs font-bold rounded uppercase">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderWalkthroughModalContent() {
    const titleEl = document.getElementById('wt-title');
    const bodyEl = document.getElementById('wt-body');
    if (!titleEl || !bodyEl) return;
    const phase = window.state.currentPhase || 1;
    const data = GUIDE_TEXT[phase] || GUIDE_TEXT[1];
    titleEl.innerText = data.title;
    bodyEl.innerHTML = data.body;
}

window.toggleWalkthrough = function() {
    createWalkthroughModal(); 
    const modal = document.getElementById('walkthrough-modal');
    if (modal.classList.contains('hidden')) {
        renderWalkthroughModalContent();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
};

// ==========================================================================
// TUTORIAL SYSTEM (Interactive Introduction)
// ==========================================================================

const TUTORIAL_STEPS = [
    {
        title: "Welcome to the Night",
        content: `
            <p>Welcome to the V20 Character Creator. This tool is designed to help you create and manage Vampire: The Masquerade (20th Anniversary) characters quickly and accurately.</p>
            <p class="mt-2">This short tutorial will guide you through the interface.</p>
        `
    },
    {
        title: "Character Creation Phases",
        content: `
            <p>The sheet is divided into <strong>8 Phases</strong>, mirroring the creation steps in the core rulebook.</p>
            <p class="mt-2">Use the navigation bar (bottom on mobile, right on desktop) to move between steps. You cannot proceed to the next step until the current one is validated (e.g., spending exactly 7/5/3 Attribute dots).</p>
        `
    },
    {
        title: "Top Controls",
        content: `
            <p>The top bar is your command center:</p>
            <ul class="list-disc pl-4 mt-2 space-y-1">
                <li><strong class="text-blue-400">Freebie Mode:</strong> Toggle this to spend Freebie Points (usually 15).</li>
                <li><strong class="text-purple-400">XP Mode:</strong> Toggle this to spend Experience Points after creation.</li>
                <li><strong class="text-[#d4af37]">Play Mode:</strong> Switches the view to a read-only, interactive character sheet for game sessions.</li>
            </ul>
        `
    },
    {
        title: "Data & Saving",
        content: `
            <p>All input fields save automatically to your local browser state as you type.</p>
            <p class="mt-2">To persist your character across devices or clear your browser cache safely, use the <strong class="text-white">SAVE</strong> button to store it in the cloud (requires login).</p>
        `
    },
    {
        title: "The Dice Tray",
        content: `
            <p>In <strong>Play Mode</strong>, clicking on Attributes, Abilities, or Disciplines will add them to the Dice Engine.</p>
            <p class="mt-2">The Dice Tray will slide up from the bottom, allowing you to roll dice pools, apply Willpower, and check for successes automatically.</p>
        `
    },
    {
        title: "Journal & Codex",
        content: `
            <p>Use the <strong>Journal</strong> tab (in Play Mode) to track sessions, XP, and NPCs.</p>
            <p class="mt-2">The <strong>Codex</strong> feature allows you to define keywords (like NPC names or locations) which will automatically become clickable links in your session logs.</p>
        `
    }
];

let currentTutorialStep = 0;

export function startTutorial() {
    currentTutorialStep = 0;
    renderTutorialStep();
    const modal = document.getElementById('tutorial-modal');
    if (modal) modal.classList.add('active');
}
window.startTutorial = startTutorial;

export function renderTutorialStep() {
    const data = TUTORIAL_STEPS[currentTutorialStep];
    if (!data) return;

    const titleEl = document.getElementById('tut-title');
    const contentEl = document.getElementById('tut-content');
    const indicatorEl = document.getElementById('tut-step-indicator');
    const prevBtn = document.getElementById('tut-prev-btn');
    const nextBtn = document.getElementById('tut-next-btn');

    if (titleEl) titleEl.innerText = data.title;
    if (contentEl) contentEl.innerHTML = data.content;
    if (indicatorEl) indicatorEl.innerText = `Step ${currentTutorialStep + 1} of ${TUTORIAL_STEPS.length}`;

    if (prevBtn) {
        prevBtn.classList.toggle('hidden', currentTutorialStep === 0);
    }
    
    if (nextBtn) {
        nextBtn.innerText = (currentTutorialStep === TUTORIAL_STEPS.length - 1) ? "Finish" : "Next";
    }
}

window.nextTutorialStep = function() {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
        currentTutorialStep++;
        renderTutorialStep();
    } else {
        window.closeTutorial();
    }
};

window.prevTutorialStep = function() {
    if (currentTutorialStep > 0) {
        currentTutorialStep--;
        renderTutorialStep();
    }
};

window.closeTutorial = function() {
    const modal = document.getElementById('tutorial-modal');
    if (modal) modal.classList.remove('active');
    
    // Mark as complete in local storage so it doesn't auto-show again
    localStorage.setItem('v20_tutorial_complete', 'true');
};

// --- GUEST PROMPT LOGIC ---
// Ensure this matches the logic called from main.js
window.dismissGuestPrompt = function() {
    const modal = document.getElementById('guest-prompt-modal');
    if (modal) modal.classList.remove('active');
    // Mark as dismissed for this session/browser
    sessionStorage.setItem('v20_guest_dismissed', 'true');
};

// Auto-init specific listeners
document.addEventListener('DOMContentLoaded', () => {
    createWalkthroughButton();
    // Ensure tutorial logic is accessible globally immediately on load
    window.startTutorial = startTutorial;
    window.dismissGuestPrompt = window.dismissGuestPrompt || function() {
        const modal = document.getElementById('guest-prompt-modal');
        if (modal) modal.classList.remove('active');
        sessionStorage.setItem('v20_guest_dismissed', 'true');
    };
});
