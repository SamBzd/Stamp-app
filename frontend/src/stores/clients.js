import { defineStore } from 'pinia';
import { clientsAPI } from '../services/api';

export const useClientsStore = defineStore('clients', {
  state: () => ({
    clients: [],
    loading: false,
    error: null,
  }),

  getters: {
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id);
    },
  },

  actions: {
    async fetchClients(options = {}) {
      this.loading = true;
      this.error = null;
      try {
        this.clients = await clientsAPI.getAll(options);
      } catch (error) {
        this.error = error.message;
        console.error('Erreur lors de la récupération des clients:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchClient(id) {
      this.loading = true;
      this.error = null;
      try {
        const client = await clientsAPI.getById(id);
        const index = this.clients.findIndex(c => c.id === id);
        if (index !== -1) {
          this.clients[index] = client;
        } else {
          this.clients.push(client);
        }
        return client;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createClient(clientData) {
      this.error = null;
      try {
        const newClient = await clientsAPI.create(clientData);
        this.clients.push(newClient);
        return newClient;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateClient(id, clientData) {
      this.error = null;
      try {
        const updatedClient = await clientsAPI.update(id, clientData);
        const index = this.clients.findIndex(c => c.id === id);
        if (index !== -1) {
          this.clients[index] = updatedClient;
        }
        return updatedClient;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async setArchive(id, archive) {
      this.error = null;
      try {
        const updated = await clientsAPI.setArchive(id, archive);
        const index = this.clients.findIndex(c => c.id === id);
        if (index !== -1) this.clients[index] = updated;
        return updated;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async fetchClientCommandes(clientId) {
      try {
        return await clientsAPI.getCommandes(clientId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
  },
});
