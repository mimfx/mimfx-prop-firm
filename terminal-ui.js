(()=> {
const $=id=>document.getElementById(id), watchKey="nexora_watchlist";
const getWatch=()=>{try{return JSON.parse(localStorage.getItem(watchKey))||[]}catch{return[]}};
const setWatch=a=>localStorage.setItem(watchKey,JSON.stringify([...new Set(a)]));
const symbolSelect=$("symbol"),all=[...symbolSelect.options].filter(o=>o.value).map(o=>({symbol:o.value,label:o.textContent,group:o.parentElement.label||""}));
let pickerCategory="fx",selectedQuote=null,longTimer=null;
const categoryOf=x=>/CRYPTO/i.test(x.group)?"crypto":/INDICES/i.test(x.group)?"index":/PRECIOUS/i.test(x.group)?"metal":/MINOR/i.test(x.group)?"minor":"fx";
function syncWatch(){const current=getWatch();setWatch(current.length?current:["EURUSD","GBPUSD","USDJPY","XAUUSD"]);}
syncWatch();
function drawChoices(){const q=$("symbolSearch").value.toLowerCase();$("symbolChoices").innerHTML=all.filter(x=>categoryOf(x)===pickerCategory&&(x.symbol.toLowerCase().includes(q)||x.label.toLowerCase().includes(q))).map(x=>'<button class="symbol-choice" data-add-symbol="'+x.symbol+'"><span>'+x.symbol+' <small>'+x.label.split("·").slice(1).join("·")+'</small></span><b>'+(getWatch().includes(x.symbol)?"ADDED":"＋ ADD")+'</b></button>').join("")||'<p class="picker-empty">No matching symbols.</p>';}
function openPicker(){ $("symbolPicker").hidden=false;$("symbolSearch").value="";drawChoices();}
$("addSymbolButton")?.addEventListener("click",openPicker);
$("closeSymbolPicker")?.addEventListener("click",()=> $("symbolPicker").hidden=true);
$("doneSymbolPicker")?.addEventListener("click",()=>{$("symbolPicker").hidden=true;});
$("symbolPicker")?.addEventListener("click",e=>{const tab=e.target.closest("[data-category]");if(tab){pickerCategory=tab.dataset.category;document.querySelectorAll("[data-category]").forEach(b=>b.classList.toggle("active",b===tab));drawChoices();return;}const add=e.target.closest("[data-add-symbol]");if(add){const s=add.dataset.addSymbol;setWatch([...getWatch(),s]);drawChoices();const nativeRender=$("quotesList");if(nativeRender){const row=nativeRender.querySelector('[data-quote-symbol="'+s+'"]');if(!row)setTimeout(()=>{},0);}return;}});
$("symbolSearch")?.addEventListener("input",drawChoices);
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{pickerCategory=b.dataset.category;drawChoices()}));
function selectSymbol(s){if(!all.some(x=>x.symbol===s))return;symbolSelect.value=s;symbolSelect.dispatchEvent(new Event("change",{bubbles:true}));document.body.dataset.mobileView="charts";setNav("charts");}
function setNav(view){document.body.dataset.mobileView=view;document.querySelectorAll("[data-mobile-view]").forEach(b=>b.classList.toggle("active",b.dataset.mobileView===view));}
$("quotesList")?.addEventListener("click",e=>{const row=e.target.closest("[data-quote-symbol]");if(row)selectSymbol(row.dataset.quoteSymbol);});
$("quotesList")?.addEventListener("contextmenu",e=>{const row=e.target.closest("[data-quote-symbol]");if(!row)return;e.preventDefault();selectedQuote=row.dataset.quoteSymbol;const m=$("quoteActions");m.hidden=false;m.style.top=Math.min(e.clientY,innerHeight-210)+"px";m.style.left=Math.min(e.clientX,innerWidth-220)+"px";});
$("quotesList")?.addEventListener("touchstart",e=>{const row=e.target.closest("[data-quote-symbol]");if(!row)return;selectedQuote=row.dataset.quoteSymbol;longTimer=setTimeout(()=>{const m=$("quoteActions");m.hidden=false;m.style.left="50%";m.style.top="45%";m.style.transform="translate(-50%,-50%)";},550);},{passive:true});
["touchend","touchmove","touchcancel"].forEach(n=>$("quotesList")?.addEventListener(n,()=>clearTimeout(longTimer),{passive:true}));
$("quoteActions")?.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const action=b.dataset.action,m=$("quoteActions");m.hidden=true;m.style.transform="";if(action==="chart")selectSymbol(selectedQuote);if(action==="trade"){selectSymbol(selectedQuote);openTicket("market");}if(action==="remove"){setWatch(getWatch().filter(s=>s!==selectedQuote));const row=$('quotesList [data-quote-symbol="'+selectedQuote+'"]');row?.remove();}});
document.addEventListener("click",e=>{if(!e.target.closest("#quoteActions")&&!e.target.closest("#quotesList")){$("quoteActions").hidden=true;$("quoteActions").style.transform="";}});
function setVolume(v){$("volume").value=v;$("quickVolume").value=v;$("topVolume").value=v;}
$("topVolume")?.addEventListener("change",e=>setVolume(e.target.value));
$("quickVolume")?.addEventListener("change",e=>setVolume(e.target.value));
window.nexoraExecuteMarketOrder=(side)=>{
 const type=$("orderType"); type.value="market";type.dispatchEvent(new Event("change"));
 const btn=$(side==="BUY"?"buyBtn":"sellBtn");
 if(btn.disabled){alert("No fresh executable demo quote yet. Wait for the quote to update, then try again.");return;}
 btn.click();
};
$("topBuy")?.addEventListener("click",()=>window.nexoraExecuteMarketOrder("BUY"));
$("topSell")?.addEventListener("click",()=>window.nexoraExecuteMarketOrder("SELL"));
function openTicket(type){$("orderType").value=type;$("orderType").dispatchEvent(new Event("change"));document.body.classList.add("order-ticket-open");renderOrderTabs();}
function closeTicket(){document.body.classList.remove("order-ticket-open");}
$("openOrderTicket")?.addEventListener("click",()=>openTicket($("orderType").value||"market"));
$("closeOrderTicket")?.addEventListener("click",closeTicket);
$("orderPanel")?.addEventListener("click",e=>{const b=e.target.closest("[data-order-type]");if(!b)return;openTicket(b.dataset.orderType);});
$("orderType")?.addEventListener("change",()=>{renderOrderTabs();const pending=$("orderType").value!=="market";$("stopLimitWrap").hidden=!$("orderType").value.endsWith("stop_limit");$("pendingPrice").disabled=!pending;$("pendingPrice").placeholder=pending?"Required trigger price":"Market price";});
function renderOrderTabs(){document.querySelectorAll("[data-order-type]").forEach(b=>b.classList.toggle("active",b.dataset.orderType===$("orderType").value));}
$("placePending")?.addEventListener("click",()=>setTimeout(closeTicket,100));
$("buyBtn")?.addEventListener("click",()=>setTimeout(closeTicket,100));
$("sellBtn")?.addEventListener("click",()=>setTimeout(closeTicket,100));
$("topTimeframe")?.addEventListener("change",e=>{const b=document.querySelector('#timeframes [data-tf="'+e.target.value+'"]');b?.click();});
$("timeframes")?.addEventListener("click",e=>{const b=e.target.closest("[data-tf]");if(b)$("topTimeframe").value=b.dataset.tf;});
$("toolsMenu")?.addEventListener("click",()=>setNav("quotes"));
$("crosshairTool")?.addEventListener("click",()=>{const b=$("crosshairTool");b.classList.toggle("selected");window.dispatchEvent(new CustomEvent("nexora-crosshair-toggle",{detail:{enabled:b.classList.contains("selected")}}));});
$("indicatorsTool")?.addEventListener("click",()=>alert("Indicators are not enabled in this NEXORA terminal build."));
$("alertsTool")?.addEventListener("click",()=>alert("Price alerts are not enabled yet."));
$("chartTools")?.addEventListener("click",()=>openTicket($("orderType").value||"market"));
function updateAccount(){const bal=Number(($("balance").textContent||"").replace(/[^0-9.-]/g,""))||0,flt=Number(($("openPnl").textContent||"").replace(/[^0-9.-]/g,""))||0,eq=bal+flt;let margin=0;document.querySelectorAll("#positionsBody tr").forEach(row=>{const cells=row.querySelectorAll("td");if(cells.length<9)return;const s=cells[0].textContent,vol=Number(cells[2].textContent),entry=Number(cells[3].textContent);const opt=all.find(x=>x.symbol===s),raw=opt?.symbol||"";const contract=/USD$/.test(raw)?100000:/JPY$/.test(raw)?100000:raw==="XAUUSD"?100:raw==="XAGUSD"?5000:1;margin+=Math.abs(entry*vol*contract)/100;});$("mtBalance").textContent=$("balance").textContent;$("mtEquity").textContent=$("equity").textContent;$("mtFloating").textContent=$("openPnl").textContent;$("mtFloating").classList.toggle("negative",flt<0);$("mtMargin").textContent="$"+margin.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});$("mtFreeMargin").textContent="$"+(eq-margin).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});$("mtMarginLevel").textContent=margin>0?((eq/margin)*100).toFixed(2)+"%":"—";$("topBid").textContent=$("quickBid").textContent;$("topAsk").textContent=$("quickAsk").textContent;}
const observer=new MutationObserver(updateAccount);["balance","openPnl","equity","positionsBody","quickBid","quickAsk"].forEach(id=>{const el=$(id);if(el)observer.observe(el,{childList:true,subtree:true,characterData:true});});
setInterval(updateAccount,1000);
document.querySelectorAll("[data-mobile-view]").forEach(b=>b.addEventListener("click",e=>{
 e.preventDefault();e.stopImmediatePropagation();const view=b.dataset.mobileView;setNav(view);
 if(view==="trade"){document.querySelector('[data-trade-tab="positions"]')?.click();$("accountOverview").scrollIntoView({block:"start",behavior:"smooth"});}
 if(view==="history"){$("historyScreen").hidden=false;$("historyScreen").scrollIntoView({block:"start",behavior:"smooth"});}
 if(view==="charts"){$("terminalWorkspace").scrollIntoView({block:"start",behavior:"smooth"});}
 if(view==="quotes"){$("quotesScreen").scrollIntoView({block:"start",behavior:"smooth"});}
}));
document.body.dataset.mobileView="charts";setNav("charts");renderOrderTabs();updateAccount();
})();