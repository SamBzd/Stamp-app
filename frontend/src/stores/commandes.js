import { defineStore } from 'pinia';
import { commandesAPI } from '../services/api';

export const useCommandesStore = defineStore('commandes', {
  state: () => ({
    commandes: [],
    loading: false,
    error: null,
    filterGroupeId: null,
  }),

  getters: {
    getCommandeById: (state) => (id) => {
      return state.commandes.find(commande => commande.id === id);
    },

    filteredCommandes: (state) => {
      if (!state.filterGroupeId) {
        return state.commandes;
      }
      // Filtrer les commandes qui contiennent des collections du groupe sélectionné
      // Note: Cette logique nécessitera de charger les collections de chaque commande
      // Pour l'instant, on retourne toutes les commandes
      return state.commandes;
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

    async fetchCommandeComplet(id) {
      try {
        return await commandesAPI.getComplet(id);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async fetchCommandeCollections(commandeId) {
      try {
        return await commandesAPI.getCollections(commandeId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async createCommande(commandeData) {
      this.loading = true;
      this.error = null;
      try {
        const newCommande = await commandesAPI.create(commandeData);
        this.commandes.push(newCommande);
        return newCommande;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCommande(id, commandeData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedCommande = await commandesAPI.update(id, commandeData);
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

    async addCollectionToCommande(commandeId, collectionId) {
      try {
        return await commandesAPI.addCollection(commandeId, collectionId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async removeCollectionFromCommande(commandeId, collectionId) {
      try {
        await commandesAPI.removeCollection(commandeId, collectionId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    setFilterGroupe(groupeId) {
      this.filterGroupeId = groupeId;
    },

    clearFilter() {
      this.filterGroupeId = null;
    },
  },
});


