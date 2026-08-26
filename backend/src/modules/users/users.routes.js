const express = require("express");
const router = express.Router();
const usersService = require("./users.service");

/**
 * @openapi
 * /api/v1/users/create-from-ad:
 *   post:
 *     tags: [Users]
 *     summary: Creer un compte a partir de l'AD
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, nom, prenom, email]
 *             properties:
 *               login:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [utilisateur, administrateur]
 *     responses:
 *       201:
 *         description: Utilisateur cree depuis l'AD
 */
router.post("/create-from-ad", async (req, res, next) => {
  try {
    const user = await usersService.createFromAD(req.body, req.user?.sub, req.ip);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Lister les utilisateurs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 */
router.get("/", async (req, res, next) => {
  try {
    const result = await usersService.list(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtenir un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur
 */
router.get("/:id", async (req, res, next) => {
  try {
    const user = await usersService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     tags: [Users]
 *     summary: Creer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, nom, prenom, email, password]
 *             properties:
 *               login:
 *                 type: string
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [utilisateur, administrateur]
 *     responses:
 *       201:
 *         description: Utilisateur cree
 */
router.post("/", async (req, res, next) => {
  try {
    const user = await usersService.create(req.body, req.user?.sub, req.ip);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Modifier un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur modifie
 */
router.put("/:id", async (req, res, next) => {
  try {
    const user = await usersService.update(req.params.id, req.body, req.user?.sub, req.ip);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Supprimer un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Supprime
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await usersService.remove(req.params.id, req.user?.sub, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
