const express = require("express");
const router = express.Router();
const { db, SCHEMA_NAME } = require("../../config/pg_db");

const USAGERS = `"${SCHEMA_NAME}".usagers`;
const PIECES = `"${SCHEMA_NAME}".dossier_pieces`;
const ATTESTATIONS = `"${SCHEMA_NAME}".attestations`;
const TEMPLATES = `"${SCHEMA_NAME}".templates`;

/**
 * @openapi
 * /api/v1/stats/dashboard:
 *   get:
 *     tags: [Stats]
 *     summary: Indicateurs du tableau de bord (usagers, pieces CNI/Passeport, attestations, delais)
 *     responses:
 *       200:
 *         description: Compteurs
 */
router.get("/dashboard", async (_req, res, next) => {
  try {
    const [usagers, pieces, attestations, delais] = await Promise.all([
      db.get(
        `SELECT
           COUNT(*)::int AS actifs,
           COUNT(*) FILTER (WHERE ville ILIKE 'ivry%')::int AS ivry,
           COUNT(*) FILTER (WHERE ville IS NULL OR ville NOT ILIKE 'ivry%')::int AS hors_ivry,
           COUNT(*) FILTER (WHERE date_naissance <= CURRENT_DATE - INTERVAL '18 years')::int AS majeurs,
           COUNT(*) FILTER (WHERE date_naissance > CURRENT_DATE - INTERVAL '18 years')::int AS mineurs
         FROM ${USAGERS} WHERE archived IS NOT TRUE`
      ),
      db.get(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE statut = 'demande')::int AS en_cours,
           COUNT(*) FILTER (WHERE statut = 'ajourne')::int AS ajourne,
           COUNT(*) FILTER (WHERE statut = 'arrive')::int AS arrive,
           COUNT(*) FILTER (WHERE statut IN ('recupere','refuse'))::int AS archive
         FROM ${PIECES}`
      ),
      db.get(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE a.statut_suivi = 'en_cours')::int AS en_cours,
           COUNT(*) FILTER (WHERE a.statut_suivi = 'ajourne')::int AS ajourne,
           COUNT(*) FILTER (WHERE a.statut_suivi = 'arrive')::int AS arrive,
           COUNT(*) FILTER (WHERE a.statut_suivi IN ('recupere','archive'))::int AS archive
         FROM ${ATTESTATIONS} a JOIN ${TEMPLATES} t ON t.id = a.template_id
         WHERE a.statut <> 'import_alto'
           AND NOT (t.nom ILIKE '%certificat%' OR t.nom ILIKE '%concubinage%')`
      ),
      db.get(
        `SELECT
           ROUND(AVG(date_arrivee::date - date_demande) FILTER (WHERE date_arrivee >= NOW() - INTERVAL '7 days'), 1)::float AS semaine,
           ROUND(AVG(date_arrivee::date - date_demande) FILTER (WHERE date_arrivee >= NOW() - INTERVAL '30 days'), 1)::float AS mois
         FROM ${PIECES} WHERE date_arrivee IS NOT NULL`
      ),
    ]);
    res.json({ usagers, pieces, attestations, delais });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
