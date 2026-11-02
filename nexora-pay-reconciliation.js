import { supabase } from "./supabase-config.js";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(v,c)=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:6})+" "+c;
async function initReconciliation(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)return;
 const {data:admin}=await supabase.rpc("is_nexora_admin");
 if(!admin)return;
 await Promise.all([loadOrders(),loadPayoutQueue()]);
}
async function loadOrders(){
 const host=$("orders");if(!host)return;
 const {data,error}=await supabase.from("challenge_purchase_orders").select("id,user_id,account_size,model,final_price,status,created_at").in("status",["awaiting_payment","under_review"]).order("created_at",{ascending:false}).limit(100);
 if(error){host.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 const ids=[...new Set((data||[]).map(x=>x.user_id))];
 const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]);
 const names=Object.fromEntries((profiles||[]).map(x=>[x.id,x.full_name||"Trader"]));
 host.innerHTML=(data||[]).length?data.map(o=>'<tr><td>'+o.id.slice(0,8)+'</td><td>'+esc(names[o.user_id]||"Trader")+'</td><td>$'+Number(o.account_size).toLocaleString()+' · '+esc(o.model)+'</td><td>'+money(o.final_price,"USD")+'</td><td>'+esc(o.status)+'</td><td><button class="primary" data-order="'+o.id+'">Confirm received</button></td></tr>').join(""):'<tr><td colspan="6">No unpaid orders.</td></tr>';
 host.querySelectorAll("[data-order]").forEach(btn=>btn.onclick=async()=>{
  const currency=prompt("Receipt currency: USD, USDT or USDC","USD");if(!currency)return;
  const amount=prompt("Exact amount actually received (must match order USD total):");if(!amount)return;
  const ref=prompt("Actual bank/wallet transaction reference:");if(!ref)return;
  if(!confirm("Confirm the funds have actually arrived and the amount/reference are verified?"))return;
  btn.disabled=true;
  const {data,error}=await supabase.rpc("admin_confirm_nexora_order_receipt",{p_order_id:btn.dataset.order,p_currency:currency.toUpperCase(),p_received_amount:Number(amount),p_external_reference:ref.trim()});
  alert(error?error.message:"Receipt posted. Order paid; challenge remains pending MT5 provisioning.");
  await Promise.all([loadOrders(),loadPayoutQueue(),window.nexoraPayReload?.()]);
 });
}
async function loadPayoutQueue(){
 const host=$("payoutQueue");if(!host)return;
 const {data,error}=await supabase.from("payout_requests").select("id,user_id,gross_amount,trader_amount,payout_destination,status").eq("status","approved").order("requested_at",{ascending:true}).limit(100);
 if(error){host.innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
 const ids=[...new Set((data||[]).map(x=>x.user_id))];
 const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]);
 const names=Object.fromEntries((profiles||[]).map(x=>[x.id,x.full_name||"Trader"]));
 host.innerHTML=(data||[]).length?data.map(p=>'<tr><td>'+esc(names[p.user_id]||"Trader")+'</td><td>'+money(p.gross_amount,"USD")+'</td><td>'+money(p.trader_amount,"USD")+'</td><td>'+esc(p.payout_destination)+'</td><td>APPROVED</td><td><button class="primary" data-payout="'+p.id+'">Settle after transfer</button></td></tr>').join(""):'<tr><td colspan="6">No approved payouts waiting.</td></tr>';
 host.querySelectorAll("[data-payout]").forEach(btn=>btn.onclick=async()=>{
  const ref=prompt("Enter the real completed bank/wallet transfer reference:");if(!ref)return;
  if(!confirm("Confirm you have already sent the trader's net payout? This posts the USD ledger debit and marks the request paid."))return;
  btn.disabled=true;
  const {error}=await supabase.rpc("admin_settle_nexora_payout",{p_payout_id:btn.dataset.payout,p_external_reference:ref.trim()});
  alert(error?"Could not settle: "+error.message:"Payout settled and recorded.");
  await Promise.all([loadPayoutQueue(),window.nexoraPayReload?.()]);
 });
}
initReconciliation();
