import fs from "node:fs/promises";
import readline from "node:readline";
import path from "node:path";
import { createReadStream } from "node:fs";

async function formatShopifyInventory() {
  const inputPath = path.resolve(import.meta.dirname, "../output/final_inventory.jsonl");
  const outputPath = path.resolve(import.meta.dirname, "../output/shopify_inventory_set_input.jsonl");

  const inputStream = readline.createInterface({ input: createReadStream(inputPath) });
  const outputHandle = await fs.open(outputPath, "w");

  try {
    for await (const line of inputStream) {
      if (!line.trim()) continue;

      const record = JSON.parse(line);

      // Skip records without a valid inventoryItemId
      if (!record.inventoryItemId) continue;

      const shopifyPayload = {
        input: {
          name: "available",
          reason: "correction",
          ignoreCompareQuantity: true,
          quantities: [
            {
              inventoryItemId: record.inventoryItemId,
              locationId: record.locationId,
              quantity: record.quantity
            }
          ]
        }
      };

      await outputHandle.appendFile(JSON.stringify(shopifyPayload) + "\n", "utf-8");
    }
  } finally {
    await outputHandle.close();
  }

  console.log(`Shopify inventory payload generated: ${outputPath}`);
}

formatShopifyInventory().catch(console.error);
