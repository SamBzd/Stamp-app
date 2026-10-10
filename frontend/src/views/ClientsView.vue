<template>
  <Layout contained title="Clientes" subtitle="Les coordonnées, les préférences et l’histoire de chaque cliente.">
    <div class="clients-view form-workspace-view">
      <div class="clients-toolbar"><Button id="clients-create" :disabled="isModalOpen" @click="openCreateModal"><template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></template>Ajouter une cliente</Button></div>
      <p v-if="operationError && !isViewModalOpen" class="client-error" role="alert">{{ operationError }}</p>
      <div class="clients-workspace form-workspace" :class="{ 'form-workspace-editing': isModalOpen }">
      <section class="clients-list-panel" aria-label="Répertoire des clientes">
        <header id="clients-list-header" class="clients-list-heading" tabindex="-1">
          <div class="clients-tabs" role="tablist" aria-label="Statut des clientes">
            <button id="clients-tab-actifs" type="button" role="tab" :disabled="pointsSaving" :aria-selected="archiveFilter === 'actifs'" aria-controls="clients-list-content" :tabindex="archiveFilter === 'actifs' ? 0 : -1" @click="selectArchiveTab('actifs')" @keydown="onTabKeydown">Actives <span>{{ activeCount }}</span></button>
            <button id="clients-tab-archives" type="button" role="tab" :disabled="pointsSaving" :aria-selected="archiveFilter === 'archives'" aria-controls="clients-list-content" :tabindex="archiveFilter === 'archives' ? 0 : -1" @click="selectArchiveTab('archives')" @keydown="onTabKeydown">Archivées <span>{{ archivedCount }}</span></button>
          </div>
          <div class="clients-list-tools">
            <p role="status">{{ filteredClients.length }} / {{ archiveFilter === 'actifs' ? activeCount : archivedCount }}<span class="sr-only"> clientes affichées</span></p>
            <button id="clients-filter-toggle" type="button" class="clients-filter-toggle" :aria-expanded="filtersExpanded" aria-controls="clients-filter-fields" :aria-label="filterSummary ? `Recherche et filtres, ${filterSummary}` : 'Recherche et filtres'" @click="toggleFilters"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>Filtres <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span><svg class="filter-chevron" :class="{ expanded: filtersExpanded }" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m4 6 4 4 4-4"/></svg></button>
          </div>
        </header>
        <div v-show="filtersExpanded" id="clients-filter-fields" class="clients-filters" role="region" aria-label="Recherche et filtres des clientes">
          <div class="client-filter"><label for="clients-search">Rechercher une cliente</label><input id="clients-search" :disabled="pointsSaving" v-model="searchQuery" type="search" placeholder="Nom, email, ville ou téléphone…" autocomplete="off" /></div>
          <label class="favorites-filter"><input :disabled="pointsSaving" v-model="showOnlyFavorites" type="checkbox" />Favoris uniquement</label>
          <button v-if="activeFilterCount" type="button" class="client-filter-reset" @click="resetFilters">Effacer les filtres</button>
        </div>
        <div id="clients-list-content" role="tabpanel" :aria-labelledby="`clients-tab-${archiveFilter}`">
          <div v-if="clientsStore.loading" class="loading-state" role="status"><div class="loading-spinner"></div><span class="loading-state-text">Chargement des clientes…</span></div>
          <div v-else-if="clientsStore.error" class="error-state" role="alert"><p>{{ clientsStore.error }}</p><Button variant="secondary" @click="loadClients">Réessayer</Button></div>
          <div v-else-if="filteredClients.length === 0" class="empty-state">
            <h3 class="empty-state-title">{{ activeFilterCount ? 'Aucune cliente ne correspond' : archiveFilter === 'archives' ? 'Aucune cliente archivée' : 'Aucune cliente' }}</h3>
            <p class="empty-state-description">{{ activeFilterCount ? 'Essaie une autre recherche ou efface les filtres.' : archiveFilter === 'archives' ? 'Les clientes archivées restent consultables et peuvent être restaurées.' : 'Commence par ajouter ta première cliente.' }}</p>
            <button v-if="activeFilterCount" type="button" class="client-filter-reset" @click="resetFilters">Effacer les filtres</button>
            <Button v-else-if="archiveFilter === 'actifs'" :disabled="isModalOpen" @click="openCreateModal">Ajouter une cliente</Button>
          </div>
          <ul v-else class="clients-list" aria-label="Clientes">
            <li v-for="client in filteredClients" :key="client.id" class="client-list-item" :class="{ 'client-selected': isViewModalOpen && selectedClient?.id === client.id }">
              <button :id="`client-open-${client.id}`" type="button" class="client-open" :aria-label="`Voir la fiche de ${client.prenom} ${client.nom}`" :aria-pressed="isViewModalOpen && selectedClient?.id === client.id" :disabled="isModalOpen || archiving || pointsSaving" @click="viewClient(client)">
                <span class="client-summary"><span class="client-name">{{ client.prenom }} {{ client.nom }}</span><span v-if="client.ville" class="client-city">{{ client.ville }}</span></span>
                <span class="client-contact"><span v-if="client.email">{{ client.email }}</span><span v-if="client.telephone_raw">{{ client.telephone_raw }}</span><span v-if="!client.email && !client.telephone_raw" class="client-city">Coordonnées non renseignées</span></span>
              </button>
              <button type="button" class="favorite-btn" :class="{ 'favorite-btn-active': client.contacter === 1 }" :disabled="isModalOpen || favoriteBusy(client.id) || archiving || pointsSaving" :aria-label="client.contacter === 1 ? `Retirer ${client.prenom} ${client.nom} des favoris` : `Ajouter ${client.prenom} ${client.nom} aux favoris`" :aria-pressed="client.contacter === 1" @click="toggleFavoriteFromList(client)"><svg aria-hidden="true" viewBox="0 0 24 24" :fill="client.contacter === 1 ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>
            </li>
          </ul>
        </div>
      </section>
      <aside v-if="!isViewModalOpen && !isModalOpen" class="client-placeholder"><h2>La fiche de ta cliente</h2><p>Sélectionne une fiche pour retrouver ses coordonnées, ses préférences et ses commandes.</p></aside>

      <!-- Panel consultation client -->
      <SlidePanel
        :is-open="isViewModalOpen && !isModalOpen"
        :inline="desktopDetails"
        :scroll-footer="desktopDetails"
        :return-focus-id="filteredClients.some(client => client.id === detailClientId) ? `client-open-${detailClientId}` : 'clients-list-header'"
        title="Fiche cliente"
        @close="closeViewModal"
        max-width="560px"
      >
        <template #header>
          <div v-if="selectedClient" class="client-heading">
            <div class="profile-identity">
              <h2 class="profile-name">{{ selectedClient.prenom }} {{ selectedClient.nom }}</h2>
              <p v-if="selectedClient.created_at" class="profile-member-since">Cliente depuis {{ formatMemberSince(selectedClient.created_at) }}</p>
            </div>
            <button
              type="button"
              :class="['favorite-toggle', { 'favorite-toggle-active': selectedClient.contacter }]"
              :disabled="favoriteBusy(selectedClient.id) || archiving || pointsSaving"
              :aria-label="selectedClient.contacter ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              :aria-pressed="Boolean(selectedClient.contacter)"
              @click="toggleFavorite"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" :fill="selectedClient.contacter ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        </template>
        <div v-if="selectedClient" class="client-profile">
          <p v-if="operationError" class="client-error" role="alert">{{ operationError }}</p>
          <p v-if="selectedClient.archive" class="archive-notice">Client archivé : les coordonnées et commandes restent consultables. Restaurez-le avant une nouvelle commande.</p>
          <p v-if="archiveError" class="archive-error" role="alert">{{ archiveError }}</p>
          <p v-if="archiveNotice" class="archive-notice" role="status">{{ archiveNotice }}</p>
          <section class="loyalty-section" aria-label="Points fidélité">
            <div class="loyalty-heading">
              <span class="loyalty-label">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/>
                  <path d="M14 5v2m0 3v2m0 3v2m0 1v1"/>
                </svg>
                Points fidélité
              </span>
              <div v-if="!pointsEditing" class="loyalty-value">
                <strong>{{ selectedClient.points_fidelite ?? 0 }}</strong>
                <button id="client-points-edit" type="button" class="loyalty-action" :disabled="archiving || favoriteBusy(selectedClient.id)" aria-label="Modifier les points fidélité" @click="startPointsEdit">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6 5-2"/></svg>
                </button>
              </div>
            </div>
            <form v-if="pointsEditing" class="loyalty-editor" novalidate @submit.prevent="savePoints" @keydown.esc.stop.prevent="cancelPointsEdit">
              <label class="sr-only" for="client-points-input">Nouveau nombre de points fidélité</label>
              <input id="client-points-input" v-model="pointsDraft" type="number" min="0" step="1" inputmode="numeric" :disabled="pointsSaving" :aria-invalid="Boolean(pointsError)" :aria-describedby="pointsError ? 'client-points-feedback' : undefined" />
              <button type="submit" class="loyalty-action loyalty-save" :disabled="pointsSaving" :aria-label="pointsSaving ? 'Enregistrement des points fidélité' : 'Enregistrer les points fidélité'">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
              </button>
              <button type="button" class="loyalty-action" :disabled="pointsSaving" aria-label="Annuler la modification des points" @click="cancelPointsEdit">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg>
              </button>
            </form>
            <p v-if="pointsSaving" class="loyalty-feedback" role="status">Enregistrement…</p>
            <p v-else-if="pointsError" id="client-points-feedback" class="loyalty-feedback loyalty-error" role="alert">{{ pointsError }}</p>
            <p v-else-if="pointsNotice" class="loyalty-feedback" role="status">{{ pointsNotice }}</p>
          </section>

          <!-- Grille d'informations -->
          <div class="profile-grid">
            <!-- Section Contact -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Contact
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.email">
                  <span class="info-label">Email</span>
                  <a :href="`mailto:${selectedClient.email}`" class="info-value info-link">{{ selectedClient.email }}</a>
                </div>
                <div class="info-item" v-if="selectedClient.telephone_raw">
                  <span class="info-label">Téléphone</span>
                  <a :href="`tel:${selectedClient.telephone_e164 || selectedClient.telephone_raw}`" class="info-value info-link">
                    {{ selectedClient.telephone_raw }}
                  </a>
                </div>
                <div v-if="!selectedClient.email && !selectedClient.telephone_raw" class="info-empty">
                  Aucun contact renseigné
                </div>
              </div>
            </div>

            <!-- Section Adresse -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Adresse
              </h3>
              <div class="info-list">
                <div v-if="hasAddress" class="address-block">
                  <p v-if="selectedClient.adresse" class="address-line">{{ selectedClient.adresse }}</p>
                  <p v-if="selectedClient.code_postal || selectedClient.ville" class="address-line">
                    {{ [selectedClient.code_postal, selectedClient.ville].filter(Boolean).join(' ') }}
                  </p>
                </div>
                <div v-else class="info-empty">
                  Aucune adresse renseignée
                </div>
              </div>
            </div>

            <!-- Section Informations personnelles -->
            <div v-if="selectedClient.date_naissance || selectedClient.derniere_commande" class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Informations
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.date_naissance">
                  <span class="info-label">Date de naissance</span>
                  <span class="info-value">
                    {{ formatDate(selectedClient.date_naissance) }}
                    <span class="info-extra">({{ calculateAge(selectedClient.date_naissance) }} ans)</span>
                  </span>
                </div>
                <div class="info-item" v-if="selectedClient.derniere_commande">
                  <span class="info-label">Dernière commande</span>
                  <span class="info-value">{{ formatDate(selectedClient.derniere_commande) }}</span>
                </div>
              </div>
            </div>

            <!-- Section Préférences -->
            <div class="profile-section">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Préférences
              </h3>
              <div class="info-list">
                <div class="info-item" v-if="selectedClient.relais_prefere">
                  <span class="info-label">Relais favori</span>
                  <span class="info-value relais-value">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    {{ selectedClient.relais_prefere }}
                  </span>
                </div>
                <div v-if="!selectedClient.relais_prefere" class="info-empty">
                  Aucun relais favori
                </div>
              </div>
            </div>
          </div>

          <!-- Section Commandes -->
          <div class="profile-commandes">
            <div class="section-header">
              <h3 class="section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Historique des commandes
              </h3>
              <span class="count-badge">{{ clientCommandes.length }}</span>
            </div>
            
            <div v-if="commandesLoading" class="commandes-loading" role="status">
              <div class="loading-spinner loading-spinner-sm"></div>
              <span>Chargement...</span>
            </div>
            <div v-else-if="commandesError" class="client-error" role="alert"><p>{{ commandesError }}</p><Button variant="secondary" @click="viewClient(selectedClient)">Recharger l’historique</Button></div>
            <div v-else-if="clientCommandes.length === 0" class="commandes-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Aucune commande pour le moment</span>
            </div>
            <ol v-else class="commandes-timeline">
              <li v-for="commande in clientCommandes" :key="commande.id" class="timeline-item">
                <span class="timeline-dot" aria-hidden="true"></span>
                <RouterLink
                  :to="commandeHistoryLink(commande)"
                  class="timeline-link"
                  :aria-disabled="pointsSaving || undefined"
                  @click.capture="pointsSaving && $event.preventDefault()"
                >
                  <div class="timeline-header">
                    <strong class="timeline-title">Commande n°{{ commande.id }}</strong>
                    <time :datetime="commandeHistoryDate(commande)">{{ formatHistoryDate(commande) }}</time>
                  </div>
                  <div class="timeline-meta">
                    <span class="timeline-catalogue">{{ commandeHistoryCatalogue(commande) }}</span>
                    <span class="timeline-status">{{ commande.reglee ? 'Réglée' : 'En attente' }}</span>
                  </div>
                </RouterLink>
              </li>
            </ol>
          </div>
        </div>
        <template #footer>
          <Button variant="secondary" :disabled="archiving || pointsSaving || favoriteBusy(selectedClient?.id)" @click="confirmArchiveFromView">{{ selectedClient?.archive ? 'Restaurer' : 'Archiver' }}</Button>
          <Button variant="secondary" :disabled="archiving || pointsSaving || favoriteBusy(selectedClient?.id)" @click="editClientFromView">Modifier</Button>
          <Button :disabled="Boolean(selectedClient?.archive) || archiving || pointsSaving || favoriteBusy(selectedClient?.id)" @click="newOrderForClient">Nouvelle commande</Button>
        </template>
      </SlidePanel>


      <!-- Panel création/édition client -->
      <div class="form-editor-slot" v-show="isModalOpen"><FormPanel
        :is-open="isModalOpen" :busy="saving" eyebrow="Clientes"
        :return-focus-id="isEditing ? (filteredClients.some(client => client.id === editingClientId) ? `client-open-${editingClientId}` : 'clients-list-header') : 'clients-create'"
        :title="modalTitle"
        @close="closeModal"
      >
        <form @submit.prevent="handleSubmit" class="client-form">
          <p v-if="errors._global" class="client-error" role="alert">{{ errors._global }}</p>
          <fieldset class="form-section" :disabled="saving">
            <legend class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Coordonnées
            </legend>
            <div class="form-row">
              <FormInput
                v-model="formData.prenom"
                label="Prénom"
                placeholder="Marie"
                autocomplete="given-name"
                required
                :error="errors.prenom"
              />
              <FormInput
                v-model="formData.nom"
                label="Nom"
                placeholder="Dupont"
                autocomplete="family-name"
                required
                :error="errors.nom"
              />
            </div>
            <div class="form-row">
              <EmailDomainInput
                v-model="formData.email"
                :error="errors.email"
              />
              <PhoneInput
                v-model="formData.telephone_raw"
                :error="errors.telephone_raw"
              />
            </div>
            <FormInput
              v-model="formData.adresse"
              label="Rue"
              placeholder="123 rue de la Paix"
              autocomplete="street-address"
              :error="errors.adresse"
            />
            <div class="form-row">
              <FormInput
                v-model="formData.code_postal"
                label="Code postal"
                placeholder="75001"
                autocomplete="postal-code"
                :error="errors.code_postal"
              />
              <FormInput
                v-model="formData.ville"
                label="Ville"
                placeholder="Paris"
                autocomplete="address-level2"
                :error="errors.ville"
              />
            </div>
          </fieldset>

          <fieldset class="form-section" :disabled="saving">
            <legend class="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Informations complémentaires
            </legend>
            <div class="form-row">
              <FormInput
                v-model="formData.date_naissance"
                label="Date de naissance"
                type="date"
                autocomplete="bday"
                :error="errors.date_naissance"
              />
              <FormInput
                v-model="formData.points_fidelite"
                label="Points fidélité"
                type="number"
                :min="0"
                :step="1"
                placeholder="0"
              />
            </div>
            <FormInput
              v-model="formData.relais_prefere"
              label="Relais favori"
              placeholder="Ex: Relais Colis - 12 rue du Commerce"
              :error="errors.relais_prefere"
            />
            <FormCheckbox
              v-model="formData.contacter"
              label="Cliente favorite"
              description="Retrouvez-la rapidement avec le filtre Favoris"
            />
          </fieldset>
        </form>
        <template #footer>
          <Button variant="secondary" :disabled="saving" @click="closeModal">Annuler</Button>
          <Button @click="handleSubmit" :loading="saving">
            {{ isEditing ? 'Enregistrer' : 'Créer' }}
          </Button>
        </template>
      </FormPanel></div>
      </div>

      <ConfirmDialog :is-open="confirmFormClose" title="Abandonner les modifications ?" message="Les saisies de cette cliente ne seront pas enregistrées." confirm-text="Abandonner" variant="danger" @confirm="discardClientForm" @cancel="confirmFormClose = false" />
      <!-- Archivage réversible -->
      <ConfirmDialog
        :is-open="isArchiveDialogOpen"
        :title="selectedClient?.archive ? 'Restaurer le client' : 'Archiver le client'"
        :message="selectedClient?.archive ? 'Ce client pourra à nouveau recevoir des commandes.' : 'Ce client sera retiré des nouvelles commandes. Ses coordonnées et son historique seront conservés.'"
        :confirm-text="selectedClient?.archive ? 'Restaurer' : 'Archiver'"
        :loading="archiving"
        @confirm="archiveClient"
        @cancel="isArchiveDialogOpen = false"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import Layout from '../components/Layout.vue';
