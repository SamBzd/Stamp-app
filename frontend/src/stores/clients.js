import { defineStore } from 'pinia'

export const useClientsStore = defineStore('clients', {
  state: () => ({
    clients: [],
    isLoading: false,
    error: null
  }),

  actions: {
    async fetchClients() {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch('http://localhost:3000/api/clients')
        if (!res.ok) throw new Error('HTTP ' + res.status)
        this.clients = await res.json()
      } catch (err) {
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    }
  }
})
