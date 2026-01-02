export default class MeritsRenderer {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    render(characterData) {
        this.renderCreateMode(characterData);
        this.renderPlayMode(characterData);
    }

    renderCreateMode(characterData) {
        // Merits
        const meritsContainer = document.getElementById('merits-list-create');
        if (meritsContainer) {
            meritsContainer.innerHTML = '';
            const merits = characterData.merits || [];
            
            merits.forEach((merit, index) => {
                const row = this.createEditRow('merits', index, merit);
                meritsContainer.appendChild(row);
            });

            const addBtn = this.createAddButton('merits', 'Add Merit');
            meritsContainer.appendChild(addBtn);
        }

        // Flaws
        const flawsContainer = document.getElementById('flaws-list-create');
        if (flawsContainer) {
            flawsContainer.innerHTML = '';
            const flaws = characterData.flaws || [];

            flaws.forEach((flaw, index) => {
                const row = this.createEditRow('flaws', index, flaw);
                flawsContainer.appendChild(row);
            });

            const addBtn = this.createAddButton('flaws', 'Add Flaw');
            flawsContainer.appendChild(addBtn);
        }
    }

    createEditRow(type, index, item) {
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center group';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = item.name;
        nameInput.placeholder = 'Name';
        nameInput.className = 'flex-1 bg-transparent border-b border-[#333] text-gray-200 text-xs py-1 focus:border-[#d4af37] outline-none font-serif';
        nameInput.onchange = (e) => this.uiManager.updateArrayItem(type, index, 'name', e.target.value);

        const valInput = document.createElement('input');
        valInput.type = 'number';
        valInput.value = item.value;
        valInput.className = 'w-10 bg-transparent border-b border-[#333] text-gold text-xs py-1 text-center focus:border-[#d4af37] outline-none font-bold';
        valInput.onchange = (e) => this.uiManager.updateArrayItem(type, index, 'value', parseInt(e.target.value));

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = 'text-[#444] hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity';
        removeBtn.onclick = () => this.uiManager.removeArrayItem(type, index);

        row.appendChild(nameInput);
        row.appendChild(valInput);
        row.appendChild(removeBtn);

        return row;
    }

    createAddButton(type, label) {
        const btn = document.createElement('button');
        btn.innerHTML = `<i class="fas fa-plus mr-1"></i> ${label}`;
        btn.className = 'w-full py-1 text-[10px] uppercase font-bold text-[#444] border border-[#333] border-dashed hover:text-[#d4af37] hover:border-[#d4af37] transition-colors rounded mt-2';
        btn.onclick = () => this.uiManager.addArrayItem(type, { name: '', value: 1 });
        return btn;
    }

    renderPlayMode(characterData) {
        const container = document.getElementById('merit-flaw-rows-play');
        if (!container) return;
        container.innerHTML = '';

        const merits = characterData.merits || [];
        const flaws = characterData.flaws || [];

        if (merits.length === 0 && flaws.length === 0) {
            container.innerHTML = '<div class="text-xs text-gray-600 italic">No Merits or Flaws</div>';
            return;
        }

        merits.forEach(m => {
            const div = document.createElement('div');
            div.className = 'flex justify-between text-xs border-b border-[#222] py-1';
            div.innerHTML = `<span class="text-gray-300">${m.name}</span><span class="text-gold">${m.value} pt</span>`;
            container.appendChild(div);
        });

        flaws.forEach(f => {
            const div = document.createElement('div');
            div.className = 'flex justify-between text-xs border-b border-[#222] py-1';
            div.innerHTML = `<span class="text-red-300">${f.name}</span><span class="text-red-500">${f.value} pt</span>`;
            container.appendChild(div);
        });
    }
}
