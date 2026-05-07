<template>
  <Layout>
    <div class="commandes-view">
      <!-- Page Header -->
      <header class="page-header">
        <div>
          <h1 class="page-title">Commandes</h1>
          <p class="page-subtitle">Gérez vos commandes kits et hors kit</p>
        </div>
        <div class="header-actions">
          <Button variant="secondary" @click="openKitForm">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </template>
            Nouveau kit
          </Button>
          <Button @click="openHorsKitForm">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </template>
            Nouvelle hors kit
          </Button>
        </div>
      </header>

      <!-- States -->
      <div v-if="commandesStore.loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span class="loading-state-text">Chargement des commandes...</span>
      </div>

      <div v-else-if="commandesStore.error" class="error-state">
        <p>{{ commandesStore.error }}</p>
        <Button variant="secondary" @click="commandesStore.fetchCommandes()">Réessayer</Button>
      </div>

      <div v-else-if="commandesStore.commandes.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h3 class="empty-state-title">Aucune commande</h3>
        <p class="empty-state-description">Commencez par créer votre première commande</p>
        <div class="empty-state-actions">
          <Button variant="secondary" @click="openKitForm">Nouveau kit</Button>
          <Button @click="openHorsKitForm">Nouvelle hors kit</Button>
        </div>
      </div>

      <!-- Commandes List -->
      <div v-else class="commandes-list">
        <div
          v-for="(commande, index) in commandesStore.commandes"
          :key="commande.id"
          class="commande-card"
          :style="{ animationDelay: `${index * 0.04}s` }"
          @click="viewCommande(commande)"
        >
          <!-- Badge type -->
          <span :class="['type-badge', commande.type === 'kit' ? 'type-badge-kit' : 'type-badge-hors-kit']">
            {{ commande.type === 'kit' ? 'Kit' : 'Hors kit' }}
          </span>

          <!-- Client -->
          <div class="commande-client">
            <div class="client-avatar-sm">
              {{ getClientInitials(commande) }}
            </div>
            <span class="client-name">{{ commande.client_prenom }} {{ commande.client_nom }}</span>
          </div>

          <!-- Infos principales -->
          <div class="commande-infos">
            <span v-if="commande.type === 'kit'" :class="['format-badge', `format-badge-${commande.format_type?.toLowerCase()}`]">
              Format {{ commande.format_type }}
            </span>
            <span class="commande-montant">
              {{ commande.type === 'kit'
                ? (commande.prix_total !== undefined ? `${commande.prix_total}€` : '—')
                : (commande.montant !== undefined ? `${commande.montant}€` : '—') }}
            </span>
          </div>

          <!-- Statut + Date -->
          <div class="commande-meta">
            <span :class="['status-badge', commande.reglee ? 'status-badge-regle' : 'status-badge-attente']">
              {{ commande.reglee ? 'Réglée' : 'En attente' }}
            </span>
            <span class="commande-date">{{ formatDate(commande.created_at) }}</span>
          </div>

          <div class="arrow-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- SlidePanel détail commande -->
      <SlidePanel
        :is-open="isViewPanelOpen"
        title=""
        @close="closeViewPanel"
        max-width="540px"
      >
        <div v-if="selectedCommande" class="commande-detail">
          <!-- Header détail -->
          <div class="detail-header">
            <div class="detail-id-row">
              <span class="detail-id">Commande #{{ selectedCommande.id }}</span>
              <span :class="['type-badge', selectedCommande.type === 'kit' ? 'type-badge-kit' : 'type-badge-hors-kit']">
                {{ selectedCommande.type === 'kit' ? 'Kit' : 'Hors kit' }}
              </span>
            </div>
            <span :class="['status-badge-lg', selectedCommande.reglee ? 'status-badge-regle' : 'status-badge-attente']">
              {{ selectedCommande.reglee ? 'Réglée' : 'En attente' }}
            </span>
          </div>

          <!-- Client -->
          <div class="detail-client">
            <div class="client-avatar-md">
              {{ getClientInitials(selectedCommande) }}
            </div>
            <div class="detail-client-info">
              <span class="detail-client-name">
                {{ selectedCommande.client?.prenom || selectedCommande.client_prenom }}
                {{ selectedCommande.client?.nom || selectedCommande.client_nom }}
              </span>
              <span class="detail-client-label">Cliente</span>
            </div>
          </div>

          <!-- Infos kit -->
          <div v-if="selectedCommande.type === 'kit'" class="detail-section">
            <h4 class="detail-section-title">Détails du kit</h4>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="detail-label">Format</span>
                <span :class="['format-badge', `format-badge-${selectedCommande.format_type?.toLowerCase()}`]">
                  {{ selectedCommande.format_type }}
                </span>
              </div>
              <div v-if="selectedCommande.methode_paiement" class="detail-row">
                <span class="detail-label">Paiement</span>
                <span>{{ selectedCommande.methode_paiement }}</span>
              </div>
              <div v-if="selectedCommande.papier_supplementaire" class="detail-row">
                <span class="detail-label">Papier suppl.</span>
                <span class="badge badge-neutral">Oui</span>
              </div>
              <div v-if="selectedCommande.produit_promo_texte" class="detail-row">
                <span class="detail-label">Promo</span>
                <span>{{ selectedCommande.produit_promo_texte }}
                  <span v-if="selectedCommande.produit_promo_prix"> — {{ selectedCommande.produit_promo_prix }}€</span>
                </span>
              </div>
              <div v-if="selectedCommande.autres_texte" class="detail-row">
                <span class="detail-label">Autres</span>
                <span>{{ selectedCommande.autres_texte }}
                  <span v-if="selectedCommande.autres_prix"> — {{ selectedCommande.autres_prix }}€</span>
                </span>
              </div>
            </div>

            <!-- Collections -->
            <div v-if="selectedCommande.commande_collections?.length" class="detail-collections">
              <span class="detail-label">Collections</span>
              <div class="collections-chips">
                <span
                  v-for="cc in selectedCommande.commande_collections"
                  :key="cc.id"
                  class="collection-chip"
                >
                  {{ cc.collection_nom }}
                  <span class="chip-count">×{{ cc.nb_feuilles }}</span>
                </span>
              </div>
            </div>

            <!-- Papiers sélectionnés -->
            <div v-if="selectedCommande.papiers_selectionnes?.length" class="detail-papiers">
              <span class="detail-label">Papiers</span>
              <div class="papiers-list">
                <span
                  v-for="p in selectedCommande.papiers_selectionnes"
                  :key="p.id"
                  class="papier-chip"
                >
                  {{ p.nom }}
                </span>
              </div>
            </div>
          </div>

          <!-- Infos hors kit -->
          <div v-else class="detail-section">
            <h4 class="detail-section-title">Détails hors kit</h4>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="detail-label">Montant</span>
                <span class="detail-price">{{ selectedCommande.montant }}€</span>
              </div>
              <div v-if="selectedCommande.methode_paiement" class="detail-row">
                <span class="detail-label">Paiement</span>
                <span>{{ selectedCommande.methode_paiement }}</span>
              </div>
              <div v-if="selectedCommande.date_commande" class="detail-row">
                <span class="detail-label">Date commande</span>
                <span>{{ formatDate(selectedCommande.date_commande) }}</span>
              </div>
              <div v-if="selectedCommande.cadeau_texte" class="detail-row">
                <span class="detail-label">Cadeau</span>
                <span>{{ selectedCommande.cadeau_texte }}
                  <span v-if="selectedCommande.cadeau_valeur"> — {{ selectedCommande.cadeau_valeur }}€</span>
                </span>
              </div>
            </div>
          </div>

          <div class="detail-row detail-date-row">
            <span class="detail-label">Créée le</span>
            <span>{{ formatDateLong(selectedCommande.created_at) }}</span>
          </div>
        </div>

        <template #footer>
          <Button variant="danger" @click="confirmDeleteFromView">Supprimer</Button>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            @click="marquerReglee"
            :loading="markingReglee"
          >
            Marquer réglée
          </Button>
        </template>
      </SlidePanel>

      <!-- Modal Kit -->
      <CommandeKitForm
        :is-open="isKitFormOpen"
        @close="isKitFormOpen = false"
        @saved="onCommandeSaved"
      />

      <!-- Modal Hors Kit -->
      <CommandeHorsKitForm
        :is-open="isHorsKitFormOpen"
        @close="isHorsKitFormOpen = false"
        @saved="onCommandeSaved"
      />

      <!-- Confirm Delete -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Supprimer la commande"
        :message="`Supprimer la commande #${commandeToDelete?.id} ? Cette action est irréversible.`"
        confirm-text="Supprimer"
        variant="danger"
        @confirm="deleteCommande"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import CommandeKitForm from '../components/CommandeKitForm.vue';
