(()=> {
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const key="nexora_terminal_demo_v2", MARKET_API="https://nexora-market-data-api.onrender.com";
let state=load(),symbol="XAUUSD",tf="5m",quotePollTimer=null,activeTab="positions",chart=null,candleSeries=null,chartResizeObserver=null,priceLines=[];
const liveQuotes={};
const raw={"EURUSD":[1.085,0.00012,5,100000,"fx"],"GBPUSD":[1.27,0.00014,5,100000,"fx"],"USDJPY":[150,0.018,3,100000,"fx"],"USDCHF":[0.88,0.0001,5,100000,"fx"],"USDCAD":[1.36,0.00012,5,100000,"fx"],"AUDUSD":[0.655,0.0001,5,100000,"fx"],"NZDUSD":[0.61,0.0001,5,100000,"fx"],"EURGBP":[0.855,0.0001,5,100000,"fx"],"EURCHF":[0.95,0.0001,5,100000,"fx"],"EURJPY":[162,0.018,3,100000,"fx"],"EURAUD":[1.65,0.00014,5,100000,"fx"],"EURNZD":[1.78,0.00015,5,100000,"fx"],"EURCAD":[1.47,0.00013,5,100000,"fx"],"GBPJPY":[190,0.02,3,100000,"fx"],"GBPCHF":[1.12,0.00012,5,100000,"fx"],"GBPAUD":[1.94,0.00016,5,100000,"fx"],"GBPCAD":[1.72,0.00014,5,100000,"fx"],"GBPNZD":[2.08,0.00017,5,100000,"fx"],"AUDJPY":[98,0.015,3,100000,"fx"],"AUDCHF":[0.575,0.0001,5,100000,"fx"],"AUDCAD":[0.89,0.0001,5,100000,"fx"],"AUDNZD":[1.08,0.00012,5,100000,"fx"],"NZDJPY":[91,0.014,3,100000,"fx"],"NZDCHF":[0.537,0.00009,5,100000,"fx"],"NZDCAD":[0.83,0.0001,5,100000,"fx"],"CADJPY":[110,0.016,3,100000,"fx"],"CADCHF":[0.647,0.0001,5,100000,"fx"],"CHFJPY":[170,0.02,3,100000,"fx"],"US30":[39000,8,1,1,"index"],"US500":[5200,1.2,1,1,"index"],"NAS100":[18200,5,1,1,"index"],"US2000":[2050,1,1,1,"index"],"UK100":[8300,2,1,1,"index"],"GER40":[18500,5,1,1,"index"],"FRA40":[8000,2,1,1,"index"],"EU50":[5000,1.5,1,1,"index"],"JP225":[39000,10,1,1,"index"],"AUS200":[7800,2,1,1,"index"],"HK50":[17000,7,1,1,"index"],"BTCUSD":[68000,45,2,1,"crypto"],"ETHUSD":[3500,5,2,1,"crypto"],"BNBUSD":[580,1.5,2,1,"crypto"],"XRPUSD":[0.53,0.003,4,1,"crypto"],"SOLUSD":[165,1.2,2,1,"crypto"],"ADAUSD":[0.45,0.003,4,1,"crypto"],"DOGEUSD":[0.16,0.0015,5,1,"crypto"],"TRXUSD":[0.12,0.001,5,1,"crypto"],"LTCUSD":[85,0.7,2,1,"crypto"],"AVAXUSD":[35,0.5,2,1,"crypto"],"XAUUSD":[2350,0.18,2,100,"metal"],"XAGUSD":[28,0.025,3,5000,"metal"]};
const specs=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,{start:v[0],step:v[1],precision:v[2],contract:v[3],kind:v[4]}]));
const quotes=Object.fromEntries(Object.entries(specs).map(([k,v])=>[k,v.start]));
const paperSpread = s => {
 const spec=specs[s];
 if(spec.kind==="fx"){
  if(s.endsWith("JPY")) return ["USDJPY","EURJPY","GBPJPY","NZDJPY","AUDJPY","CADJPY","CHFJPY"].includes(s)?0.012:0.018;
  const major=["EURUSD","GBPUSD","USDCHF","USDCAD","AUDUSD","NZDUSD"].includes(s);
  return major?0.00010:0.00016;
 }
 if(spec.kind==="metal") return s==="XAUUSD"?0.30:0.035;
 if(spec.kind==="index") return ({US30:2.0,US500:0.6,NAS100:1.5,US2000:1.2,UK100:1.5,GER40:1.8,FRA40:1.5,EU50:1.2,JP225:5,AUS200:1.5,HK50:5})[s]||2;
 return ({BTCUSD:4,ETHUSD:1.2,BNBUSD:0.5,XRPUSD:0.001,SOLUSD:0.25,ADAUSD:0.001,DOGEUSD:0.0008,TRXUSD:0.0005,LTCUSD:0.25,AVAXUSD:0.15})[s]||0.2;
};
// NEXORA demo rollover window: 22:00–22:59 Africa/Lagos (WAT, UTC+1).
// Spreads widen temporarily to model lower liquidity around the daily rollover.
function isRolloverWindow(date=new Date()){
 const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Lagos",hour:"2-digit",hourCycle:"h23"}).format(date));
 return hour===22;
}
function appliedPaperSpread(s,date=new Date()){
 const base=paperSpread(s);
 if(!isRolloverWindow(date))return base;
 const kind=specs[s].kind;
 const multiplier=kind==="fx"?2.8:kind==="metal"?2.5:kind==="index"?2.0:1.6;
 return base*multiplier;
}

