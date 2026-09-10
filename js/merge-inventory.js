import fs from "node:fs/promises";
import readline from "node:readline";
import path from "node:path";
import { createReadStream } from "node:fs";

async function mergeInventory() {
  const cmsPath = path.resolve(import.meta.dirname, "../output/aggregated_cms_data.jsonl");
  const ibmPath = path.resolve(import.meta.dirname, "../output/ibm-inventory.jsonl");
  const shopifyPath = path.resolve(import.meta.dirname, "../output/shopify_data.jsonl");
  const outputPath = path.resolve(import.meta.dirname, "../output/final_inventory.jsonl");

  // Step 1: Map SKU to inventoryItemId from Shopify data
  const shopifyItemMap = new Map();
  const shopifyStream = readline.createInterface({ input: createReadStream(shopifyPath) });

  for await (const line of shopifyStream) {
    if (!line.trim()) continue;
    try {
      const product = JSON.parse(line);
      if (product.sku && product.inventoryItemId) {
        shopifyItemMap.set(String(product.sku), product.inventoryItemId);
      }
    } catch {
      // Ignore malformed JSON lines
    }
  }

  // Step 2: Aggregate sales and reversals from CMS
  const netSalesMap = new Map();
  const cmsStream = readline.createInterface({ input: createReadStream(cmsPath) });

  for await (const line of cmsStream) {
    if (!line.trim()) continue;
    const { locationId, itemCode, soldQuantity, reversalQuantity } = JSON.parse(line);
    const key = `${locationId}:${itemCode}`;

    const sold = Number(soldQuantity) || 0;
    const reversal = Number(reversalQuantity) || 0;
    const netAdjustment = sold - reversal;

    const currentTotal = netSalesMap.get(key) || 0;
    netSalesMap.set(key, currentTotal + netAdjustment);
  }

  // Step 3: Compute final inventory and attach inventoryItemId
  const ibmContent = await fs.readFile(ibmPath, "utf-8");
  const ibmLines = ibmContent.split("\n").filter(line => line.trim());
  const outputHandle = await fs.open(outputPath, "w");

  try {
    for (const line of ibmLines) {
      const record = JSON.parse(line);

      const key = `${record.locationId}:${record.itemCode}`;
      const currentQty = Number(record.quantity || 0);
      const netSales = netSalesMap.get(key) || 0;

      const updatedRecord = {
        inventoryItemId: shopifyItemMap.get(String(record.itemCode)) || null,
        itemCode: record.itemCode,
        locationId: record.locationId,
        quantity: currentQty - netSales
      };

      await outputHandle.appendFile(JSON.stringify(updatedRecord) + "\n", "utf-8");
    }
  } finally {
    await outputHandle.close();
  }

  console.log(`Inventory merged successfully: ${outputPath}`);
}

mergeInventory().catch(console.error);
