import { calculateItemPrepTime, calculateOrderPrepTime, calculateRemainingPrepTime } from '../src/utils/prepTime';
import { initDatabase, db } from '../server/db';
import { calculateOrderPrepTime as serverCalculateOrderPrepTime } from '../server/prepTime';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('--- STARTING PREPARATION TIME & BATCH QUANTITY VERIFICATION SUITE ---\n');

  // Test 1: Batch Quantity & Item Calculation (User Examples: Pizza 20-30 min, batch 4)
  console.log('1. Testing Item Batch Quantity Scaling (Pizza: 20–30 min, batch 4)');
  
  // 1 pizza = 1 batch -> 20–30 min
  const p1 = calculateItemPrepTime(20, 30, 4, 1);
  assert(p1.batches === 1 && p1.minTime === 20 && p1.maxTime === 30, '1 pizza -> 1 batch, 20-30 min');

  // 2 pizzas = 1 batch -> 20–30 min
  const p2 = calculateItemPrepTime(20, 30, 4, 2);
  assert(p2.batches === 1 && p2.minTime === 20 && p2.maxTime === 30, '2 pizzas -> 1 batch, 20-30 min');

  // 4 pizzas = 1 batch -> 20–30 min
  const p4 = calculateItemPrepTime(20, 30, 4, 4);
  assert(p4.batches === 1 && p4.minTime === 20 && p4.maxTime === 30, '4 pizzas -> 1 batch, 20-30 min');

  // 5 pizzas = 2 batches -> 40–60 min
  const p5 = calculateItemPrepTime(20, 30, 4, 5);
  assert(p5.batches === 2 && p5.minTime === 40 && p5.maxTime === 60, '5 pizzas -> 2 batches, 40-60 min');

  // 8 pizzas = 2 batches -> 40–60 min
  const p8 = calculateItemPrepTime(20, 30, 4, 8);
  assert(p8.batches === 2 && p8.minTime === 40 && p8.maxTime === 60, '8 pizzas -> 2 batches, 40-60 min');

  // 9 pizzas = 3 batches -> 60–90 min
  const p9 = calculateItemPrepTime(20, 30, 4, 9);
  assert(p9.batches === 3 && p9.minTime === 60 && p9.maxTime === 90, '9 pizzas -> 3 batches, 60-90 min');

  // 10 pizzas = 3 batches -> 60–90 min
  const p10 = calculateItemPrepTime(20, 30, 4, 10);
  assert(p10.batches === 3 && p10.minTime === 60 && p10.maxTime === 90, '10 pizzas -> 3 batches, 60-90 min');

  // 12 pizzas = 3 batches -> 60–90 min
  const p12 = calculateItemPrepTime(20, 30, 4, 12);
  assert(p12.batches === 3 && p12.minTime === 60 && p12.maxTime === 90, '12 pizzas -> 3 batches, 60-90 min');

  // 13 pizzas = 4 batches -> 80–120 min
  const p13 = calculateItemPrepTime(20, 30, 4, 13);
  assert(p13.batches === 4 && p13.minTime === 80 && p13.maxTime === 120, '13 pizzas -> 4 batches, 80-120 min');

  console.log('\n2. Testing Mixed Items Simultaneous Preparation (Pizza x 4, Burger x 2, Pasta x 1)');
  // Pizza: 20-30 min, batch 4, qty 4 -> 20-30 min
  // Burger: 10-15 min, batch 4, qty 2 -> 10-15 min
  // Pasta: 15-20 min, batch 2, qty 1 -> 15-20 min
  const mixedOrder = [
    { min_prep_time: 20, max_prep_time: 30, batch_quantity: 4, quantity: 4 },
    { min_prep_time: 10, max_prep_time: 15, batch_quantity: 4, quantity: 2 },
    { min_prep_time: 15, max_prep_time: 20, batch_quantity: 2, quantity: 1 },
  ];
  const calculatedOrder = calculateOrderPrepTime(mixedOrder);
  assert(
    calculatedOrder.minTime === 20 && calculatedOrder.maxTime === 30,
    `Mixed order uses LONGEST requirement (max): 20–30 min (NOT added together to 45–65 min). Actual: ${calculatedOrder.minTime}–${calculatedOrder.maxTime}`
  );

  const serverCalculated = serverCalculateOrderPrepTime(mixedOrder);
  assert(
    serverCalculated.minTime === 20 && serverCalculated.maxTime === 30,
    `Server-side mixed order calculation matches: 20–30 min`
  );

  console.log('\n3. Testing Real-time Countdown Timer & Non-Negative Logic (Order 20–30 min)');
  const orderCreated = Date.now();

  // At 0 minutes elapsed
  const t0 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated);
  assert(t0.remainingMin === 20 && t0.remainingMax === 30, '0 min elapsed -> 20–30 min remaining');

  // After 5 minutes elapsed
  const t5 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 5 * 60 * 1000);
  assert(t5.remainingMin === 15 && t5.remainingMax === 25, '5 min elapsed -> 15–25 min remaining');

  // After 10 minutes elapsed
  const t10 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 10 * 60 * 1000);
  assert(t10.remainingMin === 10 && t10.remainingMax === 20, '10 min elapsed -> 10–20 min remaining');

  // After 15 minutes elapsed
  const t15 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 15 * 60 * 1000);
  assert(t15.remainingMin === 5 && t15.remainingMax === 15, '15 min elapsed -> 5–15 min remaining');

  // After 25 minutes elapsed (min reached 0, max still has 5 min)
  const t25 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 25 * 60 * 1000);
  assert(
    t25.remainingMin === 0 && t25.remainingMax === 5 && t25.displayText === '0–5 min',
    '25 min elapsed -> 0–5 min remaining (Never negative)'
  );

  // After 30 minutes elapsed (max reached)
  const t30 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 30 * 60 * 1000);
  assert(
    t30.isReadyTimeReached && t30.displayText === 'Estimated ready time reached',
    '30 min elapsed -> Estimated ready time reached'
  );

  // After 45 minutes elapsed (well past max, guaranteed NO negative numbers)
  const t45 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 45 * 60 * 1000);
  assert(
    t45.remainingMin === 0 && t45.remainingMax === 0 && t45.displayText === 'Estimated ready time reached',
    '45 min elapsed -> Never displays negative numbers (-5 min is impossible)'
  );

  console.log('\n4. Testing Large Order Countdown (10 Pizzas: 60–90 min)');
  // 0 min -> 60–90 min
  const lt0 = calculateRemainingPrepTime(orderCreated, 60, 90, orderCreated);
  assert(lt0.remainingMin === 60 && lt0.remainingMax === 90, '0 min elapsed -> 60–90 min');

  // 10 min -> 50–80 min
  const lt10 = calculateRemainingPrepTime(orderCreated, 60, 90, orderCreated + 10 * 60 * 1000);
  assert(lt10.remainingMin === 50 && lt10.remainingMax === 80, '10 min elapsed -> 50–80 min');

  // 30 min -> 30–60 min
  const lt30 = calculateRemainingPrepTime(orderCreated, 60, 90, orderCreated + 30 * 60 * 1000);
  assert(lt30.remainingMin === 30 && lt30.remainingMax === 60, '30 min elapsed -> 30–60 min');

  // 60 min -> 0–30 min
  const lt60 = calculateRemainingPrepTime(orderCreated, 60, 90, orderCreated + 60 * 60 * 1000);
  assert(lt60.remainingMin === 0 && lt60.remainingMax === 30 && lt60.displayText === '0–30 min', '60 min elapsed -> 0–30 min');

  // 90 min -> Estimated ready time reached
  const lt90 = calculateRemainingPrepTime(orderCreated, 60, 90, orderCreated + 90 * 60 * 1000);
  assert(lt90.isReadyTimeReached, '90 min elapsed -> Estimated ready time reached');

  console.log('\n5. Testing Database Schema & Order Persistence');
  initDatabase();
  
  // Verify columns exist on food_items and orders
  const foodCols = db.prepare("PRAGMA table_info(food_items)").all() as { name: string }[];
  assert(foodCols.some(c => c.name === 'min_prep_time'), 'food_items has min_prep_time column');
  assert(foodCols.some(c => c.name === 'max_prep_time'), 'food_items has max_prep_time column');
  assert(foodCols.some(c => c.name === 'batch_quantity'), 'food_items has batch_quantity column');

  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  assert(orderCols.some(c => c.name === 'estimated_prep_min'), 'orders has estimated_prep_min column');
  assert(orderCols.some(c => c.name === 'estimated_prep_max'), 'orders has estimated_prep_max column');

  console.log('\n6. Testing Live Seconds Display & Formatting (Seconds with max time, minimum minutes for min time)');
  // Order placed with 20-30 min:
  // At 0s elapsed:
  const sec0 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated);
  assert(sec0.remainingSecondsMin === 1200 && sec0.remainingSecondsMax === 1800, '0s elapsed -> 1200s min, 1800s max');
  assert(sec0.displayTextWithSeconds === '20m – 30m 00s', '0s elapsed formatted string -> 20m – 30m 00s');
  assert(sec0.formattedElapsed === '0m 00s', '0s elapsed -> 0m 00s');

  // After 15 seconds:
  const sec15 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 15 * 1000);
  assert(sec15.remainingSecondsMin === 1185 && sec15.remainingSecondsMax === 1785, '15s elapsed -> 1185s min, 1785s max');
  assert(sec15.displayTextWithSeconds === '20m – 29m 45s', '15s elapsed formatted string -> 20m – 29m 45s (seconds with max time only, min time is minimum minutes)');
  assert(sec15.formattedElapsed === '0m 15s', '15s elapsed -> 0m 15s');

  // After 5 minutes 30 seconds (330 seconds):
  const sec330 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 330 * 1000);
  assert(sec330.remainingSecondsMin === 870 && sec330.remainingSecondsMax === 1470, '330s elapsed -> 870s min, 1470s max');
  assert(sec330.displayTextWithSeconds === '15m – 24m 30s', '330s elapsed formatted string -> 15m – 24m 30s');
  assert(sec330.formattedElapsed === '5m 30s', '330s elapsed -> 5m 30s');

  // After 21 minutes (1260 seconds): min has elapsed (0m), max has 540s (9m 00s):
  const sec1260 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 1260 * 1000);
  assert(sec1260.remainingSecondsMin === 0 && sec1260.remainingSecondsMax === 540, '1260s elapsed -> 0s min, 540s max');
  assert(sec1260.displayTextWithSeconds === '0m – 9m 00s', '1260s elapsed formatted string -> 0m – 9m 00s');

  // After 30 minutes 10 seconds: both min and max reached 0:
  const sec1810 = calculateRemainingPrepTime(orderCreated, 20, 30, orderCreated + 1810 * 1000);
  assert(sec1810.remainingSecondsMin === 0 && sec1810.remainingSecondsMax === 0, '1810s elapsed -> never negative (0s)');
  assert(sec1810.displayTextWithSeconds === 'Estimated ready time reached', '1810s elapsed -> Estimated ready time reached');

  console.log('\n✨ ALL FOOD PREPARATION TIME & LIVE TIMER TESTS PASSED SUCCESSFULLY! ✨\n');
}

runTests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
