// Simple in-memory storage for the Web2 version
let travels = [];

function addTravel() {
  const country = document.getElementById("country").value.trim();
  const city = document.getElementById("city").value.trim();
  if (!country || !city) return alert("Please enter both country and city");
  travels.push({ country, city, date: new Date().toISOString().slice(0,10) });
  renderList();
  document.getElementById("country").value = "";
  document.getElementById("city").value = "";
}

function renderList() {
  const list = document.getElementById("travelList");
  list.innerHTML = travels
    .map(t => `<li><strong>${t.country}</strong> — ${t.city} <span class="date">(${t.date})</span></li>`)
    .join("");
}

document.getElementById("addBtn").addEventListener("click", addTravel);

// load sample data
travels = [{country:'Togo', city:'Lomé', date:'2025-01-01'}];
renderList();
