/**
 * Food Preparation Time, Batch Quantity & Live Timer Utilities
 * 
 * Rules:
 * 1. Batch Quantity: Number of units prepared in one normal preparation cycle.
 * 2. Item batches = Math.ceil(quantity / batchQuantity)
 *    Item min prep = batches * min_prep_time
 *    Item max prep = batches * max_prep_time
 * 3. Simultaneous Kitchen Preparation:
 *    When an order contains different items, we do NOT add the times together.
 *    Instead, we take the MAXIMUM requirement across all items because different foods
 *    are prepared simultaneously.
 *    orderMin = Math.max(...itemMins)
 *    orderMax = Math.max(...itemMaxs)
 * 4. Live Timer:
 *    Calculates remaining time based on actual elapsed time since order was created.
 *    Never displays negative values. When max estimate elapsed: "Estimated ready time reached".
 */

export interface PrepTimeConfig {
  min_prep_time?: number;
  max_prep_time?: number;
  batch_quantity?: number;
}

export interface PrepTimeItemInput extends PrepTimeConfig {
  quantity: number;
}

export interface CalculatedItemPrepTime {
  batches: number;
  minTime: number;
  maxTime: number;
  formattedRange: string;
}

export interface CalculatedOrderPrepTime {
  minTime: number;
  maxTime: number;
  formattedRange: string;
}

export interface LiveRemainingPrepTime {
  elapsedSeconds: number;
  elapsedMinutes: number;
  remainingMin: number;
  remainingMax: number;
  remainingSecondsMin: number;
  remainingSecondsMax: number;
  isReadyTimeReached: boolean;
  isMinTimeReached: boolean;
  displayText: string;
  displayTextWithSeconds: string;
  formattedElapsed: string;
  statusText: string;
}

/**
 * Calculate preparation time for a single food item and given quantity.
 */
export function calculateItemPrepTime(
  minPrep: number = 15,
  maxPrep: number = 25,
  batchQty: number = 4,
  quantity: number = 1
): CalculatedItemPrepTime {
  const safeQty = Math.max(1, Math.floor(quantity) || 1);
  const safeBatch = Math.max(1, Math.floor(batchQty) || 4);
  const safeMin = Math.max(1, Math.floor(minPrep) || 15);
  const safeMax = Math.max(safeMin, Math.floor(maxPrep) || safeMin);

  // Number of batches required
  const batches = Math.ceil(safeQty / safeBatch);

  const minTime = batches * safeMin;
  const maxTime = batches * safeMax;

  return {
    batches,
    minTime,
    maxTime,
    formattedRange: formatPrepRange(minTime, maxTime),
  };
}

/**
 * Format preparation time range in a clean, professional string.
 */
export function formatPrepRange(minTime: number, maxTime: number, unit: string = 'min'): string {
  if (minTime <= 0 && maxTime <= 0) return `0 ${unit}`;
  if (minTime === maxTime) return `${minTime} ${unit}`;
  return `${minTime}–${maxTime} ${unit}`;
}

/**
 * Calculate the overall preparation time for an entire order.
 * Uses the MAXIMUM requirement among items (simultaneous preparation rule).
 */
export function calculateOrderPrepTime(items: PrepTimeItemInput[]): CalculatedOrderPrepTime {
  if (!items || items.length === 0) {
    return {
      minTime: 15,
      maxTime: 25,
      formattedRange: '15–25 min',
    };
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

  // Fallbacks if all calculated were 0
  if (highestMin === 0) highestMin = 15;
  if (highestMax === 0) highestMax = Math.max(highestMin, 25);

  return {
    minTime: highestMin,
    maxTime: highestMax,
    formattedRange: formatPrepRange(highestMin, highestMax),
  };
}

/**
 * Format total seconds into "Xm YYs" (e.g. "19m 45s", "0m 15s")
 */
export function formatTimeWithSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const padSec = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}m ${padSec}s`;
}

/**
 * Calculate live remaining preparation time from order creation timestamp.
 * Guaranteed never to return negative values.
 */
export function calculateRemainingPrepTime(
  createdAt: string | Date | number,
  estimatedMin: number = 15,
  estimatedMax: number = 25,
  nowTimestamp: number = Date.now()
): LiveRemainingPrepTime {
  const createdTime = new Date(createdAt).getTime();
  const safeCreated = isNaN(createdTime) ? nowTimestamp : createdTime;

  const diffMs = Math.max(0, nowTimestamp - safeCreated);
  const elapsedSeconds = Math.floor(diffMs / 1000);
  const elapsedMinutes = Math.floor(diffMs / 60000);

  const safeMin = Math.max(1, Math.floor(estimatedMin) || 15);
  const safeMax = Math.max(safeMin, Math.floor(estimatedMax) || safeMin);

  // Remaining minutes (never below 0)
  const remainingMin = Math.max(0, safeMin - elapsedMinutes);
  const remainingMax = Math.max(0, safeMax - elapsedMinutes);

  // Remaining seconds (never below 0)
  const remainingSecondsMin = Math.max(0, safeMin * 60 - elapsedSeconds);
  const remainingSecondsMax = Math.max(0, safeMax * 60 - elapsedSeconds);

  const isReadyTimeReached = remainingSecondsMax <= 0 || remainingMax <= 0;
  const isMinTimeReached = remainingSecondsMin <= 0 && !isReadyTimeReached;

  let displayText = '';
  let statusText = 'Your order is being prepared';

  if (isReadyTimeReached) {
    displayText = 'Estimated ready time reached';
    statusText = 'Your order should be ready soon';
  } else if (remainingMin === 0) {
    displayText = `0–${remainingMax} min`;
    statusText = 'Wrapping up preparation';
  } else if (remainingMin === remainingMax) {
    displayText = `${remainingMin} min`;
    statusText = 'Your order is being prepared';
  } else {
    displayText = `${remainingMin}–${remainingMax} min`;
    statusText = 'Your order is being prepared';
  }

  // Live timer display string: seconds with the max time, minimum minutes with the min time
  // e.g. "15m – 24m 30s", "0m – 5m 20s"
  let displayTextWithSeconds = '';
  if (isReadyTimeReached) {
    displayTextWithSeconds = 'Estimated ready time reached';
  } else if (safeMin === safeMax) {
    displayTextWithSeconds = formatTimeWithSeconds(remainingSecondsMax);
  } else {
    displayTextWithSeconds = `${remainingMin}m – ${formatTimeWithSeconds(remainingSecondsMax)}`;
  }

  const formattedElapsed = formatTimeWithSeconds(elapsedSeconds);

  return {
    elapsedSeconds,
    elapsedMinutes,
    remainingMin,
    remainingMax,
    remainingSecondsMin,
    remainingSecondsMax,
    isReadyTimeReached,
    isMinTimeReached,
    displayText,
    displayTextWithSeconds,
    formattedElapsed,
    statusText,
  };
}
