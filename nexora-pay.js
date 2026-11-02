import { supabase } from "./supabase-config.js";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
$("back").onclick=()=>location.href="admin.html";
async function boot(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.href="auth.html?mode=signin&next=admin";return;}
 const {data:isAdmin,error:adminError}=await supabase.rpc("is_nexora_admin");
 if(adminError||!isAdmin){document.querySelector("main").innerHTML="<h1>Access denied</h1><p>Administrator access is required.</p>";return;}
 await Promise.all([loadBalances(),loadHistory()]);
}
async function loadBalances(){
 const {data,error}=await supabase.rpc("get_nexora_pay_admin_summary");
 if(error){$("balances").innerHTML='<div class="notice">Could not load ledger balances: '+esc(error.message)+'</div>';return;}
 const rows=data?.balances||[];
 $("balances").innerHTML=rows.map(x=>'<article class="card"><span>'+esc(x.currency)+' AVAILABLE</span><strong>'+Number(x.available||0).toLocaleString(undefined,{maximumFractionDigits:6})+'</strong></article>').join("");
}
async function loadHistory(){
 const {data,error}=await supabase.from("nexora_pay_journals").select("id,reference,entry_type,currency,amount,external_reference,description,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){$("history").innerHTML='<tr><td colspan="6">Could not load history: '+esc(error.message)+'</td></tr>';return;}
 $("history").innerHTML=data?.length?data.map(x=>'<tr><td>'+new Date(x.created_at).toLocaleString()+'</td><td>'+esc(x.reference)+'</td><td>'+esc(x.entry_type.replaceAll("_"," "))+'</td><td>'+Number(x.amount).toLocaleString()+' '+esc(x.currency)+'</td><td>'+esc(x.external_reference)+'</td><td>'+esc(x.description)+'</td></tr>').join(""):'<tr><td colspan="6">No ledger movements recorded yet.</td></tr>';
}
$("movement").addEventListener("submit",async e=>{
 e.preventDefault();$("save").disabled=true;$("status").textContent="Saving…";
 const {data,error}=await supabase.rpc("admin_record_nexora_pay_movement",{p_entry_type:$("kind").value,p_amount:Number($("amount").value),p_currency:$("currency").value,p_external_reference:$("reference").value.trim(),p_description:$("description").value.trim()});
 $("save").disabled=false;
 if(error){$("status").textContent=error.message;return;}
 $("status").textContent="Recorded: "+data.reference;
 e.target.reset();await Promise.all([loadBalances(),loadHistory()]);
});
window.nexoraPayReload=async()=>{await Promise.all([loadBalances(),loadHistory()]);};
boot();