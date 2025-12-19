import { defineStore } from 'pinia';
import { stocksAPI } from '../services/api';

export const useStocksStore = defineStore('stocks', {
  state: () => ({
    stocks: [],
    loading: false,
    error: null,
  }),

  getters: {
    getStock: (state) => (collectionId, format) => {
      return state.stocks.find(
        s => s.collection_id === collectionId && s.format === format
      );
    },

    stocksANecessiterCommande: (state) => {
      return state.stocks.filter(stock => stock.gere === 0 && stock.quantite_commande > 0);
    },
  },

  actions: {
    async fetchStocks() {
      this.loading = true;
      this.error = null;
      try {
        const stocks = await stocksAPI.getAll();
        this.stocks = Array.isArray(stocks) ? stocks : [];
      } catch (error) {
        this.error = error.message || 'Erreur lors de la récupération des stocks';
        console.error('Erreur lors de la récupération des stocks:', error);
        this.stocks = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchStock(collectionId, format) {
      this.loading = true;
      this.error = null;
      try {
        const stock = await stocksAPI.getById(collectionId, format);
        const index = this.stocks.findIndex(
          s => s.collection_id === collectionId && s.format === format
        );
        if (index !== -1) {
          this.stocks[index] = stock;
        } else {
          this.stocks.push(stock);
        }
        return stock;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateStock(collectionId, format, quantiteStock) {
      this.loading = true;
      this.error = null;
      try {
        const updatedStock = await stocksAPI.updateStock(collectionId, format, quantiteStock);
        const index = this.stocks.findIndex(
          s => s.collection_id === collectionId && s.format === format
        );
        if (index !== -1) {
          this.stocks[index] = updatedStock;
        } else {
          this.stocks.push(updatedStock);
        }
        return updatedStock;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async markAsGere(collectionId, format) {
      this.loading = true;
      this.error = null;
      try {
        const updatedStock = await stocksAPI.setGere(collectionId, format, true);
        const index = this.stocks.findIndex(
          s => s.collection_id === collectionId && s.format === format
        );
        if (index !== -1) {
          this.stocks[index] = updatedStock;
        } else {
          this.stocks.push(updatedStock);
        }
        return updatedStock;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async markAsNonGere(collectionId, format) {
      this.loading = true;
      this.error = null;
      try {
        const updatedStock = await stocksAPI.setGere(collectionId, format, false);
        const index = this.stocks.findIndex(
          s => s.collection_id === collectionId && s.format === format
        );
        if (index !== -1) {
          this.stocks[index] = updatedStock;
        } else {
          this.stocks.push(updatedStock);
        }
        return updatedStock;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async recalculateStocks() {
      this.loading = true;
      this.error = null;
      try {
        await stocksAPI.recalculate();
        await this.fetchStocks();
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});


