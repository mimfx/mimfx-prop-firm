import { supabase } from "./supabase-config.js";
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let accounts=[],selected=null;
function message(t,bad=false){$("payoutMessage").textContent=t;$("payoutMessage").style.color=bad?"#e58a8a":"#9bb6a2";}
function updatePreview(){const gross=Math.max(0,Number($("grossAmount").value)||0);$("grossPreview").textContent=money(gross);$("traderPreview").textContent=money(gross*.7);}
$("grossAmount").addEventListener("input",updatePreview);
$("fundedAccount").addEventListener("change",()=>{selected=accounts.find(a=>a.id===$("fundedAccount").value)||null;$("availablePreview").textContent=money(selected?.available||0);$("grossAmount").max=selected?.available||0;});
async function load(){
 const {data:{session}}=await supabase.auth.getSession();if(!session){location.replace("auth.html");return;}
 const {data:rows,error}=await supabase.from("challenge_accounts").select("id,account_size,model,stage,status,initial_balance,current_balance,rule_set_id,created_at").eq("user_id",session.user.id).eq("stage","funded").eq("status","active").order("created_at",{ascending:false});
 if(error)throw error;
 const {data:requests,error:reqError}=await supabase.from("payout_requests").select("id,account_id,gross_amount,trader_amount,status,requested_at,payment_reference").eq("user_id",session.user.id).order("requested_at",{ascending:false});
 if(reqError)throw reqError;
 const reserved={};for(const r of (requests||[]))if(["pending","approved"].includes(r.status))reserved[r.account_id]=(reserved[r.account_id]||0)+Number(r.gross_amount);
 accounts=(rows||[]).map(a=>({...a,available:Math.max(0,Number(a.current_balance||0)-Number(a.initial_balance||0)-(reserved[a.id]||0))}));
 $("fundedAccount").innerHTML='<option value="">Select active funded account</option>'+accounts.map(a=>'<option value="'+a.id+'">$'+Number(a.account_size).toLocaleString()+" · "+esc(a.model)+" · "+a.id.slice(0,8)+"</option>").join("");
 if(!accounts.length)$("fundedAccount").innerHTML='<option value="">No active funded account found</option>';
 $("payoutHistory").querySelector("tbody").innerHTML=(requests||[]).length?requests.map(r=>'<tr><td>'+new Date(r.requested_at).toLocaleDateString()+'</td><td>'+money(r.gross_amount)+'</td><td>'+money(r.trader_amount)+'</td><td><span class="status-pill status-'+esc(r.status)+'">'+esc(r.status)+'</span></td><td>'+esc(r.payment_reference||"—")+'</td></tr>').join(""):'<tr><td colspan="5">No payout requests yet.</td></tr>';
}
$("payoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!selected){message("Choose an active funded account first.",true);return;}
 const gross=Number($("grossAmount").value),destination=$("destination").value.trim();
 if(!Number.isFinite(gross)||gross<=0||gross>selected.available){message("Enter a gross amount within your available verified profit.",true);return;}
 if(destination.length<4){message("Enter your payment destination details.",true);return;}
 $("submitPayout").disabled=true;
 const {error}=await supabase.from("payout_requests").insert({account_id:selected.id,user_id:(await supabase.auth.getUser()).data.user.id,gross_amount:gross,payout_destination:destination});
 $("submitPayout").disabled=false;
 if(error){message(error.message,true);return;}
 message("Payout request submitted. It is pending Nexora review; no MT5 balance has been deducted.");
 $("payoutForm").reset();selected=null;updatePreview();await load();
});
load().catch(e=>message("Could not load payout information: "+e.message,true));
