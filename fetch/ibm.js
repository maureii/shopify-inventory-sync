import fs from "node:fs";
import path from "node:path";
import { getIBMPool } from "../connections.js";
import { STORES } from "../stores.js";

function getShopifySkus(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const skus = fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line).sku)
    .filter(Boolean);

  return [...new Set(skus)];
}

function buildInventoryQuery(skuChunk) {
  const storeValues = Object.entries(STORES)
    .map(([storeId, store]) => `CAST('${storeId}' AS VARCHAR(10)), CAST('${store.locationId}' AS VARCHAR(100))`)
    .map((val) => `(${val})`)
    .join(", ");

  const placeholders = skuChunk.map(() => "?").join(", ");

  const sql = `
    WITH STORE_MAPPING (StoreID, LocationID) AS (
      SELECT * FROM (VALUES ${storeValues}) AS T(StoreID, LocationID)
    )
    SELECT
      LTRIM(RTRIM(INUMBR)) AS ITEMCODE,
      SM.LocationID AS LOCATIONID,
      SUM(IBHAND) AS QUANTITY
    FROM MM800LIB.INVBAL
    INNER JOIN STORE_MAPPING SM ON LTRIM(RTRIM(ISTORE)) = LTRIM(RTRIM(SM.StoreID))
    WHERE LTRIM(RTRIM(INUMBR)) IN (${placeholders})
       OR LTRIM(LTRIM(RTRIM(INUMBR)), '0') IN (${placeholders})
    GROUP BY LTRIM(RTRIM(INUMBR)), SM.LocationID
  `;

  return { sql, params: [...skuChunk, ...skuChunk] };
}

async function fetchIBMInventory() {
  const inputPath = path.resolve(import.meta.dirname, "../output/shopify_data.jsonl");
  const outputPath = path.resolve(import.meta.dirname, "../output/ibm-inventory.jsonl");

  console.log("Reading input SKUs...");
  const skus = getShopifySkus(inputPath);

  if (skus.length === 0) {
    console.log("No SKUs found. Exiting.");
    return;
  }

  const uniqueLocationIds = [...new Set(Object.values(STORES).map((s) => s.locationId))];

  const aggregatedResults = new Map();
  for (const sku of skus) {
    for (const locationId of uniqueLocationIds) {
      const key = `${sku}:${locationId}`;
      aggregatedResults.set(key, { itemCode: sku, locationId, quantity: 0 });
    }
  }

  console.log(`Querying IBM database for ${skus.length} unique SKUs...`);
  const pool = await getIBMPool();
  const CHUNK_SIZE = 100;

  for (let i = 0; i < skus.length; i += CHUNK_SIZE) {
    const chunk = skus.slice(i, i + CHUNK_SIZE);
    const { sql, params } = buildInventoryQuery(chunk);

    try {
      const rows = await pool.query(sql, params);

      for (const row of rows) {
        // Strip zero padding from DB2 item code to match Shopify SKU
        const rawItemCode = String(row.ITEMCODE || row.ItemCode || "").trim();
        const itemCode = rawItemCode.replace(/^0+/, "");
        const locationId = String(row.LOCATIONID || row.LocationID || "").trim();
        const quantity = Number(row.QUANTITY || row.Quantity) || 0;

        const key = `${itemCode}:${locationId}`;

        if (aggregatedResults.has(key)) {
          aggregatedResults.get(key).quantity += quantity;
        }
      }
    } catch (err) {
      console.error(`Error querying chunk starting at index ${i}:`, err.message);
    }
  }

  console.log(`Writing ${aggregatedResults.size} inventory records...`);
  const outputLines = Array.from(aggregatedResults.values()).map((record) =>
    JSON.stringify(record)
  );

  fs.writeFileSync(outputPath, outputLines.join("\n"));
  console.log(`Saved output to ${outputPath}`);
}

fetchIBMInventory().catch((err) => {
  console.error("Execution failed:", err);
});
