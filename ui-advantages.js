export default class AdvantagesRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderDisciplines(characterData);
        this.renderBackgrounds(characterData);
        this.renderVirtues(characterData);
    }

    renderDisciplines(characterData) {
        const container = document.getElementById('list-disc');
        if (!container) return;
        container.innerHTML = '';

        const disciplines = characterData.disciplines || [];

        disciplines.forEach((disc, index) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-2 mb-2 bg-white/5 p-2 rounded border border-transparent hover:border-[#333] transition-colors group';

            // Name Input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = disc.name;
            nameInput.placeholder = 'Discipline Name';
            nameInput.className = 'bg-transparent border-b border-[#333] text-gray-200 text-sm w-full focus:border-[#d4af37] focus:outline-none placeholder-gray-600 font-serif';
            nameInput.onchange = (e) => this.uiManager.updateArrayItem('disciplines', index, 'name', e.target.value);

            // Dots
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex gap-1 min-w-[80px] justify-end';

            const maxVal = 5;
            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= disc.value;
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                dot.onclick = () => this.uiManager.updateArrayItem('disciplines', index, 'value', i);
                dotsContainer.appendChild(dot);
            }

            // Remove Button
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.className = 'text-[#555] hover:text-red-500 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity';
            removeBtn.onclick = () => this.uiManager.removeArrayItem('disciplines', index);

            row.appendChild(nameInput);
            row.appendChild(dotsContainer);
            row.appendChild(removeBtn);
            container.appendChild(row);
        });

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add Discipline';
        addBtn.className = 'w-full py-1 text-[10px] uppercase font-bold text-[#444] border border-[#333] border-dashed hover:text-[#d4af37] hover:border-[#d4af37] transition-colors rounded mt-2';
        addBtn.onclick = () => this.uiManager.addArrayItem('disciplines', { name: '', value: 1 });
        container.appendChild(addBtn);
    }

    renderBackgrounds(characterData) {
        const container = document.getElementById('list-back');
        if (!container) return;
        container.innerHTML = '';

        const backgrounds = characterData.backgrounds || [];

        backgrounds.forEach((bg, index) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-2 mb-2 bg-white/5 p-2 rounded border border-transparent hover:border-[#333] transition-colors group';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = bg.name;
            nameInput.placeholder = 'Background Name';
            nameInput.className = 'bg-transparent border-b border-[#333] text-gray-200 text-sm w-full focus:border-[#d4af37] focus:outline-none placeholder-gray-600 font-serif';
            nameInput.onchange = (e) => this.uiManager.updateArrayItem('backgrounds', index, 'name', e.target.value);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex gap-1 min-w-[80px] justify-end';

            const maxVal = 5;
            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= bg.value;
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                dot.onclick = () => this.uiManager.updateArrayItem('backgrounds', index, 'value', i);
                dotsContainer.appendChild(dot);
            }

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.className = 'text-[#555] hover:text-red-500 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity';
            removeBtn.onclick = () => this.uiManager.removeArrayItem('backgrounds', index);

            row.appendChild(nameInput);
            row.appendChild(dotsContainer);
            row.appendChild(removeBtn);
            container.appendChild(row);
        });

        const addBtn = document.createElement('button');
        addBtn.innerHTML = '<i class="fas fa-plus mr-1"></i> Add Background';
        addBtn.className = 'w-full py-1 text-[10px] uppercase font-bold text-[#444] border border-[#333] border-dashed hover:text-[#d4af37] hover:border-[#d4af37] transition-colors rounded mt-2';
        addBtn.onclick = () => this.uiManager.addArrayItem('backgrounds', { name: '', value: 1 });
        container.appendChild(addBtn);
    }

    renderVirtues(characterData) {
        const container = document.getElementById('list-virt');
        if (!container) return;
        container.innerHTML = '';

        // Standard V20 Virtues
        const virtues = ['conscience', 'self_control', 'courage'];
        const labels = {
            'conscience': 'Conscience / Conviction',
            'self_control': 'Self-Control / Instinct',
            'courage': 'Courage'
        };

        virtues.forEach(virtue => {
            const row = document.createElement('div');
            row.className = 'flex justify-between items-center mb-4';

            const label = document.createElement('span');
            label.className = 'text-sm text-gray-300 font-serif cursor-pointer hover:text-gold transition-colors select-none';
            label.textContent = labels[virtue];
            label.onclick = () => this.uiManager.rollDice(virtue, characterData.virtues[virtue]);

            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex gap-1';

            const currentVal = characterData.virtues[virtue] || 1;
            const maxVal = 5;

            for (let i = 1; i <= maxVal; i++) {
                const dot = document.createElement('div');
                const isFilled = i <= currentVal;
                dot.className = `w-3 h-3 rounded-full border border-[#444] cursor-pointer hover:border-white transition-colors ${isFilled ? 'bg-[#af0000] shadow-[0_0_5px_rgba(175,0,0,0.5)]' : 'bg-transparent'}`;
                dot.onclick = () => this.uiManager.updateStat('virtues', virtue, i);
                dotsContainer.appendChild(dot);
            }

            row.appendChild(label);
            row.appendChild(dotsContainer);
            container.appendChild(row);
        });
    }
}
