import axios from "axios";
import config from "../config/config.js";

const MAX_ATTEMPTS = 3;
const RETRY_STATUSES = [429, 500, 503];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const promptGemini = async (promptMessage) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await axios.post(
        config.gemini.url,
        {
          contents: [
            {
              parts: [
                {
                  text: promptMessage,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "x-goog-api-key": config.gemini.apiKey,
          },
          timeout: 20000,
        }
      );

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      const status = error.response?.status;
      if (attempt >= MAX_ATTEMPTS || !RETRY_STATUSES.includes(status)) throw error;
      await wait(1000 * attempt);
    }
  }
};

export default promptGemini;
