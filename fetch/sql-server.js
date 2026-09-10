import { GET_SOLD_ITEMS } from "../sql/sold-items.js";
import { GET_REVERSALS } from "../sql/reversals.js";
import { connectSql } from "../connections.js";
import { STORES } from "../stores.js";
import fs from "node:fs/promises";
import path from "node:path";

async function fetchStoreData([storeId, config]) {
  let pool;
  try {
    pool = await connectSql({ host: config.host, store: storeId });

    const [soldItems, reversals] = await Promise.all([
      pool.request().query(GET_SOLD_ITEMS),
      pool.request().query(GET_REVERSALS)
    ]);

    console.log(`[CONNECTED] ${storeId} | ${config.name}`);
    console.log(`[SOLD]: ${soldItems.recordset.length}, [REVERSALS]: ${reversals.recordset.length}`);

    return {
      storeCode: storeId,
      storeName: config.name,
      sold_items: soldItems.recordset,
      reversals: reversals.recordset
    };
  } catch (error) {
    console.error(`[FAILED] ${storeId} | ${config.name}: ${error.message}`);
    return null;
  } finally {
    await pool?.close();
  }
}

async function fetchAllStoreData() {
  const stores = Object.entries(STORES);
  const results = await Promise.allSettled(stores.map(fetchStoreData));

  const data = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  console.log(`Fetched ${data.length}/${stores.length} stores`);

  const outputDir = path.resolve(import.meta.dirname, '../output');
  const filePath = path.join(outputDir, 'cms_data.json');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));

  console.log(`Saved to ${filePath}`);
}

fetchAllStoreData().catch(console.error);
