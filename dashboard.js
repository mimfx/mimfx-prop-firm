import { supabase } from "./supabase-config.js";
const accounts={5000:{target:400},10000:{target:800},20000:{target:1600},50000:{target:4000},100000:{target:8000}};
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);
const select=document.getElementById("accountSelect");
function updateAccount(){const size=Number(select.value),a=accounts[size];document.getElementById("balance").textContent=money(size);document.getElementById("initialEquity").textContent=money(size);document.getElementById("targetAmount").textContent=money(a.target);document.getElementById("netPnl").textContent=money(0);document.getElementById("targetProgress").textContent="0.0%";}
select.addEventListener("change",updateAccount);updateAccount();
const el=id=>document.getElementById(id);
let clock;
function empty(msg){clearInterval(clock);el("phaseCountdown").textContent="—";el("phaseDeadline").textContent="—";el("phaseStarted").textContent="—";el("phaseClockStatus").textContent="NO ACTIVE PHASE";el("phaseClockMessage").textContent=msg;}
function show(row){
 clearInterval(clock);
 const stage=(row.stage||"").replaceAll("_"," ").toUpperCase();
 el("phaseClockTitle").textContent=stage?stage+" · 60-day window":"Your 60-day phase window";
 el("phaseClockStatus").textContent=(row.status||"").toUpperCase();
 const start=row.phase_started_at?new Date(row.phase_started_at):null;
 const end=row.phase_deadline_at?new Date(row.phase_deadline_at):null;
 el("phaseStarted").textContent=start&&!isNaN(start)?start.toLocaleString():"Not recorded";
 el("phaseDeadline").textContent=end&&!isNaN(end)?end.toLocaleString():"Not set";
 if(row.status!=="active"){el("phaseCountdown").textContent="—";el("phaseClockMessage").textContent=row.status==="breached"?(row.breach_reason||"This phase has been marked breached."):"Your challenge is not currently in an active phase.";return;}
 if(!end||isNaN(end)){el("phaseCountdown").textContent="—";el("phaseClockMessage").textContent="Your phase is active, but its deadline has not been recorded. Contact support.";return;}
 const tick=()=>{const ms=end-Date.now();if(ms<=0){el("phaseCountdown").textContent="00d 00h 00m";el("phaseClockStatus").textContent="DEADLINE PASSED";el("phaseClockMessage").textContent="The 60-day deadline has passed. The scheduled expiry check will mark overdue phases as breached.";return;}const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);el("phaseCountdown").textContent=`${String(d).padStart(2,"0")}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;el("phaseClockMessage").textContent="Your 60-calendar-day countdown began when this phase was activated.";};
 tick();clock=setInterval(tick,1000);
}
async function loadClock(){const {data:{session}}=await supabase.auth.getSession();if(!session){empty("Sign in to view your phase deadline.");return;}const {data,error}=await supabase.from("challenge_accounts").select("stage,status,phase_started_at,phase_deadline_at,breach_reason,created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(error){empty("We couldn't load your phase deadline. Refresh or contact support.");return;}if(!data){empty("No challenge is linked to your profile yet. Your 60-day clock starts when a phase is activated.");return;}show(data);}
loadClock();