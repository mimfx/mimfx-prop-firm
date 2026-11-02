import { supabase } from "./supabase-config.js";
const { data: { session } } = await supabase.auth.getSession();
if (!session) { location.replace("auth.html"); throw new Error("Authentication required"); }
const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
const firstName = profile?.full_name?.trim().split(" ")[0] || "Trader";
const avatar = document.getElementById("userAvatar");
if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
const page = location.pathname.split("/").pop().replace(".html","");

if(page==="terminal"){
 const gate=document.getElementById("tradingLoginScreen"),form=document.getElementById("tradingLoginForm"),error=document.getElementById("tradingLoginError"),submit=document.getElementById("tradingLoginSubmit");
 let saved=null;try{saved=JSON.parse(sessionStorage.getItem("nexora_trading_login")||"null")}catch{}
 if(saved?.account_number&&saved?.account_size){gate.hidden=true;document.body.classList.add("terminal-authenticated");const size=document.getElementById("accountSize");if(size){size.value=String(saved.account_size);size.disabled=true;size.dispatchEvent(new Event("change",{bubbles:true}));}}
 else{gate.hidden=false;document.body.classList.add("terminal-locked");}
 form.addEventListener("submit",async event=>{
  event.preventDefault();error.textContent="";submit.disabled=true;submit.textContent="VERIFYING…";
  try{
   const {data:{session:current}}=await supabase.auth.getSession();
   if(!current?.access_token)throw new Error("Website session expired. Sign in again.");
   const response=await fetch("https://jklmzkmankwnrlcgbtsa.supabase.co/functions/v1/terminal-login",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+current.access_token,"apikey":"sb_publishable_mKFp98jH1Lt2HcxwHOEkLw_H9Fgksqz"},body:JSON.stringify({account_number:document.getElementById("tradingAccountNumber").value.trim(),password:document.getElementById("tradingAccountPassword").value})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Login failed. Check your trading credentials.");
   const account=result.account||result;if(!account.account_number||!account.account_size)throw new Error("Login response was incomplete.");
   sessionStorage.setItem("nexora_trading_login",JSON.stringify(account));gate.hidden=true;document.body.classList.add("terminal-authenticated");
   const size=document.getElementById("accountSize");if(size&&[2500,5000,10000,20000].includes(Number(account.account_size))){size.value=String(account.account_size);size.disabled=true;size.dispatchEvent(new Event("change",{bubbles:true}));}
  }catch(err){error.textContent=err.message||"Unable to verify login.";}
  finally{submit.disabled=false;submit.innerHTML='LOGIN TO TERMINAL <span>→</span>';}
 });
 document.getElementById("logoutBtn").addEventListener("click",()=>sessionStorage.removeItem("nexora_trading_login"));
}

const labels = {dashboard:"Dashboard",terminal:"Trading terminal",challenge:"Challenge",activity:"Trading activity",payout:"Payouts",risk:"Risk limits",account:"My account"};
document.getElementById("pageLabel").textContent = labels[page] || "Workspace";
document.querySelectorAll(".side-link[data-page]").forEach(link => { if(link.dataset.page===page) link.classList.add("active"); });
document.getElementById("year").textContent = new Date().getFullYear();
if(page==="account"){document.getElementById("profileName").textContent=profile?.full_name || "Trader";document.getElementById("profileEmail").textContent=session.user.email || "Not available";document.getElementById("profileMark").textContent=firstName.charAt(0).toUpperCase();}
document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("auth.html");});