import FormPanel from '../components/FormPanel.vue';
import '../styles/form-workspace.css';
import SlidePanel from '../components/SlidePanel.vue';
import Button from '../components/Button.vue';
import FormInput from '../components/FormInput.vue';
import FormCheckbox from '../components/FormCheckbox.vue';
import EmailDomainInput from '../components/EmailDomainInput.vue';
import PhoneInput from '../components/PhoneInput.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { useClientsStore } from '../stores/clients';
import { commandeHistoryLink, commandeHistoryDate, formatHistoryDate, commandeHistoryCatalogue } from '../utils/client-history.js';
import { matchesClientSearch } from '../utils/client-input';

const router = useRouter();
const desktopMedia = window.matchMedia('(min-width: 901px)');
const desktopDetails = ref(desktopMedia.matches);
const updateDesktopDetails = event => { desktopDetails.value = event.matches; };
onMounted(() => desktopMedia.addEventListener('change', updateDesktopDetails));
onUnmounted(() => { desktopMedia.removeEventListener('change', updateDesktopDetails); ++historyGeneration; });

const clientsStore = useClientsStore();

const searchQuery = ref('');
const filtersExpanded = ref(false);
const operationError = ref('');
const detailClientId = ref(null);
const commandesError = ref('');
const favoritePending = ref(new Set());
let historyGeneration = 0;
const showOnlyFavorites = ref(false);
const archiveFilter = ref('actifs');
const archiving = ref(false);
const archiveError = ref('');
const archiveNotice = ref('');
const isModalOpen = ref(false);
const isViewModalOpen = ref(false);
const isArchiveDialogOpen = ref(false);
const isEditing = ref(false);
const editingClientId = ref(null);
const selectedClient = ref(null);
const clientCommandes = ref([]);
const commandesLoading = ref(false);
const saving = ref(false);
const pointsEditing = ref(false);
const pointsDraft = ref('');
const pointsSaving = ref(false);
const pointsError = ref('');
const pointsNotice = ref('');

