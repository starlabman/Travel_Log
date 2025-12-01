// Configuration de la DApp
const CONFIG = {
  contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  supportedNetworks: {
    '0x7a69': { name: 'Localhost', explorer: 'http://localhost:8545' },
    '0x1': { name: 'Ethereum Mainnet', explorer: 'https://etherscan.io' },
    '0x5': { name: 'Goerli Testnet', explorer: 'https://goerli.etherscan.io' },
    '0x13881': { name: 'Polygon Mumbai', explorer: 'https://mumbai.polygonscan.com' }
  },
  defaultGasPrice: '20', // GWEI
  maxGasPrice: '100', // GWEI
  requiredConfirmations: 1,
  maxRetries: 3,
  retryDelay: 2000 // ms
};

// État de l'application
const state = {
  provider: null,
  signer: null,
  contract: null,
  account: null,
  chainId: null,
  isConnected: false,
  isProcessing: false,
  travelLogs: [],
  currentNetwork: null,
  currentBlock: 0,
  gasPrice: 0,
  pendingTransactions: new Map()
};

// Éléments du DOM
const elements = {
  // Formulaire
  form: document.getElementById('travelForm'),
  countryInput: document.getElementById('country'),
  cityInput: document.getElementById('city'),
  dateInput: document.getElementById('date'),
  
  // Boutons
  connectBtn: document.getElementById('connectBtn'),
  addBtn: document.getElementById('addBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  addFirstTravelBtn: document.getElementById('addFirstTravelBtn'),
  
  // État du portefeuille
  walletStatus: document.getElementById('walletStatus'),
  walletAddress: document.getElementById('walletAddress'),
  networkName: document.getElementById('networkName'),
  blockNumber: document.getElementById('blockNumber'),
  
  // Liste et états
  travelList: document.getElementById('travelList'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  
  // Notification
  notification: document.getElementById('notification'),
  
  // Transaction status
  transactionStatus: document.getElementById('transactionStatus'),
  transactionMessage: document.getElementById('transactionMessage'),
  transactionLink: document.getElementById('transactionLink'),
  gasAmount: document.getElementById('gasAmount'),
  
  // Modals
  successModal: document.getElementById('successModal'),
  errorModal: document.getElementById('errorModal'),
  viewTransactionBtn: document.getElementById('viewTransactionBtn'),
  closeSuccessModal: document.getElementById('closeSuccessModal'),
  closeErrorModal: document.getElementById('closeErrorModal'),
  errorMessage: document.getElementById('errorMessage')
};

// ABI du contrat (version complète avec événements)
const CONTRACT_ABI = [
  // Fonctions
  {
    "inputs": [
      { "internalType": "string", "name": "country", "type": "string" },
      { "internalType": "string", "name": "city", "type": "string" },
      { "internalType": "string", "name": "dateVisited", "type": "string" }
    ],
    "name": "addPlace",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMyPlaces",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "country", "type": "string" },
          { "internalType": "string", "name": "city", "type": "string" },
          { "internalType": "string", "name": "dateVisited", "type": "string" }
        ],
        "internalType": "struct TravelLog.Place[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Événements
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "country",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "city",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "dateVisited",
        "type": "string"
      }
    ],
    "name": "PlaceAdded",
    "type": "event"
  }
];

/**
 * Initialisation de l'application
 */
