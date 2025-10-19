class ConfigGenerator {
    constructor() {
        this.components = [];
        this.selectedComponents = {};
        this.inputTimeout = null;
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;
        this.init();
    }

    async init() {
        this.setCurrentDate();
        await this.loadData();
        this.renderTable();
        this.bindEvents();
    }

    setCurrentDate() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        document.getElementById('currentDate').textContent = dateStr;
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('数据加载失败');
            this.components = await response.json();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.components = [];
        }
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        const types = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];
        
        tbody.innerHTML = types.map(type => {
            const isOther = type === '其它1' || type === '其它2';
            const minValue = isOther ? 0 : 1;
            const placeholder = isOther ? `请输入${type}名称` : '搜索或选择配件';
            
            return `
                <tr data-type="${type}">
                    <td>${type}</td>
                    <td>
                        <div class="search-container">
                            <input type="text" class="search-input" placeholder="${placeholder}" 
                                   data-type="${type}" autocomplete="off">
                            <div class="dropdown" style="display: none;"></div>
                        </div>
                    </td>
                    <td>
                        <input type="number" class="quantity-input" data-type="${type}" 
                               value="" placeholder="0" style="display: none;" min="${minValue}" step="1"
                               oninput="this.value = Math.max(${minValue}, parseInt(this.value) || ${minValue})">
                    </td>
                    <td>
                        <input type="text" class="cost-input" data-type="${type}" 
                               placeholder="成本价" value="" style="display: none;"
                               oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                    </td>
                    <td>
                        <input type="text" class="price-input" data-type="${type}" 
                               placeholder="销售价" value="" style="display: none;"
                               oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                    </td>
                    <td class="subtotal" data-type="${type}">-</td>
                    <td class="profit" data-type="${type}">-</td>
                </tr>
            `;
        }).join('');
    }

    bindEvents() {
        // 添加 touchstart/touchend for haptic simulation
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('btn') || e.target.classList.contains('dropdown-item') || e.target.classList.contains('input-field')) {
                this.simulateHaptic('light'); // 轻触反馈
            }
        }, { passive: true });

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('search-input')) {
                const type = target.dataset.type;
                if (target.value === '' && type !== '其它1' && type !== '其它2') {
                    this.showAllOptions(target);
                }
            }
            if (target.classList.contains('dropdown-item')) {
                this.selectComponent(target);
            }
            this.handleOutsideClick(e);
        });

        document.addEventListener('input', (e) => {
            const target = e.target;
            if (!target.dataset.type) return;
            const type = target.dataset.type;

            if (target.classList.contains('search-input')) {
                if (type !== '其它1' && type !== '其它2') {
                    clearTimeout(this.inputTimeout);
                    this.inputTimeout = setTimeout(() => {
                        this.handleSearch(target);
                    }, 300);
                } else {
                    this.handleOtherInputImmediate(type);
                }
            } else if (target.classList.contains('quantity-input') ||
                       target.classList.contains('cost-input') ||
                       target.classList.contains('price-input')) {
                if (type !== '其它1' && type !== '其它2') {
                    this.handleRegularInput(type);
                } else {
                    this.handleOtherInputImmediate(type);
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        document.getElementById('copyConfig').addEventListener('click', () => {
            this.copyConfigToClipboard();
        });

        document.getElementById('loadPreset').addEventListener('click', () => {
            this.showPresetModal();
        });

        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('presetModal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('presetModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        this.bindSpinEvents();
    }

    simulateHaptic(type) {
        // 模拟触觉反馈（浏览器支持 navigator.vibrate）
        if (navigator.vibrate) {
            const patterns = {
                light: [10],
                medium: [50],
                heavy: [100]
            };
            navigator.vibrate(patterns[type] || patterns.light);
        }
    }

    bindSpinEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const type = e.target.dataset.type;
                const isOther = type === '其它1' || type === '其它2';
                const minVal = isOther ? 0 : 1;
                let val = parseInt(e.target.value) || minVal;
                if (val < minVal) {
                    e.target.value = minVal;
                    val = minVal;
                }
                if (type !== '其它1' && type !== '其它2') {
                    this.handleRegularInput(type);
                } else {
                    this.handleOtherInputImmediate(type);
                }
            }
        });

        const quantityInputs = document.querySelectorAll('.quantity-input');
        quantityInputs.forEach(input => {
            input.addEventListener('mousewheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 1 : -1;
                let val = parseInt(input.value) || 1;
                val += delta;
                const minVal = parseInt(input.min) || 1;
                input.value = Math.max(minVal, val);
                const type = input.dataset.type;
                if (type !== '其它1' && type !== '其它2') {
                    this.handleRegularInput(type);
                } else {
                    this.handleOtherInputImmediate(type);
                }
            });
        });
    }

    // [其余方法保持不变，与之前提供的相同]
    // handleOutsideClick, hideAllDropdowns, handleRegularInput, handleOtherInputImmediate, updateRegularRow, updateOtherRowDisplay, updateTotals, handleSearch, searchComponents, showAllOptions, showDropdown, selectComponent, handleKeyboard, selectDropdownItem, showPresetModal, getPresetConfigs, loadPresetConfig, clearSelection, copyConfigToClipboard

    handleOutsideClick(e) {
        if (!e.target.classList.contains('search-input') && 
            !e.target.classList.contains('dropdown-item') &&
            !e.target.closest('.dropdown')) {
            this.hideAllDropdowns();
        }
    }

    hideAllDropdowns() {
        const allDropdowns = document.querySelectorAll('.dropdown');
        allDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;
    }

    handleRegularInput(type) {
        const component = this.selectedComponents[type];
        if (!component) return;

        const row = document.querySelector(`tr[data-type="${type}"]`);
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');
        
        const quantity = parseInt(quantityInput.value) || 1;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

        if (quantity > 0) {
            component.quantity = quantity;
        }
        if (price > 0) {
            component.price = price;
        }
        if (cost >= 0) {
            component.cost = cost;
            component.manualCost = true;
        }

        if (component.quantity > 0 && component.price > 0) {
            this.updateRegularRow(type);
        } else if (quantity === 0) {
            this.clearSelection(type);
        }
    }

    handleOtherInputImmediate(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        if (!row) return;

        const nameInput = row.querySelector('.search-input');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');
        
        const name = nameInput.value.trim();
        let quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

        if (name) {
            quantityInput.style.display = 'block';
            costInput.style.display = 'block';
            priceInput.style.display = 'block';
            if (quantity === 0) {
                quantityInput.value = '1';
                quantity = 1;
            }
        } else {
            quantityInput.style.display = 'none';
            costInput.style.display = 'none';
            priceInput.style.display = 'none';
            quantityInput.value = '';
            costInput.value = '';
            priceInput.value = '';
        }

        if (name && quantity > 0 && price > 0) {
            this.selectedComponents[type] = {
                name,
                price,
                cost: cost || 0,
                quantity,
                isCustom: true,
                manualCost: cost > 0
            };
            this.updateOtherRowDisplay(type);
        } else {
            delete this.selectedComponents[type];
            this.updateOtherRowDisplay(type);
        }
    }

    updateRegularRow(type) {
        const component = this.selectedComponents[type];
        if (!component) return;

        const subtotal = component.price * component.quantity;
        const profit = (component.price - component.cost) * component.quantity;
        
        const row = document.querySelector(`tr[data-type="${type}"]`);
        row.querySelector('.subtotal').textContent = `¥${subtotal}`;
        row.querySelector('.profit').textContent = `¥${profit}`;

        this.updateTotals();
    }

    updateOtherRowDisplay(type) {
        const component = this.selectedComponents[type];
        const row = document.querySelector(`tr[data-type="${type}"]`);
        
        if (component && component.quantity > 0 && component.price > 0) {
            const subtotal = component.price * component.quantity;
            const profit = (component.price - component.cost) * component.quantity;
            
            row.querySelector('.subtotal').textContent = `¥${subtotal}`;
            row.querySelector('.profit').textContent = `¥${profit}`;
        } else {
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }
        
        this.updateTotals();
    }

    updateTotals() {
        let totalPrice = 0;
        let totalProfit = 0;

        Object.values(this.selectedComponents).forEach(component => {
            if (component.quantity > 0 && component.price > 0) {
                totalPrice += component.price * component.quantity;
                totalProfit += (component.price - component.cost) * component.quantity;
            }
        });

        document.getElementById('totalPrice').textContent = totalPrice;
        document.getElementById('totalProfit').textContent = totalProfit;
    }

    handleSearch(input) {
        const query = input.value.trim();
        const type = input.dataset.type;
        
        if (query === '') {
            this.showAllOptions(input);
            return;
        }

        const results = this.searchComponents(query, type);
        this.showDropdown(input, results);
    }

    searchComponents(query, type) {
        const lowerQuery = query.toLowerCase();
        return this.components.filter(component => {
            if (component.type !== type) return false;
            return component.name.toLowerCase().includes(lowerQuery);
        });
    }

    showAllOptions(input) {
        const type = input.dataset.type;
        const components = this.components.filter(c => c.type === type);
        this.showDropdown(input, components);
    }

    showDropdown(input, components) {
        const dropdown = input.nextElementSibling;
        
        this.hideAllDropdowns();
        
        if (components.length === 0) {
            dropdown.style.display = 'none';
            this.currentDropdown = null;
            this.currentDropdownItems = [];
            this.currentSelectedIndex = -1;
            return;
        }

        dropdown.innerHTML = components.map(component => `
            <div class="dropdown-item" data-name="${component.name}" data-type="${component.type}"
                 data-price="${component.price}">
                ${component.name} (¥${component.price})
            </div>
        `).join('');

        dropdown.style.display = 'block';
        this.currentDropdown = dropdown;
        this.currentDropdownItems = Array.from(dropdown.querySelectorAll('.dropdown-item'));
        this.currentSelectedIndex = -1;
    }

    selectComponent(item) {
        const name = item.dataset.name;
        const type = item.dataset.type;
        const price = parseInt(item.dataset.price);

        item.closest('.dropdown').style.display = 'none';
        this.currentDropdown = null;
        this.currentDropdownItems = [];
        this.currentSelectedIndex = -1;

        const input = item.closest('.search-container').querySelector('.search-input');
        input.value = name;

        const quantityInput = document.querySelector(`.quantity-input[data-type="${type}"]`);
        const costInput = document.querySelector(`.cost-input[data-type="${type}"]`);
        const priceInput = document.querySelector(`.price-input[data-type="${type}"]`);
        
        quantityInput.style.display = 'block';
        quantityInput.value = '1';
        
        costInput.style.display = 'block';
        costInput.value = Math.round(price * 0.8);
        
        priceInput.style.display = 'block';
        priceInput.value = price;

        this.selectedComponents[type] = {
            name,
            price,
            cost: Math.round(price * 0.8),
            quantity: 1,
            isCustom: false,
            manualCost: false
        };

        this.updateRegularRow(type);
    }

    handleKeyboard(e) {
        if (!this.currentDropdown || this.currentDropdown.style.display === 'none') {
            return;
        }

        const items = this.currentDropdownItems;
        if (items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentSelectedIndex = (this.currentSelectedIndex + 1) % items.length;
                this.selectDropdownItem(items, this.currentSelectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.currentSelectedIndex = (this.currentSelectedIndex - 1 + items.length) % items.length;
                this.selectDropdownItem(items, this.currentSelectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.currentSelectedIndex >= 0 && items[this.currentSelectedIndex]) {
                    items[this.currentSelectedIndex].click();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.currentDropdown.style.display = 'none';
                this.currentDropdown = null;
                this.currentDropdownItems = [];
                this.currentSelectedIndex = -1;
                break;
        }
    }

    selectDropdownItem(items, index) {
        items.forEach(item => item.classList.remove('selected'));
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    showPresetModal() {
        const modal = document.getElementById('presetModal');
        const presetList = document.getElementById('presetList');
        
        const presets = this.getPresetConfigs();
        presetList.innerHTML = presets.map((preset, index) => `
            <div class="preset-item" data-index="${index}">
                <h4>${preset.name}</h4>
                <p>${preset.description}</p>
            </div>
        `).join('');

        presetList.querySelectorAll('.preset-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadPresetConfig(parseInt(item.dataset.index));
                modal.style.display = 'none';
            });
        });

        modal.style.display = 'block';
    }

    getPresetConfigs() {
        return [
            {
                name: '办公配置',
                description: '适合日常办公使用',
                components: [
                    { type: 'CPU', name: 'Intel i5-13400F' },
                    { type: '主板', name: '华硕 B760M-P' },
                    { type: '内存', name: '金士顿 16GB DDR5 5200' }
                ]
            },
            {
                name: '游戏配置',
                description: '主流游戏配置',
                components: [
                    { type: 'CPU', name: 'Intel i7-13700K' },
                    { type: '主板', name: '华硕 B760M-P' },
                    { type: '内存', name: '金士顿 16GB DDR5 5200' },
                    { type: '显卡', name: '技嘉 RTX 4060 8G' }
                ]
            }
        ];
    }

    loadPresetConfig(index) {
        const presets = this.getPresetConfigs();
        const preset = presets[index];
        
        if (!preset) return;

        Object.keys(this.selectedComponents).forEach(type => {
            this.clearSelection(type);
        });

        preset.components.forEach(item => {
            const component = this.components.find(c => 
                c.type === item.type && c.name === item.name
            );
            
            if (component) {
                const input = document.querySelector(`.search-input[data-type="${item.type}"]`);
                if (input) {
                    this.selectedComponents[item.type] = {
                        name: component.name,
                        price: component.price,
                        cost: Math.round(component.price * 0.8),
                        quantity: 1,
                        isCustom: false,
                        manualCost: false
                    };

                    input.value = component.name;
                    const quantityInput = document.querySelector(`.quantity-input[data-type="${item.type}"]`);
                    const costInput = document.querySelector(`.cost-input[data-type="${item.type}"]`);
                    const priceInput = document.querySelector(`.price-input[data-type="${item.type}"]`);
                    
                    quantityInput.style.display = 'block';
                    quantityInput.value = '1';
                    
                    costInput.style.display = 'block';
                    costInput.value = Math.round(component.price * 0.8);
                    
                    priceInput.style.display = 'block';
                    priceInput.value = component.price;

                    this.updateRegularRow(item.type);
                }
            }
        });
    }

    clearSelection(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        const input = row.querySelector('.search-input');
        input.value = '';
        
        const quantityInput = row.querySelector('.quantity-input');
        const costInput = row.querySelector('.cost-input');
        const priceInput = row.querySelector('.price-input');
        
        quantityInput.style.display = 'none';
        quantityInput.value = '';
        
        costInput.style.display = 'none';
        costInput.value = '';
        
        priceInput.style.display = 'none';
        priceInput.value = '';
        
        row.querySelector('.subtotal').textContent = '-';
        row.querySelector('.profit').textContent = '-';

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    async copyConfigToClipboard() {
        const lines = [];
        let totalAmount = 0;

        const typeOrder = ['CPU', '散热器', '主板', '内存', '硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];
        
        typeOrder.forEach(type => {
            const component = this.selectedComponents[type];
            if (component && component.quantity > 0 && component.price > 0) {
                const subtotal = component.price * component.quantity;
                totalAmount += subtotal;
                
                let displayName = component.name;
                if (component.quantity > 1) {
                    displayName += `【数量${component.quantity}】`;
                }
                
                lines.push(`${type}\t${displayName}\t${subtotal}`);
            }
        });

        if (lines.length > 0) {
            lines.push(`总价\t${totalAmount}`);
        }

        const text = lines.join('\n');

        try {
            await navigator.clipboard.writeText(text);
            alert('配置单已复制到剪贴板！');
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('配置单已复制到剪贴板！');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ConfigGenerator();
});