import CommandeHorsKitForm from '../components/CommandeHorsKitForm.vue';
import { useCommandesStore } from '../stores/commandes';
import { commandesAPI } from '../services/api';

const commandesStore = useCommandesStore();

const isKitFormOpen = ref(false);
const isHorsKitFormOpen = ref(false);
const isViewPanelOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const markingReglee = ref(false);

const openKitForm = () => { isKitFormOpen.value = true; };
const openHorsKitForm = () => { isHorsKitFormOpen.value = true; };

const onCommandeSaved = () => {
  commandesStore.fetchCommandes();
};

const getClientInitials = (commande) => {
  const prenom = commande.client?.prenom || commande.client_prenom || '';
  const nom = commande.client?.nom || commande.client_nom || '';
  return ((prenom[0] || '') + (nom[0] || '')).toUpperCase() || '?';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

const viewCommande = async (commande) => {
  // Charger le détail complet (avec collections + papiers)
  try {
    const detail = await commandesAPI.getById(commande.id);
    selectedCommande.value = detail;
  } catch {
    selectedCommande.value = commande;
  }
  isViewPanelOpen.value = true;
};

const closeViewPanel = () => {
  isViewPanelOpen.value = false;
  selectedCommande.value = null;
};

const marquerReglee = async () => {
  if (!selectedCommande.value) return;
  markingReglee.value = true;
  try {
    const updated = await commandesStore.updateCommande(selectedCommande.value.id, { reglee: 1 });
    selectedCommande.value = { ...selectedCommande.value, reglee: 1, ...updated };
  } catch (error) {
    console.error('Erreur lors du marquage réglée:', error);
  } finally {
    markingReglee.value = false;
  }
};

const confirmDeleteFromView = () => {
  commandeToDelete.value = selectedCommande.value;
  closeViewPanel();
  isDeleteDialogOpen.value = true;
};

const deleteCommande = async () => {
  if (!commandeToDelete.value) return;
  try {
    await commandesStore.deleteCommande(commandeToDelete.value.id);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  } finally {
    isDeleteDialogOpen.value = false;
    commandeToDelete.value = null;
  }
};

onMounted(async () => {
  await commandesStore.fetchCommandes();
});
</script>

<style scoped>
.commandes-view {
  max-width: var(--content-max-width);
  animation: fadeInUp 0.4s ease-out;
}

.page-title {
  font-family: var(--font-heading);
}

/* === Header actions === */
.header-actions {
  display: flex;
  gap: var(--spacing-3);
  align-items: center;
}

/* === Empty state actions === */
.empty-state-actions {
  display: flex;
  gap: var(--spacing-3);
}

/* === Commandes List === */
.commandes-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.commande-card {
  background: var(--card);
  border-radius: var(--border-radius-2xl);
  padding: var(--spacing-4) var(--spacing-5);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  cursor: pointer;
  transition: all var(--transition-normal);
  animation: fadeInUp 0.4s ease-out backwards;
  position: relative;
}

.commande-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.commande-card:hover .arrow-indicator {
  opacity: 1;
  transform: translateX(4px);
  color: var(--primary);
}

/* === Type badge === */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  flex-shrink: 0;
}