async function init() {
  try {
    // Vérifier si Web3 est disponible
    if (!window.ethereum) {
      showError('Veuillez installer MetaMask ou un portefeuille Web3 pour utiliser cette application');
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
    
    // Charger les données initiales
    await loadInitialData();
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    showError(`Erreur d'initialisation: ${error.message}`);
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

/**
 * Gestion du changement de réseau
 * @param {string} chainId - ID de la chaîne au format hexadécimal
 */
function handleChainChanged(chainId) {
  console.log('Changement de réseau détecté:', chainId);
  
  // Vérifier si le réseau est pris en charge
  if (!isSupportedNetwork(chainId)) {
    showError(`Réseau non pris en charge. Veuillez basculer vers un réseau pris en charge.`);
  }
  
  // Recharger la page pour mettre à jour l'interface
  window.location.reload();
}

/**
 * Gestion du changement de compte
 * @param {string[]} accounts - Tableau des adresses du compte connecté
 */
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

/**
 * Gère la connexion/déconnexion du portefeuille
 */
async function connectWallet() {
  try {
    // Si déjà connecté, déconnecter
    if (state.isConnected) {
      await resetApp();
      showNotification('Déconnexion réussie', 'success');
      return;
    }
    
    // Afficher l'état de chargement
    showLoading(true, 'Connexion au portefeuille...');
    
    // Demander l'accès au compte
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('Aucun compte trouvé');
    }
    
    // Mettre à jour l'état
    state.account = accounts[0];
    state.isConnected = true;
    
    // Initialiser le fournisseur si nécessaire
    if (!state.provider) {
      await initProvider();
    }
    
    // Initialiser le contrat
    await initContract();
    
    // Charger les données
    await loadInitialData();
    
    // Mettre à jour l'interface
    updateUI();
    
    // Afficher une notification de succès
    showNotification('Portefeuille connecté avec succès', 'success');
    
  } catch (error) {
    console.error('Erreur de connexion au portefeuille:', error);
    
    // Gestion des erreurs spécifiques
    let errorMessage = 'Échec de la connexion';
    
    if (error.code === 4001) {
      errorMessage = 'Connexion refusée par l\'utilisateur';
    } else if (error.code === -32002) {
      errorMessage = 'Une requête de connexion est déjà en cours';
    } else if (error.code === -32601) {
      errorMessage = 'La méthode de requête n\'est pas disponible';
    } else if (error.code === -32603) {
      errorMessage = 'Erreur interne du fournisseur';
    } else {
      errorMessage = error.message || error.toString();
    }
    
    showError(errorMessage);
    
    // Réinitialiser l'état en cas d'erreur
    await resetApp();
    
  } finally {
    // Cacher l'état de chargement
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

/**
 * Chargement des données initiales de l'application
 */
async function loadInitialData() {
  try {
    // Afficher l'état de chargement
    showLoading(true, 'Chargement des données...');
    
    // Vérifier si un portefeuille est connecté
    if (state.isConnected && state.account) {
      // Charger les voyages de l'utilisateur
      await loadTravelLogs();
      
      // Mettre à jour les informations du réseau
      if (state.provider) {
        const network = await state.provider.getNetwork();
        updateNetworkInfo(network);
      }
    }
    
    // Mettre à jour l'interface utilisateur
    updateUI();
    
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    showError(`Erreur lors du chargement des données: ${error.message}`);
  } finally {
    // Cacher l'état de chargement
    showLoading(false);
  }
}

/**
 * Charge les voyages de l'utilisateur depuis la blockchain
 * @returns {Promise<void>}
 */
async function loadTravelLogs() {
  // Vérifier les prérequis
  if (!state.contract || !state.account) {
    console.warn('Impossible de charger les voyages: contrat ou compte non initialisé');
    return;
  }
  
  // Vérifier si un chargement est déjà en cours
  if (state.isLoading) {
    console.log('Chargement déjà en cours, annulation de la nouvelle requête');
    return;
  }
  
  try {
    // Mettre à jour l'état de chargement
    state.isLoading = true;
    showLoading(true, 'Chargement de vos voyages...');
    
    // Afficher l'état de chargement dans l'interface
    elements.travelList.innerHTML = '<div class="loading-text">Chargement de vos voyages...</div>';
    
    // Récupérer les données depuis le contrat
    console.log('Récupération des voyages depuis la blockchain...');
    const logs = await Promise.race([
      state.contract.getMyPlaces(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Délai dépassé lors du chargement des voyages')), 30000)
      )
    ]);
    
    console.log(`${logs.length} voyages récupérés`, logs);
    
    if (!Array.isArray(logs)) {
      throw new Error('Format de données invalide reçu du contrat');
    }
    
    // Transformer et trier les données
    const processedLogs = logs
      .map((log, index) => {
        try {
          // Vérifier que les champs requis existent
          if (!log.country || !log.city || !log.dateVisited) {
            console.warn('Données de voyage incomplètes à l\'index', index, log);
            return null;
          }
          
          // Convertir la date en objet Date
          const date = new Date(log.dateVisited * 1000);
          
          // Vérifier que la date est valide
          if (isNaN(date.getTime())) {
            console.warn('Date invalide à l\'index', index, log);
            return null;
          }
          
          // Formater la date pour l'affichage
          const formattedDate = date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          return {
            id: `${log.country}-${log.city}-${date.getTime()}`,
            country: log.country.toString(),
            city: log.city.toString(),
            date: formattedDate,
            timestamp: date.getTime()
          };
          
        } catch (error) {
          console.error('Erreur lors du traitement du voyage', index, ':', error);
          return null;
        }
      })
      .filter(log => log !== null) // Supprimer les entrées invalides
      .sort((a, b) => b.timestamp - a.timestamp); // Trier par date décroissante
    
    console.log(`${processedLogs.length} voyages valides après traitement`);
    
    // Mettre à jour l'état de l'application
    state.travelLogs = processedLogs;
    
    // Mettre en cache les données pour une utilisation ultérieure
    try {
      localStorage.setItem(`travelLogs_${state.account}`, JSON.stringify({
        data: processedLogs,
        timestamp: Date.now()
      }));
    } catch (cacheError) {
      console.warn('Impossible de mettre en cache les données:', cacheError);
    }
    
    // Mettre à jour l'interface utilisateur
    renderTravelLogs();
    
    // Si aucun voyage n'est trouvé, afficher l'état vide
    if (processedLogs.length === 0) {
      elements.emptyState.style.display = 'block';
      elements.travelList.style.display = 'none';
    } else {
      elements.emptyState.style.display = 'none';
      elements.travelList.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des voyages:', error);
    
    // Essayer de récupérer les données en cache en cas d'erreur
    try {
      const cachedData = localStorage.getItem(`travelLogs_${state.account}`);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const maxCacheAge = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < maxCacheAge) {
          state.travelLogs = data;
          renderTravelLogs();
          showNotification('Données en cache chargées (hors ligne)', 'warning');
          return;
        }
      }
    } catch (cacheError) {
      console.warn('Erreur lors de la récupération du cache:', cacheError);
    }
    
    // Afficher un message d'erreur approprié
    let errorMessage = 'Impossible de charger les voyages';
    
    if (error.message.includes('revert')) {
      errorMessage = 'Erreur lors de la lecture des données du contrat';
    } else if (error.message.includes('timeout') || error.message.includes('délai')) {
      errorMessage = 'Délai dépassé lors de la connexion à la blockchain';
    } else if (!navigator.onLine) {
      errorMessage = 'Connexion Internet requise pour charger les données';
    } else {
      errorMessage = `Erreur: ${error.message || 'Erreur inconnue'}`;
    }
    
    showError(errorMessage);
    
    // Afficher l'état d'erreur dans l'interface
    elements.travelList.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${errorMessage}</p>
        <button id="retryLoadBtn" class="btn btn-secondary">
          <i class="fas fa-sync-alt"></i> Réessayer
        </button>
      </div>
    `;
    
    // Ajouter l'écouteur d'événement pour le bouton de réessai
    const retryBtn = document.getElementById('retryLoadBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadTravelLogs);
    }
    
  } finally {
    // Réinitialiser l'état de chargement
    state.isLoading = false;
    showLoading(false);
  }
}

// Ajout d'un nouveau voyage
async function addTravelLog(e) {
  e.preventDefault();
  
  // Vérifier la connexion au portefeuille
  if (!state.contract || !state.account) {
    showError('Veuillez vous connecter à votre portefeuille');
    return;
  }
  
  // Récupération et validation des données du formulaire
  const country = elements.countryInput.value.trim();
  const city = elements.cityInput.value.trim();
  const date = elements.dateInput.value;
  
  // Validation des champs obligatoires
  if (!country || !city || !date) {
    showError('Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  // Validation de la date (doit être dans le passé ou aujourd'hui)
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate > today) {
    showError('La date ne peut pas être dans le futur');
    return;
  }
  
  // Formatage de la date pour l'affichage
  const formattedDate = selectedDate.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Confirmation avant envoi
  const confirmAdd = confirm(`Ajouter ${city}, ${country} (${formattedDate}) à votre journal de voyage ?`);
  if (!confirmAdd) return;
  
  try {
    // Afficher la modale de transaction
    showTransactionModal();
    updateTransactionStatus('approval', 'En attente de votre approbation...');
    
    // Désactiver le formulaire pendant le traitement
    elements.form.querySelectorAll('input, button').forEach(el => {
      el.disabled = true;
    });
    
    // Estimation du coût en gaz
    updateTransactionStatus('estimate', 'Estimation du coût en gaz...');
    
    try {
      const gasEstimate = await state.contract.addPlace.estimateGas(country, city, date);
      const gasPrice = await state.provider.getGasPrice();
      
      // Afficher l'estimation du coût
      const estimatedCost = ethers.formatEther(gasEstimate.mul(gasPrice));
      updateTransactionStatus('estimate', `Coût estimé: ${estimatedCost} ETH`);
      
    } catch (estimateError) {
      console.warn('Erreur lors de l\'estimation du gaz:', estimateError);
      updateTransactionStatus('estimate', 'Impossible d\'estimer le coût');
    }
    
    // Envoi de la transaction
    updateTransactionStatus('sending', 'Envoi de la transaction...');
    
    const tx = await state.contract.addPlace(country, city, date, {
      gasLimit: 500000, // Limite de gaz généreuse
      gasPrice: await state.provider.getGasPrice()
    });
    
    // Mise à jour avec le hash de la transaction
    updateTransactionStatus('pending', 'En attente de confirmation...', tx.hash);
    
    // Attente de la confirmation
    const receipt = await tx.wait();
    
    // Vérification de la confirmation
    if (receipt.status === 1) {
      // Transaction réussie
      updateTransactionStatus('confirmed', 'Transaction confirmée!', tx.hash);
      
      // Mise à jour de l'interface
      await loadTravelLogs();
      elements.form.reset();
      
      // Afficher la notification de succès
      showNotification(`Voyage à ${city}, ${country} ajouté avec succès!`, 'success');
      
      // Fermer la modale après un délai
      setTimeout(() => {
        closeTransactionModal();
      }, 3000);
      
    } else {
      throw new Error('La transaction a échoué');
    }
    
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
    let errorMessage = 'Échec de l\'ajout du voyage';
    
    if (error.code === 4001) {
      errorMessage = 'Transaction rejetée par l\'utilisateur';
    } else if (error.code === -32603) {
      errorMessage = 'Échec de la transaction: ' + (error.data?.message || 'Fonds ou gaz insuffisants');
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Fonds insuffisants pour effectuer cette transaction';
    } else if (error.message.includes('revert')) {
      errorMessage = 'La transaction a été annulée';
    } else {
      errorMessage = `Erreur: ${error.message || 'Erreur inconnue'}`;
    }
    
    showError(errorMessage);
    
    // Mettre à jour l'état de la transaction
    if (typeof updateTransactionStatus === 'function') {
      updateTransactionStatus('error', errorMessage);
    }
  } finally {
    // Réactiver le formulaire
    if (elements.form) {
      elements.form.querySelectorAll('input, button').forEach(el => {
        el.disabled = false;
      });
    }
    
    // Cacher l'état de chargement
    showLoading(false);
  }
}

/**
 * Affiche les voyages dans l'interface utilisateur
 */
function renderTravelLogs() {
  if (!elements.travelList) {
    console.warn('Élément travelList non trouvé dans le DOM');
    return;
  }

  // Vérifier s'il y a des voyages à afficher
  if (!state.travelLogs || state.travelLogs.length === 0) {
    elements.travelList.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-globe-americas"></i>
        <h3>Votre journal de voyage est vide</h3>
        <p>Commencez par ajouter votre premier voyage !</p>
      </div>
    `;
    return;
  }
  
  try {
    // Créer le conteneur principal
    const container = document.createElement('div');
    container.className = 'travel-logs-container';
    
    // Ajouter l'en-tête avec le compteur
    const header = document.createElement('div');
    header.className = 'travel-logs-header';
    header.innerHTML = `
      <h2>Mes voyages <span class="badge">${state.travelLogs.length}</span></h2>
      <div class="travel-controls">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" id="searchTravels" placeholder="Rechercher un voyage..." />
        </div>
        <div class="sort-options">
          <select id="sortTravels" class="form-select">
            <option value="date-desc">Plus récent</option>
            <option value="date-asc">Plus ancien</option>
            <option value="country">Pays (A-Z)</option>
            <option value="city">Ville (A-Z)</option>
          </select>
        </div>
      </div>
    `;
    container.appendChild(header);
    
    // Créer la liste des voyages
    const list = document.createElement('ul');
    list.className = 'travel-list';
    
    // Trier les voyages par date décroissante par défaut
    const sortedLogs = [...state.travelLogs].sort((a, b) => b.timestamp - a.timestamp);
    
    // Ajouter chaque voyage à la liste
    sortedLogs.forEach((log, index) => {
      const item = document.createElement('li');
      item.className = 'travel-item fade-in';
      item.style.animationDelay = `${index * 0.05}s`;
      item.dataset.country = log.country.toLowerCase();
      item.dataset.city = log.city.toLowerCase();
      item.dataset.date = log.timestamp;
      
      // Formater la date pour l'affichage détaillé
      const date = new Date(log.timestamp);
      const formattedDate = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      item.innerHTML = `
        <div class="travel-card">
          <div class="travel-location">
            <div class="country-flag">
              <i class="fas fa-map-marker-alt"></i>
              <span>${escapeHtml(log.country)}</span>
            </div>
            <h3 class="city-name">${escapeHtml(log.city)}</h3>
          </div>
          <div class="travel-meta">
            <div class="travel-date">
              <i class="far fa-calendar-alt"></i>
              <span>${formattedDate}</span>
            </div>
            <div class="travel-actions">
              <button class="btn-icon" title="Partager" data-city="${escapeHtml(log.city)}" data-country="${escapeHtml(log.country)}" data-date="${date.toISOString().split('T')[0]}">
                <i class="fas fa-share-alt"></i>
              </button>
              <button class="btn-icon" title="Voir sur la carte" data-city="${escapeHtml(log.city)}" data-country="${escapeHtml(log.country)}">
                <i class="fas fa-map-marked-alt"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      
      list.appendChild(item);
    });
    
    container.appendChild(list);
    
    // Remplacer le contenu de l'élément travelList
    elements.travelList.innerHTML = '';
    elements.travelList.appendChild(container);
    
    // Initialiser les écouteurs d'événements pour les contrôles
    setupTravelListControls();
    
  } catch (error) {
    console.error('Erreur lors du rendu des voyages:', error);
    elements.travelList.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Une erreur est survenue lors du chargement des voyages.</p>
        <button class="btn btn-secondary" id="retryRenderBtn">
          <i class="fas fa-sync"></i> Réessayer
        </button>
      </div>
    `;
    
    // Ajouter l'écouteur d'événement pour le bouton de réessai
    const retryBtn = document.getElementById('retryRenderBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', renderTravelLogs);
    }
  }
}

/**
 * Configure les écouteurs d'événements pour les contrôles de la liste des voyages
 */
function setupTravelListControls() {
  // Recherche
  const searchInput = document.getElementById('searchTravels');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll('.travel-item');
      
      items.forEach(item => {
        const country = item.dataset.country || '';
        const city = item.dataset.city || '';
        const isVisible = country.includes(searchTerm) || city.includes(searchTerm);
        item.style.display = isVisible ? 'block' : 'none';
      });
    });
  }
  
  // Tri
  const sortSelect = document.getElementById('sortTravels');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const sortBy = e.target.value;
      
      // Mettre à jour le tri dans l'état
      switch (sortBy) {
        case 'date-asc':
          state.travelLogs.sort((a, b) => a.timestamp - b.timestamp);
          break;
        case 'country':
          state.travelLogs.sort((a, b) => a.country.localeCompare(b.country));
          break;
        case 'city':
          state.travelLogs.sort((a, b) => a.city.localeCompare(b.city));
          break;
        case 'date-desc':
        default:
          state.travelLogs.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      // Re-rendre la liste triée
      renderTravelLogs();
    });
  }
  
  // Gestion des clics sur les boutons d'action
  document.addEventListener('click', (e) => {
    // Bouton de partage
    if (e.target.closest('.btn-icon .fa-share-alt') || e.target.closest('.btn-icon[title="Partager"]')) {
      const btn = e.target.closest('.btn-icon');
      const city = btn.dataset.city || '';
      const country = btn.dataset.country || '';
      const date = btn.dataset.date || '';
      
      if (city && country) {
        shareTravel(city, country, date);
      }
    }
    
    // Bouton de carte
    if (e.target.closest('.btn-icon .fa-map-marked-alt') || e.target.closest('.btn-icon[title*="carte"]')) {
      const btn = e.target.closest('.btn-icon');
      const city = btn.dataset.city || '';
      const country = btn.dataset.country || '';
      
      if (city && country) {
        viewOnMap(city, country);
      }
    }
  });
}

