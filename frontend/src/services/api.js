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
 * API Catalogues
 */
export const cataloguesAPI = {
  getAll: () => apiCall('/catalogues'),
  getById: (id) => apiCall(`/catalogues/${id}`),
  create: (data) => apiCall('/catalogues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/catalogues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/catalogues/${id}`, { method: 'DELETE' }),
  addCollection: (catalogueId, nom) => apiCall(`/catalogues/${catalogueId}/collections`, { method: 'POST', body: JSON.stringify({ nom }) }),
  updateCollection: (id, nom) => apiCall(`/catalogues/collections/${id}`, { method: 'PUT', body: JSON.stringify({ nom }) }),
  deleteCollection: (id) => apiCall(`/catalogues/collections/${id}`, { method: 'DELETE' }),
  setPapiersCollection: (collectionId, papierIds) => apiCall(`/catalogues/collections/${collectionId}/papiers`, { method: 'PUT', body: JSON.stringify({ papier_ids: papierIds }) }),
};

/**
 * API Papiers cartonnés
 */
export const papierCartonnesAPI = {
  search: (q = '') => apiCall(`/papiers-cartonnes${q ? `?search=${encodeURIComponent(q)}` : ''}`),
  create: (nom) => apiCall('/papiers-cartonnes', { method: 'POST', body: JSON.stringify({ nom }) }),
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


