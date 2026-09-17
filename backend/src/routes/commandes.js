const router = require('express').Router();
const commandes = require('../db/commandes');
const v = require('../db/source-validation');
const { route, id } = require('./helpers/sources');

function found(order) {
  if (!order) v.invalid('Commande non trouvée', 404);
  return order;
}

router.get('/', route((req, res) => res.json(commandes.getAllCommandes())));
router.get('/:id', route((req, res) => res.json(found(commandes.getCommandeById(id(req))))));
router.post('/', route((req, res) => res.status(201).json(commandes.createCommande(req.body))));
router.put('/:id', route((req, res) => res.json(found(commandes.updateCommande(id(req), req.body)))));
router.patch('/:id/reglement', route((req, res) => res.json(found(commandes.regleCommande(id(req), req.body)))));
router.delete('/:id', route((req, res) => {
  found(commandes.deleteCommande(id(req)));
  res.status(204).send();
}));

module.exports = router;
