// Application state
let travels = [];

// DOM Elements
const elements = {
  form: document.querySelector('.form'),
  countryInput: document.getElementById('country'),
  cityInput: document.getElementById('city'),
  addBtn: document.getElementById('addBtn'),
  clearBtn: document.getElementById('clearBtn'),
  travelList: document.getElementById('travelList'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  notification: document.getElementById('notification')
};

// Initialize the application
function init() {
  loadTravels();
  setupEventListeners();
}

// Load travels from localStorage or use sample data
function loadTravels() {
  showLoading(true);
  
  // Simulate API call delay
  setTimeout(() => {
    try {
      const savedTravels = localStorage.getItem('travels');
      travels = savedTravels ? JSON.parse(savedTravels) : [
        { country: 'Togo', city: 'Lomé', date: new Date().toISOString().slice(0, 10) },
        { country: 'France', city: 'Paris', date: '2024-06-15' },
        { country: 'Japan', city: 'Tokyo', date: '2024-03-22' }
      ];
      
      renderList();
      showLoading(false);
    } catch (error) {
      showError('Failed to load travels');
      console.error('Error loading travels:', error);
      showLoading(false);
    }
  }, 800);
}

// Save travels to localStorage
function saveTravels() {
  try {
    localStorage.setItem('travels', JSON.stringify(travels));
  } catch (error) {
    console.error('Error saving travels:', error);
    showError('Failed to save travels');
  }
}

// Add a new travel entry
async function addTravel(e) {
  e.preventDefault();
  
  const country = elements.countryInput.value.trim();
  const city = elements.cityInput.value.trim();
  
  // Validate inputs
  if (!country || !city) {
    showError('Please enter both country and city');
    return;
  }
  
  try {
    // Show loading state
    elements.addBtn.disabled = true;
    elements.addBtn.querySelector('.btn-text').textContent = 'Adding...';
    elements.addBtn.querySelector('.btn-loader').style.display = 'inline-block';
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Add new travel
    const newTravel = {
      id: Date.now(),
      country,
      city,
      date: new Date().toISOString().slice(0, 10)
    };
    
    travels.unshift(newTravel);
    saveTravels();
    renderList();
    
    // Reset form
    elements.form.reset();
    elements.countryInput.focus();
    
    // Show success message
    showNotification('Travel entry added successfully!');
    
  } catch (error) {
    console.error('Error adding travel:', error);
    showError('Failed to add travel entry');
  } finally {
    // Reset button state
    elements.addBtn.disabled = false;
    elements.addBtn.querySelector('.btn-text').textContent = 'Add Visit';
    elements.addBtn.querySelector('.btn-loader').style.display = 'none';
  }
}

// Clear all travels
function clearAllTravels() {
  if (confirm('Are you sure you want to delete all your travel entries? This cannot be undone.')) {
    travels = [];
    saveTravels();
    renderList();
    showNotification('All travel entries have been cleared');
  }
}

// Render the travel list
function renderList() {
  if (!travels || travels.length === 0) {
    elements.emptyState.style.display = 'block';
    elements.travelList.style.display = 'none';
    elements.clearBtn.disabled = true;
    return;
  }
  
  elements.emptyState.style.display = 'none';
  elements.travelList.style.display = 'block';
  elements.clearBtn.disabled = false;
  
  elements.travelList.innerHTML = travels
    .map(travel => `
      <li class="fade-in">
        <div class="location">
          <strong>${escapeHtml(travel.country)}</strong> — ${escapeHtml(travel.city)}
          <span class="date">${travel.date}</span>
        </div>
        <div class="actions">
          <button class="btn-secondary" onclick="editTravel(${travel.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-danger" onclick="deleteTravel(${travel.id})">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </li>
    `)
    .join('');
}

// Edit a travel entry
function editTravel(id) {
  const travel = travels.find(t => t.id === id);
  if (!travel) return;
  
  elements.countryInput.value = travel.country;
  elements.cityInput.value = travel.city;
  
  // Change button text and action
  const addBtn = elements.addBtn;
  const btnText = addBtn.querySelector('.btn-text');
  const originalText = btnText.textContent;
  
  btnText.textContent = 'Update';
  addBtn.onclick = async function updateTravelHandler(e) {
    e.preventDefault();
    
    const country = elements.countryInput.value.trim();
    const city = elements.cityInput.value.trim();
    
    if (!country || !city) {
      showError('Please enter both country and city');
      return;
    }
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update travel
      const index = travels.findIndex(t => t.id === id);
      if (index !== -1) {
        travels[index] = { ...travels[index], country, city };
        saveTravels();
        renderList();
        elements.form.reset();
        showNotification('Travel entry updated successfully!');
      }
      
      // Reset form and button
      addBtn.onclick = addTravel;
      btnText.textContent = originalText;
      
    } catch (error) {
      console.error('Error updating travel:', error);
      showError('Failed to update travel entry');
    }
  };
}

// Delete a travel entry
async function deleteTravel(id) {
  if (!confirm('Are you sure you want to delete this travel entry?')) return;
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = travels.findIndex(t => t.id === id);
    if (index !== -1) {
      travels.splice(index, 1);
      saveTravels();
      renderList();
      showNotification('Travel entry deleted');
    }
  } catch (error) {
    console.error('Error deleting travel:', error);
    showError('Failed to delete travel entry');
  }
}

// Show loading state
function showLoading(isLoading) {
  elements.loadingState.style.display = isLoading ? 'block' : 'none';
  elements.travelList.style.display = isLoading ? 'none' : 'block';
  elements.emptyState.style.display = 'none';
}

// Show notification
function showNotification(message, isError = false) {
  const notification = elements.notification;
  notification.textContent = message;
  notification.className = `notification ${isError ? 'error' : 'success'} show`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Show error message
function showError(message) {
  showNotification(message, true);
}

// Escape HTML to prevent XSS
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

// Set up event listeners
function setupEventListeners() {
  elements.form.addEventListener('submit', addTravel);
  elements.clearBtn.addEventListener('click', clearAllTravels);
  
  // Enable/disable add button based on input
  const inputs = [elements.countryInput, elements.cityInput];
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const hasValue = inputs.every(i => i.value.trim() !== '');
      elements.addBtn.disabled = !hasValue;
    });
  });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
