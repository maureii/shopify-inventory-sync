import { client } from '../connections.js';
import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

const __dirname = import.meta.dirname;

const MUTATIONS = {
  STAGED_UPLOADS_CREATE: `
    mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url parameters { name value } }
      }
    }
  `,
  BULK_OPERATION_RUN: `
    mutation BulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `,
  // Modern inventory mutation structure for latest Admin API versions
  INVENTORY_SET_QUANTITIES: `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup { reason }
        userErrors { field message }
      }
    }
  `
};

const QUERIES = {
  BULK_OPERATION_STATUS: `
    query BulkOperationStatus($id: ID!) {
      node(id: $id) {
        ... on BulkOperation {
          status
          errorCode
          objectCount
          url
          createdAt
          completedAt
        }
      }
    }
  `
};

async function getStagedUploadTarget(fileName) {
  const response = await client.request(MUTATIONS.STAGED_UPLOADS_CREATE, {
    variables: {
      input: [{
        resource: 'BULK_MUTATION_VARIABLES',
        filename: fileName,
        mimeType: 'text/jsonl',
        httpMethod: 'POST'
      }]
    }
  });

  const unwrapped = response.data || response;
  const target = unwrapped.stagedUploadsCreate?.stagedTargets?.[0];

  if (!target) {
    throw new Error(`Failed to create upload target for ${fileName}: ${JSON.stringify(unwrapped)}`);
  }

  return target;
}

async function uploadFileToTarget(filePath, fileName, target) {
  const formData = new FormData();
  target.parameters.forEach(({ name, value }) => formData.append(name, value));
  formData.append('file', new Blob([fs.readFileSync(filePath)], { type: 'text/jsonl' }), fileName);

  const response = await fetch(target.url, { method: 'POST', body: formData });
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
  }
}

async function downloadResults(url, fileName) {
  try {
    console.log(`📥 Downloading results from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download results: HTTP ${response.status}`);
    }
    
    const resultsContent = await response.text();
    const resultsPath = path.resolve(__dirname, '../output', `results_${fileName.replace('.jsonl', '')}.jsonl`);
    await fsPromises.writeFile(resultsPath, resultsContent, 'utf-8');
    console.log(`✅ Results saved to: ${resultsPath}`);
    return resultsPath;
  } catch (error) {
    console.error(`⚠️ Failed to download results: ${error.message}`);
    return null;
  }
}

async function pollBulkOperation(operationId, fileName) {
  while (true) {
    const response = await client.request(QUERIES.BULK_OPERATION_STATUS, { variables: { id: operationId } });
    const node = (response.data || response).node;

    if (!node) {
      console.warn('\n⚠ Received empty status node from Shopify.');
    } else {
      process.stdout.write(`\rProgress: ${node.status} | Objects: ${node.objectCount || 0}`);

      if (node.status === 'COMPLETED') {
        console.log(`\n✔ Completed: ${fileName}`);
        console.log(`📊 Results:`);
        console.log(`   - Status: ${node.status}`);
        console.log(`   - Objects processed: ${node.objectCount || 0}`);
        console.log(`   - Error code: ${node.errorCode || 'None'}`);
        console.log(`   - Created at: ${node.createdAt}`);
        console.log(`   - Completed at: ${node.completedAt}`);
        
        if (node.url) {
          await downloadResults(node.url, fileName);
        }
        
        if (node.errorCode) {
          console.log(`\n⚠️ Operation completed with errors. Check the results file for details.`);
        }
        
        console.log();
        return;
      }

      if (node.status === 'FAILED' || node.status === 'CANCELED') {
        throw new Error(`Bulk job ${operationId} failed with status: ${node.status}, errorCode: ${node.errorCode || 'UNKNOWN'}`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

export async function executeBulk(fileName, mutationString) {
  console.log(`🚀 Executing bulk job: ${fileName}`);

  const filePath = path.resolve(__dirname, '../output', fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // 1. Stage upload & send file
  const target = await getStagedUploadTarget(fileName);
  await uploadFileToTarget(filePath, fileName, target);

  const stagedUploadPath = target.parameters.find(p => p.name === 'key')?.value;
  if (!stagedUploadPath) {
    throw new Error('Missing "key" parameter in staged upload payload.');
  }

  // 2. Trigger bulk execution
  const runResponse = await client.request(MUTATIONS.BULK_OPERATION_RUN, {
    variables: {
      mutation: mutationString.replace(/\s+/g, ' ').trim(),
      stagedUploadPath
    }
  });

  const unwrappedRun = runResponse.data || runResponse;
  const bulkOpResult = unwrappedRun.bulkOperationRunMutation;
  const op = bulkOpResult?.bulkOperation;

  if (!op || bulkOpResult?.userErrors?.length > 0) {
    const errors = bulkOpResult?.userErrors || unwrappedRun;
    throw new Error(`Bulk execution failed to start: ${JSON.stringify(errors, null, 2)}`);
  }

  console.log(`Job Started [ID: ${op.id}]`);

  // 3. Monitor execution
  await pollBulkOperation(op.id, fileName);
}

async function run() {
  try {
    await executeBulk('shopify_inventory_set_input.jsonl', MUTATIONS.INVENTORY_SET_QUANTITIES);
    console.log('🎉 Processing complete.');
  } catch (err) {
    console.error('\n💥 Critical Error:', err.message);
    process.exit(1);
  }
}

run();
