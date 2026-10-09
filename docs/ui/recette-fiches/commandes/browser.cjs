const { chromium } = require(process.env.STAMP_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const out = process.env.STAMP_CAPTURE_DIR || __dirname;
const preview = process.env.STAMP_PREVIEW_URL || 'http://127.0.0.1:5174';
const common = { created_at: '2026-10-09 12:30:00', reglee: 0, methode_paiement: 'Paypal', commande_collections: [], papiers_selectionnes: [], ruban: null };
const commandes = [
 { ...common, id: 101, type: 'kit', client_id: 1, client_prenom: 'Éléonore', client_nom: 'D’Œuvre', catalogue_id: 7, catalogue_titre: 'Automne à l’atelier', format_type: 'A', prix_applique_cents: 1800, prix_format_cents: 1800, prix_option_cents: 0 },
 { ...common, id: 102, type: 'kit', client_id: 2, client_prenom: 'Alice', client_nom: 'Martin', catalogue_id: 8, catalogue_titre: 'Noël en préparation', format_type: 'C', prix_applique_cents: 900, prix_format_cents: 900, prix_option_cents: 0, reglee: 1 },
 { ...common, id: 103, type: 'kit', client_id: 3, client_prenom: 'Camille', client_nom: 'NomTrèsLongSansEspacePourVérifierLesRetoursÀLaLigne', catalogue_id: 7, catalogue_titre: 'AncienTitreHistoriqueAuNomTrèsLongSansEspacePourTesterLeRepli', format_type: 'B', prix_applique_cents: 0, prix_format_cents: 0, prix_option_cents: 0 },
 { ...common, id: 104, type: 'kit', client_id: 4, client_prenom: 'Sarah', client_nom: 'Exemple', catalogue_id: 9, catalogue_titre: 'Petites attentions', format_type: 'A', prix_applique_cents: 2300, prix_format_cents: 1950, prix_option_cents: 350 },
 { ...common, id: 201, type: 'hors_kit', client_id: 1, client_prenom: 'Éléonore', client_nom: 'D’Œuvre', montant: 80, date_commande: '2026-10-06', cadeau_texte: 'Petite attention', cadeau_valeur: 2.5 },
 { ...common, id: 202, type: 'hors_kit', client_id: 3, client_prenom: 'Camille', client_nom: 'NomTrèsLongSansEspacePourVérifierLesRetoursÀLaLigne', montant: 0, reglee: 1 }
];
(async () => {
 const browser = await chromium.launch({headless: true, executablePath: process.env.STAMP_CHROMIUM_EXECUTABLE});
 try {
  const p = await browser.newPage({viewport: {width: 1280, height: 800}});
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.route('**/api/**', async route => {
   const pathname = new URL(route.request().url()).pathname;
   if (pathname === '/api/commandes') return route.fulfill({json: commandes});
   const match = pathname.match(/^\/api\/commandes\/(\d+)$/);
   if (match) return route.fulfill({json: commandes.find(c => c.id === Number(match[1]))});
   return route.fulfill({json: []});
  });
  const capture = async name => { await p.mouse.move(0, 0); await p.evaluate(() => document.activeElement?.blur()); await p.screenshot({path: `${out}/${name}.png`, animations: 'disabled', fullPage: !name.startsWith('detail')}); };
  const noOverflow = async () => { await p.waitForFunction(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); };
  await p.goto(`${preview}/commandes/kits`); await p.locator('#commande-open-101').waitFor();
  assert.equal(await p.locator('.commande-open').count(), 4);
  assert.equal(await p.locator('.commandes-list-panel table').count(), 0);
  assert.equal(await p.locator('#commandes-filter-fields').isVisible(), false);
  assert.match(await p.locator('#commande-open-101').innerText(), /Automne à l’atelier/);
  await p.locator('#commande-open-101').focus(); await p.keyboard.press('Enter');
  await p.getByRole('region', {name: 'Commande #101', exact: true}).waitFor();
  assert.equal(await p.locator('#commande-open-101').getAttribute('aria-pressed'), 'true');
  assert.equal(await p.evaluate(() => document.body.style.overflow), '');
  assert.ok(await p.getByRole('button', {name: 'Modifier', exact: true}).isVisible());
  await capture('detail-kit-1280');
  await p.locator('.slide-panel-close').focus(); await p.keyboard.press('Escape');
  await p.locator('#commande-open-101:focus').waitFor();
  await capture('kits-1280');
  await p.locator('#commandes-filter-toggle').click(); await p.locator('#commande-client-search:focus').waitFor();
  await p.locator('#commande-client-search').fill('oeuvre eleonore');
  assert.equal(await p.locator('.commande-open').count(), 1);
  await p.locator('#commande-catalogue-filter').selectOption('7');
  assert.equal(await p.locator('.commande-open').count(), 1);
  await capture('filtres-kits-1280');
  await p.locator('#commandes-filter-toggle').click();
  assert.equal(await p.locator('#commandes-filter-fields').isVisible(), false);
  assert.equal(await p.locator('.filter-count').innerText(), '2');
  await p.locator('.commandes-pages').getByRole('link', {name: /Hors kit/}).click();
  await p.locator('#commande-open-201').waitFor(); assert.equal(await p.locator('.commande-open').count(), 2);
  await capture('hors-kit-1280');
  await p.locator('.commandes-pages').getByRole('link', {name: /Kits/}).click();
  await p.locator('#commande-open-101').waitFor(); assert.equal(await p.locator('.commande-open').count(), 1);
  await p.locator('#commandes-filter-toggle').click(); await p.getByRole('button', {name: 'Effacer les filtres', exact: true}).click();
  assert.equal(await p.locator('.commande-open').count(), 4);
  await p.locator('#commande-open-101').click(); await p.getByRole('region', {name: 'Commande #101', exact: true}).waitFor();
  await p.locator('#commande-client-search').fill('Alice'); await p.locator('.slide-panel').waitFor({state: 'hidden'});
  await p.locator('#commande-client-search:focus').waitFor();
  await p.locator('#commande-client-search').fill('personne inconnue'); await p.getByText('Aucune commande ne correspond').waitFor();
  await p.getByRole('button', {name: 'Effacer les filtres', exact: true}).last().click();
  await p.locator('#commande-open-102').click(); await p.getByRole('region', {name: 'Commande #102', exact: true}).waitFor();
  assert.equal(await p.getByRole('button', {name: 'Modifier', exact: true}).count(), 0);
  assert.equal(await p.getByRole('button', {name: 'Supprimer', exact: true}).count(), 0);
  await p.locator('.slide-panel-close').click(); await p.locator('#commandes-filter-toggle').click();
  for (const [width, height] of [[1024, 768], [375, 800], [800, 375]]) {
   await p.setViewportSize({width, height});
   for (const [path, id, name] of [['kits', 103, 'kits'], ['hors-kit', 202, 'hors-kit']]) {
    await p.goto(`${preview}/commandes/${path}`); await p.locator(`#commande-open-${id}`).waitFor(); await noOverflow();
    assert.equal(await p.locator('.commandes-list-panel table').count(), 0);
    await capture(`${name}-${width}`);
    await p.locator(`#commande-open-${id}`).click();
    await p.getByRole(width > 900 ? 'region' : 'dialog', {name: `Commande #${id}`, exact: true}).waitFor();
    await noOverflow(); assert.ok(await p.locator('.slide-panel').evaluate(e => e.scrollWidth <= e.clientWidth));
    await capture(`detail-${name}-${width}`);
    if (width <= 900) assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden');
    await p.locator('.slide-panel-close').focus(); await p.keyboard.press('Escape');
    await p.locator(`#commande-open-${id}:focus`).waitFor();
    assert.equal(await p.evaluate(() => document.body.style.overflow), '');
   }
  }
  await p.setViewportSize({width: 1280, height: 800});
  await p.goto(`${preview}/commandes/hors-kit?commande=201`);
  await p.getByRole('region', {name: 'Commande #201', exact: true}).waitFor();
  assert.equal(await p.locator('#commande-open-201').getAttribute('aria-pressed'), 'true');
  await p.getByText(/^Petite attention/).waitFor();
  await capture('detail-hors-kit-1280');
  assert.deepEqual(errors, []);
  console.log('OK : fiches Kits/Hors kit, sélection clavier et retour de focus, critères par onglet/repli/effacement, historique catalogue, états réglée, lien direct, détails desktop/mobile, noms longs et zéro, absence de débordement 1280/1024/375/800.');
 } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
