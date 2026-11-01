const accounts={5000:{target:400},10000:{target:800},20000:{target:1600},50000:{target:4000},100000:{target:8000}};
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);
const select=document.getElementById("accountSelect");
function updateAccount(){const size=Number(select.value),a=accounts[size];document.getElementById("balance").textContent=money(size);document.getElementById("initialEquity").textContent=money(size);document.getElementById("targetAmount").textContent=money(a.target);document.getElementById("netPnl").textContent=money(0);document.getElementById("targetProgress").textContent="0.0%";}
select.addEventListener("change",updateAccount);updateAccount();