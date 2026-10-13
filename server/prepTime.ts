/**
 * Server-side Food Preparation Time & Batch Quantity Calculations
 */

export interface PrepTimeConfig {
  min_prep_time?: number;
  max_prep_time?: number;
  batch_quantity?: number;
}

export interface PrepTimeItemInput extends PrepTimeConfig {
  quantity: number;
}

export function calculateItemPrepTime(
  minPrep: number = 15,
  maxPrep: number = 25,
  batchQty: number = 4,
  quantity: number = 1
) {
  const safeQty = Math.max(1, Math.floor(quantity) || 1);
  const safeBatch = Math.max(1, Math.floor(batchQty) || 4);
  const safeMin = Math.max(1, Math.floor(minPrep) || 15);
  const safeMax = Math.max(safeMin, Math.floor(maxPrep) || safeMin);

  const batches = Math.ceil(safeQty / safeBatch);

  return {
    batches,
    minTime: batches * safeMin,
    maxTime: batches * safeMax,
  };
}

export function calculateOrderPrepTime(items: PrepTimeItemInput[]) {
  if (!items || items.length === 0) {
    return { minTime: 15, maxTime: 25 };
  }

  let highestMin = 0;
  let highestMax = 0;

  for (const item of items) {
    const minPrep = Number(item.min_prep_time) || 15;
    const maxPrep = Number(item.max_prep_time) || Math.max(minPrep, 25);
    const batchQty = Number(item.batch_quantity) || 4;
    const qty = Number(item.quantity) || 1;

    const calculated = calculateItemPrepTime(minPrep, maxPrep, batchQty, qty);

    if (calculated.minTime > highestMin) {
      highestMin = calculated.minTime;
    }
    if (calculated.maxTime > highestMax) {
      highestMax = calculated.maxTime;
    }
  }

  if (highestMin === 0) highestMin = 15;
  if (highestMax === 0) highestMax = Math.max(highestMin, 25);

  return {
    minTime: highestMin,
    maxTime: highestMax,
  };
}
