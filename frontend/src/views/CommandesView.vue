<template>
  <Layout @new-order="openKitForm">
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

      <p v-if="operationError" class="form-error-global" role="alert">{{ operationError }}</p>

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
          @keydown.enter="viewCommande(commande)"
          @keydown.space.prevent="viewCommande(commande)"
          role="button"
          tabindex="0"
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
            <span class="client-name">{{ commande.client?.prenom || commande.client_prenom }} {{ commande.client?.nom || commande.client_nom }}</span>
          </div>

          <!-- Infos principales -->
          <div class="commande-infos">
            <span v-if="commande.type === 'kit'" :class="['format-badge', `format-badge-${commande.format_type?.toLowerCase()}`]">
              Format {{ commande.format_type }}
            </span>
            <span class="commande-montant">
              {{ commande.type === 'kit' ? formatMoney(commande.prix_applique_cents) : formatEuro(commande.montant) }}
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
        :title="selectedCommande ? `Commande #${selectedCommande.id}` : 'Détail de la commande'"
        @close="closeViewPanel"
        max-width="540px"
      >
        <div v-if="detailError" class="form-error-global" role="alert"><p>{{ detailError }}</p><Button v-if="detailCommandeId" variant="secondary" @click="viewCommande({ id: detailCommandeId })">Recharger le détail</Button></div>
        <div v-else-if="loadingDetail" class="loading-state">
          <div class="loading-spinner"></div>
          <span class="loading-state-text">Chargement du détail…</span>
        </div>
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
              <div class="detail-row">
                <span class="detail-label">Catalogue</span>
                <span>{{ selectedCommande.catalogue_titre }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Prix appliqué</span>
                <span class="detail-price">{{ formatMoney(selectedCommande.prix_applique_cents) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Origine du prix</span>
                <span>{{ selectedCommande.prix_origine === 'manuelle' ? 'Correction manuelle' : 'Automatique' }}</span>
              </div>
              <div class="detail-row"><span class="detail-label">Tarif historique du format</span><span>{{ formatMoney(selectedCommande.prix_format_cents) }}</span></div>
              <div class="detail-row"><span class="detail-label">Option historique</span><span>{{ formatMoney(selectedCommande.prix_option_cents) }}</span></div>
              <div v-if="selectedCommande.date_commande" class="detail-row"><span class="detail-label">Date commande</span><span>{{ formatDateLong(selectedCommande.date_commande) }}</span></div>
              <div v-if="selectedCommande.papier_supplementaire" class="detail-row">
                <span class="detail-label">Papier suppl.</span>
                <span class="badge badge-neutral">Oui</span>
              </div>
              <div v-if="selectedCommande.produit_promo_texte" class="detail-row">
                <span class="detail-label">Promo</span>
                <span>{{ selectedCommande.produit_promo_texte }}
                  <span v-if="selectedCommande.produit_promo_prix_cents !== null"> — {{ formatMoney(selectedCommande.produit_promo_prix_cents) }}</span>
                </span>
              </div>
              <div v-if="selectedCommande.autres_texte" class="detail-row">
                <span class="detail-label">Autres</span>
                <span>{{ selectedCommande.autres_texte }}
                  <span v-if="selectedCommande.autres_prix_cents !== null"> — {{ formatMoney(selectedCommande.autres_prix_cents) }}</span>
                </span>
              </div>
            </div>

            <div v-if="selectedCommande.ruban" class="detail-row">
              <span class="detail-label">Ruban</span>
              <span>{{ selectedCommande.ruban.ruban_nom }} ×{{ selectedCommande.ruban.quantite }}</span>
            </div>
            <div v-if="selectedCommande.papier_spe_nom" class="detail-row">
              <span class="detail-label">Papier spécial</span>
              <span>{{ selectedCommande.papier_spe_nom }} ×{{ selectedCommande.papier_spe_quantite }}</span>
            </div>
            <div v-if="selectedCommande.embellissement_nom" class="detail-row">
              <span class="detail-label">Embellissement</span>
              <span>{{ selectedCommande.embellissement_nom }} ×{{ selectedCommande.embellissement_quantite }}</span>
            </div>

            <!-- Collections et papiers : exclusivement les snapshots de la commande -->
            <div v-if="kitComposition.length" class="detail-collections">
              <span class="detail-label">Collections</span>
              <div class="collections-chips">
                <span
                  v-for="cc in kitComposition"
                  :key="cc.id"
                  class="collection-chip"
                >
                  {{ cc.collection_nom }}
                  <span class="chip-count">{{ cc.nb_feuilles }} de base → {{ cc.nb_feuilles * (selectedCommande.papier_supplementaire ? 2 : 1) }} à préparer</span>
                </span>
              </div>
            </div>

            <div v-for="cc in kitComposition" :key="`papers-${cc.id}`" class="detail-papiers">
              <span class="detail-label">Papiers — {{ cc.collection_nom }}</span>
              <div class="papiers-list">
                <span
                  v-for="p in cc.papiers"
                  :key="p.id"
                  class="papier-chip"
                >
                  {{ p.nom }} : {{ p.quantite_base }} de base → {{ p.quantite_finale }} à préparer
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
                <span class="detail-price">{{ formatEuro(selectedCommande.montant) }}</span>
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
                  <span v-if="selectedCommande.cadeau_valeur !== null"> — {{ formatEuro(selectedCommande.cadeau_valeur) }}</span>
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
          <p v-if="selectedCommande?.reglee" class="detail-label">Commande réglée : prix et composition figés.</p>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            variant="danger"
            :disabled="markingReglee"
            @click="confirmDeleteFromView"
          >Supprimer</Button>
          <Button
            v-if="selectedCommande && !selectedCommande.reglee"
            variant="secondary"
            :disabled="markingReglee"
            @click="editSelectedCommande"
          >Modifier</Button>
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
        :commande="editingCommande"
        @close="isKitFormOpen = false"
        @saved="onCommandeSaved"
      />

      <!-- Modal Hors Kit -->
      <CommandeHorsKitForm
        :is-open="isHorsKitFormOpen"
        :commande="editingCommande"
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
        :loading="deletingCommande"
        @confirm="deleteCommande"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Layout from '../components/Layout.vue';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import CommandeKitForm from '../components/CommandeKitForm.vue';
import CommandeHorsKitForm from '../components/CommandeHorsKitForm.vue';
import { useCommandesStore } from '../stores/commandes';
import { useStocksStore } from '../stores/stocks';
import { useClientsStore } from '../stores/clients';
import { formatMoney, historicalComposition } from '../utils/commande-kit';

const commandesStore = useCommandesStore();
const stocksStore = useStocksStore();
const clientsStore = useClientsStore();
const route = useRoute();
const router = useRouter();

const isKitFormOpen = ref(false);
const isHorsKitFormOpen = ref(false);
const isViewPanelOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const selectedCommande = ref(null);
const commandeToDelete = ref(null);
const markingReglee = ref(false);
const deletingCommande = ref(false);
const editingCommande = ref(null);
const detailError = ref('');
const loadingDetail = ref(false);
const operationError = ref('');
const detailCommandeId = ref(null);
let detailGeneration = 0;

const kitComposition = computed(() => selectedCommande.value?.type === 'kit'
  ? historicalComposition(selectedCommande.value)
  : []);

const openKitForm = () => {
  editingCommande.value = null;
  isKitFormOpen.value = true;
};
const openHorsKitForm = () => {
  editingCommande.value = null;
  isHorsKitFormOpen.value = true;
};

const onCommandeSaved = async (commande) => {
  operationError.value = '';
  if (commande) {
    ++detailGeneration;
    detailCommandeId.value = commande.id;
    selectedCommande.value = commande;
    isViewPanelOpen.value = true;
    detailError.value = '';
    await router.replace({ query: { ...route.query, commande: String(commande.id) } });
  }
  editingCommande.value = null;
  await refreshDependentData();
};

const refreshDependentData = async () => {
  // Ces stores peuvent déjà être affichés dans une autre vue : rafraîchir leurs
  // snapshots évite de laisser stocks, bilan ou fidélité avec des données périmées.
  const requests = [stocksStore.fetchStocks(), clientsStore.fetchClients()];
  if (stocksStore.bilan?.mois) requests.push(stocksStore.fetchBilan(stocksStore.bilan.mois));
  await Promise.allSettled(requests);
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

const formatEuro = (amount) => amount === undefined || amount === null
  ? '—'
  : `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00a0€`;

const viewCommande = async (commande) => {
  const generation = ++detailGeneration;
  detailCommandeId.value = commande.id;
  detailError.value = '';
  loadingDetail.value = true;
  selectedCommande.value = null;
  isViewPanelOpen.value = true;
  try {
    const detail = await commandesStore.fetchCommande(commande.id);
    if (generation !== detailGeneration || !isViewPanelOpen.value) return;
    selectedCommande.value = detail;
    if (route.query.commande !== String(commande.id)) {
      await router.replace({ query: { ...route.query, commande: String(commande.id) } });
    }
  } catch (error) {
    if (generation === detailGeneration) detailError.value = error.message || 'Impossible de charger le détail complet de cette commande.';
  } finally {
    if (generation === detailGeneration) loadingDetail.value = false;
  }
};

const closeViewPanel = async () => {
  if (markingReglee.value) return;
  ++detailGeneration;
  loadingDetail.value = false;
  isViewPanelOpen.value = false;
  selectedCommande.value = null;
  detailError.value = '';
  if (route.query.commande) {
    const query = { ...route.query };
    delete query.commande;
    await router.replace({ query });
  }
};

const marquerReglee = async () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  markingReglee.value = true;
  try {
    operationError.value = '';
    const updated = await commandesStore.markCommandeReglee(selectedCommande.value.id);
    selectedCommande.value = updated;
    await refreshDependentData();
  } catch (error) {
    detailError.value = error.message || 'Impossible de marquer cette commande réglée.';
  } finally {
    markingReglee.value = false;
  }
};

const confirmDeleteFromView = () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  commandeToDelete.value = selectedCommande.value;
  closeViewPanel();
  isDeleteDialogOpen.value = true;
};

const editSelectedCommande = async () => {
  if (!selectedCommande.value || selectedCommande.value.reglee || markingReglee.value) return;
  editingCommande.value = selectedCommande.value;
  await closeViewPanel();
  if (editingCommande.value.type === 'kit') isKitFormOpen.value = true;
  else isHorsKitFormOpen.value = true;
};

const deleteCommande = async () => {
  if (!commandeToDelete.value || commandeToDelete.value.reglee || deletingCommande.value) return;
  deletingCommande.value = true;
  try {
    operationError.value = '';
    await commandesStore.deleteCommande(commandeToDelete.value.id);
    await refreshDependentData();
  } catch (error) {
    operationError.value = error.message || 'Impossible de supprimer cette commande.';
  } finally {
    deletingCommande.value = false;
    isDeleteDialogOpen.value = false;
    commandeToDelete.value = null;
  }
};

onMounted(async () => {
  await commandesStore.fetchCommandes();
  const id = Number(route.query.commande);
  if (Number.isInteger(id) && id > 0) {
    await viewCommande({ id });
  }
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

.form-error-global {
  margin: var(--spacing-4) 0;
  padding: var(--spacing-3);
  border-radius: var(--border-radius);
  background: var(--error-light, #fde8e8);
  color: var(--error, #c0392b);
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

.commande-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
.collection-chip, .papier-chip { overflow-wrap: anywhere; max-width: 100%; }

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
