import { defineStore } from 'pinia';
import { groupesAPI } from '../services/api';

export const useGroupesStore = defineStore('groupes', {
  state: () => ({
    groupes: [],
    loading: false,
    error: null,
  }),

  getters: {
    getGroupeById: (state) => (id) => {
      return state.groupes.find(groupe => groupe.id === id);
    },
  },

  actions: {
    async fetchGroupes() {
      this.loading = true;
      this.error = null;
      try {
        this.groupes = await groupesAPI.getAll();
      } catch (error) {
        this.error = error.message;
        console.error('Erreur lors de la récupération des groupes:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchGroupe(id) {
      this.loading = true;
      this.error = null;
      try {
        const groupe = await groupesAPI.getById(id);
        const index = this.groupes.findIndex(g => g.id === id);
        if (index !== -1) {
          this.groupes[index] = groupe;
        } else {
          this.groupes.push(groupe);
        }
        return groupe;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchGroupeCollections(groupeId) {
      try {
        return await groupesAPI.getCollections(groupeId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async createGroupe(groupeData) {
      this.loading = true;
      this.error = null;
      try {
        const newGroupe = await groupesAPI.create(groupeData);
        this.groupes.push(newGroupe);
        return newGroupe;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateGroupe(id, groupeData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedGroupe = await groupesAPI.update(id, groupeData);
        const index = this.groupes.findIndex(g => g.id === id);
        if (index !== -1) {
          this.groupes[index] = updatedGroupe;
        }
        return updatedGroupe;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteGroupe(id) {
      this.loading = true;
      this.error = null;
      try {
        await groupesAPI.delete(id);
        this.groupes = this.groupes.filter(g => g.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addCollectionToGroupe(groupeId, collectionId, ordre) {
      try {
        return await groupesAPI.addCollection(groupeId, collectionId, ordre);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async removeCollectionFromGroupe(groupeId, collectionId) {
      try {
        await groupesAPI.removeCollection(groupeId, collectionId);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async updateCollectionOrder(groupeId, collectionId, ordre) {
      try {
        await groupesAPI.updateCollectionOrder(groupeId, collectionId, ordre);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },
  },
});


