class ConfigGenerator {
    // 在ConfigGenerator类中添加这个方法
importFromText(configText) {
    try {
        // 清空当前配置
        this.clearAllConfig();
        
        const lines = configText.split('\n');
        let currentType = '';
        
        lines.forEach(line => {
            line = line.trim();
            
            // 匹配配件行：● 类型：【名称】价格元
            const match = line.match(/●\s*([^：]+)：【([^】]+)】(\d+)元/);
            if (match) {
                const type = match[1].trim();
                let name = match[2].trim();
                const price = parseInt(match[3]);
                
                // 处理数量（如 "内存条 ×2"）
                let quantity = 1;
                const quantityMatch = name.match(/×(\d+)$/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1]);
                    name = name.replace(/×\d+$/, '').trim();
                }
                
                this.importComponent(type, name, price, quantity);
            }
        });
        
        this.updateTotals();
        alert('配置导入成功！');
    } catch (e) {
        console.error('导入失败:', e);
        alert('导入失败，请检查格式是否正确');
    }
}

// 辅助方法：导入单个组件
importComponent(type, name, price, quantity = 1) {
    const component = this.components.find(c => 
        c.type === type && c.name.includes(name)
    );
    
    if (component) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        if (row) {
            const searchInput = row.querySelector('.search-input');
            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');
            
            searchInput.value = component.name;
            quantityInput.value = quantity;
            costInput.value = component.cost;
            priceInput.value = price;
            
            quantityInput.style.display = 'block';
            costInput.style.display = 'block';
            priceInput.style.display = 'block';
            
            this.selectedComponents[type] = {
                name: component.name,
                price: price,
                cost: component.cost,
                quantity: quantity,
                isCustom: false,
                manualCost: false
            };
            
            this.updateRegularRow(type);
        }
    }
}

// 在bindEvents()中添加按钮事件
document.getElementById('importConfig').addEventListener('click', () => {
    this.showImportModal();
});

