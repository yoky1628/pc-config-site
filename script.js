class PCConfigurator {
    constructor() {
        this.components = {};
        this.selectedComponents = {};
        this.totalPrice = 0;
        
        this.init();
    }

    async init() {
        await this.loadComponentsData();
        this.renderComponentCategories();
        this.setupEventListeners();
        this.updateSummary();
        this.loadFromLocalStorage();
    }

    // 加载配件数据
    async loadComponentsData() {
        try {
            // 使用你的实际 raw 地址
            const response = await fetch('https://raw.githubusercontent.com/yoky1628/pc-config-site/main/data.json?t=' + Date.now());
            
            if (!response.ok) {
                throw new Error('数据加载失败: ' + response.status);
            }
            
            this.components = await response.json();
            console.log('配件数据加载成功', this.components);
            this.showMessage('数据加载成功', 'success');
            this.renderComponentCategories();
        } catch (error) {
            console.error('加载配件数据失败:', error);
            // 使用默认数据作为fallback
            this.components = this.getDefaultData();
            this.showMessage('使用默认数据，在线数据加载失败', 'warning');
        }
    }

    // 默认数据（备用）
    getDefaultData() {
        return {
            cpu: [
                { id: 'cpu1', name: 'Intel i5-13400', price: 1599, category: 'cpu', brand: 'intel', socket: '1700' },
                { id: 'cpu2', name: 'AMD Ryzen 5 7600X', price: 1699, category: 'cpu', brand: 'amd', socket: 'AM5' }
            ],
            motherboard: [
                { id: 'mb1', name: 'B760M 主板', price: 899, category: 'motherboard', socket: '1700', brand: 'msi' },
                { id: 'mb2', name: 'B650 主板', price: 999, category: 'motherboard', socket: 'AM5', brand: 'asus' }
            ],
            memory: [
                { id: 'mem1', name: '16GB DDR5 5200', price: 499, category: 'memory', capacity: 16 },
                { id: 'mem2', name: '32GB DDR5 5200', price: 899, category: 'memory', capacity: 32 }
            ],
            gpu: [
                { id: 'gpu1', name: 'RTX 4060 8GB', price: 2499, category: 'gpu', brand: 'nvidia' },
                { id: 'gpu2', name: 'RX 7600 8GB', price: 2199, category: 'gpu', brand: 'amd' }
            ],
            storage: [
                { id: 'ssd1', name: '1TB NVMe SSD', price: 399, category: 'storage', type: 'nvme', capacity: 1000 },
                { id: 'ssd2', name: '2TB NVMe SSD', price: 699, category: 'storage', type: 'nvme', capacity: 2000 }
            ],
            power: [
                { id: 'psu1', name: '650W 金牌电源', price: 499, category: 'power', wattage: 650 },
                { id: 'psu2', name: '750W 金牌电源', price: 599, category: 'power', wattage: 750 }
            ],
            case: [
                { id: 'case1', name: '中塔机箱', price: 299, category: 'case', type: 'mid-tower' },
                { id: 'case2', name: 'ATX机箱', price: 399, category: 'case', type: 'mid-tower' }
            ]
        };
    }

    // 渲染配件分类
    renderComponentCategories() {
        const componentsContainer = document.querySelector('.components');
        if (!componentsContainer) return;
        
        componentsContainer.innerHTML = '';

        Object.keys(this.components).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'component-category';
            
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = this.getCategoryName(category);
            categoryDiv.appendChild(categoryTitle);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'component-options';
            
            this.components[category].forEach(component => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'component-option';
                optionDiv.setAttribute('data-category', category);
                optionDiv.setAttribute('data-id', component.id);
                optionDiv.innerHTML = `
                    <div class="component-name">${component.name}</div>
                    <div class="component-price">¥${component.price}</div>
                `;
                optionDiv.addEventListener('click', () => this.selectComponent(category, component));
                
                // 如果这个配件已经被选中，标记为选中状态
                if (this.selectedComponents[category] && this.selectedComponents[category].id === component.id) {
                    optionDiv.classList.add('selected');
                }
                
                optionsDiv.appendChild(optionDiv);
            });

            categoryDiv.appendChild(optionsDiv);
            componentsContainer.appendChild(categoryDiv);
        });
    }

    // 获取分类中文名称
    getCategoryName(category) {
        const names = {
            cpu: '处理器 (CPU)',
            motherboard: '主板',
            memory: '内存',
            gpu: '显卡 (GPU)',
            storage: '存储',
            power: '电源',
            case: '机箱'
        };
        return names[category] || category;
    }

    // 选择配件
    selectComponent(category, component) {
        // 移除之前的选择
        const previousSelected = document.querySelectorAll(`.component-option.selected[data-category="${category}"]`);
        previousSelected.forEach(selected => {
            selected.classList.remove('selected');
        });

        // 添加新选择
        event.target.closest('.component-option').classList.add('selected');

        this.selectedComponents[category] = component;
        this.updateSummary();
        this.updatePreview();
        this.saveToLocalStorage();
        this.checkCompatibility(component);
    }

    // 兼容性检查
    checkCompatibility(selectedComponent) {
        const issues = [];
        
        // CPU和主板兼容性检查
        if (selectedComponent.category === 'cpu' && this.selectedComponents.motherboard) {
            const cpu = selectedComponent;
            const motherboard = this.selectedComponents.motherboard;
            
            if (cpu.brand === 'intel' && motherboard.socket !== '1700') {
                issues.push('CPU与主板插槽不兼容');
            }
            if (cpu.brand === 'amd' && motherboard.socket !== 'AM5') {
                issues.push('CPU与主板插槽不兼容');
            }
        }
        
        // 电源功率检查
        if (selectedComponent.category === 'gpu' && this.selectedComponents.power) {
            const estimatedPower = this.calculatePowerConsumption();
            const power = this.selectedComponents.power;
            
            if (estimatedPower > power.wattage * 0.8) {
                issues.push('电源功率可能不足');
            }
        }
        
        if (issues.length > 0) {
            this.showMessage('兼容性警告: ' + issues.join(', '), 'warning');
        }
    }

    calculatePowerConsumption() {
        let totalPower = 0;
        Object.values(this.selectedComponents).forEach(component => {
            // 简化的功率估算
            const powerMap = {
                cpu: 65,
                gpu: 200,
                motherboard: 50,
                memory: 15,
                storage: 10,
                power: 0,
                case: 0
            };
            totalPower += powerMap[component.category] || 0;
        });
        return totalPower;
    }

    // 更新总价和摘要
    updateSummary() {
        this.totalPrice = Object.values(this.selectedComponents).reduce((total, component) => {
            return total + (component ? component.price : 0);
        }, 0);

        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            totalPriceElement.textContent = `总价: ¥${this.totalPrice}`;
        }
    }

    // 更新配置预览
    updatePreview() {
        const preview = document.getElementById('configPreview');
        if (!preview) return;
        
        preview.innerHTML = '';

        Object.keys(this.selectedComponents).forEach(category => {
            const component = this.selectedComponents[category];
            if (component) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'config-item';
                itemDiv.innerHTML = `
                    <span class="config-item-name">${this.getCategoryName(category)}: ${component.name}</span>
                    <span class="config-item-price">¥${component.price}</span>
                `;
                preview.appendChild(itemDiv);
            }
        });

        // 添加总计行
        if (Object.keys(this.selectedComponents).length > 0) {
            const totalDiv = document.createElement('div');
            totalDiv.className = 'config-item';
            totalDiv.style.fontWeight = 'bold';
            totalDiv.style.borderTop = '2px solid #333';
            totalDiv.innerHTML = `
                <span class="config-item-name">总计</span>
                <span class="config-item-price">¥${this.totalPrice}</span>
            `;
            preview.appendChild(totalDiv);
        }
    }

    // 保存配置到本地存储
    saveToLocalStorage() {
        const config = {
            selectedComponents: this.selectedComponents,
            timestamp: Date.now()
        };
        localStorage.setItem('pcConfig', JSON.stringify(config));
    }

    // 从本地存储加载配置
    loadFromLocalStorage() {
        const saved = localStorage.getItem('pcConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.selectedComponents = config.selectedComponents || {};
                this.updateSummary();
                this.updatePreview();
                this.showMessage('已恢复上次的配置', 'info');
            } catch (e) {
                console.error('加载保存的配置失败:', e);
            }
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        const generateBtn = document.getElementById('generateBtn');
        const exportBtn = document.getElementById('exportBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateConfig());
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportConfig());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetConfig());
        }
        
        const usageType = document.getElementById('usageType');
        const budget = document.getElementById('budget');
        
        if (usageType) {
            usageType.addEventListener('change', (e) => this.applyPreset(e.target.value));
        }
        if (budget) {
            budget.addEventListener('change', (e) => this.applyBudget(parseInt(e.target.value)));
        }
    }

    // 应用预设配置
    applyPreset(usageType) {
        console.log('应用使用场景:', usageType);
        // 这里可以根据使用场景自动选择配件
    }

    // 应用预算限制
    applyBudget(budget) {
        console.log('应用预算:', budget);
        // 这里可以过滤掉超过预算的配件选项
    }

    // 生成配置单
    generateConfig() {
        if (Object.keys(this.selectedComponents).length === 0) {
            alert('请至少选择一个配件！');
            return;
        }

        const config = {
            timestamp: new Date().toISOString(),
            totalPrice: this.totalPrice,
            components: this.selectedComponents
        };

        console.log('生成的配置:', config);
        this.showMessage('配置单生成成功！', 'success');
        
        // 在实际应用中，这里可以保存到服务器或生成图片
    }

    // 导出配置
    exportConfig() {
        if (Object.keys(this.selectedComponents).length === 0) {
            alert('请先选择配件！');
            return;
        }

        const configText = this.formatConfigForExport();
        const blob = new Blob([configText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `电脑配置单_${new Date().toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('配置单已导出', 'success');
    }

    // 格式化配置用于导出
    formatConfigForExport() {
        let text = '电脑配置单\n';
        text += '生成时间: ' + new Date().toLocaleString() + '\n';
        text += '='.repeat(30) + '\n\n';

        Object.keys(this.selectedComponents).forEach(category => {
            const component = this.selectedComponents[category];
            if (component) {
                text += `${this.getCategoryName(category)}: ${component.name} - ¥${component.price}\n`;
            }
        });

        text += '\n' + '='.repeat(30) + '\n';
        text += `总计: ¥${this.totalPrice}\n\n`;
        text += '备注: 此配置单由电脑配置生成器生成';

        return text;
    }

    // 重置配置
    resetConfig() {
        if (confirm('确定要重置所有配置吗？')) {
            this.selectedComponents = {};
            this.totalPrice = 0;
            document.querySelectorAll('.component-option.selected').forEach(option => {
                option.classList.remove('selected');
            });
            this.updateSummary();
            this.updatePreview();
            localStorage.removeItem('pcConfig');
            this.showMessage('配置已重置', 'info');
        }
    }

    // 显示消息
    showMessage(text, type = 'info') {
        // 移除现有的消息
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PCConfigurator();
});
