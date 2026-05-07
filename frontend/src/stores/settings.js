import { defineStore } from 'pinia';
import { settingsAPI } from '../services/api';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    prix: { prix_A: '', prix_B: '', prix_C: '' },
    loading: false,
    error: null,
  }),

  actions: {
    async fetchSettings() {
      this.loading = true;
      this.error = null;
      try {
        this.prix = await settingsAPI.get();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async updateSettings(updates) {
      this.loading = true;
      this.error = null;
      try {
        this.prix = await settingsAPI.update(updates);
        return this.prix;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
