const router = require('express').Router();
const { getSettings, updateSettings } = require('../db/settings');
const { route } = require('./helpers/sources');
router.get('/', route((req, res) => res.json(getSettings())));
router.put('/', route((req, res) => res.json(updateSettings(req.body))));
module.exports = router;
