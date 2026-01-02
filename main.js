import UIRenderer from './ui-renderer.js';
import rules from './v20-rules.js';
import blankTemplate from './data.js'; 
import * as FirebaseManager from './firebase-manager.js'; 

class MainApp {
    constructor() {
        // Use the blankTemplate imported from data.js
        this.characterData = JSON.parse(JSON.stringify(blankTemplate || {}));
        this.rules = rules;
        
        // Navigation State
        this.currentStep = 1;
        this.totalSteps = 8;
        this.stepNames = [
            "Concept", "Attributes", "Abilities", "Advantages", 
            "Backgrounds", "Merits", "Vitals", "Finalize"
        ];

        // Initialize Renderer with reference to this App and the Rules
        this.uiRenderer = new UIRenderer(this, this.rules);

        // Bind global window functions for the HTML buttons (Save, Load, etc.)
        this.bindWindowExposes();
        
        // Initial Render
        this.init();
    }

    init() {
        console.log("Initializing V20 App...");
        this.renderNavigation(); // Restore the missing navigation buttons
        this.goToStep(1); // Ensure we start on step 1
        this.render();

        // --- FIX: Hide Loading Overlay ---
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    renderNavigation() {
        const navContainer = document.getElementById('sheet-nav');
        if (!navContainer) return;
        navContainer.innerHTML = '';

        this.stepNames.forEach((name, index) => {
            const stepNum = index + 1;
            const btn = document.createElement('button');
            btn.textContent = `${stepNum}. ${name}`;
            btn.className = `px-4 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-colors hover:bg-[#111] ${this.currentStep === stepNum ? 'text-[#af0000] border-[#af0000]' : 'text-gray-500 border-transparent hover:text-gray-300'}`;
            
            btn.onclick = () => this.goToStep(stepNum);
            navContainer.appendChild(btn);
        });
    }

    goToStep(stepNum) {
        this.currentStep = stepNum;
        
        // Hide all phases
        for (let i = 1; i <= this.totalSteps; i++) {
            const phase = document.getElementById(`phase-${i}`);
            if (phase) {
                phase.style.display = 'none';
                phase.classList.remove('active');
            }
        }

        // Show current phase
        const activePhase = document.getElementById(`phase-${stepNum}`);
        if (activePhase) {
            activePhase.style.display = 'block';
            setTimeout(() => activePhase.classList.add('active'), 10);
        }

        // Re-render nav to update active state styling
        this.renderNavigation();
    }

    render() {
        this.uiRenderer.render(this.characterData);
        this.updateCalculatedStats();
    }

    updateCalculatedStats() {
        this.updatePoolCounters();
    }

    updatePoolCounters() {
        const update = (id, arr) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `[${(arr || []).length}]`;
        };
        update('p-disc', this.characterData.disciplines);
        update('p-back', this.characterData.backgrounds);
    }

    // --- Data Management Methods called by UI Renderer ---

    updateCharacterData(field, value) {
        this.characterData[field] = value;
        if (field === 'clan') {
            this.uiRenderer.renderClanWeakness(this.characterData);
        }
    }

    updateCharacterStat(category, statName, value) {
        if (category === 'attributes' || category === 'abilities') {
            if (!this.characterData[category]) this.characterData[category] = {};
            this.characterData[category][statName] = value;
        } else if (category === 'virtues') {
            if (!this.characterData.virtues) this.characterData.virtues = {};
            this.characterData.virtues[statName] = value;
        } else if (category === 'health' || category === 'willpower' || category === 'willpower_pool' || category === 'blood_pool' || category === 'experience') {
            if (statName === null) {
                this.characterData[category] = value;
            }
        }
        this.render();
    }

    updateArrayData(arrayName, index, key, value) {
        if (!this.characterData[arrayName]) this.characterData[arrayName] = [];
        if (this.characterData[arrayName][index]) {
            this.characterData[arrayName][index][key] = value;
        }
        this.render();
    }

    removeArrayData(arrayName, index) {
        if (!this.characterData[arrayName]) return;
        this.characterData[arrayName].splice(index, 1);
        this.render();
    }

    addArrayData(arrayName, newItem) {
        if (!this.characterData[arrayName]) this.characterData[arrayName] = [];
        this.characterData[arrayName].push(newItem);
        this.render();
    }

    // --- Dice Rolling Stub ---
    handleRoll(statName, statValue) {
        console.log(`Rolling ${statName} with ${statValue} dice.`);
        const resultsContainer = document.getElementById('roll-results');
        if (!resultsContainer) return;

        const diff = parseInt(document.getElementById('roll-diff')?.value || 6);
        let successes = 0;
        let rolls = [];
        
        for(let i=0; i < statValue; i++) {
            const roll = Math.floor(Math.random() * 10) + 1;
            rolls.push(roll);
            if (roll >= diff) successes++;
            if (roll === 1) successes--;
        }
        if (successes < 0) successes = 0; 

        const msg = document.createElement('div');
        msg.className = 'text-xs text-gray-300 border-b border-[#333] py-1';
        msg.innerHTML = `<span class="text-gold font-bold">${statName}</span> (Diff ${diff}): [${rolls.join(', ')}] = <span class="${successes > 0 ? 'text-green-400' : 'text-gray-500'} font-bold">${successes} Successes</span>`;
        resultsContainer.prepend(msg);
    }

    // --- Global Bindings for HTML Buttons ---
    bindWindowExposes() {
        window.rollPool = () => console.log("Roll Pool Triggered");
        window.clearPool = () => console.log("Clear Pool Triggered");

        window.toggleSidebarLedger = () => {
            const sb = document.getElementById('freebie-sidebar');
            if(sb) sb.classList.toggle('active');
        };

        window.togglePlayMode = () => {
            const playSheet = document.getElementById('play-mode-sheet');
            const sheetContent = document.getElementById('sheet-content'); 
            if (playSheet && sheetContent) {
                const isPlay = !playSheet.classList.contains('hidden');
                if (isPlay) {
                    playSheet.classList.add('hidden');
                    sheetContent.classList.remove('hidden'); 
                } else {
                    playSheet.classList.remove('hidden');
                    sheetContent.classList.add('hidden'); 
                }
                this.render(); 
            }
        };
        
        window.nextStep = () => {
            if (this.currentStep < this.totalSteps) {
                this.goToStep(this.currentStep + 1);
            }
        };
    }
}

const app = new MainApp();
export default app;
