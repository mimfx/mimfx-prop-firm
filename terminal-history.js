(()=> {
const $=id=>document.getElementById(id);
if(!window.nexoraHistoryData)return;
let tab="positions";
const money=n=>{const v=Number(n)||0;return (v<0?"-$":"$")+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});};
const price=n=>Number(n||0).toFixed(5);
const date=s=>new Date(s).toLocaleString();
function data(){return window.nexoraHistoryData()||{};}
function filtered(list){const sym=$("historySymbolFilter").value,period=$("historyPeriodFilter").value,now=new Date();return list.filter(x=>{if(sym!=="all"&&x.symbol!==sym)return false;const d=new Date(x.time||x.createdAt||x.openedAt||Date.now());if(period==="today"&&d.toDateString()!==now.toDateString())return false;if(period==="week"&&(now-d)>7*86400000)return false;if(period==="month"&&(now-d)>31*86400000)return false;return true;});}
function card(p,closed){const pnl=closed?Number(p.result)||0:0;return '<article class="history-trade-card"><div class="history-trade-top"><b>'+p.symbol+'</b><strong class="'+(p.side==="BUY"?"buy-text":"sell-text")+'">'+p.side+'</strong><span class="history-type">'+(closed?"Closed":"Pending")+'</span></div><div class="history-trade-grid"><div><small>Volume</small><b>'+Number(p.volume||0).toFixed(2)+'</b></div><div><small>Entry</small><b>'+price(p.entry)+'</b></div><div><small>'+(closed?"Close price":"Order price")+'</small><b>'+price(closed?p.close:p.entry)+'</b></div><div><small>Profit</small><b class="'+(pnl>=0?"buy-text":"sell-text")+'">'+money(pnl)+'</b></div></div><time>'+date(closed?p.time:p.createdAt)+'</time></article>';}
function render(){const s=data(),hist=filtered(s.history||[]),pending=filtered(s.pending||[]),profit=(s.history||[]).reduce((n,x)=>n+(Number(x.result)||0),0);
$("histProfit").textContent=money(profit);$("histDeposit").textContent=money(s.size);$("histSwap").textContent=money(0);$("histCommission").textContent=money(0);$("histBalance").textContent=money((Number(s.size)||0)+profit);
const symbols=[...new Set([...(s.history||[]),...(s.pending||[])].map(x=>x.symbol))].sort(),sel=$("historySymbolFilter"),old=sel.value;sel.innerHTML='<option value="all">All symbols</option>'+symbols.map(x=>'<option value="'+x+'">'+x+'</option>').join("");sel.value=symbols.includes(old)?old:"all";$("historySymbolLabel").textContent=sel.value==="all"?"All symbols":sel.value;
$("historyPositionRows").innerHTML=hist.length?hist.map(x=>card(x,true)).join(""):'<p class="history-empty">No closed positions in this period.</p>';
$("historyDealRows").innerHTML=hist.length?hist.map(x=>card(x,true)).join(""):'<p class="history-empty">No deals recorded yet.</p>';
$("historyOrderRows").innerHTML=pending.length?pending.map(x=>card(x,false)).join(""):'<p class="history-empty">No order history in this period.</p>';
}
function setTab(t){tab=t;document.querySelectorAll("[data-history-tab]").forEach(b=>b.classList.toggle("active",b.dataset.historyTab===t));$("historyPositionsView").hidden=t!=="positions";$("historyOrdersView").hidden=t!=="orders";$("historyDealsView").hidden=t!=="deals";render();}
document.querySelectorAll("[data-history-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.historyTab)));
$("historySymbolFilter").addEventListener("change",render);$("historyPeriodFilter").addEventListener("change",render);
window.addEventListener("storage",render);
setTab("positions");setInterval(render,2000);
})();