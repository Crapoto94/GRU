require("dotenv").config({ path: require("path").resolve(__dirname, "../../../.env") });
const { db, pool } = require("../config/pg_db");

async function seed() {
  const SCHEMA = process.env.SCHEMA_NAME || "gru";

  const usagers = [
    { civilite: "M.", nom: "DUPONT", prenom: "Jean", date_naissance: "1985-03-15", email: "jean.dupont@email.fr", telephone: "0145678901", mobile: "0612345678", Adresse: "10 Rue de Paris", code_postal: "94200", ville: "Ivry-sur-Seine", situation_familiale: "Marie(e)", consentement_rgpd: true },
    { civilite: "Mme", nom: "MARTIN", prenom: "Marie", date_naissance: "1990-07-22", email: "marie.martin@email.fr", telephone: "0145678902", mobile: "0623456789", Adresse: "25 Avenue de la Republique", code_postal: "94200", ville: "Ivry-sur-Seine", situation_familiale: "Celibataire", consentement_rgpd: true },
    { civilite: "M.", nom: "BERNARD", prenom: "Pierre", date_naissance: "1978-11-08", email: "pierre.bernard@email.fr", telephone: "0145678903", mobile: "0634567890", Adresse: "5 Boulevard de la Liberte", code_postal: "94200", ville: "Ivry-sur-Seine", situation_familiale: "Divorce(e)", consentement_rgpd: true },
    { civilite: "Mme", nom: "PETIT", prenom: "Sophie", date_naissance: "1995-01-30", email: "sophie.petit@email.fr", telephone: null, mobile: "0645678901", Adresse: "15 Rue Victor Hugo", code_postal: "94200", ville: "Ivry-sur-Seine", situation_familiale: "Pacs(e)", consentement_rgpd: false },
    { civilite: "M.", nom: "MOREAU", prenom: "Lucas", date_naissance: "2000-06-12", email: null, telephone: null, mobile: "0656789012", Adresse: "3 Place du Marche", code_postal: "94200", ville: "Ivry-sur-Seine", situation_familiale: "Celibataire", consentement_rgpd: true },
  ];

  console.log("Insertion des usagers de test...");
  for (const u of usagers) {
    try {
      await db.run(
        `INSERT INTO "${SCHEMA}".usagers (civilite, nom, prenom, date_naissance, email, telephone, mobile,
          Adresse, code_postal, ville, situation_familiale, consentement_rgpd, date_consentement)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          u.civilite, u.nom, u.prenom, u.date_naissance, u.email, u.telephone, u.mobile,
          u.Adresse, u.code_postal, u.ville, u.situation_familiale, u.consentement_rgpd,
          u.consentement_rgpd ? new Date().toISOString() : null,
        ]
      );
      console.log(`  + ${u.prenom} ${u.nom}`);
    } catch (err) {
      if (err.code === "23505") {
        console.log(`  = ${u.prenom} ${u.nom} (deja existant)`);
      } else {
        console.error(`  ERREUR: ${u.prenom} ${u.nom}`, err.message);
      }
    }
  }

  console.log("Seed termine !");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
