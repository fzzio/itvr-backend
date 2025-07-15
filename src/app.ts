import express from "express";
import cors from "cors";

import mainRouter from "./mainRouter";
import { initializeDatabase } from "./config/database";
import { env } from "./config/env";

const app = express();

// --- Global middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Mount all routes under the base path (/api by default) ---
app.use(env.apiPath, mainRouter);

// Error general
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const startServer = async () => {
  const PORT = parseInt(env.port, 10) || 3010;
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
