const db = require('./db/connection');
const fs = require('fs');
const path = require('path');

// Lire le fichier de migration
const migrationPath = path.join(__dirname, '../../db/migration_stocks.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Application de la migration stocks...');

try {
    // Exécuter la migration
    db.exec(migrationSQL);
    console.log('✅ Migration stocks appliquée avec succès!');
    
    // Vérifier que la table existe
    const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stocks'");
    const tableExists = checkTable.get();
    
    if (tableExists) {
        console.log('✅ Table stocks créée avec succès');
    } else {
        console.error('❌ Erreur: La table stocks n\'a pas été créée');
        process.exit(1);
    }
    
    process.exit(0);
} catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    process.exit(1);
}


