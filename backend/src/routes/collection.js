const router = require('express').Router();
const col = require('../db/collection');
const { setPapiersCollection } = require('../db/collections');
const { getCatalogueById } = require('../db/catalogues');
const v = require('../db/source-validation');
const { route, id, readOnlyDelete } = require('./helpers/sources');
router.get('/', route((req, res) => res.json(col.getAllCollections())));
router.get('/:id', route((req, res) => {
  const collection = col.getCollectionById(id(req));
  if (!collection) v.invalid('Collection non trouvée', 404);
  res.json(collection);
}));
router.post('/', route((req, res) => res.status(201).json(col.createCollection(req.body))));
router.put('/:id', route((req, res) => res.json(col.updateCollection(id(req), req.body))));
router.put('/:id/papiers', route((req, res) => {
  v.fields(req.body, ['papier_ids']);
  const collection = setPapiersCollection(id(req), req.body.papier_ids);
  res.json({ success: true, catalogue: getCatalogueById(collection.catalogue_id) });
}));
readOnlyDelete(router, '/:id', 'GET, PUT');
module.exports = router;
