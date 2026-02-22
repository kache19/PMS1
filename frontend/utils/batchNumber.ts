let batchCounter = Date.now() % 100000;

export function generateBatchNumber(): string {
  batchCounter = (batchCounter + 1) % 100000;
  return `BATCH-${String(batchCounter).padStart(5, '0')}`;
}

