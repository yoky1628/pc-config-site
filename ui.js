class ConfigGenerator {
    constructor() {
        this.components = [];
        this.selectedComponents = {};
        this.inputTimeout = null;
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
            if (type === '其它1' || type === '其它2') {
                return `
                    <tr data-type="${type}">
                        <td>${type}</td>
                        <td>
                            <input type="text" class="other-name-input" 
                                   data-type="${type}" placeholder="请输入${type}名称" 
                                   style="width: 100%; padding: 6px; border: 1px solid #ced4da; border-radius: 3px;">
                        </td>
                        <td>
                            <input type="number" class="quantity-input" data-type="${type}" 
                                   min="1" value="1" placeholder="1" style="width: 60px; padding: 6px; display: block;">
                        </td>
                        <td>
                            <input type="text" class="cost-input" data-type="${type}" 
                                   placeholder="成本价" style="width: 80px; padding: 6px; display: block;">
                        </td>
                        <td>
                            <input type="text" class="price-input" data-type="${type}" 
                                   placeholder="销售价" style="width: 80px; padding: 6px; display: block;">
                        </td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            } else {
                return `
                    <tr data-type="${type}">
                        <td>${type}</td>
                        <td>
                            <div class="search-container">
                                <input type="text" class="search-input" placeholder="搜索或选择配件" 
                                       data-type="${type}" autocomplete="off" style="width: 100%; padding: 6px;">
                                <div class="dropdown" style="display: none;"></div>
                            </div>
                        </td>
                        <td>
                            <input type="number" class="quantity-input" data-type="${type}" 
                                   min="1" value="" placeholder="0" style="width: 60px; padding: 6px; display: none;">
                        </td>
                        <td class="cost" data-type="${type}">-</td>
                        <td class="price" data-type="${type}">-</td>
                        <td class="subtotal" data-type="${type}">-</td>
                        <td class="profit" data-type="${type}">-</td>
                    </tr>
                `;
            }
        }).join('');
    }

    bindEvents() {
        // 搜索功能事件
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleSearch(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-input')) {
                if (e.target.value === '') {
                    this.showAllOptions(e.target);
                }
            }
            if (e.target.classList.contains('dropdown-item')) {
                this.selectComponent(e.target);
            }
        });

        // 其它类型输入事件 - 使用延迟处理
        document.addEventListener('input', (e) => {
            const type = e.target.dataset.type;
            
            if (e.target.classList.contains('other-name-input') || 
                e.target.classList.contains('quantity-input') ||
                e.target.classList.contains('price-input') ||
                e.target.classList.contains('cost-input')) {
                
                // 延迟处理输入，让用户有时间完成输入
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    this.processOtherInput(type);
                }, 800); // 800毫秒后处理
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('search-input')) {
                this.handleKeyboard(e);
            }
        });

        // 按钮事件
        document.getElementById('copyConfig').addEventListener('click', () => {
            this.copyConfigToClipboard();
        });

        document.getElementById('loadPreset').addEventListener('click', () => {
            this.showPresetModal();
        });

        // 模态框事件
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

    processOtherInput(type) {
        const row = document.querySelector(`tr[data-type="${type}"]`);
        const nameInput = row.querySelector('.other-name-input');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const costInput = row.querySelector('.cost-input');
        
        const name = nameInput.value.trim();
        const quantity = parseInt(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const cost = parseFloat(costInput.value) || 0;

        if (name && quantity > 0 && price > 0) {
            this.selectedComponents[type] = {
                name,
                price,
                cost,
                quantity,
                isCustom: true
            };
            
            this.updateOtherRowDisplay(type);
        } else {
            delete this.selectedComponents[type];
            this.updateOtherRowDisplay(type);
        }
        
        this.updateTotals();
    }

    updateOtherRowDisplay(type) {
        const component = this.selectedComponents[type];
        const row = document.querySelector(`tr[data-type="${type}"]`);
        
        if (component) {
            const subtotal = component.price * component.quantity;
            const profit = (component.price - component.cost) * component.quantity;
            
            row.querySelector('.subtotal').textContent = `¥${subtotal.toFixed(2)}`;
            row.querySelector('.profit').textContent = `¥${profit.toFixed(2)}`;
        } else {
            row.querySelector('.subtotal').textContent = '-';
            row.querySelector('.profit').textContent = '-';
        }
    }

    // ... 其他方法保持不变（handleSearch, searchComponents, showAllOptions 等）
    // 为了节省空间，这里省略了其他未改变的方法，您只需要替换上面的部分
}

// 其余代码保持不变
