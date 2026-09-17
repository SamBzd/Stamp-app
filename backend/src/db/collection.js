// Alias historique : les mutations utilisent les mêmes transactions métier.
const collections = require('./collections');
const v = require('./source-validation');
module.exports = {
  getAllCollections: collections.getAllCollections,
  getCollectionById: collections.getCollectionById,
  createCollection(data) {
    v.fields(data, ['catalogue_id', 'nom']);
    return collections.addCollection(v.id(data.catalogue_id), data.nom);
  },
  updateCollection(id, data) {
    v.fields(data, ['nom']);
    return collections.updateCollection(id, data.nom);
  }
};
