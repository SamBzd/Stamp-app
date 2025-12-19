/**
 * Service API - Communication avec le backend
 * Base URL: http://localhost:3000/api
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fonction utilitaire pour les appels API
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || `Erreur ${response.status}`);
    }

    // Gérer les réponses 204 (No Content)
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Erreur API ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API Clients
 */
export const clientsAPI = {
  getAll: () => apiCall('/clients'),
  getById: (id) => apiCall(`/clients/${id}`),
  create: (data) => apiCall('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/clients/${id}`, { method: 'DELETE' }),
  getCommandes: (id) => apiCall(`/clients/${id}/commandes`),
};

/**
 * API Collections
 */
export const collectionsAPI = {
  getAll: () => apiCall('/collections'),
  getById: (id) => apiCall(`/collections/${id}`),
  create: (data) => apiCall('/collections', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/collections/${id}`, { method: 'DELETE' }),
};

/**
 * API Groupes
 */
export const groupesAPI = {
  getAll: () => apiCall('/groupes'),
  getById: (id) => apiCall(`/groupes/${id}`),
  getCollections: (id) => apiCall(`/groupes/${id}/collections`),
  create: (data) => apiCall('/groupes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/groupes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/groupes/${id}`, { method: 'DELETE' }),
  addCollection: (groupeId, collectionId, ordre) => 
    apiCall(`/groupes/${groupeId}/collections`, { 
      method: 'POST', 
      body: JSON.stringify({ collection_id: collectionId, ordre }) 
    }),
  removeCollection: (groupeId, collectionId) => 
    apiCall(`/groupes/${groupeId}/collections/${collectionId}`, { method: 'DELETE' }),
  updateCollectionOrder: (groupeId, collectionId, ordre) => 
    apiCall(`/groupes/${groupeId}/collections/${collectionId}/ordre`, { 
      method: 'PUT', 
      body: JSON.stringify({ ordre }) 
    }),
};

/**
 * API Commandes
 */
export const commandesAPI = {
  getAll: () => apiCall('/commandes'),
  getById: (id) => apiCall(`/commandes/${id}`),
  getComplet: (id) => apiCall(`/commandes/${id}/complet`),
  getCollections: (id) => apiCall(`/commandes/${id}/collections`),
  create: (data) => apiCall('/commandes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/commandes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/commandes/${id}`, { method: 'DELETE' }),
  addCollection: (commandeId, collectionId) => 
    apiCall(`/commandes/${commandeId}/collections`, { 
      method: 'POST', 
      body: JSON.stringify({ collection_id: collectionId }) 
    }),
  removeCollection: (commandeId, collectionId) => 
    apiCall(`/commandes/${commandeId}/collections/${collectionId}`, { method: 'DELETE' }),
};

/**
 * API Stocks
 */
export const stocksAPI = {
  getAll: () => apiCall('/stocks'),
  getById: (collectionId, format) => apiCall(`/stocks/${collectionId}/${format}`),
  updateStock: (collectionId, format, quantiteStock) => 
    apiCall(`/stocks/${collectionId}/${format}`, { 
      method: 'PUT', 
      body: JSON.stringify({ quantite_stock: quantiteStock }) 
    }),
  setGere: (collectionId, format, gere) => 
    apiCall(`/stocks/${collectionId}/${format}/gere`, { 
      method: 'PATCH', 
      body: JSON.stringify({ gere }) 
    }),
  getANecessiter: () => apiCall('/stocks/a-necessiter'),
  recalculate: () => apiCall('/stocks/recalculate', { method: 'POST' }),
};


