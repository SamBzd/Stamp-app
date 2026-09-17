import { defineStore } from 'pinia';
import { stocksAPI } from '../services/api.js';

export const useStocksStore = defineStore('stocks', {
  state: () => ({
    stocks: null,   // { papiers_cartonnes, papier_spe, embellissement, collections, rubans }
    bilan: null,
    loadingStocks: false,
    stocksError: null,
    loadingBilan: false,
    bilanError: null,
    stocksRequest: 0,
    bilanRequest: 0,
  }),

  actions: {
    async fetchStocks() {
      const request = ++this.stocksRequest;
      this.loadingStocks = true;
      this.stocksError = null;
      try {
        const stocks = await stocksAPI.get();
        if (request === this.stocksRequest) this.stocks = stocks;
      } catch (error) {
        if (request !== this.stocksRequest) return;
        this.stocksError = error.message || 'Erreur lors de la récupération des stocks';
        console.error('Erreur lors de la récupération des stocks:', error);
        this.stocks = null;
      } finally {
        if (request === this.stocksRequest) this.loadingStocks = false;
      }
    },

    async fetchBilan(mois) {
      const request = ++this.bilanRequest;
      this.loadingBilan = true;
      this.bilanError = null;
      try {
        const bilan = await stocksAPI.getBilan(mois);
        if (request === this.bilanRequest) this.bilan = bilan;
      } catch (error) {
        if (request !== this.bilanRequest) return;
        this.bilanError = error.message || 'Erreur lors de la récupération du bilan';
        console.error('Erreur lors de la récupération du bilan:', error);
        this.bilan = null;
      } finally {
        if (request === this.bilanRequest) this.loadingBilan = false;
      }
    },
  },
});
