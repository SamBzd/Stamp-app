import { defineStore } from 'pinia';
import { fournituresAPI, stocksAPI } from '../services/api.js';
import { applyWorkflowArchive, applyWorkflowMove } from '../utils/fournitures.js';

export const useStocksStore = defineStore('stocks', {
  state: () => ({
    stocks: null,   // { papiers_cartonnes, papier_spe, embellissement, collections, rubans }
    bilan: null,
    workflow: null,
    loadingStocks: false,
    stocksError: null,
    loadingWorkflow: false,
    workflowError: null,
    mutatingWorkflow: false,
    loadingBilan: false,
    bilanError: null,
    stocksRequest: 0,
    bilanRequest: 0,
    workflowRequest: 0,
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

    async fetchWorkflow() {
      const request = ++this.workflowRequest;
      this.loadingWorkflow = true;
      this.workflowError = null;
      try {
        const workflow = await fournituresAPI.getWorkflow();
        if (request === this.workflowRequest) this.workflow = workflow;
        return workflow;
      } catch (error) {
        if (request !== this.workflowRequest) return null;
        this.workflowError = error.message || 'Erreur lors de la récupération des fournitures';
        console.error('Erreur lors de la récupération des fournitures:', error);
        return null;
      } finally {
        if (request === this.workflowRequest) this.loadingWorkflow = false;
      }
    },

    async moveWorkflowGroup(data) {
      const workflowBeforeMutation = this.workflow;
      ++this.workflowRequest;
      this.mutatingWorkflow = true;
      this.workflowError = null;
      try {
        const result = await fournituresAPI.move(data);
        this.workflow = applyWorkflowMove(workflowBeforeMutation, data);
        const refreshed = await this.fetchWorkflow();
        if (!refreshed) {
          this.workflowError = 'Déplacement enregistré, mais le tableau n’a pas pu être resynchronisé. Actualise avant une nouvelle action.';
        }
        return result;
      } catch (error) {
        this.workflowError = error.message || 'Le déplacement n’a pas pu être enregistré';
        throw error;
      } finally {
        this.mutatingWorkflow = false;
      }
    },

    async archiveWorkflowGroup(data) {
      const workflowBeforeMutation = this.workflow;
      ++this.workflowRequest;
      this.mutatingWorkflow = true;
      this.workflowError = null;
      try {
        const result = await fournituresAPI.archive(data);
        this.workflow = applyWorkflowArchive(workflowBeforeMutation, data);
        const refreshed = await this.fetchWorkflow();
        if (!refreshed) {
          this.workflowError = 'Pile terminée, mais le tableau n’a pas pu être resynchronisé. Actualise avant une nouvelle action.';
        }
        return result;
      } catch (error) {
        this.workflowError = error.message || 'La pile n’a pas pu être terminée';
        throw error;
      } finally {
        this.mutatingWorkflow = false;
      }
    },
  },
});
