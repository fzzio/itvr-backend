import { DataSource } from "typeorm";
import { env } from "./env";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  synchronize: false,
  logging: env.nodeEnv === "development",
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: ["src/subscribers/**/*.ts"],
  poolSize: 10,
  extra: {
    connectTimeout: 60000,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    charset: "utf8mb4",
  },
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
  } catch (error) {
    console.error("Error during Data Source initialization", error);
    throw error;
  }
};