function load(){try{const old=JSON.parse(localStorage.getItem(key));if(old)return old;const prev=JSON.parse(localStorage.getItem("nexora_terminal_demo_v1"));return prev?{size:prev.size||10000,closedPnl:prev.closedPnl||0,positions:prev.positions||[],pending:[],history:[] }:{size:10000,closedPnl:0,positions:[],pending:[],history:[]}}catch{return{size:10000,closedPnl:0,positions:[],pending:[],history:[]}}}
function save(){localStorage.setItem(key,JSON.stringify(state))}
function fmt(n,s=symbol){return Number(n).toFixed(specs[s].precision)}
function quoteTradable(q){if(!q||q.marketState!=="open")return false;const age=Date.now()-Date.parse(q.timestamp);return Number.isFinite(age)&&age>=-60000&&age<=300000}
function exitPrice(p,q){return p.side==="BUY"?Number(q.bid):Number(q.ask)}
function pnl(p){const q=liveQuotes[p.symbol],s=specs[p.symbol];if(!q)return 0;const exit=exitPrice(p,q),d=(exit-p.entry)*(p.side==="BUY"?1:-1);let v=d*s.contract*p.volume;if(s.kind==="fx"&&!p.symbol.endsWith("USD"))v/=Math.max(exit,1e-8);return v}
function balance(){return state.size+state.closedPnl}
function closePosition(p,price,reason){const q=liveQuotes[p.symbol];const exit=Number.isFinite(price)?price:exitPrice(p,q);const s=specs[p.symbol],d=(exit-p.entry)*(p.side==="BUY"?1:-1);let result=d*s.contract*p.volume;if(s.kind==="fx"&&!p.symbol.endsWith("USD"))result/=Math.max(exit,1e-8);state.closedPnl+=result;state.positions=state.positions.filter(x=>x.id!==p.id);state.history.unshift({...p,close:exit,result,reason,time:new Date().toISOString()});state.history=state.history.slice(0,100);save()}
function validateStops(side,entry,sl,tp){if(sl!==null&&(!Number.isFinite(sl)||((side==="BUY"&&sl>=entry)||(side==="SELL"&&sl<=entry))))return "Stop Loss must be below a BUY entry or above a SELL entry.";if(tp!==null&&(!Number.isFinite(tp)||((side==="BUY"&&tp<=entry)||(side==="SELL"&&tp>=entry))))return "Take Profit must be above a BUY entry or below a SELL entry.";return ""}
function renderQuotesList(){const host=$("quotesList");if(!host)return;let watch=[];try{watch=JSON.parse(localStorage.getItem("nexora_watchlist")||"[]")}catch{}if(!Array.isArray(watch)||!watch.length){watch=["EURUSD","GBPUSD","USDJPY","USDCHF","USDCAD","AUDUSD","NZDUSD","EURGBP","EURJPY","GBPJPY","XAUUSD","XAGUSD","BTCUSD"];localStorage.setItem("nexora_watchlist",JSON.stringify(watch));}host.innerHTML=watch.map(s=>{const q=liveQuotes[s],mid=q&&Number.isFinite(Number(q.mid))?Number(q.mid):null,spread=appliedPaperSpread(s),bid=mid===null?null:mid-spread/2,ask=mid===null?null:mid+spread/2;return '<div class="quote-item" data-quote-symbol="'+s+'"><div><div class="quote-symbol">'+s+'</div><div class="quote-sub">'+(q&&quoteTradable(q)?"LIVE REFERENCE":q&&q.marketState==="closed"?"MARKET CLOSED":"WAITING FOR QUOTE")+'</div></div><div class="quote-side"><div class="quote-bid">'+(bid===null?"—":fmt(bid,s))+'</div><small>BID</small></div><div class="quote-side"><div class="quote-ask">'+(ask===null?"—":fmt(ask,s))+'</div><small>ASK</small></div></div>'}).join("");}
window.nexoraRenderQuotesList=renderQuotesList;
function render(){const open=state.positions.reduce((n,p)=>n+pnl(p),0),bal=balance(),equity=bal+open;
$("balance").textContent=money(bal);$("openPnl").textContent=money(open);$("openPnl").style.color=open>=0?"#b6e5a0":"#f0a2a8";$("equity").textContent=money(equity);$("pendingTop").textContent=state.pending.length;
$("positionCount").textContent=state.positions.length;$("pendingCount").textContent=state.pending.length;$("historyCount").textContent=state.history.length;
$("positionsBody").innerHTML=state.positions.length?state.positions.map(p=>{const v=pnl(p),q=liveQuotes[p.symbol];return '<tr><td>'+p.symbol+'</td><td class="'+(p.side==="BUY"?"buy-text":"sell-text")+'">'+p.side+'</td><td>'+p.volume.toFixed(2)+'</td><td>'+fmt(p.entry,p.symbol)+'</td><td>'+ (p.sl?fmt(p.sl,p.symbol):"—")+'</td><td>'+(p.tp?fmt(p.tp,p.symbol):"—")+'</td><td>'+(q?fmt(exitPrice(p,q),p.symbol):"—")+'</td><td class="'+(v>=0?"buy-text":"sell-text")+'">'+money(v)+'</td><td><button data-edit="'+p.id+'">MANAGE</button> <button data-close="'+p.id+'">CLOSE</button></td></tr>'}).join(""):'<tr><td colspan="9" class="empty-row">No open positions.</td></tr>';
$("pendingBody").innerHTML=state.pending.length?state.pending.map(p=>{const q=liveQuotes[p.symbol],mid=q?Number(q.mid):null;
const marginUsed=state.positions.reduce((sum,p)=>{const sp=specs[p.symbol];return sum+(sp?Math.abs(p.entry*p.volume*sp.contract)/100:0)},0);
const mtBal=bal,mtEq=equity,mtFree=mtEq-marginUsed;
$("mtBalance").textContent=money(mtBal);$("mtEquity").textContent=money(mtEq);$("mtMargin").textContent=money(marginUsed);$("mtFreeMargin").textContent=money(mtFree);$("mtMarginLevel").textContent=marginUsed>0?(mtEq/marginUsed*100).toFixed(2)+"%":"—";
$("mtTradePositions").innerHTML=state.positions.length?state.positions.map(p=>{const q=liveQuotes[p.symbol],cur=q?exitPrice(p,q):null,pl=pnl(p);return '<article class="mt-position-card"><div class="mt-position-line"><b>'+p.symbol+'</b><strong class="'+(p.side==="BUY"?"buy-text":"sell-text")+'">'+p.side.toLowerCase()+' '+p.volume.toFixed(2)+'</strong><b class="'+(pl>=0?"buy-text":"sell-text")+'">'+money(pl)+'</b></div><div class="mt-position-prices"><span>'+fmt(p.entry,p.symbol)+'</span><span>'+(cur===null?"—":fmt(cur,p.symbol))+'</span></div><div class="mt-position-actions"><button data-edit="'+p.id+'">Modify</button><button data-close="'+p.id+'">Close</button></div></article>'}).join(""):'<div class="mt-trade-empty">No open positions</div>';
$("mtTradePending").innerHTML=state.pending.length?state.pending.map(p=>'<article class="mt-position-card"><div class="mt-position-line"><b>'+p.symbol+'</b><strong class="'+(p.side==="BUY"?"buy-text":"sell-text")+'">'+p.type.replaceAll("_"," ").toUpperCase()+' '+p.volume.toFixed(2)+'</strong><span class="pending-text">PENDING</span></div><div class="mt-position-prices"><span>Entry '+fmt(p.entry,p.symbol)+'</span><span>SL '+(p.sl?fmt(p.sl,p.symbol):"—")+' · TP '+(p.tp?fmt(p.tp,p.symbol):"—")+'</span></div><div class="mt-position-actions"><button data-cancel="'+p.id+'">Cancel order</button></div></article>').join(""):'<div class="mt-trade-empty">No pending orders</div>';
return '<tr><td>'+p.symbol+'</td><td class="'+(p.side==="BUY"?"buy-text":"sell-text")+'">'+p.type.replace("_"," ").toUpperCase()+'</td><td>'+p.volume.toFixed(2)+'</td><td>'+fmt(p.entry,p.symbol)+'</td><td>'+(p.sl?fmt(p.sl,p.symbol):"—")+'</td><td>'+(p.tp?fmt(p.tp,p.symbol):"—")+'</td><td>'+(mid===null?"—":fmt(mid,p.symbol))+'</td><td class="pending-text">WAITING</td><td><button data-cancel="'+p.id+'">CANCEL</button></td></tr>'}).join(""):'<tr><td colspan="9" class="empty-row">No pending orders.</td></tr>';
$("historyBody").innerHTML=state.history.length?state.history.map(p=>'<tr><td>'+p.symbol+'</td><td>'+p.side+'</td><td>'+p.volume.toFixed(2)+'</td><td>'+fmt(p.entry,p.symbol)+'</td><td>'+fmt(p.close,p.symbol)+'</td><td class="'+(p.result>=0?"buy-text":"sell-text")+'">'+money(p.result)+'</td><td>'+new Date(p.time).toLocaleString()+'</td></tr>').join(""):'<tr><td colspan="7" class="empty-row">No closed trades yet.</td></tr>';
window.nexoraHistoryData=()=>state;
$("quote").textContent=liveQuotes[symbol]?fmt(Number(liveQuotes[symbol].mid)):"—";
renderQuotesList();
renderChartLines();
}
function renderDraggableLevels(){const el=$("priceChart");if(!el||!chart||!candleSeries)return;let layer=el.querySelector(".order-level-layer");if(!layer){layer=document.createElement("div");layer.className="order-level-layer";el.appendChild(layer)}layer.innerHTML="";const levels=[];for(const p of state.pending.filter(x=>x.symbol===symbol)){levels.push({p,field:"entry",label:p.type.replace("_"," ").toUpperCase(),color:"#e5bd68"});if(p.sl!=null)levels.push({p,field:"sl",label:"PENDING SL",color:"#f07878"});if(p.tp!=null)levels.push({p,field:"tp",label:"PENDING TP",color:"#70c8a0"});}for(const p of state.positions.filter(x=>x.symbol===symbol)){if(p.sl!=null)levels.push({p,field:"sl",label:p.side+" SL",color:"#f07878"});if(p.tp!=null)levels.push({p,field:"tp",label:p.side+" TP",color:"#70c8a0"});}for(const item of levels){const y=candleSeries.priceToCoordinate(Number(item.p[item.field]));if(y==null||!Number.isFinite(y))continue;const line=document.createElement("div");line.className="draggable-order-level";line.style.top=y+"px";line.style.borderColor=item.color;line.style.color=item.color;line.textContent=item.label+" · "+fmt(item.p[item.field],item.p.symbol)+" ↕";line.addEventListener("pointerdown",ev=>{ev.preventDefault();line.setPointerCapture(ev.pointerId);const move=e=>{const rect=el.getBoundingClientRect(),raw=candleSeries.coordinateToPrice(e.clientY-rect.top);if(raw==null)return;line.style.top=(e.clientY-rect.top)+"px";line.dataset.next=String(raw)};const end=()=>{line.removeEventListener("pointermove",move);line.removeEventListener("pointerup",end);line.removeEventListener("pointercancel",end);const next=Number(line.dataset.next);if(!Number.isFinite(next))return;if(!confirm("Apply "+item.label+" at "+fmt(next,item.p.symbol)+"?"))return;const sl=item.field==="sl"?next:item.p.sl,tp=item.field==="tp"?next:item.p.tp;if(item.field!=="entry"){const err=validateStops(item.p.side,item.p.entry,sl,tp);if(err){alert(err);renderChartLines();return}}item.p[item.field]=Number(next);save();render()};line.addEventListener("pointermove",move);line.addEventListener("pointerup",end);line.addEventListener("pointercancel",end)});layer.appendChild(line)}}
function renderChartLines(){if(!candleSeries)return;for(const line of priceLines){try{candleSeries.removePriceLine(line)}catch(e){}}priceLines=[];const add=(price,title,color,style=2,width=1)=>{if(!Number.isFinite(Number(price)))return;priceLines.push(candleSeries.createPriceLine({price:Number(price),title,color,lineWidth:width,lineStyle:style,axisLabelVisible:true}));};const marketQuote=liveQuotes[symbol];if(marketQuote){add(Number(marketQuote.bid),"BID","#64b5f6",2,1);add(Number(marketQuote.ask),"ASK","#f5b45b",2,1);}for(const p of state.positions.filter(x=>x.symbol===symbol)){add(p.entry,p.side+" ENTRY","#b6e5a0",0);if(p.sl!==null&&p.sl!==undefined)add(p.sl,p.side+" SL","#f07878",2);if(p.tp!==null&&p.tp!==undefined)add(p.tp,p.side+" TP","#70c8a0",2);}for(const p of state.pending.filter(x=>x.symbol===symbol)){add(p.entry,p.type.replace("_"," ").toUpperCase(),"#e5bd68",1);if(p.sl!==null&&p.sl!==undefined)add(p.sl,"PENDING SL","#f07878",2);if(p.tp!==null&&p.tp!==undefined)add(p.tp,"PENDING TP","#70c8a0",2);}renderDraggableLevels()}
function switchTab(tab){activeTab=tab;document.querySelectorAll("[data-trade-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tradeTab===tab));$("positionsTable").hidden=tab!=="positions";$("pendingTable").hidden=tab!=="pending";$("historyTable").hidden=true;$("mtTradePositions").hidden=tab!=="positions";$("mtTradePending").hidden=tab!=="pending"}
function getStopInputs(entry,side){const sl=$("stopLoss").value.trim()===""?null:Number($("stopLoss").value),tp=$("takeProfit").value.trim()===""?null:Number($("takeProfit").value);const err=validateStops(side,entry,sl,tp);if(err)throw new Error(err);return{sl,tp}}
function executeMarket(side,volume,sl,tp,q){const entry=Number(side==="BUY"?q.ask:q.bid);state.positions.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2),symbol,side,volume,entry,sl,tp,openedAt:new Date().toISOString()});save();render()}
window.nexoraExecuteMarketOrder=function(side){
 const q=liveQuotes[symbol];
 if(!quoteTradable(q)){alert("A fresh live reference quote is required. Please wait for the chart price to update.");return false;}
 try{const entry=Number(side==="BUY"?q.ask:q.bid),{sl,tp}=getStopInputs(entry,side);executeMarket(side,Number($("volume").value),sl,tp,q);return true}
 catch(e){alert(e.message);return false}
};
function pendingTriggered(p,q){const bid=Number(q.bid),ask=Number(q.ask);if(p.type==="buy_limit")return ask<=p.entry;if(p.type==="sell_limit")return bid>=p.entry;if(p.type==="buy_stop")return ask>=p.entry;if(p.type==="sell_stop")return bid<=p.entry;if(p.type==="buy_stop_limit"){if(!p.activated&&ask>=p.entry)p.activated=true;return !!p.activated&&ask<=p.stopLimitPrice}if(p.type==="sell_stop_limit"){if(!p.activated&&bid<=p.entry)p.activated=true;return !!p.activated&&bid>=p.stopLimitPrice}return false}
function checkOrders(){for(const p of [...state.pending]){const q=liveQuotes[p.symbol];if(!quoteTradable(q)||!pendingTriggered(p,q))continue;state.pending=state.pending.filter(x=>x.id!==p.id);const side=p.type.startsWith("buy")?"BUY":"SELL",entry=Number(side==="BUY"?q.ask:q.bid);state.positions.push({id:p.id,symbol:p.symbol,side,volume:p.volume,entry,sl:p.sl,tp:p.tp,openedAt:new Date().toISOString(),triggeredFrom:p.type});}
for(const p of [...state.positions]){const q=liveQuotes[p.symbol];if(!quoteTradable(q))continue;const px=exitPrice(p,q);if(p.side==="BUY"&&p.sl!==null&&p.sl!==undefined&&px<=p.sl)closePosition(p,px,"STOP LOSS");else if(p.side==="SELL"&&p.sl!==null&&p.sl!==undefined&&px>=p.sl)closePosition(p,px,"STOP LOSS");else if(p.side==="BUY"&&p.tp!==null&&p.tp!==undefined&&px>=p.tp)closePosition(p,px,"TAKE PROFIT");else if(p.side==="SELL"&&p.tp!==null&&p.tp!==undefined&&px<=p.tp)closePosition(p,px,"TAKE PROFIT");}
save();render()}
async function pollQuotes(){const watch=(()=>{try{return JSON.parse(localStorage.getItem("nexora_watchlist")||"[]")}catch{return[]}})();const needed=[...new Set([symbol,...watch,...state.positions.map(p=>p.symbol),...state.pending.map(p=>p.symbol)])];await Promise.all(needed.map(async s=>{try{const r=await fetch(MARKET_API+"/v1/quote/"+encodeURIComponent(s),{cache:"no-store"});if(!r.ok)throw new Error("quote unavailable");const q=await r.json();if(q.symbol===s&&Number.isFinite(Number(q.mid))){const rollover=isRolloverWindow();const spread=appliedPaperSpread(s);liveQuotes[s]={...q,bid:Number(q.mid)-spread/2,ask:Number(q.mid)+spread/2,spread,spreadModel:"NEXORA_SIMULATED",rollover};}}catch(e){}}));const q=liveQuotes[symbol],fresh=quoteTradable(q);if(q){$("quote").textContent=fmt(Number(q.mid));$("entryPrice").textContent=fresh?fmt(Number(q.ask)):"—";const age=Math.max(0,Math.round((Date.now()-Date.parse(q.timestamp))/1000));$("quoteChange").textContent=(fresh?"LIVE MID · "+(q.rollover?"ROLLOVER WIDE SPREAD":"NEXORA DEMO SPREAD")+" "+fmt(Number(q.spread))+" · BID "+fmt(Number(q.bid))+" / ASK "+fmt(Number(q.ask))+" · "+age+"s ago":q.marketState==="closed"?"MARKET CLOSED · LAST PRICE "+age+"s OLD":"STALE/UNVERIFIED · ORDERS DISABLED");}else{$("quote").textContent="—";$("entryPrice").textContent="—";$("quoteChange").textContent="LIVE QUOTE UNAVAILABLE · RETRYING"}
const isMarket=$("orderType").value==="market";renderQuotesList();$("quickBid").textContent=fresh?fmt(Number(q.bid)):"—";$("quickAsk").textContent=fresh?fmt(Number(q.ask)):"—";$("buyBtn").disabled=!fresh||!isMarket;$("sellBtn").disabled=!fresh||!isMarket;$("placePending").disabled=!fresh||isMarket;$("executionHint").textContent=isMarket?"At current bid/ask": "Triggered by live bid/ask";$("pendingPrice").placeholder=isMarket?"Not needed for market order":"Required trigger price";renderQuotesList();checkOrders()}
async function draw(){
 const el=$("priceChart");
 if(chartResizeObserver){chartResizeObserver.disconnect();chartResizeObserver=null;}
 if(chart&&typeof chart.remove==="function"){try{chart.remove()}catch(e){}}
 chart=null;candleSeries=null;priceLines=[];
 el.innerHTML="";
 const indexTickers={US30:"DJI",US500:"SPXUSD",NAS100:"NSXUSD",UK100:"UKXGBP",GER40:"GRXEUR",JP225:"JPXJPY",AUS200:"AUXAUD",HK50:"HKXHKD",US2000:"US2000",FRA40:"FRA40",EU50:"EU50"};
 const isCrypto=/^(BTC|ETH|BNB|XRP|SOL|ADA|DOGE|TRX|LTC|AVAX)USD$/.test(symbol);
 const ticker=isCrypto?"CRYPTO:"+symbol:"FOREXCOM:"+(indexTickers[symbol]||symbol);
 const intervals={"1m":"1","5m":"5","15m":"15","30m":"30","1h":"60","4h":"240","1d":"D"};
 const config={autosize:true,symbol:ticker,interval:intervals[tf]||"5",timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",allow_symbol_change:false,hide_side_toolbar:false,withdateranges:true,details:false,hotlist:false,calendar:false,save_image:false,support_host:"https://www.tradingview.com"};
 el.innerHTML='<div id="nexoraTradingViewChart" style="width:100%;height:100%;min-height:380px"></div>';
 $("quoteChange").textContent="LOADING TRADINGVIEW · "+ticker+" · "+tf.toUpperCase();
 const script=document.createElement("script");
 script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
 script.async=true;
 script.innerHTML=JSON.stringify(config);
 el.querySelector("#nexoraTradingViewChart").appendChild(script);
 $("quoteChange").textContent="TRADINGVIEW CHART · "+ticker+" · "+tf.toUpperCase();
 pollQuotes();
}

let candleRefreshBusy=false;
async function refreshLiveCandles(){
 if(candleRefreshBusy||!chart||!candleSeries||!document.getElementById("priceChart"))return;
 const targetSymbol=symbol,targetTf=tf,targetSeries=candleSeries;
 candleRefreshBusy=true;
 try{
  const response=await fetch(MARKET_API+"/v1/ohlc/"+encodeURIComponent(targetSymbol)+"?interval="+encodeURIComponent(targetTf)+"&limit=300",{cache:"no-store"});
  if(!response.ok)throw new Error("Candle refresh failed");
  const payload=await response.json();
  if(targetSymbol!==symbol||targetTf!==tf||targetSeries!==candleSeries||!Array.isArray(payload.bars)||!payload.bars.length)return;
  const seen=new Map();
  for(const b of payload.bars){
   const time=Math.floor(Date.parse(b.openTime)/1000),open=Number(b.open),high=Number(b.high),low=Number(b.low),close=Number(b.close);
   if(Number.isFinite(time)&&[open,high,low,close].every(Number.isFinite))seen.set(time,{time,open,high,low,close});
  }
  const bars=[...seen.values()].sort((a,b)=>a.time-b.time);
  if(bars.length)targetSeries.setData(bars);
  const last=bars[bars.length-1];
  if(last)$("quoteChange").textContent="LIVE UPDATING · BIQUOTE · "+targetTf.toUpperCase()+" · "+new Date().toLocaleTimeString();
 }catch(e){/* Keep the last valid candles visible during a temporary feed delay. */}
 finally{candleRefreshBusy=false;}
}
function changeSymbol(){symbol=$("symbol").value;draw()}
document.querySelectorAll("[data-mobile-view]").forEach(b=>b.addEventListener("click",()=>{const view=b.dataset.mobileView;document.body.dataset.mobileView=view;document.querySelectorAll("[data-mobile-view]").forEach(x=>x.classList.toggle("active",x===b));if(view==="history")switchTab("history");if(view==="trade")switchTab("positions");if(view==="charts")setTimeout(()=>{if(chart)chart.applyOptions({width:$("priceChart").clientWidth,height:$("priceChart").clientHeight});},80)}));


$("symbol").addEventListener("change",changeSymbol);$("accountSize").value=String(state.size);$("accountSize").addEventListener("change",e=>{state.size=Number(e.target.value);save();render()});
$("orderType").addEventListener("change",()=>{const m=$("orderType").value==="market";$("buyBtn").disabled=true;$("sellBtn").disabled=true;$("placePending").disabled=true;$("pendingPrice").disabled=m;$("pendingPrice").required=!m;$("executionHint").textContent=m?"At current bid/ask":"Triggered by live bid/ask";$("pendingPrice").placeholder=m?"Not needed for market order":"Required trigger price";pollQuotes()});
$("buyBtn").addEventListener("click",()=>{const q=liveQuotes[symbol];if(!quoteTradable(q))return alert("Fresh open-market quote required.");try{const side="BUY",entry=Number(q.ask),{sl,tp}=getStopInputs(entry,side);executeMarket(side,Number($("volume").value),sl,tp,q)}catch(e){alert(e.message)}});
$("sellBtn").addEventListener("click",()=>{const q=liveQuotes[symbol];if(!quoteTradable(q))return alert("Fresh open-market quote required.");try{const side="SELL",entry=Number(q.bid),{sl,tp}=getStopInputs(entry,side);executeMarket(side,Number($("volume").value),sl,tp,q)}catch(e){alert(e.message)}});
$("placePending").addEventListener("click",()=>{const q=liveQuotes[symbol],type=$("orderType").value;if(!quoteTradable(q))return alert("Fresh open-market quote required to place a pending paper order.");if(type==="market")return;const entry=Number($("pendingPrice").value);if(!Number.isFinite(entry)||entry<=0)return alert("Enter a valid pending entry price.");const side=type.startsWith("buy")?"BUY":"SELL",bid=Number(q.bid),ask=Number(q.ask),stopLimitPrice=Number($("stopLimitPrice")?.value);if(type==="buy_limit"&&entry>=ask)return alert("Buy Limit must be below the current Ask price.");if(type==="sell_limit"&&entry<=bid)return alert("Sell Limit must be above the current Bid price.");if(type==="buy_stop"&&entry<=ask)return alert("Buy Stop must be above the current Ask price.");if(type==="sell_stop"&&entry>=bid)return alert("Sell Stop must be below the current Bid price.");if(type==="buy_stop_limit"&&(!Number.isFinite(stopLimitPrice)||stopLimitPrice<=0||stopLimitPrice>=entry))return alert("Buy Stop Limit price must be below its stop trigger.");if(type==="sell_stop_limit"&&(!Number.isFinite(stopLimitPrice)||stopLimitPrice<=entry))return alert("Sell Stop Limit price must be above its stop trigger.");try{const{sl,tp}=getStopInputs(entry,side);state.pending.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),symbol,type,side,volume:Number($("volume").value),entry,stopLimitPrice:(type.endsWith("stop_limit")?stopLimitPrice:null),activated:false,sl,tp,createdAt:new Date().toISOString()});save();render();switchTab("pending")}catch(e){alert(e.message)}});
$("positionsBody").addEventListener("click",e=>{const edit=e.target.closest("[data-edit]");if(edit){const p=state.positions.find(x=>x.id===edit.dataset.edit);if(!p)return;const slText=prompt("Set Stop Loss (leave blank to remove):",p.sl??"");if(slText===null)return;const tpText=prompt("Set Take Profit (leave blank to remove):",p.tp??"");if(tpText===null)return;const sl=slText.trim()===""?null:Number(slText),tp=tpText.trim()===""?null:Number(tpText),err=validateStops(p.side,p.entry,sl,tp);if(err)return alert(err);if(!confirm("Confirm SL "+(sl??"OFF")+" and TP "+(tp??"OFF")+"?"))return;p.sl=sl;p.tp=tp;save();render();return}const b=e.target.closest("[data-close]");if(!b)return;const p=state.positions.find(x=>x.id===b.dataset.close),q=p&&liveQuotes[p.symbol];if(!p||!quoteTradable(q))return alert("Fresh open-market quote required to close.");closePosition(p,exitPrice(p,q),"MANUAL CLOSE");render()});
$("pendingBody").addEventListener("click",e=>{const b=e.target.closest("[data-cancel]");if(!b)return;state.pending=state.pending.filter(p=>p.id!==b.dataset.cancel);save();render()});
document.querySelectorAll("[data-trade-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tradeTab)));
$("timeframes").addEventListener("click",e=>{const b=e.target.closest("button[data-tf]");if(!b)return;tf=b.dataset.tf;document.querySelectorAll("#timeframes button").forEach(x=>x.classList.toggle("active",x===b));draw()});
$("resetDemo").addEventListener("click",()=>{if(!confirm("Reset this browser's simulated trades, pending orders and demo balance?"))return;state={size:Number($("accountSize").value),closedPnl:0,positions:[],pending:[],history:[]};save();render()});
$("year").textContent=new Date().getFullYear();render();document.body.dataset.mobileView="charts";switchTab("positions");$("pendingPrice").disabled=true;$("placePending").disabled=true;draw();pollQuotes();quotePollTimer=setInterval(pollQuotes,5000);
setInterval(refreshLiveCandles,1000);
})();