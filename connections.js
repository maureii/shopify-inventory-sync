import {createAdminApiClient} from '@shopify/admin-api-client';
import sql from "mssql";
import odbc from "odbc";

export async function connectSql(config) {
  const pool = new sql.ConnectionPool({
    database: config.store,
    server: config.host,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    port: Number(process.env.DB_PORT),
    connectionTimeout: 60_000,
    requestTimeout: 300_000,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  await pool.connect();
  return pool;
}

let ibmPool = null;

export async function getIBMPool() {
  if (ibmPool) return ibmPool;

  const connectionString = `DRIVER={iSeries Access ODBC Driver};SYSTEM=${process.env.IBM_HOST};UID=${process.env.IBM_UID};PWD=${process.env.IBM_PWD}`;

  try {
    ibmPool = await odbc.pool({
      connectionString,
      initialSize: 1,
      maxSize: 10,
      connectionTimeout: 30,
    });
  } catch (error) {
    console.error("IBM connection failed:", error);
    throw error;
  }

  return ibmPool;
}

export const client = createAdminApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
  apiVersion: process.env.SHOPIFY_API_VERSION,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
});
