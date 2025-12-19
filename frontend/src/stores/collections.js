import { defineStore } from 'pinia';
import { collectionsAPI } from '../services/api';

export const useCollectionsStore = defineStore('collections', {
  state: () => ({
    collections: [],
    loading: false,
    error: null,
  }),

  getters: {
    getCollectionById: (state) => (id) => {
      return state.collections.find(collection => collection.id === id);
    },
  },

  actions: {
    async fetchCollections() {
      this.loading = true;
      this.error = null;
      try {
        this.collections = await collectionsAPI.getAll();
      } catch (error) {
        this.error = error.message;
        console.error('Erreur lors de la récupération des collections:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchCollection(id) {
      this.loading = true;
      this.error = null;
      try {
        const collection = await collectionsAPI.getById(id);
        const index = this.collections.findIndex(c => c.id === id);
        if (index !== -1) {
          this.collections[index] = collection;
        } else {
          this.collections.push(collection);
        }
        return collection;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createCollection(collectionData) {
      this.loading = true;
      this.error = null;
      try {
        const newCollection = await collectionsAPI.create(collectionData);
        this.collections.push(newCollection);
        return newCollection;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateCollection(id, collectionData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedCollection = await collectionsAPI.update(id, collectionData);
        const index = this.collections.findIndex(c => c.id === id);
        if (index !== -1) {
          this.collections[index] = updatedCollection;
        }
        return updatedCollection;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteCollection(id) {
      this.loading = true;
      this.error = null;
      try {
        await collectionsAPI.delete(id);
        this.collections = this.collections.filter(c => c.id !== id);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});


