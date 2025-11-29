// DApp frontend using ethers v6 with enhanced error handling and UX
const CONFIG = {
  contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Remplacez par l'adresse de votre contrat
  supportedNetworks: {
    '0x7a69': 'Localhost',
    '0x1': 'Ethereum Mainnet',
    '0x5': 'Goerli Testnet',
    '0x13881': 'Polygon Mumbai'
  }
};

// Éléments du DOM
const elements = {
  // Boutons
  connectBtn: document.getElementById('connectBtn'),
  addBtn: document.getElementById('addBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  
  // Champs de formulaire
  countryInput: document.getElementById('country'),
  cityInput: document.getElementById('city'),
  dateInput: document.getElementById('date'),
  
  // Affichage
  walletStatus: document.getElementById('walletStatus'),
  walletAddress: document.getElementById('walletAddress'),
  networkName: document.getElementById('networkName'),
  blockNumber: document.getElementById('blockNumber'),
  gasEstimate: document.getElementById('gasEstimate'),
  
  // Liste et états
  travelList: document.getElementById('travelList'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  notification: document.getElementById('notification'),
  
  // Modal de transaction
  txModal: document.getElementById('txModal'),
  txHashLink: document.getElementById('txHashLink'),
  txApproval: document.getElementById('txApproval'),
  txMining: document.getElementById('txMining'),
  txConfirmed: document.getElementById('txConfirmed'),
  closeModal: document.querySelector('.close-modal')
};

// ABI du contrat (version simplifiée)
const CONTRACT_ABI = [
  "function addPlace(string memory country, string memory city, string memory dateVisited) public",
  "function getMyPlaces() public view returns (tuple(string country, string city, string dateVisited)[] memory)",
  "function getCount(address user) public view returns (uint)",
  "event PlaceAdded(address indexed user, string country, string city, string dateVisited)
];

// État de l'application
let state = {
  provider: null,
  signer: null,
  contract: null,
  account: null,
  network: null,
  isConnected: false,
  travelLogs: []
};

// Initialisation de l'application
async function init() {
  if (!window.ethereum) {
    showError('Veuillez installer MetaMask ou un autre portefeuille Web3');
    return;
  }

  // Configuration des écouteurs d'événements
  setupEventListeners();
  
  // Initialisation du fournisseur
  await initProvider();
  
  // Vérification de la connexion existante
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  if (accounts.length > 0) {
    await connectWallet();
  } else {
    updateUI();
  }
}

// Initialisation du fournisseur Web3
async function initProvider() {
  try {
    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.network = await state.provider.getNetwork();
    updateNetworkInfo(state.network);
    
    // Gestionnaire de changement de réseau
    window.ethereum.on('chainChanged', handleChainChanged);
    
    // Gestionnaire de changement de compte
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    
    return true;
  } catch (error) {
    console.error('Erreur d\'initialisation du fournisseur:', error);
    showError('Échec de l\'initialisation du fournisseur Web3');
    return false;
  }
}

// Gestion du changement de réseau
function handleChainChanged(chainId) {
  window.location.reload();
}

// Gestion du changement de compte
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Déconnexion du portefeuille
    resetApp();
  } else {
    // Mise à jour du compte
    state.account = accounts[0];
    updateUI();
    loadTravelLogs();
  }
}

// Connexion du portefeuille
async function connectWallet() {
  try {
    showLoading(true, 'Connexion au portefeuille...');
    
    // Demande d'accès au compte
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('Aucun compte trouvé');
    }
    
    state.account = accounts[0];
    state.isConnected = true;
    
    // Initialisation du contrat
    await initContract();
    
    // Chargement des logs de voyage
    await loadTravelLogs();
    
    updateUI();
    showNotification('Portefeuille connecté avec succès !');
    
  } catch (error) {
    console.error('Erreur de connexion au portefeuille:', error);
    showError('Échec de la connexion: ' + (error.message || 'Erreur inconnue'));
  } finally {
    showLoading(false);
  }
}

// Initialisation du contrat intelligent
async function initContract() {
  try {
    if (!state.provider) {
      throw new Error('Fournisseur non initialisé');
    }
    
    // Obtention du signataire
    state.signer = await state.provider.getSigner();
    
    // Création de l'instance du contrat
    state.contract = new ethers.Contract(
      CONFIG.contractAddress,
      CONTRACT_ABI,
      state.signer
    );
    
    return true;
  } catch (error) {
    console.error('Erreur d\'initialisation du contrat:', error);
    showError('Échec de l\'initialisation du contrat intelligent');
    return false;
  }
}

