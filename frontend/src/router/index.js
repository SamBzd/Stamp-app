import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/', 
      name: 'commandes', 
      component: () => import('../views/CommandesView.vue') 
    },
    { 
      path: '/clients', 
      name: 'clients', 
      component: () => import('../views/ClientsView.vue') 
    },
    {
      path: '/catalogues/:id',
      name: 'catalogue-detail',
      component: () => import('../views/CatalogueDetailView.vue')
    },
    {
      path: '/catalogues',
      name: 'catalogues',
      component: () => import('../views/CataloguesView.vue')
    },
    {
      path: '/papiers',
      name: 'papiers',
      component: () => import('../views/PapiersView.vue')
    },
    { 
      path: '/stocks', 
      name: 'stocks', 
      component: () => import('../views/StocksView.vue') 
    }
  ]
})
