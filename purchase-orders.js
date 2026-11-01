import { supabase } from "./supabase-config.js";
const body=document.getElementById("purchaseOrdersBody");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const usd=n=>"$"+Number(n).toFixed(2);
async function boot(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){body.innerHTML='<tr><td colspan="6">Sign in as admin.</td></tr>';return;}
 const {data:allowed,error:authError}=await supabase.rpc("is_nexora_admin");
 if(authError||!allowed){body.innerHTML='<tr><td colspan="6">Admin access required.</td></tr>';return;}
 await load();
}
async function load(){
 const {data:orders,error}=await supabase.from("challenge_purchase_orders").select("*").order("created_at",{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="6">Could not load orders: '+esc(error.message)+'</td></tr>';return;}
 if(!orders?.length){body.innerHTML='<tr><td colspan="6">No purchase orders yet.</td></tr>';return;}
 const ids=[...new Set(orders.map(o=>o.user_id))];
 const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids);
 const names=Object.fromEntries((profiles||[]).map(p=>[p.id,p.full_name||"Trader"]));
 body.innerHTML=orders.map(o=>{
  const canPay=["awaiting_payment","under_review"].includes(o.status);
  return '<tr><td><strong>'+esc(o.id.slice(0,8))+'</strong><small>'+esc(names[o.user_id]||o.user_id.slice(0,8))+'</small><small>'+new Date(o.created_at).toLocaleString()+'</small></td><td>$'+Number(o.account_size).toLocaleString()+'<small>'+esc(o.model)+'</small></td><td>'+usd(o.final_price)+'<small>Base '+usd(o.base_price)+' · Discount '+usd(o.discount_amount)+'</small></td><td>'+esc(o.promo_code||'—')+'</td><td>'+esc(o.status.replaceAll('_',' ').toUpperCase())+(o.payment_reference?'<small>'+esc(o.payment_reference)+'</small>':'')+'</td><td>'+(canPay?'<button class="primary mark-order-paid" data-id="'+o.id+'">Verify payment & mark paid</button>':'—')+'</td></tr>';
 }).join("");
}
body.addEventListener("click",async e=>{
 const btn=e.target.closest(".mark-order-paid");if(!btn)return;
 const reference=prompt("Enter the verified payment reference. Only continue after confirming the funds have actually arrived.");
 if(!reference||reference.trim().length<3)return;
 if(!confirm("Confirm that payment has been received and is cleared? This creates a challenge in pending provisioning."))return;
 btn.disabled=true;
 const {data,error}=await supabase.rpc("admin_mark_nexora_order_paid",{p_order_id:btn.dataset.id,p_payment_reference:reference.trim()});
 if(error){alert("Could not mark order paid: "+error.message);btn.disabled=false;return;}
 alert("Payment recorded. Challenge created in pending provisioning. MT5 is not activated.");
 await load();
});
boot().catch(e=>{body.innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>';});
