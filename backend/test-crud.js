/**
 * Script de test automatisé pour le CRUD des clients
 * Usage: node test-crud.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let createdClientId = null;

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Fonction pour afficher les résultats
function printTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Tests
async function runTests() {
  console.log('==========================================');
  console.log('Test du CRUD des clients');
  console.log('==========================================\n');

  try {
    // Test 1: Health check
    console.log('1. Test de santé du serveur...');
    const health = await makeRequest('GET', '/api/health');
    printTest('GET /api/health', health.status === 200, `Status: ${health.status}`);
    console.log('');

    // Test 2: Récupérer tous les clients
    console.log('2. Récupérer tous les clients...');
    const allClients = await makeRequest('GET', '/api/clients');
    printTest('GET /api/clients', allClients.status === 200, `Status: ${health.status}, ${Array.isArray(allClients.body) ? allClients.body.length + ' clients' : 'Erreur'}`);
    if (allClients.body && allClients.body.length > 0) {
      console.log(`   Premier client: ${allClients.body[0].nom} ${allClients.body[0].prenom}`);
    }
    console.log('');

    // Test 3: Récupérer un client par ID
    console.log('3. Récupérer un client par ID (ID=1)...');
    const client1 = await makeRequest('GET', '/api/clients/1');
    printTest('GET /api/clients/1', client1.status === 200 || client1.status === 404, 
      client1.status === 200 ? `Client trouvé: ${client1.body?.nom} ${client1.body?.prenom}` : 'Client non trouvé (normal si DB vide)');
    console.log('');

    // Test 4: Créer un nouveau client
    console.log('4. Créer un nouveau client...');
    const newClient = {
      nom: 'Test',
      prenom: 'Script',
      email: `test.script.${Date.now()}@example.com`,
      telephone_raw: '06 11 22 33 44',
      ville: 'Paris',
      contacter: 1,
    };
    const created = await makeRequest('POST', '/api/clients', newClient);
    printTest('POST /api/clients', created.status === 201, `Status: ${created.status}`);
    if (created.status === 201 && created.body) {
      createdClientId = created.body.id;
      console.log(`   Client créé avec ID: ${createdClientId}`);
      console.log(`   Nom: ${created.body.nom} ${created.body.prenom}`);
    } else {
      console.log(`   Réponse: ${JSON.stringify(created.body)}`);
    }
    console.log('');

    if (createdClientId) {
      // Test 5: Mettre à jour le client
      console.log('5. Mettre à jour le client créé...');
      const updatedData = {
        ...newClient,
        prenom: 'ScriptModifié',
        ville: 'Lyon',
      };
      const updated = await makeRequest('PUT', `/api/clients/${createdClientId}`, updatedData);
      printTest('PUT /api/clients/:id', updated.status === 200, `Status: ${updated.status}`);
      if (updated.status === 200 && updated.body) {
        console.log(`   Prénom mis à jour: ${updated.body.prenom}`);
        console.log(`   Ville mise à jour: ${updated.body.ville}`);
      }
      console.log('');

      // Test 6: Supprimer le client
      console.log('6. Supprimer le client créé...');
      const deleted = await makeRequest('DELETE', `/api/clients/${createdClientId}`);
      printTest('DELETE /api/clients/:id', deleted.status === 204, `Status: ${deleted.status}`);
      console.log('');

      // Vérifier que le client a bien été supprimé
      console.log('7. Vérifier que le client a été supprimé...');
      const checkDeleted = await makeRequest('GET', `/api/clients/${createdClientId}`);
      printTest('GET /api/clients/:id (après suppression)', checkDeleted.status === 404, 'Client non trouvé (correct)');
      console.log('');
    }

    // Test 8: Validation - Créer un client sans nom
    console.log('8. Test de validation - Créer un client sans nom...');
    const invalidClient = { prenom: 'Test' };
    const invalid = await makeRequest('POST', '/api/clients', invalidClient);
    printTest('POST /api/clients (sans nom)', invalid.status === 400, `Status: ${invalid.status}`);
    if (invalid.body && invalid.body.error) {
      console.log(`   Erreur: ${invalid.body.error}`);
    }
    console.log('');

    // Test 9: Test avec ID invalide
    console.log('9. Test avec ID invalide...');
    const invalidId = await makeRequest('GET', '/api/clients/abc');
    printTest('GET /api/clients/abc', invalidId.status === 400, `Status: ${invalidId.status}`);
    console.log('');

    // Test 10: Test avec ID inexistant
    console.log('10. Test avec ID inexistant...');
    const notFound = await makeRequest('GET', '/api/clients/99999');
    printTest('GET /api/clients/99999', notFound.status === 404, `Status: ${notFound.status}`);
    console.log('');

    console.log('==========================================');
    console.log('Tests terminés');
    console.log('==========================================');

  } catch (error) {
    console.error('Erreur lors des tests:', error.message);
    process.exit(1);
  }
}

// Lancer les tests
runTests();

