import { defineStore } from 'pinia'

const API_URL = 'http://localhost:3000/api/clients'

export const useClientsStore = defineStore('clients', {
  state: () => ({
    clients: [],
    isLoading: false,
    error: null,
    editingClient: null
  }),

  actions: {
    // READ - Récupérer tous les clients
    async fetchClients() {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        this.clients = await res.json()
      } catch (err) {
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },

    // READ - Récupérer un client par ID
    async fetchClientById(id) {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch(`${API_URL}/${id}`)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return await res.json()
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // CREATE - Créer un nouveau client
    async createClient(clientData) {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clientData)
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Erreur lors de la création')
        }

        const newClient = await res.json()
        this.clients.push(newClient)
        return newClient
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // UPDATE - Mettre à jour un client
    async updateClient(id, clientData) {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clientData)
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Erreur lors de la mise à jour')
        }

        const updatedClient = await res.json()
        const index = this.clients.findIndex(c => c.id === id)
        if (index !== -1) {
          this.clients[index] = updatedClient
        }
        return updatedClient
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // DELETE - Supprimer un client
    async deleteClient(id) {
      this.isLoading = true
      this.error = null

      try {
        const res = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE'
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Erreur lors de la suppression')
        }

        this.clients = this.clients.filter(c => c.id !== id)
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // Actions pour gérer l'édition
    setEditingClient(client) {
      this.editingClient = client ? { ...client } : null
    },

    clearEditingClient() {
      this.editingClient = null
    }
  }
})
