const router = require('express').Router();
const cat = require('../db/catalogues');
const col = require('../db/collections');
const rubans = require('../db/rubans');
const v = require('../db/source-validation');
const { route, id, flag, readOnlyDelete } = require('./helpers/sources');
router.get('/', route((req, res) => res.json(cat.getAllCatalogues({
  includeArchives: flag(req.query, 'include_archives'), utilisables: flag(req.query, 'utilisables')
}))));
router.get('/:id', route((req, res) => {
  const catalogue = cat.getCatalogueById(id(req));
  if (!catalogue) v.invalid('Catalogue non trouvé', 404);
  res.json(catalogue);
}));
router.post('/', route((req, res) => res.status(201).json(cat.createCatalogue(req.body))));
router.put('/:id', route((req, res) => res.json(cat.updateCatalogue(id(req), req.body))));
router.post('/:id/publication', route((req, res) => {
  v.fields(req.body ?? {}, []);
  res.json(cat.publishCatalogue(id(req)));
}));
router.patch('/:id/archivage', route((req, res) => res.json(cat.archiveCatalogue(id(req), req.body))));
router.post('/:id/collections', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.status(201).json(col.addCollection(id(req), req.body.nom));
}));
router.put('/collections/:id', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.json(col.updateCollection(id(req), req.body.nom));
}));
router.put('/collections/:id/papiers', route((req, res) => {
  v.fields(req.body, ['papier_ids']);
  const collection = col.setPapiersCollection(id(req), req.body.papier_ids);
  res.json({ success: true, catalogue: cat.getCatalogueById(collection.catalogue_id) });
}));
router.post('/:id/rubans', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.status(201).json(rubans.addRuban(id(req), req.body.nom));
}));
router.put('/rubans/:id', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.json(rubans.updateRuban(id(req), req.body.nom));
}));
readOnlyDelete(router, '/:id', 'GET, PUT');
readOnlyDelete(router, '/collections/:id', 'PUT');
readOnlyDelete(router, '/rubans/:id', 'PUT');
module.exports = router;
