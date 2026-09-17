const router = require('express').Router();
const papiers = require('../db/papiers_cartonnes');
const v = require('../db/source-validation');
const { route, id, readOnlyDelete } = require('./helpers/sources');
router.get('/', route((req, res) => res.json(papiers.searchPapiersCartonnes(req.query.search))));
router.post('/', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.status(201).json(papiers.createPapierCartonne(req.body.nom));
}));
router.put('/:id', route((req, res) => {
  v.fields(req.body, ['nom']);
  res.json(papiers.updatePapierCartonne(id(req), req.body.nom));
}));
readOnlyDelete(router, '/:id', 'PUT');
module.exports = router;
