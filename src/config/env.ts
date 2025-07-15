import dotenv from "dotenv";
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || "3010",
  basePath: process.env.BASE_PATH || "/",
  apiPath: process.env.API_PREFIX || "/api",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "interviewer",
  },
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
