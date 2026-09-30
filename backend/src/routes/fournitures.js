const router = require('express').Router();
const fournitures = require('../db/fournitures');
const { route } = require('./helpers/sources');

router.get('/', route((req, res) => res.json(fournitures.workflow())));
router.patch('/deplacement', route((req, res) => res.json(fournitures.move(req.body))));
router.post('/archivage', route((req, res) => res.json(fournitures.archive(req.body))));

module.exports = router;