// 显示导入模态框
showImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>粘贴配置单文本</h3>
            <textarea id="importTextarea" placeholder="请粘贴配置单文本..." rows="15" style="width: 100%; margin: 10px 0;"></textarea>
            <button id="confirmImport" class="btn primary">确认导入</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 事件绑定
    modal.querySelector('.close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#confirmImport').addEventListener('click', () => {
        const text = document.getElementById('importTextarea').value;
        if (text.trim()) {
            this.importFromText(text);
            document.body.removeChild(modal);
        } else {
            alert('请输入配置单文本');
        }
    });
    
    // 点击外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}
    
    
    // 保存配置到本地存储
    saveConfig() {
        try {
            const configData = {
                components: this.selectedComponents,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('pcConfig', JSON.stringify(configData));
            alert('配置已保存！');
        } catch (e) {
            alert('保存失败');
        }
    }

    // 从本地存储加载配置
    loadConfig() {
        try {
            const saved = localStorage.getItem('pcConfig');
            if (!saved) {
                alert('没有找到保存的配置');
                return;
            }

            const configData = JSON.parse(saved);
            this.clearAllConfig();

            Object.entries(configData.components).forEach(([type, component]) => {
                const row = document.querySelector(`tr[data-type="${type}"]`);
                if (!row) return;

                if (type === '其它1' || type === '其它2') {
                    row.querySelector('.other-name-input').value = component.name || '';
                    row.querySelector('.quantity-input').value = component.quantity || 1;
                    row.querySelector('.cost-input').value = component.cost || 0;
                    row.querySelector('.price-input').value = component.price || 0;
                    this.handleOtherInputImmediate(type);
                } else {
                    const searchInput = row.querySelector('.search-input');
                    searchInput.value = component.name || '';

                    this.selectedComponents[type] = {
                        ...component,
                        name: component.name || ''
                    };

                    this.updateRegularRow(type);
                }
            });

            this.updateTotals();
            console.log('配置加载成功'); // 控制台日志
        } catch (e) {
            alert('加载配置失败');
        }
    }

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
        const types = ['CPU', '散热器', '主板', '内存', '固态硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];

        tbody.innerHTML = types.map(type => {
            if (type === '其它1' || type === '其它2') {
                return `
                    <tr data-type="${type}">
                        <td>
                            <span class="type-text">${type}</span>
                        </td>
                        <td>
                            <input type="text" class="other-name-input" 
                                   data-type="${type}" placeholder="请输入${type}名称">
                        </td>
                        <td>
                            <div class="quantity-container" data-type="${type}">
                                <button class="quantity-btn minus-btn" data-type="${type}">-</button>
                                <input type="text" class="quantity-input" data-type="${type}" 
                                       value="0" placeholder="0"
                                       oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                <button class="quantity-btn plus-btn" data-type="${type}">+</button>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价" value="0"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价" value="0"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            } else {
                return `
                    <tr data-type="${type}">
                        <td>
                            <span class="type-text">${type}</span>
                        </td>
                        <td>
                            <div class="search-container">
                                <input type="text" class="search-input" placeholder="搜索或选择配件" 
                                       data-type="${type}" autocomplete="off">
                                <div class="dropdown" style="display: none;"></div>
                            </div>
                        </td>
                        <td>
                            <div class="quantity-container">
                                <button class="quantity-btn minus-btn" data-type="${type}">-</button>
                                <input type="text" class="quantity-input" data-type="${type}" 
                                       value="0" placeholder="0"
                                       oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                                <button class="quantity-btn plus-btn" data-type="${type}">+</button>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价" style="display: none;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价" style="display: none;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            }
        }).join('');
    }

    // 清除整行数据的方法
    clearRowData(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);

        if (!row) return;

        if (type === '其它1' || type === '其它2') {
            const nameInput = row.querySelector('.other-name-input');
            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            nameInput.value = '';
            quantityInput.value = '1';
            costInput.value = '0';
            priceInput.value = '0';
        } else {
            const searchInput = row.querySelector('.search-input');
            const quantityContainer = row.querySelector('.quantity-container');
            const quantityInput = quantityContainer.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            searchInput.value = '';
            quantityInput.value = '';
            quantityInput.style.display = 'block';
            costInput.style.display = 'none';
            costInput.value = '';
            priceInput.style.display = 'none';
            priceInput.value = '';
        }

        const subtotalCell = row.querySelector('.subtotal');
        const profitCell = row.querySelector('.profit');
        subtotalCell.textContent = '-';
        profitCell.textContent = '-';

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    bindEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const type = e.target.dataset.type;
                const isPlus = e.target.classList.contains('plus-btn');
                this.adjustQuantity(type, isPlus);
            }

            if (e.target.classList.contains('search-input')) {
                if (e.target.value === '') {
                    this.showAllOptions(e.target);
                }
            }
            if (e.target.classList.contains('dropdown-item')) {
                this.selectComponent(e.target);
            }

            this.handleOutsideClick(e);
        });

        document.addEventListener('input', (e) => {
            const type = e.target.dataset.type;

            if (type && type !== '其它1' && type !== '其它2') {
                if (e.target.classList.contains('quantity-input') ||
                    e.target.classList.contains('price-input') ||
                    e.target.classList.contains('cost-input')) {

                    this.handleRegularInput(type);
                }
            }

            if ((type === '其它1' || type === '其它2') &&
                (e.target.classList.contains('other-name-input') ||
                    e.target.classList.contains('quantity-input') ||
                    e.target.classList.contains('price-input') ||
                    e.target.classList.contains('cost-input'))) {

                this.handleOtherInputImmediate(type);
            }

            if (e.target.classList.contains('search-input')) {
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    this.handleSearch(e.target);
                }, 300);
            }
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        document.getElementById('copyConfig').addEventListener('click', () => {
            this.copyConfigToClipboard();
        });

        document.getElementById('saveConfig').addEventListener('click', () => {
            this.saveConfig();
        });

        document.getElementById('loadConfig').addEventListener('click', () => {
            this.loadConfig();
        });

        document.getElementById('loadPreset').addEventListener('click', () => {
            this.showPresetModal();
        });

        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllConfig();
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
    }

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

        const quantity = parseInt(quantityInput.value) || 0;
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

        const nameInput = row.querySelector('.other-name-input');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');

        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseInt(priceInput.value) || 0;
        const cost = parseInt(costInput.value) || 0;

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
        const keywords = query.toLowerCase().split(/\s+/);

        return this.components.filter(component => {
            if (component.type !== type) return false;

            const text = component.name.toLowerCase();
            return keywords.every(keyword =>
                text.replace(/[\s\-\+\(\)]/g, '').includes(keyword)
            );
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

        const sortedComponents = components.sort((a, b) => a.price - b.price);

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

        const componentData = this.components.find(c => c.name === name && c.type === type);
        const actualCost = componentData ? componentData.cost : 0;

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
        costInput.value = actualCost;

        priceInput.style.display = 'block';
        priceInput.value = price;

        this.selectedComponents[type] = {
            name,
            price,
            cost: actualCost,
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
            items[index].scrollIntoView({block: 'nearest'});
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
                description: '经济实用办公电脑配置',
                components: [
                    {type: 'CPU', name: '（散片）英特尔 i3-12100F CPU处理器【4核8线程】质保三年', quantity: 1},
                    {type: '散热器', name: '安钛克 A35 2热管 静音无光CPU散热器（1700架构/intel平台专用）', quantity: 1},
                    {type: '主板', name: '七彩虹 H610M-D V20 DDR4 台式机主板', quantity: 1},
                    {type: '内存', name: '三星德乐 DDR4 8G 3200 台式机内存条', quantity: 1},  // 添加 quantity: 2
                    {type: '固态硬盘', name: '雷克沙 NM610PRO 500G M.2接口 NVMe协议（PCIe 3.0x4）读速3300MB/s  SSD固态硬盘', quantity: 1},
                    {type: '显卡', name: '艾尔莎 R5 220 1G 幻影 办公家用独立显卡（VGA+DVI+HDMI）', quantity: 1},
                    {type: '电源', name: '硕一台式机电脑电源全新PC电源 静音王450W额定300W(静音版)', quantity: 1},
                    {type: '机箱', name: '硕美达 2522 U2*2 办公商务机箱（仅支持小板）', quantity: 1}
                ]
            },
            {
                name: '轻度游戏',
                description: 'AMD高性能核显游戏配置',
                components: [
                    {type: 'CPU', name: '（盒装）AMD 锐龙5 5600GT处理器(r5) 6核12线程 加速频率至高4.6GHz', quantity: 1},
                    {type: '主板', name: '技嘉 A520M K V2 VGA HDMI 双接口', quantity: 1},
                    {type: '内存', name: '三星德乐 DDR4 8G 3200 台式机内存条', quantity: 2},
                    {type: '固态硬盘', name: '雷克沙 NM610PRO 500G M.2接口 NVMe协议（PCIe 3.0x4）读速3300MB/s  SSD固态硬盘', quantity: 1},
                    {type: '电源', name: '航嘉GS400 额定300W静音台式电源(工包）', quantity: 1},
                    {type: '机箱', name: '技展 天空之城  黑 海景房机箱（支持240水冷）', quantity: 1}
                ]
            },
            {
                name: '游戏配置',
                description: '高性能游戏电脑配置',
                components: [
                    {type: 'CPU', name: '(散片)英特尔 i5-12400F 6核12线程 CPU(LGA1700/4.4Ghz /18M)', quantity: 1},
                    {type: '散热器', name: '安钛克 战虎 A400SE 战斗版 4铜管 散热器（高度148MM/Intel平台专用）', quantity: 1},
                    {type: '主板', name: '微星（MSI）PRO H610M-S DDR4  台式机主板', quantity: 1},
                    {type: '内存', name: '三星德乐 DDR4 8G 3200 台式机内存条', quantity: 2},  // 添加 quantity: 2
                    {type: '固态硬盘', name: '雷克沙 NM610PRO 1T M.2接口 NVMe协议（PCIe 3.0x4）读速3300MB/s  SSD固态硬盘', quantity: 1},
                    {type: '显卡', name: '七彩虹 RTX 5050 8G DUO 战斧双风扇 电竞游戏显卡', quantity: 1},
                    {type: '电源', name: '安钛克 BP500P  额定500W 台式机电脑静音电源', quantity: 1},
                    {type: '机箱', name: '技展 天空之城  黑 海景房机箱（支持240水冷）', quantity: 1}
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
                    // 新增：支持预设数量，保持向后兼容
                    const quantity = item.quantity || 1;

                    this.selectedComponents[item.type] = {
                        name: component.name,
                        price: component.price,
                        cost: component.cost,
                        quantity: quantity,  // 修改这里
                        isCustom: false,
                        manualCost: false
                    };

                    input.value = component.name;
                    const quantityInput = document.querySelector(`.quantity-input[data-type="${item.type}"]`);
                    const costInput = document.querySelector(`.cost-input[data-type="${item.type}"]`);
                    const priceInput = document.querySelector(`.price-input[data-type="${item.type}"]`);

                    quantityInput.style.display = 'block';
                    quantityInput.value = quantity;  // 修改这里

                    costInput.style.display = 'block';
                    costInput.value = component.cost;

                    priceInput.style.display = 'block';
                    priceInput.value = component.price;

                    this.updateRegularRow(item.type);
                }
            }
        });
    }
    clearSelection(type) {
        if (type === '其它1' || type === '其它2') {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            row.querySelector('.other-name-input').value = '';
            row.querySelector('.quantity-input').value = '1';
            row.querySelector('.cost-input').value = '0';
            row.querySelector('.price-input').value = '0';
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        } else {
            const row = document.querySelector(`tr[data-type="${type}"]`);
            const input = row.querySelector('.search-input');
            input.value = '';

            const quantityInput = row.querySelector('.quantity-input');
            const costInput = row.querySelector('.cost-input');
            const priceInput = row.querySelector('.price-input');

            quantityInput.style.display = 'block';
            quantityInput.value = '';

            costInput.style.display = 'none';
            costInput.value = '';

            priceInput.style.display = 'none';
            priceInput.value = '';

            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }

        delete this.selectedComponents[type];
        this.updateTotals();
    }

    clearAllConfig() {
        if (confirm('确定要清空所有配置吗？这将清除所有已选择的配件。')) {
            this.selectedComponents = {};

            const types = ['CPU', '散热器', '主板', '内存', '固态硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];

            types.forEach(type => {
                const row = document.querySelector(`tr[data-type="${type}"]`);
                if (!row) return;

                if (type === '其它1' || type === '其它2') {
                    const nameInput = row.querySelector('.other-name-input');
                    const quantityInput = row.querySelector('.quantity-input');
                    const costInput = row.querySelector('.cost-input');
                    const priceInput = row.querySelector('.price-input');

                    nameInput.value = '';
                    quantityInput.value = '1';
                    costInput.value = '0';
                    priceInput.value = '0';
                } else {
                    const searchInput = row.querySelector('.search-input');
                    const quantityInput = row.querySelector('.quantity-input');
                    const costInput = row.querySelector('.cost-input');
                    const priceInput = row.querySelector('.price-input');

                    searchInput.value = '';
                    quantityInput.value = '1';
                    quantityInput.style.display = 'block';
                    costInput.style.display = 'none';
                    costInput.value = '';
                    priceInput.style.display = 'none';
                    priceInput.value = '';
                }

                row.querySelector('.subtotal').textContent = '-';
                row.querySelector('.profit').textContent = '-';
            });

            this.updateTotals();
        }
    }

    adjustQuantity(type, isPlus) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        const quantityInput = row.querySelector('.quantity-input');

        let quantity = parseInt(quantityInput.value) || 0;

        if (isPlus) {
            quantity++;
            quantityInput.style.display = 'block';
        } else {
            quantity = Math.max(0, quantity - 1);
        }

        quantityInput.value = quantity;

        if (type === '其它1' || type === '其它2') {
            this.handleOtherInputImmediate(type);
        } else {
            if (this.selectedComponents[type]) {
                this.selectedComponents[type].quantity = quantity;
                if (quantity > 0) {
                    this.updateRegularRow(type);
                } else {
                    this.clearSelection(type);
                }
            } else if (quantity > 0) {
                quantityInput.style.display = 'block';
                const costInput = row.querySelector('.cost-input');
                const priceInput = row.querySelector('.price-input');
                costInput.style.display = 'block';
                priceInput.style.display = 'block';
            }
        }
    }

    async copyConfigToClipboard() {
        const lines = [];
        let totalAmount = 0;

        lines.push('装机天下电脑配置单 www.dnpz.net');
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(/\//g, '/');
        lines.push(`生成时间：${timeStr}`);
        lines.push('===========================');

        const typeOrder = ['CPU', '散热器', '主板', '内存', '固态硬盘', '显卡', '电源', '机箱', '显示器', '键鼠套装', '其它1', '其它2'];

        typeOrder.forEach(type => {
            const component = this.selectedComponents[type];
            if (component && component.quantity > 0 && component.price > 0) {
                const subtotal = component.price * component.quantity;
                totalAmount += subtotal;

                let displayName = component.name;
                if (component.quantity > 1) {
                    displayName += ` ×${component.quantity}`;
                }

                lines.push(`● ${type}：【${displayName}】${subtotal}元`);
            }
        });

        lines.push('===========================');
        lines.push(`💰 配置总价：${totalAmount}元 （不含运费，默认顺丰到付）`);
        lines.push(''); // 空行

        // 添加带图标的联系信息
        lines.push('✅ 承诺：所有配件保证全新正品 利润微薄！不议价！');
        lines.push('💬 微信：156169653');
        lines.push('🌐 官方网站：http://www.dnpz.net');
        lines.push('🛒 淘宝店：装机天下组装电脑店');

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

document.addEventListener('DOMContentLoaded', () => {
    new ConfigGenerator();
});