.type-badge-kit {
  background: var(--info-light, #dbeafe);
  color: var(--info-dark, #1d4ed8);
}

.type-badge-hors-kit {
  background: var(--success-light);
  color: var(--success-dark);
}

/* === Client === */
.commande-client {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.client-avatar-sm {
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.client-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* === Infos === */
.commande-infos {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.commande-montant {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  color: var(--foreground);
}

/* === Format badge === */
.format-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius-sm);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  font-family: var(--font-heading);
}

.format-badge-a {
  background: rgba(93, 112, 82, 0.15);
  color: var(--format-a, var(--primary));
}

.format-badge-b {
  background: rgba(168, 121, 72, 0.15);
  color: var(--format-b, var(--secondary));
}

.format-badge-c {
  background: rgba(88, 122, 168, 0.15);
  color: var(--format-c, #1d4ed8);
}

/* === Meta === */
.commande-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-1);
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.status-badge-regle {
  background: var(--success-light);
  color: var(--success-dark);
}

.status-badge-attente {
  background: var(--warning-light);
  color: var(--warning-dark);
}

.commande-date {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.arrow-indicator {
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.arrow-indicator svg {
  width: 100%;
  height: 100%;
}

/* === Détail SlidePanel === */
.commande-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--border-light);
}

.detail-id-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.detail-id {
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--foreground);
}

.status-badge-lg {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.detail-client {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
}

.client-avatar-md {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--success-dark) 100%);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-foreground);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.detail-client-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-client-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--foreground);
}

.detail-client-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.detail-section {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.detail-section-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  margin: 0 0 var(--spacing-2) 0;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.detail-rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid var(--border-light);
  font-size: var(--font-size-sm);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.detail-price {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--primary);
}

.detail-date-row {
  padding: var(--spacing-2) 0;
  border-bottom: none;
}

/* === Collections chips === */
.detail-collections,
.detail-papiers {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--border-light);
}

.collections-chips,
.papiers-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.collection-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 4px 12px;
  background: var(--primary-light);
  border: 1px solid rgba(93, 112, 82, 0.2);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-sm);
  color: var(--primary);
  font-weight: var(--font-weight-medium);
}

.chip-count {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  background: var(--card);
  padding: 1px 5px;
  border-radius: var(--border-radius-full);
}

.papier-chip {
  padding: 3px 10px;
  background: var(--muted);
  border-radius: var(--border-radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* === Responsive === */
@media (max-width: 640px) {
  .commande-card {
    flex-wrap: wrap;
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
