let partsData = {};

const fixedParts = [
  "CPU", "散热器", "主板", "内存", "硬盘", "显卡",
  "电源", "机箱", "显示器", "键鼠套装", "其它1", "其它2"
];

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("date").innerText = new Date().toLocaleDateString();

  try {
    const res = await fetch("data.json");
    partsData = await res.json();
  } catch (e) {
    console.error("data.json 加载失败", e);
  }

  const tbody = document.getElementById("tableBody");
  fixedParts.forEach(type => tbody.appendChild(createRow(type)));

  document.getElementById("copyBtn").addEventListener("click", copyConfig);
  document.getElementById("clearAll").addEventListener("click", clearAll);
});

// 创建表格行
function createRow(type) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${type}</td>
    <td style="position:relative;">
      <input class="nameInput" placeholder="输入关键字搜索" autocomplete="off">
      <div class="suggestions"></div>
    </td>
    <td class="cost">0</td>
    <td class="sale">0</td>
    <td><input type="number" class="qty" value="1" min="1"></td>
    <td class="subtotal">0</td>
    <td class="profit">0</td>
  `;

  const input = tr.querySelector(".nameInput");
  const box = tr.querySelector(".suggestions");
  const qty = tr.querySelector(".qty");

  input.addEventListener("input", () => {
    if (type.includes("其它")) {
      manualUpdate(tr);
    } else {
      showSuggestions(type, input, box, tr);
    }
  });

  qty.addEventListener("input", () => updateSubtotal(tr));
  return tr;
}

// 搜索建议
function showSuggestions(type, input, box, tr) {
  const keyword = input.value.trim();
  if (!keyword) {
    box.style.display = "none";
    return;
  }

  const list = partsData[type] || [];
  const results = list.filter(p => p.name.includes(keyword)).slice(0, 10);

  if (!results.length) {
    box.style.display = "none";
    return;
  }

  box.innerHTML = results.map(p => `<div>${p.name}</div>`).join('');
  box.style.display = "block";

  box.querySelectorAll("div").forEach(div => {
    div.addEventListener("click", () => {
      input.value = div.textContent;
      box.style.display = "none";
      const part = list.find(p => p.name === div.textContent);
      fillRowData(tr, part);
    });
  });
}

// 填充单行数据
function fillRowData(tr, part) {
  const cost = part.cost || 0;
  const sale = Math.round(cost * 1.15);
  const qty = parseInt(tr.querySelector(".qty").value) || 1;

  const subtotal = sale * qty;
  const profit = (sale - cost) * qty;

  tr.querySelector(".cost").textContent = cost;
  tr.querySelector(".sale").textContent = sale;
  tr.querySelector(".subtotal").textContent = subtotal;
  tr.querySelector(".profit").textContent = profit;

  updateTotals();
}

function manualUpdate(tr) {
  tr.querySelector(".cost").textContent = "0";
  tr.querySelector(".sale").textContent = "0";
  tr.querySelector(".subtotal").textContent = "0";
  tr.querySelector(".profit").textContent = "0";
  updateTotals();
}

function updateSubtotal(tr) {
  const sale = parseFloat(tr.querySelector(".sale").textContent) || 0;
  const cost = parseFloat(tr.querySelector(".cost").textContent) || 0;
  const qty = parseInt(tr.querySelector(".qty").value) || 1;
  const subtotal = sale * qty;
  const profit = (sale - cost) * qty;
  tr.querySelector(".subtotal").textContent = subtotal;
  tr.querySelector(".profit").textContent = profit;
  updateTotals();
}

// 汇总
function updateTotals() {
  let totalCost = 0, totalSale = 0, totalProfit = 0;
  document.querySelectorAll("#tableBody tr").forEach(tr => {
    const cost = parseFloat(tr.querySelector(".cost").textContent) || 0;
    const sale = parseFloat(tr.querySelector(".sale").textContent) || 0;
    const qty = parseInt(tr.querySelector(".qty").value) || 1;
    totalCost += cost * qty;
    totalSale += sale * qty;
    totalProfit += (sale - cost) * qty;
  });

  document.getElementById("costTotal").textContent = totalCost;
  document.getElementById("saleTotal").textContent = totalSale;
  document.getElementById("profitTotal").textContent = totalProfit;
}

// 复制配置单
function copyConfig() {
  let text = "【装机配置单】\n";
  text += `日期：${document.getElementById("date").innerText}\n\n`;
  document.querySelectorAll("#tableBody tr").forEach(tr => {
    const type = tr.children[0].innerText;
    const name = tr.querySelector(".nameInput").value;
    const cost = tr.querySelector(".cost").textContent;
    const sale = tr.querySelector(".sale").textContent;
    const qty = tr.querySelector(".qty").value;
    const subtotal = tr.querySelector(".subtotal").textContent;
    const profit = tr.querySelector(".profit").textContent;
    text += `${type}：${name || "-"} ×${qty}\n成本￥${cost} / 售价￥${sale} / 小计￥${subtotal} / 利润￥${profit}\n\n`;
  });
  text += `总成本：￥${document.getElementById("costTotal").textContent}\n`;
  text += `总售价：￥${document.getElementById("saleTotal").textContent}\n`;
  text += `总利润：￥${document.getElementById("profitTotal").textContent}\n`;

  navigator.clipboard.writeText(text);
  alert("配置单已复制到剪贴板");
}

// 清空
function clearAll() {
  document.querySelectorAll(".nameInput").forEach(i => i.value = "");
  document.querySelectorAll(".cost,.sale,.subtotal,.profit").forEach(c => c.textContent = "0");
  document.querySelectorAll(".qty").forEach(q => q.value = 1);
  updateTotals();
}
