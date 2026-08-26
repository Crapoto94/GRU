const axios = require("axios");
const { getAxiosConfig } = require("./ad.config");

module.exports = {
  async search(query) {
    const config = await getAxiosConfig();
    const response = await axios.get("/api/v1/ad/search", {
      ...config,
      params: { q: query },
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      throw Object.assign(
        new Error(response.data?.error || `Erreur AD (${response.status})`),
        { status: response.status }
      );
    }
    return response.data;
  },

  async getUser(identifier) {
    const config = await getAxiosConfig();
    const response = await axios.get("/api/v1/ad/user", {
      ...config,
      params: { identifier },
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      throw Object.assign(
        new Error(response.data?.error || `Utilisateur AD non trouve (${response.status})`),
        { status: response.status }
      );
    }
    return response.data;
  },

  async authenticate(username, password) {
    const config = await getAxiosConfig();
    const response = await axios.post("/api/v1/ad/authenticate", { username, password }, {
      ...config,
      validateStatus: () => true,
    });
    if (response.status !== 200) {
      throw Object.assign(
        new Error(response.data?.error || `Authentification echouee (${response.status})`),
        { status: response.status }
      );
    }
    return response.data;
  },
};
