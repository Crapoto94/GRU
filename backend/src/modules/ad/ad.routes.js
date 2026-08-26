const express = require("express");
const router = express.Router();
const adService = require("./ad.service");

/**
 * @openapi
 * /api/v1/ad/search:
 *   get:
 *     tags: [AD]
 *     summary: Rechercher un utilisateur dans l'Active Directory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche (samAccountName, nom, prenom, mail)
 *     responses:
 *       200:
 *         description: Resultats de recherche
 */
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      throw Object.assign(new Error("Minimum 2 caracteres pour la recherche"), { status: 400 });
    }
    const results = await adService.search(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/ad/user:
 *   get:
 *     tags: [AD]
 *     summary: Recuperer les details complets d'un utilisateur AD
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant AD (sAMAccountName, mail ou userPrincipalName)
 *     responses:
 *       200:
 *         description: Details de l'utilisateur AD
 */
router.get("/user", async (req, res, next) => {
  try {
    const { identifier } = req.query;
    if (!identifier) {
      throw Object.assign(new Error("Identifiant requis"), { status: 400 });
    }
    const result = await adService.getUser(identifier);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/ad/authenticate:
 *   post:
 *     tags: [AD]
 *     summary: Authentifier un utilisateur via l'AD
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentification reussie
 */
router.post("/authenticate", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw Object.assign(new Error("Login et mot de passe requis"), { status: 400 });
    }
    const result = await adService.authenticate(username, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
