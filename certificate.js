import { supabase } from "./supabase-config.js";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));
async function boot(){
 const {data:{session}}=await supabase.auth.getSession();if(!session){location.replace("auth.html");return;}
 const id=new URLSearchParams(location.search).get("id");
 if(!id)throw new Error("Missing certificate ID");
 const {data,error}=await supabase.from("payout_certificates").select("id,certificate_number,recipient_name,gross_amount,paid_at").eq("id",id).eq("user_id",session.user.id).single();
 if(error||!data)throw error||new Error("Certificate not found");
 $("recipientName").textContent=data.recipient_name;
 $("grossAmount").textContent=money(data.gross_amount);
 $("paymentDate").textContent=new Date(data.paid_at).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
 $("certificateNumber").textContent=data.certificate_number;
 $("certificate").classList.remove("hidden");
 $("printBtn").disabled=false;
 $("certStatus").textContent="Verified payout certificate · "+esc(data.certificate_number);
 $("printBtn").addEventListener("click",()=>window.print());
}
boot().catch(()=>{$("certStatus").textContent="Certificate unavailable";$("errorState").classList.remove("hidden");});
