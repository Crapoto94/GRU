const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const attestationService = require("./attestations.service");
const { requireRole } = require("../../middleware/auth");

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
      nb_usagers: parseInt(req.body.nb_usagers, 10) || 1,
      usager_labels: req.body.usager_labels ? JSON.parse(req.body.usager_labels) : null,
      usage_logement_principal: req.body.usage_logement_principal === "true",
      usage_logement_secondaire: req.body.usage_logement_secondaire === "true",
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
router.delete("/templates/:id", requireRole("administrateur"), async (req, res, next) => {
  try {
    const attestationRepository = require("./attestations.repository");
    const existing = await attestationRepository.findTemplateById(req.params.id);
    if (!existing) throw Object.assign(new Error("Template non trouve"), { status: 404 });
    await attestationRepository.updateTemplate(req.params.id, { actif: false });
    const filePath = path.join(TEMPLATES_DIR, existing.fichier_original);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates/{id}/download:
 *   get:
 *     tags: [Attestations]
 *     summary: Telecharger le fichier .docx d'un template
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier Word
 */
router.get("/templates/:id/download", async (req, res, next) => {
  try {
    const attestationRepository = require("./attestations.repository");
    const template = await attestationRepository.findTemplateById(req.params.id);
    if (!template) throw Object.assign(new Error("Template non trouve"), { status: 404 });
    const filePath = path.join(TEMPLATES_DIR, template.fichier_original);
    if (!fs.existsSync(filePath)) {
      throw Object.assign(new Error("Fichier template non trouve sur le serveur"), { status: 404 });
    }
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${template.fichier_original}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/attestations/templates/{id}:
 *   put:
 *     tags: [Attestations]
 *     summary: Modifier un template (nom, description, variables, nb_usagers, fichier)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               nb_usagers:
 *                 type: integer
 *               variables:
 *                 type: string
 *                 description: JSON array of variable names
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Template modifie
 */
router.put("/templates/:id", upload.single("file"), async (req, res, next) => {
  try {
    const attestationRepository = require("./attestations.repository");
    const existing = await attestationRepository.findTemplateById(req.params.id);
    if (!existing) throw Object.assign(new Error("Template non trouve"), { status: 404 });

    const data = {};
    if (req.body.nom !== undefined) data.nom = req.body.nom;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.nb_usagers !== undefined) data.nb_usagers = parseInt(req.body.nb_usagers, 10) || 1;
    if (req.body.usager_labels !== undefined) {
      try { data.usager_labels = JSON.parse(req.body.usager_labels); } catch { /* ignore */ }
    }
    if (req.body.variables !== undefined) {
      try { data.variables = JSON.parse(req.body.variables); } catch { /* ignore */ }
    }
    if (req.body.usage_logement_principal !== undefined) data.usage_logement_principal = req.body.usage_logement_principal === "true";
    if (req.body.usage_logement_secondaire !== undefined) data.usage_logement_secondaire = req.body.usage_logement_secondaire === "true";

    if (req.file) {
      const oldFilePath = path.join(TEMPLATES_DIR, existing.fichier_original);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch { /* ignore */ }
      }
      data.fichier_original = req.file.filename;
    }

    if (Object.keys(data).length === 0) {
      throw Object.assign(new Error("Aucune donnee a modifier"), { status: 400 });
    }

    const template = await attestationRepository.updateTemplate(req.params.id, data);
    res.json(template.rows ? template.rows[0] : template);
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
    const { usager_id, usager2_id, usager3_id, template_id, custom_data, logement_concerne } = req.body;
    if (!usager_id || !template_id) {
      throw Object.assign(new Error("usager_id et template_id sont requis"), { status: 400 });
    }
    const attestation = await attestationService.generate(
      usager_id,
      template_id,
      custom_data,
      req.user?.login || "system",
      req.ip,
      usager2_id,
      usager3_id,
      logement_concerne
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
router.delete("/:id", requireRole("administrateur"), async (req, res, next) => {
  try {
    await attestationService.remove(req.params.id, req.user?.login || "system", req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
