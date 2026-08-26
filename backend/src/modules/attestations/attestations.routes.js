const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const attestationService = require("./attestations.service");

const router = express.Router();

const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");
const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads/documents");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    cb(null, TEMPLATES_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers .docx sont acceptes"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * @openapi
 * /api/v1/attestations/templates:
 *   get:
 *     tags: [Attestations]
 *     summary: Lister les templates disponibles
 *     responses:
 *       200:
 *         description: Liste des templates
 */
router.get("/templates", async (req, res, next) => {
  try {
    const result = await attestationService.listTemplates(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates/{id}:
 *   get:
 *     tags: [Attestations]
 *     summary: Obtenir un template par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template
 */
router.get("/templates/:id", async (req, res, next) => {
  try {
    const template = await attestationService.getTemplateById(req.params.id);
    res.json(template);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates:
 *   post:
 *     tags: [Attestations]
 *     summary: Creer un template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, fichier_original]
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               fichier_original:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Template cree
 */
router.post("/templates", async (req, res, next) => {
  try {
    const template = await attestationService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates/upload:
 *   post:
 *     tags: [Attestations]
 *     summary: Upload un fichier template Word (.docx)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Fichier uploadé et template cree
 */
router.post("/templates/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw Object.assign(new Error("Fichier requis"), { status: 400 });
    const template = await attestationService.createTemplate({
      nom: req.body.nom || req.file.originalname,
      description: req.body.description || null,
      fichier_original: req.file.filename,
      variables: req.body.variables ? JSON.parse(req.body.variables) : [],
    });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates/{id}:
 *   delete:
 *     tags: [Attestations]
 *     summary: Supprimer un template
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Template supprime
 */
router.delete("/templates/:id", async (req, res, next) => {
  try {
    const attestationRepository = require("./attestations.repository");
    await attestationRepository.removeTemplate(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations:
 *   get:
 *     tags: [Attestations]
 *     summary: Lister les attestations generees
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *       - in: query
 *         name: usager_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des attestations
 */
router.get("/", async (req, res, next) => {
  try {
    const result = await attestationService.listAttestations(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/{id}:
 *   get:
 *     tags: [Attestations]
 *     summary: Obtenir une attestation par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attestation
 */
router.get("/:id", async (req, res, next) => {
  try {
    const attestation = await attestationService.getAttestationById(req.params.id);
    res.json(attestation);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/generate:
 *   post:
 *     tags: [Attestations]
 *     summary: Generer une attestation (fusion template + donnees usager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usager_id, template_id]
 *             properties:
 *               usager_id:
 *                 type: string
 *                 format: uuid
 *               template_id:
 *                 type: string
 *                 format: uuid
 *               custom_data:
 *                 type: object
 *                 description: Variables supplementaires pour le template
 *     responses:
 *       201:
 *         description: Attestation generee
 */
router.post("/generate", async (req, res, next) => {
  try {
    const { usager_id, template_id, custom_data } = req.body;
    if (!usager_id || !template_id) {
      throw Object.assign(new Error("usager_id et template_id sont requis"), { status: 400 });
    }
    const attestation = await attestationService.generate(
      usager_id,
      template_id,
      custom_data,
      req.user?.login || "system",
      req.ip
    );
    res.status(201).json(attestation);
  } catch (err) {
    console.error("[GENERATE ERROR]", err);
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/{id}/download:
 *   get:
 *     tags: [Attestations]
 *     summary: Telecharger le PDF d'une attestation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier PDF
 */
router.get("/:id/download", async (req, res, next) => {
  try {
    const attestation = await attestationService.getAttestationById(req.params.id);
    if (!attestation.fichier_pdf) {
      throw Object.assign(new Error("Aucun fichier associe"), { status: 404 });
    }
    const filePath = path.join(UPLOADS_DIR, attestation.fichier_pdf);
    if (!fs.existsSync(filePath)) {
      throw Object.assign(new Error("Fichier non trouve sur le serveur"), { status: 404 });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attestation.fichier_pdf}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/{id}:
 *   delete:
 *     tags: [Attestations]
 *     summary: Supprimer une attestation
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
    await attestationService.remove(req.params.id, req.user?.login || "system", req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