// Chargement des voyages depuis la blockchain
async function loadTravelLogs() {
  if (!state.contract || !state.account) return;
  
  try {
    showLoading(true, 'Chargement des voyages...');
    
    // Récupération des logs depuis le contrat
    const logs = await state.contract.getMyPlaces();
    
    // Transformation des logs
    state.travelLogs = logs.map(log => ({
      country: log.country,
      city: log.city,
      date: log.dateVisited
    }));
    
    renderTravelLogs();
    
  } catch (error) {
    console.error('Erreur de chargement des voyages:', error);
    showError('Échec du chargement des voyages depuis la blockchain');
  } finally {
    showLoading(false);
  }
}

// Ajout d'un nouveau voyage
async function addTravelLog(e) {
  e.preventDefault();
  
  if (!state.contract || !state.account) {
    showError('Veuillez d\'abord connecter votre portefeuille');
    return;
  }
  
  const country = elements.countryInput.value.trim();
  const city = elements.cityInput.value.trim();
  const date = elements.dateInput.value;
  
  // Validation des entrées
  if (!country || !city || !date) {
    showError('Veuillez remplir tous les champs');
    return;
  }
  
  try {
    // Affichage de la modal de transaction
    showTransactionModal();
    
    // Estimation du gaz
    const gasEstimate = await state.contract.addPlace.estimateGas(country, city, date);
    elements.gasEstimate.textContent = `~${ethers.formatUnits(gasEstimate, 'gwei').substring(0, 6)} Gwei`;
    
    // Envoi de la transaction
    const tx = await state.contract.addPlace(country, city, date);
    
    // Mise à jour de l'interface utilisateur
    updateTransactionStatus('approval');
    updateTransactionStatus('mining', tx.hash);
    
    // Attente de la confirmation
    const receipt = await tx.wait();
    
    // Transaction confirmée
    updateTransactionStatus('confirmed');
    
    // Réinitialisation du formulaire
    elements.form.reset();
    
    // Rechargement des voyages
    await loadTravelLogs();
    
    // Message de succès
    showNotification('Voyage ajouté à la blockchain !', 'success');
    
    // Fermeture de la modal après un délai
    setTimeout(() => {
      closeTransactionModal();
    }, 2000);
    
  } catch (error) {
    console.error('Erreur lors de l\'ajout du voyage:', error);
    
    // Gestion des erreurs spécifiques
    if (error.code === 4001) {
      showError('Transaction rejetée par l\'utilisateur');
    } else if (error.code === -32603) {
      showError('Échec de la transaction: ' + (error.data?.message || 'Fonds ou gaz insuffisants'));
    } else {
      showError('Échec de l\'ajout du voyage: ' + (error.message || 'Erreur inconnue'));
    }
    
    closeTransactionModal();
  }
}

// Affichage des voyages dans l'interface utilisateur
function renderTravelLogs() {
  if (!state.travelLogs || state.travelLogs.length === 0) {
    elements.emptyState.style.display = 'block';
    elements.travelList.style.display = 'none';
    return;
  }
  
  elements.emptyState.style.display = 'none';
  elements.travelList.style.display = 'block';
  
  elements.travelList.innerHTML = state.travelLogs
    .map((log, index) => `
      <li class="fade-in" style="animation-delay: ${index * 0.05}s">
        <div class="location">
          <strong>${escapeHtml(log.country)}</strong> — ${escapeHtml(log.city)}
          <span class="date">${log.date}</span>
        </div>
      </li>
    `)
    .join('');
}

// Mise à jour de l'interface utilisateur
function updateUI() {
  // Mise à jour de l'état du portefeuille
  if (state.isConnected && state.account) {
    elements.walletStatus.classList.add('connected');
    elements.walletStatus.querySelector('.status-dot').classList.add('connected');
    elements.walletAddress.textContent = `${state.account.substring(0, 6)}...${state.account.substring(38)}`;
    elements.connectBtn.style.display = 'none';
    elements.addBtn.disabled = false;
  } else {
    elements.walletStatus.classList.remove('connected');
    elements.walletStatus.querySelector('.status-dot').classList.remove('connected');
    elements.walletAddress.textContent = 'Non connecté';
    elements.connectBtn.style.display = 'inline-flex';
    elements.addBtn.disabled = true;
  }
  
  // Mise à jour des informations réseau
  if (state.network) {
    updateNetworkInfo(state.network);
  }
}

// Mise à jour des informations réseau
function updateNetworkInfo(network) {
  const chainId = `0x${network.chainId.toString(16)}`;
  const networkName = CONFIG.supportedNetworks[chainId] || `Réseau inconnu (${chainId})`;
  
  elements.networkName.textContent = networkName;
  elements.networkName.className = `network-badge ${isSupportedNetwork(chainId) ? '' : 'unsupported'}`;
  
  // Mise à jour du numéro de bloc si disponible
  if (network.blockNumber) {
    elements.blockNumber.textContent = `#${network.blockNumber}`;
  }
  
  // Mise à jour de l'interface utilisateur en fonction du réseau pris en charge
  if (!isSupportedNetwork(chainId)) {
    showError(`Réseau non pris en charge. Veuillez basculer vers ${Object.values(CONFIG.supportedNetworks).join(' ou ')}`);
  }
}

