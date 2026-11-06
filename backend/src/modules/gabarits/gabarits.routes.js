const express = require("express");
const fs = require("fs");
const multer = require("multer");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { requireRole } = require("../../middleware/auth");
const { logAcces } = require("../../utils/logger");
const { GABARITS, VARIABLES, CUSTOM_DIR, customPath, resolveGabaritPath } = require("../../utils/gabarits");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function checkKey(key) {
  if (!GABARITS[key]) throw Object.assign(new Error("Gabarit inconnu"), { status: 404 });
}

/**
 * @openapi
 * /api/v1/gabarits:
 *   get:
 *     tags: [Gabarits]
 *     summary: Gabarits Word des courriers (CNI/Passeport) et variables disponibles
 *     responses:
 *       200:
 *         description: Liste
 */
router.get("/", (_req, res) => {
  const gabarits = Object.entries(GABARITS).map(([cle, g]) => {
    const custom = fs.existsSync(customPath(cle));
    return {
      cle,
      label: g.label,
      description: g.description,
      statut: g.statut,
      personnalise: custom,
      modifie_le: custom ? fs.statSync(customPath(cle)).mtime : null,
    };
  });
  res.json({ gabarits, variables: VARIABLES });
});

/**
 * @openapi
 * /api/v1/gabarits/{cle}/download:
 *   get:
 *     tags: [Gabarits]
 *     summary: Telecharger le gabarit en vigueur (personnalise, sinon par defaut)
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier .docx
 */
router.get("/:cle/download", (req, res, next) => {
  try {
    checkKey(req.params.cle);
    res.setHeader("Content-Type", DOCX);
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.cle}.docx"`);
    res.send(fs.readFileSync(resolveGabaritPath(req.params.cle)));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/gabarits/{cle}:
 *   put:
 *     tags: [Gabarits]
 *     summary: Remplacer un gabarit (fichier .docx, champ "file")
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gabarit remplace
 *       400:
 *         description: Fichier invalide
 */
router.put("/:cle", requireRole("administrateur"), upload.single("file"), async (req, res, next) => {
  try {
    checkKey(req.params.cle);
    if (!req.file) throw Object.assign(new Error("Fichier .docx requis"), { status: 400 });
    if (!/\.docx$/i.test(req.file.originalname)) {
      throw Object.assign(new Error("Seuls les fichiers .docx sont acceptes"), { status: 400 });
    }
    // Rend le gabarit avec des valeurs vides pour refuser un fichier dont les {{variables}} sont mal formees.
    try {
      const doc = new Docxtemplater(new PizZip(req.file.buffer), {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
        nullGetter: () => "",
      });
      doc.render({});
    } catch (e) {
      const detail = e.properties?.errors?.map((x) => x.properties?.explanation || x.message).join(" ; ") || e.message;
      throw Object.assign(new Error(`Gabarit invalide : ${detail}`), { status: 400 });
    }
    fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    fs.writeFileSync(customPath(req.params.cle), req.file.buffer);
    await logAcces(req.user?.login || "system", "UPDATE_GABARIT", "gabarits", req.params.cle, {}, req.ip);
    res.json({ cle: req.params.cle, personnalise: true });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/gabarits/{cle}:
 *   delete:
 *     tags: [Gabarits]
 *     summary: Revenir au gabarit par defaut
 *     parameters:
 *       - in: path
 *         name: cle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Gabarit par defaut retabli
 */
router.delete("/:cle", requireRole("administrateur"), async (req, res, next) => {
  try {
    checkKey(req.params.cle);
    if (fs.existsSync(customPath(req.params.cle))) fs.unlinkSync(customPath(req.params.cle));
    await logAcces(req.user?.login || "system", "RESET_GABARIT", "gabarits", req.params.cle, {}, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
