import UIRenderer from './ui-renderer.js';
import rules from './v20-rules.js';
import blankTemplate from './data.js'; 
import * as FirebaseManager from './firebase-manager.js'; 

class MainApp {
    constructor() {
        // Use the blankTemplate imported from data.js
        this.characterData = JSON.parse(JSON.stringify(blankTemplate || {}));
        this.rules = rules;
        
        // Initialize Renderer with reference to this App and the Rules
        this.uiRenderer = new UIRenderer(this, this.rules);

        // Bind global window functions for the HTML buttons (Save, Load, etc.)
        this.bindWindowExposes();
        
        // Initial Render
        this.init();
    }

    init() {
        console.log("Initializing V20 App...");
        this.render();
    }

    render() {
        this.uiRenderer.render(this.characterData);
        this.updateCalculatedStats();
    }

    updateCalculatedStats() {
        // Update Freebie points, pool costs, etc.
        this.updatePoolCounters();
    }

    updatePoolCounters() {
        // Example: Update the little counters [3] next to headers
        const update = (id, arr) => {
            const el = document.getElementById(id);
            if (el) el.textContent = `[${(arr || []).length}]`;
        };
        update('p-disc', this.characterData.disciplines);
        update('p-back', this.characterData.backgrounds);
        // Virtues default to 3 dots usually, handled by renderer
    }

    // --- Data Management Methods called by UI Renderer ---

    updateCharacterData(field, value) {
        this.characterData[field] = value;
        // Auto-save or trigger specific updates
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
            // Mechanics
            if (statName === null) {
                // Direct property update like characterData.health = 3
                this.characterData[category] = value;
            } else {
                // Should not happen based on current mechanics renderer logic for these types
            }
        }
        
        this.render(); // Re-render to update dots/visuals
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

        // Simple mock roll
        const diff = parseInt(document.getElementById('roll-diff')?.value || 6);
        let successes = 0;
        let rolls = [];
        
        for(let i=0; i < statValue; i++) {
            const roll = Math.floor(Math.random() * 10) + 1;
            rolls.push(roll);
            if (roll >= diff) successes++;
            if (roll === 1) successes--;
        }

        if (successes < 0) successes = 0; // Botch logic is more complex in V20, simplistic here

        const msg = document.createElement('div');
        msg.className = 'text-xs text-gray-300 border-b border-[#333] py-1';
        msg.innerHTML = `<span class="text-gold font-bold">${statName}</span> (Diff ${diff}): [${rolls.join(', ')}] = <span class="${successes > 0 ? 'text-green-400' : 'text-gray-500'} font-bold">${successes} Successes</span>`;
        resultsContainer.prepend(msg);
    }

    // --- Global Bindings for HTML Buttons ---
    bindWindowExposes() {
        window.rollPool = () => {
            // Implementation for the "Roll Pool" button in your HTML
            console.log("Roll Pool Triggered");
        };
        
        window.clearPool = () => {
            console.log("Clear Pool Triggered");
        };

        window.toggleSidebarLedger = () => {
            const sb = document.getElementById('freebie-sidebar');
            if(sb) sb.classList.toggle('active');
        };

        window.togglePlayMode = () => {
            const playSheet = document.getElementById('play-mode-sheet');
            const sheetContent = document.getElementById('sheet-content'); // Contains Create Mode phases
            if (playSheet && sheetContent) {
                const isPlay = !playSheet.classList.contains('hidden');
                if (isPlay) {
                    playSheet.classList.add('hidden');
                    sheetContent.classList.remove('hidden'); // Ensure create mode is visible
                } else {
                    playSheet.classList.remove('hidden');
                    sheetContent.classList.add('hidden'); // Hide create mode
                }
                this.render(); // Re-render to populate play mode fields
            }
        };
        
        // Link specific global functions your HTML calls (onclick="window.nextStep()")
        window.nextStep = () => console.log("Next step clicked");
    }
}

// Start the App
const app = new MainApp();
export default app;