/**
 * Partage un voyage sur les réseaux sociaux
 */
function shareTravel(city, country, date = '') {
  try {
    const text = `J'ai visité ${city}, ${country}${date ? ` le ${date}` : ''} avec mon journal de voyage décentralisé! #Voyage #Blockchain`;
    
    if (navigator.share) {
      navigator.share({
        title: `Mon voyage à ${city}, ${country}`,
        text: text,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    showError('Impossible de partager ce voyage');
  }
}

/**
 * Affiche un voyage sur une carte
 */
function viewOnMap(city, country) {
  try {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city}, ${country}`)}`;
    window.open(mapUrl, '_blank');
  } catch (error) {
    console.error('Erreur lors de l\'ouverture de la carte:', error);
    showError('Impossible d\'afficher la carte');
  }
}

/**
 * Met à jour l'interface utilisateur en fonction de l'état actuel
 */
function updateUI() {
  try {
    // Mise à jour du statut du portefeuille
    if (state.isConnected && state.account) {
      // Utilisateur connecté
      elements.walletStatus.textContent = 'Connecté';
      elements.walletStatus.className = 'status connected';
      elements.walletAddress.textContent = `${state.account.substring(0, 6)}...${state.account.substring(38)}`;
      elements.connectBtn.textContent = 'Déconnexion';
      elements.connectBtn.classList.remove('btn-primary');
      elements.connectBtn.classList.add('btn-secondary');
      
      // Activer le formulaire
      elements.form.querySelectorAll('input, button').forEach(el => {
        el.disabled = false;
      });
      
      // Afficher l'état vide si aucun voyage
      if (state.travelLogs.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.travelList.style.display = 'none';
      } else {
        elements.emptyState.style.display = 'none';
        elements.travelList.style.display = 'block';
      }
    } else {
      // Utilisateur non connecté
      elements.walletStatus.textContent = 'Non connecté';
      elements.walletStatus.className = 'status disconnected';
      elements.walletAddress.textContent = 'Non connecté';
      elements.connectBtn.textContent = 'Connecter le portefeuille';
      elements.connectBtn.classList.remove('btn-secondary');
      elements.connectBtn.classList.add('btn-primary');
      
      // Désactiver le formulaire
      elements.form.querySelectorAll('input, button').forEach(el => {
        el.disabled = true;
      });
      
      // Afficher l'état de connexion requis
      elements.emptyState.style.display = 'block';
      elements.emptyState.innerHTML = `
        <div class="empty-state-content">
          <i class="fas fa-wallet empty-icon"></i>
          <h3>Connectez votre portefeuille</h3>
          <p>Connectez-vous pour voir et ajouter des voyages à votre journal.</p>
          <button id="connectEmptyBtn" class="btn btn-primary">
            <i class="fas fa-plug"></i> Connecter le portefeuille
          </button>
        </div>
      `;
      
      // Ajouter l'écouteur d'événement pour le bouton de connexion
      const connectEmptyBtn = document.getElementById('connectEmptyBtn');
      if (connectEmptyBtn) {
        connectEmptyBtn.addEventListener('click', connectWallet);
      }
    }
    
    // Mise à jour des informations réseau
    if (state.network) {
      updateNetworkInfo(state.network);
    }
    
    // Mise à jour de la liste des voyages
    renderTravelLogs();
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'interface:', error);
    showError(`Erreur lors de la mise à jour de l'interface: ${error.message}`);
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
