import { defineStore } from 'pinia';
import { settingsAPI } from '../services/api';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    prix: { prix_A_cents: null, prix_B_cents: null, prix_C_cents: null },
    loading: false,
    error: null,
  }),

  actions: {
    async fetchSettings() {
      this.loading = true;
      this.error = null;
      try {
        this.prix = await settingsAPI.get();
        return this.prix;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateSettings(updates) {
      this.prix = await settingsAPI.update(updates);
      return this.prix;
    },
  },
});