const formData = ref({
  nom: '',
  prenom: '',
  email: '',
  telephone_raw: '',
  adresse: '',
  code_postal: '',
  ville: '',
  date_naissance: '',
  relais_prefere: '',
  contacter: false,
  points_fidelite: 0,
});

const errors = ref({});

const modalTitle = computed(() => {
  return isEditing.value ? 'Modifier le client' : 'Nouveau client';
});

const hasAddress = computed(() => {
  if (!selectedClient.value) return false;
  return selectedClient.value.adresse || selectedClient.value.code_postal || selectedClient.value.ville;
});

const filteredClients = computed(() => {
  let clients = clientsStore.clients.filter(client => Boolean(client.archive) === (archiveFilter.value === 'archives'));
  
  // Filtrer par favoris si activé
  if (showOnlyFavorites.value) {
    clients = clients.filter(client => client.contacter === 1);
  }
  
  if (searchQuery.value) clients = clients.filter(client => matchesClientSearch(client, searchQuery.value));
  
  return clients;
});

const activeCount = computed(() => clientsStore.clients.filter(client => !client.archive).length);
const archivedCount = computed(() => clientsStore.clients.filter(client => client.archive).length);
const activeFilterCount = computed(() => Number(Boolean(searchQuery.value.trim())) + Number(showOnlyFavorites.value));
const filterSummary = computed(() => [searchQuery.value.trim(), showOnlyFavorites.value ? 'favoris uniquement' : ''].filter(Boolean).join(', '));
const toggleFilters = async () => {
  filtersExpanded.value = !filtersExpanded.value;
  if (filtersExpanded.value) { await nextTick(); document.getElementById('clients-search')?.focus(); }
};
const resetFilters = async () => {
  if (pointsSaving.value) return;
  searchQuery.value = ''; showOnlyFavorites.value = false;
  await nextTick();
  document.getElementById(filtersExpanded.value ? 'clients-search' : 'clients-filter-toggle')?.focus();
};
const selectArchiveTab = (value, focus = false) => {
  if (pointsSaving.value) return;
  archiveFilter.value = value;
  if (focus) document.getElementById(`clients-tab-${value}`)?.focus();
};
const onTabKeydown = event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const value = event.key === 'Home' ? 'actifs' : event.key === 'End' ? 'archives' : archiveFilter.value === 'actifs' ? 'archives' : 'actifs';
  selectArchiveTab(value, true);
};
watch([searchQuery, showOnlyFavorites, archiveFilter], async () => {
  if (!isViewModalOpen.value || archiving.value || pointsSaving.value || isArchiveDialogOpen.value || filteredClients.value.some(client => client.id === selectedClient.value?.id)) return;
  const focused = document.activeElement;
  closeViewModal();
  // Laisser le panneau terminer son propre retour de focus avant de préserver le filtre.
  await nextTick();
  await nextTick();
  if (focused?.isConnected) focused.focus();
});

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatMemberSince = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return diffDays <= 1 ? 'aujourd\'hui' : `${diffDays} jours`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 mois' : `${months} mois`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 an' : `${years} ans`;
  }
};

