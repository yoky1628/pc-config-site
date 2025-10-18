let parts = [];
let selectedParts = [];
let presetConfigs = [];

// 加载 data.json
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    parts = data;
    presetConfigs = generatePresetConfigs();
    loadPresetButtons();
  })
  .catch(err => console.error("加载 data.json 出错:", err));

// 加价规则示例
const pricingRules = { 
  CPU:{mode:"fixed",value:200}, 
  GPU:{mode:"percent",value:0.2}, 
  RAM:{mode:"fixed",value:50}, 
  Motherboard:{mode:"percent",value:0.15}, 
  SSD:{mode:"fixed",value:100}, 
  PSU:{mode:"percent",value:0.1} 
};

// 计算销售价
function calculateSalePrice(part){ 
  const rule = pricingRules[part.type]; 
  if(!rule) return part.basePrice; 
  if(rule.mode==="fixed") return part.basePrice+rule.value; 
  if(rule.mode==="percent") return Math.round(part.basePrice*(1+rule.value)); 
  return part.basePrice; 
}

// 更新配置表格
function updateConfigTable(){
  const tbody = document.querySelector("#configTable tbody");
  tbody.innerHTML="";
  let totalProfit = 0;
  selectedParts.forEach((p,index)=>{
    const sale = calculateSalePrice(p);
    const profit = (sale-p.basePrice)*p.quantity;
    totalProfit += profit;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.type}</td>
      <td>${p.name}</td>
      <td>${p.basePrice}</td>
      <td>${sale}</td>
      <td><input type="number" min="1" value="${p.quantity}" data-index="${index}" class="qtyInput"></td>
      <td>${sale*p.quantity}</td>
      <td>${profit}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("totalProfit").textContent = totalProfit;

  document.querySelectorAll(".qtyInput").forEach(input=>{
    input.addEventListener("change",e=>{
      const idx = e.target.dataset.index;
      let val = parseInt(e.target.value);
      if(val<1) val=1;
      selectedParts[idx].quantity = val;
      updateConfigTable();
    });
  });
}

// 选择配件
function selectPart(part){
  if(!selectedParts.find(p=>p.name===part.name && p.type===part.type)){
    selectedParts.push({...part,quantity:1});
  }
  updateConfigTable();
  document.querySelectorAll(".search-results").forEach(c=>c.innerHTML="");
}

// 设置当前日期
function setCurrentDate(){
  const now = new Date();
  const d = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  document.getElementById("currentDate").textContent = d;
}

// 一键复制
function copyConfigToClipboard(){
  let text="电脑配置单\n类型\t名称\t成本\t销售\t数量\t小计\t利润\n";
  selectedParts.forEach(p=>{
    const sale = calculateSalePrice(p);
    const profit = (sale-p.basePrice)*p.quantity;
    text += `${p.type}\t${p.name}\t${p.basePrice}\t${sale}\t${p.quantity}\t${sale*p.quantity}\t${profit}\n`;
  });
  text += `总利润: ${selectedParts.reduce((sum,p)=>(sum+(calculateSalePrice(p)-p.basePrice)*p.quantity),0)} 元\n`;
  navigator.clipboard.writeText(text).then(()=>alert("已复制到剪贴板"));
}
document.getElementById("copyBtn").addEventListener("click", copyConfigToClipboard);

// 搜索功能
function matchKeyword(keyword, name){
  keyword = keyword.trim().toLowerCase();
  return name.toLowerCase().includes(keyword);
}

function searchParts(keyword, typeFilter){
  const allParts = parts.filter(p => p.type === typeFilter);
  if(keyword.trim() === "") return allParts;
  return allParts.filter(p => matchKeyword(keyword, p.name));
}

function renderResults(containerId, results, currentPresetIndex = null){
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  results.forEach((item, index)=>{
    const div = document.createElement("div");
    div.className = "search-result";
    div.setAttribute("data-index", index);
    let text = `${item.name} - 成本:${item.basePrice} 销售:${calculateSalePrice(item)}`;
    if(currentPresetIndex !== null && item.preset.includes(currentPresetIndex)){
      text += " ⭐";
      div.style.fontWeight = "bold";
    }
    div.textContent = text;
    div.onclick = () => selectPart(item);
    container.appendChild(div);
  });
}

function bindSearch(inputId, containerId, typeFilter){
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);

  input.addEventListener("focus", ()=>renderResults(containerId, searchParts("", typeFilter)));
  input.addEventListener("input", ()=>renderResults(containerId, searchParts(input.value, typeFilter)));

  input.addEventListener("keydown", e=>{
    const items = container.querySelectorAll(".search-result");
    if(!items.length) return;
    let selectedIndex = Array.from(items).findIndex(i => i.classList.contains("selected"));

    if(e.key==="ArrowDown"){ selectedIndex = selectedIndex<items.length-1?selectedIndex+1:0; }
    else if(e.key==="ArrowUp"){ selectedIndex = selectedIndex>0?selectedIndex-1:items.length-1; }
    else if(e.key==="Enter"){ if(selectedIndex>=0) selectPart(searchParts(input.value,typeFilter)[selectedIndex]); e.preventDefault(); return; }

    items.forEach(i=>i.classList.remove("selected"));
    if(selectedIndex>=0) items[selectedIndex].classList.add("selected");
    e.preventDefault();
  });
}

// 自动生成预设配置数组
function generatePresetConfigs() {
  if(!parts || parts.length===0) return [];
  const maxPresetIndex = Math.max(...parts.flatMap(p => p.preset.length? p.preset:[-1]));
  const presets = [];
  for(let i=0;i<=maxPresetIndex;i++){
    presets.push(parts.filter(p=>p.preset.includes(i)).map(p=>({...p,quantity:1})));
  }
  return presets;
}

// 加载预设配置按钮
function loadPresetButtons() {
  document.querySelectorAll(".presetBtn").forEach(btn => {
    const idx = Number(btn.dataset.index);
    btn.addEventListener("click", () => {
      if(presetConfigs[idx] && presetConfigs[idx].length>0){
        selectedParts = JSON.parse(JSON.stringify(presetConfigs[idx]));
        updateConfigTable();
      } else {
        alert("该预设配置暂无配件数据");
      }
    });
  });
}

// 页面初始化
document.addEventListener("DOMContentLoaded",()=>{
  setCurrentDate();
  bindSearch("cpuInput","cpuResults","CPU");
  bindSearch("gpuInput","gpuResults","GPU");
  // 可继续绑定 RAM/SSD/PSU
});
