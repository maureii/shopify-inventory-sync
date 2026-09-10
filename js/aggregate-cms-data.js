import fs from "node:fs/promises";
import path from "node:path";
import { STORES } from "../stores.js";

async function processAndAggregate() {
  const inputPath = path.resolve(import.meta.dirname, "../output/cms_data.json");
  const outputPath = path.resolve(import.meta.dirname, "../output/aggregated_cms_data.jsonl");

  console.log(`[READING] Loading raw data from: ${inputPath}`);

  let rawStoreData;
  try {
    const fileContent = await fs.readFile(inputPath, "utf-8");
    rawStoreData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`[ERROR] Could not read or parse ${inputPath}: ${error.message}`);
    return;
  }

  if (!Array.isArray(rawStoreData) || rawStoreData.length === 0) {
    console.error("[ERROR] Input file contains no array records.");
    return;
  }

  const aggregationMap = new Map();

  for (const store of rawStoreData) {
    const storeConfig = STORES[store.storeCode];
    if (!storeConfig) {
      console.warn(`[WARN] Skipping unknown storeCode: ${store.storeCode}`);
      continue;
    }

    const locationId = storeConfig.locationId;

    // Aggregate Sold Items
    for (const item of store.sold_items || []) {
      const key = `${locationId}:${item.ItemCode}`;
      const entry = aggregationMap.get(key) || {
        locationId,
        itemCode: item.ItemCode,
        soldQuantity: 0,
        reversalQuantity: 0,
      };

      entry.soldQuantity += Number(item.SoldCount) || 0;
      aggregationMap.set(key, entry);
    }

    // Aggregate Reversals
    for (const item of store.reversals || []) {
      const key = `${locationId}:${item.ItemCode}`;
      const entry = aggregationMap.get(key) || {
        locationId,
        itemCode: item.ItemCode,
        soldQuantity: 0,
        reversalQuantity: 0,
      };

      entry.reversalQuantity += Number(item.ReversalCount || item.SoldCount) || 0;
      aggregationMap.set(key, entry);
    }
  }

  if (aggregationMap.size === 0) {
    console.warn("[WARN] Aggregation complete, but no sold_items or reversals were found.");
    return;
  }

  const jsonlLines = Array.from(aggregationMap.values()).map((row) =>
    JSON.stringify(row)
  );

  await fs.writeFile(outputPath, jsonlLines.join("\n"), "utf-8");

  console.log(`[SUCCESS] Wrote ${aggregationMap.size} flat JSONL rows to: ${outputPath}`);
}

processAndAggregate().catch(console.error);
