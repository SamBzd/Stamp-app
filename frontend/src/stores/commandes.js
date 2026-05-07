import { defineStore } from 'pinia';
import { commandesAPI } from '../services/api';

export const useCommandesStore = defineStore('commandes', {
  state: () => ({
    commandes: [],
    loading: false,
    error: null,
  }),

  getters: {
    getCommandeById: (state) => (id) => {
      return state.commandes.find(commande => commande.id === id);
    },
  },

  actions: {
    async fetchCommandes() {
      this.loading = true;
      this.error = null;
      try {
        this.commandes = await commandesAPI.getAll();
      } catch (error) {
        this.error = error.message;
        console.error('Erreur lors de la récupération des commandes:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchCommande(id) {
      this.loading = true;
      this.error = null;
      try {
        const commande = await commandesAPI.getById(id);
        const index = this.commandes.findIndex(c => c.id === id);
        if (index !== -1) {
          this.commandes[index] = commande;
        } else {
          this.commandes.push(commande);
        }
        return commande;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createCommande(data) {
      this.loading = true;
      this.error = null;
      try {
        const newCommande = await commandesAPI.create(data);
        this.commandes.unshift(newCommande);
        return newCommande;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCommande(id, data) {
      this.loading = true;
      this.error = null;
      try {
        const updatedCommande = await commandesAPI.update(id, data);
        const index = this.commandes.findIndex(c => c.id === id);
        if (index !== -1) {
          this.commandes[index] = updatedCommande;
        }
        return updatedCommande;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteCommande(id) {
      this.loading = true;
      this.error = null;
      try {
        await commandesAPI.delete(id);
        this.commandes = this.commandes.filter(c => c.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
