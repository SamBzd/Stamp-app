import { defineStore } from 'pinia';
import { stocksAPI } from '../services/api';

export const useStocksStore = defineStore('stocks', {
  state: () => ({
    stocks: null,   // { papiers_cartonnes, papier_spe, embellissement, collections }
    bilan: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchStocks() {
      this.loading = true;
      this.error = null;
      try {
        this.stocks = await stocksAPI.get();
      } catch (error) {
        this.error = error.message || 'Erreur lors de la récupération des stocks';
        console.error('Erreur lors de la récupération des stocks:', error);
        this.stocks = null;
      } finally {
        this.loading = false;
      }
    },

    async fetchBilan(mois) {
      this.loading = true;
      this.error = null;
      try {
        this.bilan = await stocksAPI.getBilan(mois);
      } catch (error) {
        this.error = error.message || 'Erreur lors de la récupération du bilan';
        console.error('Erreur lors de la récupération du bilan:', error);
        this.bilan = null;
      } finally {
        this.loading = false;
      }
    },

    async recalculate() {
      this.loading = true;
      this.error = null;
      try {
        await stocksAPI.recalculate();
        await this.fetchStocks();
      } catch (error) {
        this.error = error.message || 'Erreur lors du recalcul des stocks';
        console.error('Erreur lors du recalcul des stocks:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
