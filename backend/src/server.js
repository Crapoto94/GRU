require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { setupDb, pool, SCHEMA_NAME } = require("./config/pg_db");
const { authenticateToken, requireRole } = require("./middleware/auth");
const healthRoutes = require("./modules/health/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const usagerRoutes = require("./modules/usagers/usagers.routes");
const attestationRoutes = require("./modules/attestations/attestations.routes");
const usersRoutes = require("./modules/users/users.routes");
const parametrageRoutes = require("./modules/parametrage/parametrage.routes");
const adRoutes = require("./modules/ad/ad.routes");
const logsRoutes = require("./modules/logs/logs.routes");
const dossiersRoutes = require("./modules/dossiers/dossiers.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GRU - Gestion des Relations Usager",
      version: "1.0.0",
      description: "API de gestion des relations usager et generation d'attestations",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/usagers", authenticateToken, usagerRoutes);
app.use("/api/v1/attestations", authenticateToken, attestationRoutes);
app.use("/api/v1/users", authenticateToken, usersRoutes);
app.use("/api/v1/parametrage", authenticateToken, parametrageRoutes);
app.use("/api/v1/ad", authenticateToken, adRoutes);
app.use("/api/v1/logs", authenticateToken, logsRoutes);
app.use("/api/v1/dossiers", authenticateToken, dossiersRoutes);

app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Erreur interne du serveur",
  });
});

async function seedAdmin() {
  const bcrypt = require("bcryptjs");
  const existing = await pool.query(
    `SELECT id FROM "${SCHEMA_NAME}".users WHERE login = 'admin'`
  );
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash("admin", 12);
    await pool.query(
      `INSERT INTO "${SCHEMA_NAME}".users (login, nom, prenom, email, password_hash, role)
       VALUES ('admin', 'Administrateur', 'GRU', 'admin@gru.local', $1, 'administrateur')`,
      [hash]
    );
    console.log("[SEED] Admin cree (login: admin / mdp: admin)");
  }
}

async function start() {
  await setupDb();
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`[GRU] Server running on port ${PORT}`);
    console.log(`[GRU] Swagger docs: http://localhost:${PORT}/api-docs`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
