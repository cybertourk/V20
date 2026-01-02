class AttributeRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderCategory('physical', 'list-attr-physical', characterData);
        this.renderCategory('social', 'list-attr-social', characterData);
        this.renderCategory('mental', 'list-attr-mental', characterData);
    }

    renderCategory(category, containerId, characterData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clean up ONLY the rows we generated previously, preserving headers/buttons
        const oldRows = container.querySelectorAll('.generated-stat-row');
        oldRows.forEach(row => row.remove());

        const attributes = this.uiManager.rules.attributes[category];

        attributes.forEach(attr => {
            const row = document.createElement('div');
            row.className = 'generated-stat-row flex justify-between items-center mb-1 hover:bg-white/5 px-2 rounded transition-colors';

            // Label (Click to Roll)
            const label = document.createElement('span');
            label.className = 'text-sm text-gray-300 font-serif cursor-pointer hover:text-gold transition-colors select-none';
            label.textContent = attr;
            label.onclick = () => this.uiManager.rollDice(attr, characterData.attributes[attr]);

            // Dots Container
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex gap-1';

            const currentVal = characterData.attributes[attr] || 1;
            const maxVal = 5;

            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= currentVal;
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                
                dot.onclick = () => this.uiManager.updateStat('attributes', attr, i);
                
                dotsContainer.appendChild(dot);
            }

            row.appendChild(label);
            row.appendChild(dotsContainer);
            container.appendChild(row);
        });
    }
}

export default AttributeRenderer;
