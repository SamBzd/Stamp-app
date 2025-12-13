const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../../db/app.db');
const schemaPath = path.join(__dirname, '../../db/schema.sql');

console.log('🔄 Démarrage de la migration...');
console.log(`📁 Base de données: ${dbPath}`);
console.log(`📄 Schéma: ${schemaPath}`);

// Vérifier que le fichier de schéma existe
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Le fichier schema.sql n\'existe pas!');
  process.exit(1);
}

// Lire le fichier de schéma
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

// Se connecter à la base de données
const db = new Database(dbPath);

try {
  // Extraire uniquement la partie commandes du schéma (après le premier COMMIT)
  const parts = schemaSQL.split('-- ============================================');
  let commandesSchema = '';
  
  if (parts.length > 1) {
    // Prendre tout ce qui suit le séparateur (incluant le commentaire)
    commandesSchema = parts.slice(1).join('-- ============================================');
  } else {
    // Si pas de séparateur, chercher après le premier COMMIT
    const commitIndex = schemaSQL.indexOf('COMMIT;');
    if (commitIndex !== -1) {
      commandesSchema = schemaSQL.substring(commitIndex + 7).trim();
    } else {
      console.error('❌ Impossible de trouver la section commandes dans le schéma');
      process.exit(1);
    }
  }
  
  if (!commandesSchema) {
    console.error('❌ Impossible de trouver la section commandes dans le schéma');
    process.exit(1);
  }

  // Supprimer les anciennes tables si elles existent (pour éviter les conflits de schéma)
  console.log('🗑️  Suppression des anciennes tables si elles existent...');
  db.exec(`
    DROP TABLE IF EXISTS commande_collections;
    DROP TABLE IF EXISTS commandes;
    DROP TABLE IF EXISTS groupe_collections;
    DROP TABLE IF EXISTS groupes_collections;
    DROP TABLE IF EXISTS collections;
  `);

  // Supprimer les anciens triggers
  db.exec(`
    DROP TRIGGER IF EXISTS check_format_c_collections;
    DROP TRIGGER IF EXISTS check_format_c_max_collections;
    DROP TRIGGER IF EXISTS check_collection_exists_in_groupe;
    DROP TRIGGER IF EXISTS check_groupe_3_collections;
    DROP TRIGGER IF EXISTS check_commande_collections_same_groupe;
  `);

  // Exécuter le schéma des commandes
  console.log('📝 Application du schéma des commandes...');
  db.exec(commandesSchema);
  
  console.log('✅ Migration terminée avec succès!');
  console.log('\n📊 Tables créées:');
  console.log('   - collections');
  console.log('   - groupes_collections');
  console.log('   - groupe_collections');
  console.log('   - commandes');
  console.log('   - commande_collections');
  console.log('\n🔍 Vérification des tables...');
  
  // Vérifier que les tables existent
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('collections', 'groupes_collections', 'groupe_collections', 'commandes', 'commande_collections')
    ORDER BY name
  `).all();
  
  tables.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });
  
} catch (error) {
  console.error('❌ Erreur lors de la migration:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}