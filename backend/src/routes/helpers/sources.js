const v = require('../../db/source-validation');
function route(handler) {
  return (req, res) => {
    try { handler(req, res); }
    catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Cette désignation existe déjà' });
      console.error('Erreur API sources:', error);
      res.status(500).json({ error: 'Erreur interne serveur' });
    }
  };
}
function id(req) { return v.id(Number(req.params.id)); }
function flag(query, key) {
  if (query[key] === undefined) return false;
  if (!['true', 'false'].includes(query[key])) v.invalid(`${key} doit être true ou false`);
  return query[key] === 'true';
}
function readOnlyDelete(router, path, allow) {
  router.delete(path, (req, res) => res.set('Allow', allow).status(405).json({ error: 'La suppression de cette ressource est interdite' }));
}
module.exports = { route, id, flag, readOnlyDelete };
