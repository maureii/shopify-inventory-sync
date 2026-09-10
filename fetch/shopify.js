import { client } from "../connections.js";
import path from "node:path";
import fs from "node:fs";

export const GET_PRODUCTS_QUERY = `
  query ($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          compareAtPriceRange {
            maxVariantCompareAtPrice {
              amount
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price
                sku
                inventoryItem {
                  id
                }
              }
            }
          }
          title
          descriptionHtml
          handle
          vendor
          tags
          productType
          totalInventory
          status
          mediaCount { count }
          media(first: 10) {
            edges {
              node {
                ... on MediaImage {
                  id
                }
              }
            }
          }
          model: metafield(namespace: "custom", key: "model") { value }
          promoBadge: metafield(namespace: "custom", key: "promo_badge") { value }
          titleSpec: metafield(namespace: "custom", key: "title_spec") { value }
          homeCreditBacklink: metafield(namespace: "custom", key: "home_credit_backlink") { value }
          productSpecification: metafield(namespace: "custom", key: "product_specification") { value }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function fetchShopifyProducts() {
  const filePath = path.resolve(import.meta.dirname, '../output/shopify_data.jsonl');
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: 'w' });
  let cursor = null, hasNextPage = true, total = 0, batch = 0;

  try {
    console.log('[Fetching] Shopify products...');

    while (hasNextPage) {
      batch++;
      const result = await client.request(GET_PRODUCTS_QUERY, { variables: { first: 250, after: cursor } });
      const { edges = [], pageInfo } = result.data?.products || result.products || {};

      for (const { node } of edges) {
        const variant = node.variants?.edges?.[0]?.node;
        const product = {
          id: node.id,
          variantId: variant?.id ?? null,
          inventoryItemId: variant?.inventoryItem?.id ?? null,
          title: node.title,
          descriptionHtml: node.descriptionHtml ?? null,
          handle: node.handle,
          vendor: node.vendor,
          tags: node.tags,
          productType: node.productType,
          status: node.status,
          sku: variant?.sku ?? null,
          model: node.model?.value ?? null,
          price: variant?.price ?? null,
          mediaCount: node.mediaCount?.count ?? 0,
          mediaIds: node.media?.edges?.map(e => e.node?.id).filter(Boolean) ?? [],
          promoBadge: node.promoBadge?.value ?? null,
          titleSpec: node.titleSpec?.value ?? null,
          totalInventory: node.totalInventory,
          compareAtPrice: node.compareAtPriceRange?.maxVariantCompareAtPrice?.amount ?? null,
          homeCreditBacklink: node.homeCreditBacklink?.value ?? null,
          productSpecification: node.productSpecification?.value ?? null,
        };
        stream.write(JSON.stringify(product) + '\n');
      }

      total += edges.length;
      hasNextPage = pageInfo?.hasNextPage ?? false;
      cursor = pageInfo?.endCursor ?? null;

      console.log(`[BATCH ${batch}] +${edges.length} | Total: ${total}`);
    }

    console.log(`[SUCCESS] ${total} products in ${batch} batches`);
  } catch (error) {
    console.error(`[ERROR] Batch ${batch}:`, error.message);
    throw error;
  } finally {
    stream.end();
  }
}

fetchShopifyProducts().catch(console.error);