// Vérification du réseau pris en charge
function isSupportedNetwork(chainId) {
  return chainId in CONFIG.supportedNetworks;
}

// Affichage de la modal de transaction
function showTransactionModal() {
  // Réinitialisation de l'état de la modal
  elements.txApproval.className = 'tx-step';
  elements.txMining.className = 'tx-step';
  elements.txConfirmed.className = 'tx-step';
  elements.txHashLink.href = '#';
  elements.txHashLink.textContent = 'Voir sur l\'explorateur';
  
  // Affichage de la modal
  elements.txModal.style.display = 'flex';
  setTimeout(() => {
    elements.txModal.classList.add('show');
  }, 10);
}

// Mise à jour de l'état de la transaction
function updateTransactionStatus(step, txHash = '') {
  switch (step) {
    case 'approval':
      elements.txApproval.className = 'tx-step active';
      elements.txApproval.querySelector('.step-icon').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      break;
      
    case 'mining':
      elements.txApproval.className = 'tx-step completed';
      elements.txApproval.querySelector('.step-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
      
      elements.txMining.className = 'tx-step active';
      elements.txMining.querySelector('.step-icon').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      if (txHash) {
        const explorerUrl = getExplorerUrl(txHash);
        elements.txHashLink.href = explorerUrl;
        elements.txHashLink.textContent = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`;
      }
      break;
      
    case 'confirmed':
      elements.txMining.className = 'tx-step completed';
      elements.txMining.querySelector('.step-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
      
      elements.txConfirmed.className = 'tx-step completed';
      elements.txConfirmed.querySelector('.step-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
      break;
  }
}

// Fermeture de la modal de transaction
function closeTransactionModal() {
  elements.txModal.classList.remove('show');
  setTimeout(() => {
    elements.txModal.style.display = 'none';
  }, 300);
}

// Obtention de l'URL de l'explorateur de blocs
function getExplorerUrl(txHash) {
  const networkId = state.network.chainId;
  
  // Retourne l'URL appropriée en fonction du réseau
  switch (networkId) {
    case 1: // Ethereum Mainnet
      return `https://etherscan.io/tx/${txHash}`;
    case 5: // Goerli Testnet
      return `https://goerli.etherscan.io/tx/${txHash}`;
    case 80001: // Polygon Mumbai
      return `https://mumbai.polygonscan.com/tx/${txHash}`;
    default: // Localhost ou autres
      return `#`;
  }
}

// Affichage de l'état de chargement
function showLoading(isLoading, message = '') {
  if (isLoading) {
    elements.loadingState.style.display = 'block';
    elements.travelList.style.display = 'none';
    elements.emptyState.style.display = 'none';
    
    if (message) {
      elements.loadingState.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    }
  } else {
    elements.loadingState.style.display = 'none';
  }
}

// Affichage d'une notification
function showNotification(message, type = 'info') {
  const notification = elements.notification;
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  // Masquage automatique après 5 secondes
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// Affichage d'une erreur
function showError(message) {
  console.error(message);
  showNotification(message, 'error');
}

// Réinitialisation de l'application
function resetApp() {
  state = {
    ...state,
    account: null,
    isConnected: false,
    travelLogs: []
  };
  
  updateUI();
  elements.travelList.innerHTML = '';
  elements.emptyState.style.display = 'block';
}

// Échappement du HTML pour éviter les attaques XSS
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Bouton de connexion
  elements.connectBtn.addEventListener('click', connectWallet);
  
  // Formulaire d'ajout de voyage
  elements.form.addEventListener('submit', addTravelLog);
  
  // Bouton de rafraîchissement
  elements.refreshBtn.addEventListener('click', () => {
    if (state.isConnected) {
      loadTravelLogs();
    }
  });
  
  // Bouton de fermeture de la modal
  elements.closeModal.addEventListener('click', closeTransactionModal);
  
  // Fermeture de la modal en cliquant à l'extérieur
  window.addEventListener('click', (e) => {
    if (e.target === elements.txModal) {
      closeTransactionModal();
    }
  });
  
  // Activation/désactivation du bouton d'ajout en fonction de la saisie
  const formInputs = [elements.countryInput, elements.cityInput, elements.dateInput];
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      const isFormValid = formInputs.every(i => i.value.trim() !== '');
      elements.addBtn.disabled = !(isFormValid && state.isConnected);
    });
  });
  
  // Définition de la date par défaut à aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  elements.dateInput.value = today;
  elements.dateInput.max = today; // Empêche les dates futures
}

// Initialisation de l'application au chargement de la page
document.addEventListener('DOMContentLoaded', init);
