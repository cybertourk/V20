export default class AbilityRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderCategory('talents', 'list-abil-talents', characterData);
        this.renderCategory('skills', 'list-abil-skills', characterData);
        this.renderCategory('knowledges', 'list-abil-knowledges', characterData);
    }

    renderCategory(category, containerId, characterData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clean up ONLY the rows we generated previously, preserving headers/buttons
        const oldRows = container.querySelectorAll('.generated-stat-row');
        oldRows.forEach(row => row.remove());

        const abilities = this.uiManager.rules.abilities[category];

        abilities.forEach(abil => {
            const row = document.createElement('div');
            // Using your Tailwind styles for rows
            row.className = 'generated-stat-row flex justify-between items-center mb-1 hover:bg-white/5 px-2 rounded transition-colors';

            // Label (Click to Roll)
            const label = document.createElement('span');
            label.className = 'text-sm text-gray-300 font-serif cursor-pointer hover:text-gold transition-colors select-none';
            label.textContent = abil;
            label.onclick = () => this.uiManager.rollDice(abil, characterData.abilities[abil]);

            // Dots Container
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex gap-1';

            const currentVal = characterData.abilities[abil] || 0;
            const maxVal = 5;

            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= currentVal;
                // Using your Deep Red (#af0000) dot style
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                
                dot.onclick = () => this.uiManager.updateStat('abilities', abil, i);
                
                dotsContainer.appendChild(dot);
            }

            row.appendChild(label);
            row.appendChild(dotsContainer);
            container.appendChild(row);
        });
    }
}
