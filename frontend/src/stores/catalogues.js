import { defineStore } from 'pinia';
import { cataloguesAPI } from '../services/api';

export const useCataloguesStore = defineStore('catalogues', {
  state: () => ({
    catalogues: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchCatalogues() {
      this.loading = true;
      this.error = null;
      try {
        this.catalogues = await cataloguesAPI.getAll();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async fetchCatalogue(id) {
      try {
        return await cataloguesAPI.getById(id);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async createCatalogue(data) {
      try {
        const catalogue = await cataloguesAPI.create(data);
        this.catalogues.unshift(catalogue);
        return catalogue;
      } catch (error) {
        throw error;
      }
    },

    async updateCatalogue(id, data) {
      try {
        const updated = await cataloguesAPI.update(id, data);
        const index = this.catalogues.findIndex(c => c.id === id);
        if (index !== -1) this.catalogues[index] = { ...this.catalogues[index], ...updated };
        return updated;
      } catch (error) {
        throw error;
      }
    },

    async deleteCatalogue(id) {
      try {
        await cataloguesAPI.delete(id);
        this.catalogues = this.catalogues.filter(c => c.id !== id);
      } catch (error) {
        throw error;
      }
    },
  },
});