const calculateAge = (dateStr) => {
  if (!dateStr) return '';
  const birthDate = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const viewClient = async (client) => {
  if (!client || archiving.value || pointsSaving.value) return;
  const generation = ++historyGeneration;
  archiveError.value = ''; archiveNotice.value = ''; commandesError.value = '';
  resetPointsEditor();
  detailClientId.value = client.id;
  selectedClient.value = client;
  clientCommandes.value = [];
  commandesLoading.value = true;
  isViewModalOpen.value = true;
  try {
    const commandes = await clientsStore.fetchClientCommandes(client.id);
    if (generation === historyGeneration && isViewModalOpen.value) clientCommandes.value = commandes;
  } catch (error) {
    if (clientsStore.error === error.message) clientsStore.error = null;
    if (generation === historyGeneration && isViewModalOpen.value) commandesError.value = error.message || 'Impossible de charger cet historique.';
  } finally {
    if (generation === historyGeneration) commandesLoading.value = false;
  }
};

const closeViewModal = () => {
  if (archiving.value || pointsSaving.value) return;
  resetPointsEditor();
  ++historyGeneration;
  isViewModalOpen.value = false;
  selectedClient.value = null;
  clientCommandes.value = [];
  commandesLoading.value = false;
  commandesError.value = '';
};

const resetPointsEditor = () => {
  pointsEditing.value = false;
  pointsDraft.value = '';
  pointsError.value = '';
  pointsNotice.value = '';
};
const startPointsEdit = async () => {
  if (!selectedClient.value || archiving.value || pointsSaving.value || favoriteBusy(selectedClient.value.id)) return;
  pointsDraft.value = String(selectedClient.value.points_fidelite ?? 0);
  pointsError.value = ''; pointsNotice.value = '';
  pointsEditing.value = true;
  await nextTick();
  document.getElementById('client-points-input')?.focus();
};
const cancelPointsEdit = async () => {
  if (pointsSaving.value) return;
  resetPointsEditor();
  await nextTick();
  document.getElementById('client-points-edit')?.focus();
};
const savePoints = async () => {
  if (!pointsEditing.value || !selectedClient.value || pointsSaving.value || archiving.value || favoriteBusy(selectedClient.value.id)) return;
  const points = Number(pointsDraft.value);
  if (!String(pointsDraft.value).trim() || !Number.isSafeInteger(points) || points < 0) {
    pointsError.value = 'Saisis un nombre entier de points supérieur ou égal à 0.';
    return;
  }
  const clientId = selectedClient.value.id;
  const generation = historyGeneration;
  pointsSaving.value = true;
  pointsError.value = '';
  try {
    const updated = await clientsStore.setPointsFidelite(clientId, points);
    if (generation !== historyGeneration || !isViewModalOpen.value || selectedClient.value?.id !== clientId) return;
    selectedClient.value = updated;
    pointsEditing.value = false;
    pointsNotice.value = 'Points mis à jour.';
    await nextTick();
    document.getElementById('client-points-edit')?.focus();
  } catch (error) {
    if (generation === historyGeneration && isViewModalOpen.value && selectedClient.value?.id === clientId) pointsError.value = error.message || 'Impossible d’enregistrer les points.';
  } finally { pointsSaving.value = false; }
};

const favoriteBusy = id => favoritePending.value.has(id);
const toggleFavoriteFromList = async client => {
  if (isModalOpen.value || saving.value) return;
  if (!client || favoriteBusy(client.id) || archiving.value || pointsSaving.value) return;
  const focused = document.activeElement;
  const id = client.id;
  favoritePending.value.add(id);
  operationError.value = '';
  try {
    const updated = await clientsStore.updateClient(id, { ...client, contacter: client.contacter === 1 ? 0 : 1 });
    if (isViewModalOpen.value && selectedClient.value?.id === id) selectedClient.value = updated;
    await nextTick();
    if (!focused?.isConnected && document.activeElement === document.body) document.getElementById('clients-list-header')?.focus();
  } catch (error) {
    if (clientsStore.error === error.message) clientsStore.error = null;
    operationError.value = error.message || 'Impossible de modifier ce favori.';
  } finally { favoritePending.value.delete(id); }
};
const toggleFavorite = () => toggleFavoriteFromList(selectedClient.value);

const editClientFromView = async () => {
  if (!selectedClient.value || archiving.value || pointsSaving.value || favoriteBusy(selectedClient.value.id)) return;
  const client = selectedClient.value;
  closeViewModal();
  await nextTick();
  editClient(client);
};

const newOrderForClient = () => {
  const client = selectedClient.value;
  if (!client || client.archive || archiving.value || pointsSaving.value || favoriteBusy(client.id)) return;
  closeViewModal();
  // Conserver l’accès Commandes et son paramètre cliente existant.
  router.push({ path: '/', query: { client: client.id } });
};

const confirmArchiveFromView = () => {
  if (!selectedClient.value || archiving.value || pointsSaving.value || favoriteBusy(selectedClient.value.id)) return;
  archiveError.value = '';
  isArchiveDialogOpen.value = true;
};

const openCreateModal = async () => {
  if (isModalOpen.value) return;
  if (archiving.value || saving.value || pointsSaving.value) return;
  closeViewModal();
  await nextTick();
  isEditing.value = false;
  editingClientId.value = null;
  formData.value = {
    nom: '',
    prenom: '',
    email: '',
    telephone_raw: '',
    adresse: '',
    code_postal: '',
    ville: '',
    date_naissance: '',
    relais_prefere: '',
    contacter: false,
    points_fidelite: 0,
  };
  errors.value = {};
  formBaseline.value = JSON.stringify(formData.value);
  isModalOpen.value = true;
};

const editClient = (client) => {
  isEditing.value = true;
  editingClientId.value = client.id;
  formData.value = {
    nom: client.nom || '',
    prenom: client.prenom || '',
    email: client.email || '',
    telephone_raw: client.telephone_raw || '',
    adresse: client.adresse || '',
    code_postal: client.code_postal || '',
    ville: client.ville || '',
    date_naissance: client.date_naissance || '',
    relais_prefere: client.relais_prefere || '',
    contacter: client.contacter === 1,
    points_fidelite: client.points_fidelite ?? 0,
  };
  errors.value = {};
  formBaseline.value = JSON.stringify(formData.value);
  isModalOpen.value = true;
};

const formBaseline = ref('');
const clientFormDirty = computed(() => isModalOpen.value && JSON.stringify(formData.value) !== formBaseline.value);
const confirmFormClose = ref(false);
const discardClientForm = () => { confirmFormClose.value = false; isModalOpen.value = false; };
const closeModal = () => {
  if (saving.value) return;
  if (clientFormDirty.value) confirmFormClose.value = true;
  else isModalOpen.value = false;
};
onBeforeRouteLeave(() => {
  if (!isModalOpen.value) return;
  if (saving.value) return false;
  if (clientFormDirty.value) return window.confirm('Quitter et abandonner les saisies de cette cliente ?');
});

const handleSubmit = async () => {
  if (saving.value) return;
  errors.value = {};

  if (!formData.value.nom) errors.value.nom = 'Le nom est requis';
  if (!formData.value.prenom) errors.value.prenom = 'Le prénom est requis';

  if (Object.keys(errors.value).length > 0) return;

  saving.value = true;
  try {
    // Convertir contacter de booléen à 0/1 pour le backend
    const clientData = {
      ...formData.value,
      contacter: formData.value.contacter ? 1 : 0,
      points_fidelite: parseInt(formData.value.points_fidelite) || 0,
    };
    
    if (isEditing.value) {
      await clientsStore.updateClient(editingClientId.value, clientData);
    } else {
      await clientsStore.createClient(clientData);
    }
    isModalOpen.value = false;
  } catch (error) {
    if (clientsStore.error === error.message) clientsStore.error = null;
    errors.value._global = error.message || 'Impossible d’enregistrer cette cliente.';
  } finally {
    saving.value = false;
  }
};

const archiveClient = async () => {
  if (!selectedClient.value || archiving.value || pointsSaving.value || favoriteBusy(selectedClient.value.id)) return;
  archiving.value = true;
  archiveError.value = '';
  try {
    selectedClient.value = await clientsStore.setArchive(selectedClient.value.id, !selectedClient.value.archive);
    archiveNotice.value = selectedClient.value.archive ? 'Client archivé. Son historique est conservé.' : 'Client restauré.';
    isArchiveDialogOpen.value = false;
  } catch (error) {
    archiveError.value = error.message;
    clientsStore.error = null;
    isArchiveDialogOpen.value = false;
  } finally {
    archiving.value = false;
  }
};

const loadClients = () => clientsStore.fetchClients({ includeArchives: true });
onMounted(async () => {
  await loadClients();
});
</script>

<style scoped>
.clients-view { width: 100%; min-width: 0; }
.clients-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.clients-workspace { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: 16px; align-items: start; }
.clients-list-panel, .client-placeholder { min-width: 0; background: var(--card); border-radius: var(--border-radius-xl); box-shadow: var(--shadow-sm); }
.clients-list-panel { overflow: hidden; }
.client-placeholder { padding: 24px 18px; }
.client-placeholder h2 { color: var(--primary); font-size: var(--font-size-lg); margin-bottom: 12px; }
.client-placeholder p { color: var(--text-secondary); line-height: 1.65; }
.clients-list-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 12px; padding: 0 14px; border-bottom: 1px solid var(--border-light); }
.clients-tabs { display: flex; gap: 16px; }
.clients-tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 56px; padding: 12px 6px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--font-size-sm); cursor: pointer; }
.clients-tabs button:hover { color: var(--primary); border-bottom-color: var(--border); }
.clients-tabs button[aria-selected="true"] { color: var(--primary); border-bottom-color: var(--primary); font-weight: var(--font-weight-semibold); }
.clients-tabs span { font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; }
.clients-list-tools { display: flex; align-items: center; gap: 12px; }
.clients-list-tools p { color: var(--text-secondary); font-size: var(--font-size-xs); white-space: nowrap; font-variant-numeric: tabular-nums; }
.clients-filter-toggle { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--font-size-xs); cursor: pointer; }
.clients-filter-toggle:hover, .clients-filter-toggle[aria-expanded="true"] { background: var(--primary-light); color: var(--primary); }
.clients-filter-toggle svg { width: 17px; height: 17px; }
.clients-filter-toggle .filter-chevron { width: 12px; height: 12px; }
.filter-chevron.expanded { transform: rotate(180deg); }
.filter-count { min-width: 17px; padding: 1px 4px; border-radius: 4px; background: var(--primary); color: var(--primary-foreground); text-align: center; }
.clients-filters { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-light); }
.client-filter { display: grid; gap: 6px; flex: 1 1 200px; min-width: 0; }
.client-filter label { color: var(--text-secondary); font-size: var(--font-size-xs); }
.client-filter input { width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.favorites-filter { display: flex; align-items: center; gap: 8px; min-height: 44px; color: var(--text-secondary); font-size: var(--font-size-sm); cursor: pointer; }
.favorites-filter input { accent-color: var(--primary); width: 17px; height: 17px; }
.client-filter-reset { min-height: 44px; padding: 8px 0; border: 0; background: transparent; color: var(--primary); font: inherit; font-size: var(--font-size-xs); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.clients-list { list-style: none; margin: 0; padding: 0; }
.client-list-item { position: relative; }
.client-list-item + .client-list-item { border-top: 1px solid var(--border-light); }
.client-list-item:hover { background: var(--surface-hover); }
.client-list-item.client-selected { background: var(--surface-selected); box-shadow: inset 3px 0 var(--primary); }
.client-open { display: grid; align-content: center; min-height: 72px; gap: 6px; width: 100%; padding: 12px 72px 12px 20px; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.client-open:focus-visible { outline-offset: -4px; }
.client-open:disabled { cursor: wait; }
.client-summary, .client-contact { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
.client-name { font-size: var(--font-size-base); font-weight: 600; color: var(--primary); overflow-wrap: anywhere; }
.client-city { min-width: 0; overflow-wrap: anywhere; }
.client-city, .client-contact { font-size: var(--font-size-xs); color: var(--text-secondary); }
.client-contact > span { min-width: 0; overflow-wrap: anywhere; }
.favorite-btn { position: absolute; right: 14px; top: calc(50% - 22px); display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.favorite-btn svg { width: 18px; height: 18px; }
.favorite-btn-active, .favorite-btn:hover { color: var(--primary); background: var(--primary-light); }
.favorite-btn:disabled { opacity: .6; cursor: wait; }
.client-error, .archive-error { padding: var(--feedback-padding); border-radius: var(--feedback-radius); background: var(--error-light); color: var(--error-dark); overflow-wrap: anywhere; }
.clients-view > .client-error { margin-bottom: 16px; }
.archive-notice { padding: 12px; background: var(--primary-light); color: var(--text-secondary); border-radius: 6px; }
.client-profile { display: grid; gap: 18px; min-width: 0; }
.client-heading { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
.profile-identity { min-width: 0; flex: 1; }
.profile-name { font-size: 20px; color: var(--primary); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; line-height: 1.3; margin: 0; }
.profile-member-since { color: var(--text-secondary); font-size: var(--font-size-xs); margin: 5px 0 0; }
.favorite-toggle { display: inline-grid; place-items: center; flex: 0 0 44px; min-height: 44px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); cursor: pointer; }
.favorite-toggle-active, .favorite-toggle:hover { color: var(--primary); }
.favorite-toggle svg { width: 18px; height: 18px; }
.loyalty-section { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.loyalty-heading, .loyalty-value { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.loyalty-label { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: var(--font-size-sm); }
.loyalty-label svg { width: 19px; height: 19px; flex-shrink: 0; color: var(--primary); }
.loyalty-value strong { color: var(--primary); font-size: 20px; font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
.loyalty-action { display: inline-grid; place-items: center; flex: 0 0 44px; min-height: 44px; width: 44px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--primary); cursor: pointer; }
.loyalty-action svg { width: 18px; height: 18px; }
.loyalty-action:hover { background: var(--primary-light); }
.loyalty-action:disabled { cursor: wait; opacity: .6; }
.loyalty-editor { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.loyalty-editor input { width: 100%; min-width: 0; min-height: 44px; padding: 8px 10px; border: 1.5px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text-primary); font: inherit; font-size: var(--font-size-sm); }
.loyalty-editor input[aria-invalid="true"] { border-color: var(--error); }
.loyalty-save { background: var(--primary-light); }
.loyalty-feedback { color: var(--text-secondary); font-size: var(--font-size-xs); margin-top: 6px; overflow-wrap: anywhere; }
.loyalty-error { color: var(--error-dark); }
.profile-grid { display: grid; gap: 18px; }
.profile-section { min-width: 0; }
.section-title { display: flex; align-items: center; gap: 8px; color: var(--primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); margin-bottom: 10px; }
.section-title > svg { width: 16px; height: 16px; flex-shrink: 0; }
.info-list { display: grid; gap: 10px; }
.info-item { display: grid; gap: 3px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }
.info-label, .info-extra, .info-empty { color: var(--text-secondary); font-size: var(--font-size-xs); }
.info-value, .address-line { font-size: var(--font-size-sm); color: var(--text-primary); overflow-wrap: anywhere; }
.info-link { color: var(--primary); text-decoration: underline; text-underline-offset: 3px; }
.info-link:hover { color: var(--primary); }
.info-extra { margin-left: 4px; }
.address-line { margin: 0; }
.address-block { display: grid; gap: 3px; }
.relais-value { display: inline-flex; align-items: center; gap: 6px; color: var(--primary); }
.relais-value { overflow-wrap: anywhere; }
.relais-value svg { width: 16px; height: 16px; flex-shrink: 0; }
.section-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.section-header .count-badge { background: var(--primary-light); color: var(--primary); box-shadow: none; }
.commandes-loading, .commandes-empty { display: flex; align-items: center; gap: 8px; padding: 12px 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
.commandes-empty svg { width: 20px; height: 20px; flex-shrink: 0; }
.commandes-timeline { list-style: none; margin: 0; padding: 0 0 0 16px; }
.timeline-item { position: relative; padding-left: 14px; }
.timeline-item::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: var(--primary); }
.timeline-item:first-child::before { top: 20px; }
.timeline-item:last-child::before { bottom: calc(100% - 20px); }
.timeline-item:only-child::before { display: none; }
.timeline-dot { position: absolute; top: 17px; left: -3px; width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }
.timeline-link { display: grid; gap: 4px; min-height: 44px; padding: 10px 0 12px; border-radius: 3px; color: var(--text-primary); text-decoration: none; }
.timeline-link:hover { color: var(--primary); background: var(--primary-light); }
.timeline-link[aria-disabled="true"] { opacity: .6; cursor: wait; }
.timeline-header, .timeline-meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 8px; }
.timeline-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.timeline-header time { font-size: var(--font-size-xs); color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.timeline-meta { font-size: var(--font-size-xs); color: var(--text-secondary); }
.timeline-catalogue { overflow-wrap: anywhere; flex: 1 1 120px; min-width: 0; }
.timeline-status { white-space: nowrap; }

.client-form {
  display: grid;
  gap: var(--spacing-4);
}

.form-section {
  display: grid;
  gap: var(--spacing-3);
  min-width: 0;
  padding: 0 0 var(--spacing-4);
  border: 0;
  border-bottom: 1px solid var(--border-light);
}

.form-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-family: var(--font-heading);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  margin: 0 0 var(--spacing-1);
  padding: 0;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
}

.form-section-title svg {
  width: 16px;
  height: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-row > * { min-width: 0; }
.client-form :deep(.form-field),
.client-form :deep(.form-field-checkbox),
.client-form :deep(.email-domain-field) { margin-bottom: 0; }


@media (max-width: 900px) { .clients-workspace { grid-template-columns: 1fr; } .client-placeholder { display: none; } }
@media (max-width: 480px) { .clients-list-heading { padding-inline: 10px; gap: 0 6px; } .clients-tabs { gap: 8px; } .clients-tabs button { padding-inline: 4px; } .clients-list-tools { gap: 6px; } .clients-filters { padding: 12px; } .client-open { padding-left: 16px; } .form-row { grid-template-columns: 1fr; } }
</style>
