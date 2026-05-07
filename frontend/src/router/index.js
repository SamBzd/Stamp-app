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
      path: '/catalogues',
      name: 'catalogues',
      component: () => import('../views/CataloguesView.vue')
    },
    { 
      path: '/stocks', 
      name: 'stocks', 
      component: () => import('../views/StocksView.vue') 
    }
  ]
})
