import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { 
      path: '/', 
      name: 'dashboard', 
      component: () => import('../views/DashboardView.vue') 
    },
    { 
      path: '/clients', 
      name: 'clients', 
      component: () => import('../views/ClientsListView.vue') 
    }
  ]
})
