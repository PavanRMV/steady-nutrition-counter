import test from 'node:test';
import assert from 'node:assert/strict';
import { FOOD_CATALOG, searchCatalog, calculateFood, normalizeOpenFoodFactsProduct } from '../catalog.js';

test('offline catalog has unique stable complete records and broad coverage', () => {
  assert.ok(FOOD_CATALOG.length >= 40);
  assert.equal(new Set(FOOD_CATALOG.map(food => food.id)).size, FOOD_CATALOG.length);
  for (const food of FOOD_CATALOG) {
    assert.match(food.id, /^[a-z0-9-]+$/);
    assert.ok(food.name && food.unit && food.gramsPerUnit > 0);
    for (const key of ['calories', 'protein', 'fibre']) assert.ok(Number.isFinite(food[key]) && food[key] >= 0);
  }
  for (const term of ['walnut', 'milk', 'whey', 'banana', 'water', 'chicken breast', 'shrimp', 'salmon', 'egg', 'rice', 'oats', 'bread', 'yogurt', 'lentils', 'broccoli']) assert.ok(searchCatalog(term).length, term);
  assert.equal(searchCatalog('fish').some(food => food.name.toLowerCase() === 'fish'), false);
});

test('quantity calculation multiplies exact base values and supports decimals', () => {
  const walnut = searchCatalog('walnut')[0];
  assert.equal(walnut.id, 'walnut-count');
  assert.equal(walnut.name, 'Walnut');
  assert.equal(walnut.unit, 'count');
  assert.deepEqual(calculateFood(walnut, 2), {
    foodId: walnut.id, name: walnut.name, source: 'built-in', unit: walnut.unit, quantity: 2,
    calories: walnut.calories * 2, protein: walnut.protein * 2, fibre: walnut.fibre * 2
  });
  const half = calculateFood(searchCatalog('oats')[0], 0.5);
  assert.equal(half.quantity, 0.5);
  assert.equal(half.calories, searchCatalog('oats')[0].calories * 0.5);
  assert.throws(() => calculateFood(walnut, 0), /quantity/i);
});

test('Open Food Facts products normalize per serving or per 100g', () => {
  const serving = normalizeOpenFoodFactsProduct({ code: '123', product_name: 'Test bar', serving_size: '40 g', nutriments: { 'energy-kcal_serving': 160, proteins_serving: 8, fiber_serving: 3 } });
  assert.deepEqual({ unit: serving.unit, gramsPerUnit: serving.gramsPerUnit, calories: serving.calories }, { unit: 'serving', gramsPerUnit: 40, calories: 160 });
  const per100 = normalizeOpenFoodFactsProduct({ code: '456', product_name: 'Test cereal', nutriments: { 'energy-kcal_100g': 380, proteins_100g: 10, fiber_100g: 7 } });
  assert.deepEqual({ unit: per100.unit, gramsPerUnit: per100.gramsPerUnit, calories: per100.calories }, { unit: '100 g', gramsPerUnit: 100, calories: 380 });
  assert.equal(normalizeOpenFoodFactsProduct({ product_name: '', nutriments: {} }), null);
});

test('Open Food Facts rejects absent malformed or negative nutrients but accepts numeric zeros', () => {
  const product = nutriments => normalizeOpenFoodFactsProduct({ product_name: 'Test', nutriments });
  for (const field of ['energy-kcal_100g', 'proteins_100g', 'fiber_100g']) {
    for (const value of [undefined, null, '', 'oops', -1]) {
      const nutrients = { 'energy-kcal_100g': 0, proteins_100g: 0, fiber_100g: 0 };
      if (value === undefined) delete nutrients[field]; else nutrients[field] = value;
      assert.equal(product(nutrients), null, `${field}=${String(value)}`);
    }
  }
  assert.deepEqual(product({ 'energy-kcal_100g': 0, proteins_100g: 0, fiber_100g: 0 }), {
    id: 'off-test', name: 'Test', unit: '100 g', gramsPerUnit: 100,
    calories: 0, protein: 0, fibre: 0, source: 'Open Food Facts'
  });
});
