const express = require("express");
const router = express.Router();
const authService = require("./auth.service");

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion locale
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password]
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT
 *       401:
 *         description: Identifiants invalides
 */
router.post("/login", async (req, res, next) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      throw Object.assign(new Error("Login et mot de passe requis"), { status: 400 });
    }
    const result = await authService.login(login, password, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/auth/login-ad:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion via Active Directory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password]
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token JWT
 *       401:
 *         description: Identifiants AD invalides
 */
router.post("/login-ad", async (req, res, next) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      throw Object.assign(new Error("Login et mot de passe requis"), { status: 400 });
    }
    const result = await authService.loginAD(login, password, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Profil utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil
 */
router.get("/me", async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
