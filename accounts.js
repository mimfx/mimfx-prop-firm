import { supabase } from "./supabase-config.js";

const sizes=[2500,5000,10000,15000,20000];
const prices={"2500":{two:19,one:25},"5000":{two:26,one:35},"10000":{two:50,one:65},"15000":{two:78,one:100},"20000":{two:120,one:155}};
const cards=[...document.querySelectorAll(".account-card")];
const modelCards=[...document.querySelectorAll(".model-option")];
let selected=20000,model="2-phase",appliedPromo=null;
const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n).toFixed(2)+" USD";
function basePrice(){const p=prices[String(selected)];return p[model==="1-phase"?"one":"two"];}
function clearPromo(message="Only promo codes issued by Nexora are accepted."){appliedPromo=null;$("promoMessage").textContent=message;$("promoMessage").style.color="";$("promoDiscountRow").hidden=true;$("promoFinalRow").hidden=true;}
function message(){$("selectionMessage").textContent="Selected $"+selected.toLocaleString("en-US")+" · "+(model==="1-phase"?"1-Phase":"2-Phase")+". Payment collection is not enabled yet.";}
function updatePrice(){ $("challengePrice").textContent=money(basePrice()); if(appliedPromo){$("promoDiscount").textContent="−"+money(appliedPromo.discount_amount);$("promoFinal").textContent=money(appliedPromo.final_price);} }
function chooseSize(n){selected=n;cards.forEach(c=>{let a=Number(c.dataset.size)===n;c.classList.toggle("selected",a);c.querySelector(".choose").innerHTML=a?'Selected <b>✓</b>':'Select account <b>↗</b>';});$("summaryCapital").textContent="$"+n.toLocaleString("en-US");clearPromo("Account changed. Re-apply your promo code to this price.");updatePrice();message();}
function chooseModel(m){model=m;modelCards.forEach(c=>c.classList.toggle("selected",c.dataset.model===m));let one=m==="1-phase";$("summaryModel").textContent=one?"1-Phase":"2-Phase";$("summaryDrawdown").textContent=one?"Trailing":"Static";$("summaryTarget").textContent=one?"8%":"8% + 5%";$("summaryDaily").textContent=one?"3%":"5%";$("summaryMax").textContent=one?"8%":"10%";$("summaryPayout").textContent="70%";clearPromo("Challenge model changed. Re-apply your promo code.");updatePrice();message();}
async function applyPromo(){const code=$("promoInput").value.trim().toUpperCase();if(!code){clearPromo("Enter a promo code first.");return;}$("applyPromo").disabled=true;$("promoMessage").textContent="Checking official Nexora promo codes…";$("promoMessage").style.color="";const {data,error}=await supabase.rpc("validate_nexora_promo",{p_code:code,p_base_price:basePrice()});$("applyPromo").disabled=false;if(error){clearPromo("Promo validation is temporarily unavailable. Please try again.");return;}const result=Array.isArray(data)?data[0]:data;if(!result?.valid){clearPromo(result?.message||"This promo code is invalid or inactive.");return;}appliedPromo=result;$("promoMessage").textContent=result.message+" Discount is preview only; checkout is not active.";$("promoMessage").style.color="#b6e5a0";$("promoDiscountRow").hidden=false;$("promoFinalRow").hidden=false;updatePrice();}
cards.forEach(c=>c.addEventListener("click",()=>chooseSize(Number(c.dataset.size))));
modelCards.forEach(c=>c.addEventListener("click",()=>chooseModel(c.dataset.model)));
$("applyPromo").addEventListener("click",applyPromo);
$("promoInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyPromo();}});
$("promoInput").addEventListener("input",()=>{if(appliedPromo)clearPromo("Promo code changed. Apply it again.");});
const q=new URLSearchParams(location.search),n=Number(q.get("size"));if(sizes.includes(n))chooseSize(n);chooseModel(q.get("model")==="1-phase"?"1-phase":"2-phase");
$("continueBtn").textContent="Create purchase order";
$("continueBtn").addEventListener("click",async()=>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.href="auth.html?mode=signin&next=accounts";return;}
 $("continueBtn").disabled=true;
 $("selectionMessage").textContent="Creating your secure order record…";
 const code=appliedPromo?appliedPromo.code:null;
 const {data,error}=await supabase.rpc("create_nexora_purchase_order",{p_account_size:selected,p_model:model,p_promo_code:code});
 $("continueBtn").disabled=false;
 if(error){$("selectionMessage").textContent=error.message;return;}
 const order=Array.isArray(data)?data[0]:data;
 $("selectionMessage").textContent="Order "+order.order_id+" created. Amount due: "+money(order.final_price)+". Payment collection is not enabled yet. Do not send money; Nexora will announce when checkout opens.";
 $("continueBtn").textContent="Order created";
 $("continueBtn").disabled=true;
});
$("year").textContent=new Date().getFullYear();