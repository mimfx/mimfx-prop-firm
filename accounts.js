const sizes=[2500,5000,10000,15000,20000];
const prices={"2500":{two:12,one:16},"5000":{two:19,one:25},"10000":{two:35,one:45},"15000":{two:52,one:67},"20000":{two:69,one:89}};
const cards=[...document.querySelectorAll(".account-card")];
const modelCards=[...document.querySelectorAll(".model-option")];
let selected=20000,model="2-phase";
function message(){document.getElementById("selectionMessage").textContent="Selected $"+selected.toLocaleString("en-US")+" · "+(model==="1-phase"?"1-Phase":"2-Phase")+" preview. Checkout is not active.";}
function chooseSize(n){selected=n;cards.forEach(c=>{let a=Number(c.dataset.size)===n;c.classList.toggle("selected",a);c.querySelector(".choose").innerHTML=a?'Selected <b>✓</b>':'Select account <b>↗</b>';});document.getElementById("summaryCapital").textContent="$"+n.toLocaleString("en-US");updatePrice();message();}
function updatePrice(){const p=prices[String(selected)];document.getElementById("challengePrice").textContent="$"+p[model==="1-phase"?"one":"two"]+" USD";}
function chooseModel(m){model=m;modelCards.forEach(c=>c.classList.toggle("selected",c.dataset.model===m));let one=m==="1-phase";document.getElementById("summaryModel").textContent=one?"1-Phase":"2-Phase";document.getElementById("summaryDrawdown").textContent=one?"Trailing":"Static";document.getElementById("summaryTarget").textContent=one?"8%":"8% + 5%";document.getElementById("summaryDaily").textContent=one?"3%":"5%";document.getElementById("summaryMax").textContent=one?"8%":"10%";document.getElementById("summaryPayout").textContent="70%";updatePrice();message();}
cards.forEach(c=>c.addEventListener("click",()=>chooseSize(Number(c.dataset.size))));
modelCards.forEach(c=>c.addEventListener("click",()=>chooseModel(c.dataset.model)));
const q=new URLSearchParams(location.search),n=Number(q.get("size"));if(sizes.includes(n))chooseSize(n);chooseModel(q.get("model")==="1-phase"?"1-phase":"2-phase");
document.getElementById("year").textContent=new Date().getFullYear();