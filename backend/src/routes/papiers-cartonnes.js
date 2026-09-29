const router = require('express').Router();
const papiers = require('../db/papiers_cartonnes');
const v = require('../db/source-validation');
const { route, id, flag, readOnlyDelete } = require('./helpers/sources');
router.get('/', route((req, res) => res.json(papiers.searchPapiersCartonnes(req.query.search, {
  includeArchives: flag(req.query, 'include_archives')
}))));
router.post('/', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.status(201).json(papiers.createPapierCartonne(req.body.nom));
}));
router.put('/:id', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.json(papiers.updatePapierCartonne(id(req), req.body.nom));
}));
router.patch('/:id/archivage', route((req, res) => {
  res.json(papiers.archivePapierCartonne(id(req), req.body));
}));
readOnlyDelete(router, '/:id', 'PUT');
module.exports = router;
