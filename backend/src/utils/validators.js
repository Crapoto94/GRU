const axios = require("axios");

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

function validateEmail(email) {
  if (!email) return { valid: true };
  return { valid: EMAIL_REGEX.test(email), message: "Adresse email invalide" };
}

function validatePhone(phone) {
  if (!phone) return { valid: true };
  const cleaned = phone.replace(/[\s.-]/g, "");
  return { valid: PHONE_REGEX.test(cleaned), message: "Numero de telephone invalide" };
}

async function validateAdresse(adresse) {
  if (!adresse) return { valid: true, suggestions: [] };
  try {
    const response = await axios.get("https://api-adresse.data.gouv.fr/search/", {
      params: { q: adresse, limit: 5 },
      timeout: 5000,
    });
    const features = response.data.features || [];
    if (features.length === 0) {
      return { valid: false, suggestions: [], message: "Adresse non reconnue" };
    }
    const suggestions = features.map((f) => ({
      label: f.properties.label,
      score: f.properties.score,
      city: f.properties.city,
      postcode: f.properties.postcode,
      street: f.properties.name,
      numero: f.properties.housenumber || "",
      context: f.properties.context,
    }));
    return { valid: true, suggestions };
  } catch {
    return { valid: true, suggestions: [], message: "Service de validation indisponible" };
  }
}

function validateUsager(data) {
  const errors = [];
  if (!data.nom || data.nom.trim().length < 2) errors.push("Le nom est requis (min 2 caracteres)");
  if (!data.prenom || data.prenom.trim().length < 2) errors.push("Le prenom est requis (min 2 caracteres)");
  if (!data.date_naissance) errors.push("La date de naissance est requise");
  const emailCheck = validateEmail(data.email);
  if (!emailCheck.valid) errors.push(emailCheck.message);
  const phoneCheck = validatePhone(data.telephone);
  if (!phoneCheck.valid) errors.push(phoneCheck.message);
  const mobileCheck = validatePhone(data.mobile);
  if (!mobileCheck.valid) errors.push(mobileCheck.message);
  return { valid: errors.length === 0, errors };
}

module.exports = { validateEmail, validatePhone, validateAdresse, validateUsager, EMAIL_REGEX, PHONE_REGEX };
