import { supabase } from "./supabase-config.js";
const $=id=>document.getElementById(id);
const stages={"2-phase":[["phase_1","Phase 1"],["phase_2","Phase 2"],["funded","Funded"]],"1-phase":[["phase_1","Phase 1"],["funded","Funded"]]};
let rules=[],traders=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function msg(t,bad=false){$("notice").textContent=t;$("notice").className=bad?"notice error":"notice";}
function updateStages(){const m=$("model").value;$("stage").innerHTML=stages[m].map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("");updateRules();}
function updateRules(){const list=rules.filter(r=>r.model===$("model").value&&r.stage===$("stage").value);$("ruleSet").innerHTML=list.map(r=>'<option value="'+r.id+'">'+esc(r.id.replaceAll("_"," "))+'</option>').join("");}
$("model").addEventListener("change",updateStages);$("stage").addEventListener("change",updateRules);
$("logoutBtn").onclick=async()=>{await supabase.auth.signOut();location.href="auth.html";};
async function loadPayouts(){
 const {data:rows,error}=await supabase.from("payout_requests").select("*").order("requested_at",{ascending:false});
 if(error){$("payoutsBody").innerHTML='<tr><td colspan="7">'+esc(error.message)+'</td></tr>';return;}
 const ids=[...new Set((rows||[]).map(r=>r.user_id))];
 const [p,a]=await Promise.all([supabase.from("profiles").select("id,full_name").in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]),supabase.from("challenge_accounts").select("id,account_size,model,stage")]);
 const names=Object.fromEntries((p.data||[]).map(x=>[x.id,x.full_name||"Trader"]));
 const accounts=Object.fromEntries((a.data||[]).map(x=>[x.id,x]));
 $("payoutsBody").innerHTML=(rows||[]).length?rows.map(r=>{
  const ac=accounts[r.account_id]||{};
  const action=r.status==="pending"?'<button class="primary payout-action" data-id="'+r.id+'" data-status="approved">Approve</button> <button class="payout-action" data-id="'+r.id+'" data-status="rejected">Reject</button>':r.status==="approved"?'<button class="primary payout-action" data-id="'+r.id+'" data-status="paid">Mark paid after transfer</button>':esc(r.status);
  return '<tr><td>'+esc(names[r.user_id]||r.user_id.slice(0,8))+'<small>$'+Number(ac.account_size||0).toLocaleString()+' · '+esc(ac.model||"")+'</small><small>'+esc(r.payout_destination)+'</small></td><td>$'+Number(r.gross_amount).toFixed(2)+'</td><td>$'+Number(r.trader_amount).toFixed(2)+'</td><td>$'+Number(r.firm_amount).toFixed(2)+'</td><td>'+new Date(r.requested_at).toLocaleDateString()+'</td><td>'+new Date(r.due_at).toLocaleDateString()+'</td><td>'+esc(r.status.toUpperCase())+'<br>'+action+(r.payment_reference?'<small>Ref: '+esc(r.payment_reference)+'</small>':'')+'</td></tr>';
 }).join(""):'<tr><td colspan="7">No payout requests yet.</td></tr>';
}
$("payoutsBody")?.addEventListener("click",async e=>{
 const b=e.target.closest(".payout-action");if(!b)return;
 const id=b.dataset.id,status=b.dataset.status;b.disabled=true;
 if(status==="approved"||status==="rejected"){
  const note=prompt(status==="approved"?"Optional approval note:":"Reason for rejection:");
  if(status==="rejected"&&!note?.trim()){b.disabled=false;return;}
  const {error}=await supabase.from("payout_requests").update({status,admin_note:note?.trim()||null,reviewed_at:new Date().toISOString()}).eq("id",id);
  if(error)alert(error.message);
 }else{
  const ref=prompt("Enter the real completed transfer reference. Only continue after funds have actually been sent:");
  if(!ref?.trim()){b.disabled=false;return;}
  if(!confirm("Confirm the trader has received the net payout? This records the USD ledger debit and marks the request paid.")){b.disabled=false;return;}
  const {error}=await supabase.rpc("admin_settle_nexora_payout",{p_payout_id:id,p_external_reference:ref.trim()});
  if(error)alert(error.message);
 }
 await loadPayouts();b.disabled=false;
});
async function boot(){
 const {data:{session}}=await supabase.auth.getSession();if(!session){location.replace("auth.html");return;}
 const {data:allowed,error:authError}=await supabase.rpc("is_nexora_admin");
 if(authError||!allowed){msg("Access denied. This account is not an approved Nexora administrator.",true);$("accountForm").hidden=true;return;}
 msg("Administrator verified. Purchase receipts and payout settlements are reconciled through NEXORA PAY. Trading accounts remain pending until MT5 provisioning is connected.");
 const [p,r,a]=await Promise.all([supabase.from("profiles").select("id,full_name,created_at").order("created_at",{ascending:false}),supabase.from("challenge_rule_sets").select("*").order("model").order("stage"),supabase.from("challenge_accounts").select("*").order("created_at",{ascending:false})]);
 if(p.error||r.error||a.error)throw(p.error||r.error||a.error);
 traders=p.data||[];rules=r.data||[];const accounts=a.data||[];
 $("traderCount").textContent=traders.length;$("accountCount").textContent=accounts.length;$("ruleCount").textContent=rules.length;$("traderCountLabel").textContent=traders.length+" traders";
 $("traderSelect").innerHTML='<option value="">Select a trader</option>'+traders.map(t=>'<option value="'+t.id+'">'+esc(t.full_name||"Trader")+' · '+t.id.slice(0,8)+'</option>').join("");
 $("tradersBody").innerHTML=traders.length?traders.map(t=>'<tr><td>'+esc(t.full_name||"Trader")+'</td><td><small>'+t.id+'</small></td><td>'+new Date(t.created_at).toLocaleDateString()+'</td></tr>').join(""):'<tr><td colspan="3">No traders found.</td></tr>';
 const names=Object.fromEntries(traders.map(t=>[t.id,t.full_name||"Trader"]));
 $("accountsBody").innerHTML=accounts.length?accounts.map(a=>'<tr><td>$'+Number(a.account_size).toLocaleString()+'</td><td>'+esc(names[a.user_id]||a.user_id.slice(0,8))+'</td><td>'+esc(a.model)+'<small>'+esc(a.stage)+'</small></td><td>'+esc(a.rule_set_id)+'</td><td>'+esc((a.status||"").replaceAll("_"," "))+'</td><td>'+new Date(a.created_at).toLocaleDateString()+'</td></tr>').join(""):'<tr><td colspan="6">No challenge records yet.</td></tr>';
 $("rulesBody").innerHTML=rules.map(r=>'<tr><td>'+esc(r.model)+'<small>'+esc(r.stage)+'</small></td><td>'+esc(r.drawdown_type)+'</td><td>'+(r.profit_target_pct==null?"—":r.profit_target_pct+"%")+'</td><td>'+r.max_drawdown_pct+'%</td><td>'+r.daily_drawdown_pct+'%</td><td>'+(r.trader_payout_pct==null?"—":r.trader_payout_pct+"% trader"+(r.payout_processing_days?" · "+r.payout_processing_days+" days":""))+'</td></tr>').join("");
 updateStages();await loadPayouts();
}
$("accountForm").addEventListener("submit",async e=>{
 e.preventDefault();const user_id=$("traderSelect").value,model=$("model").value,stage=$("stage").value,rule_set_id=$("ruleSet").value,size=Number($("accountSize").value);
 if(!user_id||!rule_set_id){msg("Choose a trader and rule set.",true);return;}
 $("createBtn").disabled=true;
 const {error}=await supabase.from("challenge_accounts").insert({user_id,account_size:size,model,stage,rule_set_id,status:"pending_payment",initial_balance:size,current_balance:size,high_water_mark:size,daily_start_equity:size});
 $("createBtn").disabled=false;if(error){msg(error.message,true);return;}
 msg("Pending challenge record created. No payment collected and no trading account provisioned.");await boot();
});
$("year").textContent=new Date().getFullYear();boot().catch(e=>msg("Could not load admin data: "+e.message,true));
