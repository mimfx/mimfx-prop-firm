import { supabase } from "./supabase-config.js";
const { data: { session } } = await supabase.auth.getSession();
if (!session) { location.replace("auth.html"); throw new Error("Authentication required"); }
const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
const firstName = profile?.full_name?.trim().split(" ")[0] || "Trader";
const avatar = document.getElementById("userAvatar");
if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
const page = location.pathname.split("/").pop().replace(".html","");
const labels = {dashboard:"Dashboard",terminal:"Trading terminal",challenge:"Challenge",activity:"Trading activity",payout:"Payouts",risk:"Risk limits",account:"My account"};
document.getElementById("pageLabel").textContent = labels[page] || "Workspace";
document.querySelectorAll(".side-link[data-page]").forEach(link => { if(link.dataset.page===page) link.classList.add("active"); });
document.getElementById("year").textContent = new Date().getFullYear();
if(page==="account"){document.getElementById("profileName").textContent=profile?.full_name || "Trader";document.getElementById("profileEmail").textContent=session.user.email || "Not available";document.getElementById("profileMark").textContent=firstName.charAt(0).toUpperCase();}
document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("auth.html");});