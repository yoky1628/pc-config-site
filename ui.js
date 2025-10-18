let parts = [];
let selectedParts = [];

// 读取公共仓库 data.json（同根目录）
fetch('data.json')
  .then(res => res.json())
  .then(data => { parts = data; });

// 加价规则
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

// 更新表格
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

// 自动生成日期
function setCurrentDate(){
  const now = new Date();
  const d = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  document.getElementById("currentDate").textContent = d;
}

// 一键复制配置单
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

// 搜索绑定
function getPinyinInitials(str){ return str; }
function matchKeyword(keyword, name){
  keyword = keyword.trim().toLowerCase();
  const nameLower = name.toLowerCase();
  const initials = getPinyinInitials(name).toLowerCase();
  return nameLower.includes(keyword) || initials.includes(keyword);
}
function searchParts(keyword, typeFilter){
  const allParts = parts.filter(p => p.type === typeFilter);
  if(keyword.trim() === "") return allParts;
  return allParts.filter(p => matchKeyword(keyword, p.name));
}
function renderResults(containerId, results){
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  results.forEach((item, index)=>{
    const div = document.createElement("div");
    div.className = "search-result";
    div.setAttribute("data-index", index);
    div.textContent = `${item.name} - 成本:${item.basePrice} 销售:${calculateSalePrice(item)}`;
    div.onclick = () => selectPart(item);
    container.appendChild(div);
  });
}
function bindSearch(inputId, containerId, typeFilter){
  const input = document.getElementById(inputId);
  input.addEventListener("focus", ()=>renderResults(containerId, searchParts("", typeFilter)));
  input.addEventListener("input", ()=>renderResults(containerId, searchParts(input.value, typeFilter)));
  input.addEventListener("keydown", e=>{
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll(".search-result");
    if(!items.length) return;
    let selected = container.querySelector(".selected");
    let index = selected ? Number(selected.dataset.index) : -1;
    if(e.key==="ArrowDown"){ if(index<items.length-1) index++; items.forEach(i=>i.classList.remove("selected")); items[index].classList.add("selected"); e.preventDefault();}
    else if(e.key==="ArrowUp"){ if(index>0) index--; items.forEach(i=>i.classList.remove("selected")); items[index].classList.add("selected"); e.preventDefault();}
    else if(e.key==="Enter"){ if(index>=0) selectPart(items[index]); e.preventDefault();}
  });
}

// 预设配置
const presetConfigs = [
  [{type:"CPU",name:"锐龙5 5600X",basePrice:1200,quantity:1},{type:"GPU",name:"RTX 4060",basePrice:2500,quantity:1}],
  [{type:"CPU",name:"Core i5-13400F",basePrice:1100,quantity:1},{type:"GPU",name:"RTX 4070",basePrice:4000,quantity:1}],
  [{type:"CPU",name:"锐龙7 5800X",basePrice:1800,quantity:1},{type:"GPU",name:"RX 7700XT",basePrice:3500,quantity:1}],
  [{type:"CPU",name:"Core i7-13700F",basePrice:2000,quantity:1},{type:"GPU",name:"RTX 4080",basePrice:7000,quantity:1}],
  [{type:"CPU",name:"锐龙9 7900X",basePrice:3500,quantity:1},{type:"GPU",name:"RTX 4080",basePrice:7000,quantity:1}]
];
function loadPresetButtons(){
  document.querySelectorAll(".presetBtn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx = btn.dataset.index;
      selectedParts = JSON.parse(JSON.stringify(presetConfigs[idx]));
      updateConfigTable();
    });
  });
}
