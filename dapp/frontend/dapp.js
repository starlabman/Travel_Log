// DApp frontend using ethers v6
const CONTRACT_ADDRESS = "REPLACE_WITH_DEPLOYED_ADDRESS";
const CONTRACT_ABI = [ /* REPLACE_WITH_ABI_FROM_ARTIFACTS */ ];

let provider, signer, contract;

const statusEl = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const addBtn = document.getElementById('addBtn');

connectBtn.onclick = async () => {
  if (!window.ethereum) return alert("Please install MetaMask");
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  const address = await signer.getAddress();
  statusEl.textContent = "Connected: " + address;
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  addBtn.disabled = false;
  loadList();
};

addBtn.onclick = async () => {
  const country = document.getElementById('country').value.trim();
  const city = document.getElementById('city').value.trim();
  const date = document.getElementById('date').value;
  if (!country || !city || !date) return alert("Please fill all fields");
  const tx = await contract.addPlace(country, city, date);
  statusEl.textContent = "Transaction sent: " + tx.hash;
  await tx.wait();
  statusEl.textContent = "Transaction confirmed: " + tx.hash;
  loadList();
};

async function loadList() {
  if (!contract) return;
  const places = await contract.getMyPlaces();
  const list = document.getElementById('travelList');
  // places is an array of structs: each item may be an object with fields or array-like depending on ethers version
  list.innerHTML = places.map(p => {
    // try both styles
    const country = p.country || p[0];
    const city = p.city || p[1];
    const date = p.dateVisited || p[2] || '';
    return `<li><strong>${country}</strong> — ${city} (${date})</li>`;
  }).join('');
}
