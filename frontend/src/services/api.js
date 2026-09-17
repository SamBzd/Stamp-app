/**
 * Service API - Communication avec le backend
 * Une URL relative permet au même build de fonctionner derrière tout proxy.
 */

const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || '/api').replace(/\/+$/, '');

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
  getAll: ({ includeArchives = false } = {}) => apiCall(`/clients?include_archives=${includeArchives}`),
  getById: (id) => apiCall(`/clients/${id}`),
  create: (data) => apiCall('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setArchive: (id, archive) => apiCall(`/clients/${id}/archivage`, { method: 'PATCH', body: JSON.stringify({ archive }) }),
  getCommandes: (id) => apiCall(`/clients/${id}/commandes`),
};

/**
 * API Catalogues
 */
export const cataloguesAPI = {
  getAll: ({ includeArchives = false, utilisables = false } = {}) => apiCall(`/catalogues?include_archives=${includeArchives}&utilisables=${utilisables}`),
  getById: (id) => apiCall(`/catalogues/${id}`),
  create: (data) => apiCall('/catalogues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/catalogues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publish: (id) => apiCall(`/catalogues/${id}/publication`, { method: 'POST' }),
  setArchive: (id, archive) => apiCall(`/catalogues/${id}/archivage`, { method: 'PATCH', body: JSON.stringify({ archive }) }),
  addCollection: (catalogueId, nom) => apiCall(`/catalogues/${catalogueId}/collections`, { method: 'POST', body: JSON.stringify({ nom }) }),
  updateCollection: (id, nom) => apiCall(`/catalogues/collections/${id}`, { method: 'PUT', body: JSON.stringify({ nom }) }),
  addRuban: (catalogueId, nom) => apiCall(`/catalogues/${catalogueId}/rubans`, { method: 'POST', body: JSON.stringify({ nom }) }),
  updateRuban: (id, nom) => apiCall(`/catalogues/rubans/${id}`, { method: 'PUT', body: JSON.stringify({ nom }) }),
  setPapiersCollection: (collectionId, papierIds) => apiCall(`/catalogues/collections/${collectionId}/papiers`, { method: 'PUT', body: JSON.stringify({ papier_ids: papierIds }) }),
};

/**
 * API Papiers cartonnés
 */
export const papierCartonnesAPI = {
  search: (q = '') => apiCall(`/papiers-cartonnes${q ? `?search=${encodeURIComponent(q)}` : ''}`),
  create: (nom) => apiCall('/papiers-cartonnes', { method: 'POST', body: JSON.stringify({ nom }) }),
  update: (id, nom) => apiCall(`/papiers-cartonnes/${id}`, { method: 'PUT', body: JSON.stringify({ nom }) }),
};

/**
 * API Commandes
 */
export const commandesAPI = {
  getAll: () => apiCall('/commandes'),
  getById: (id) => apiCall(`/commandes/${id}`),
  create: (data) => apiCall('/commandes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/commandes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  markReglee: (id) => apiCall(`/commandes/${id}/reglement`, { method: 'PATCH', body: JSON.stringify({}) }),
  delete: (id) => apiCall(`/commandes/${id}`, { method: 'DELETE' }),
};

/**
 * API Settings
 */
export const settingsAPI = {
  get: () => apiCall('/settings'),
  update: (data) => apiCall('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

/**
 * API Stocks
 */
export const stocksAPI = {
  get: () => apiCall('/stocks'),
  getBilan: (mois) => apiCall(`/stocks/bilan?mois=${mois}`),
};
