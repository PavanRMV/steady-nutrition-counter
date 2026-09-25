import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOOD_CATALOG, searchCatalog, calculateFood, normalizeOpenFoodFactsProduct, rankSuggestions, suggestionToSelection } from '../catalog.js';
const provenance = JSON.parse(readFileSync(new URL('../catalog-provenance.json', import.meta.url)));

test('offline catalog has 60-100 unique sourced records and requested coverage', () => {
  assert.ok(FOOD_CATALOG.length >= 60 && FOOD_CATALOG.length <= 100);
  assert.equal(new Set(FOOD_CATALOG.map(food => food.id)).size, FOOD_CATALOG.length);
  for (const food of FOOD_CATALOG) {
    assert.match(food.id, /^[a-z0-9-]+$/);
    assert.ok(food.name && food.preparation && food.unit && food.gramsPerUnit > 0);
    assert.ok(food.sourceLabel && food.sourceRef && typeof food.estimated === 'boolean');
    for (const key of ['calories', 'protein', 'fibre', 'carbs']) assert.ok(Number.isFinite(food[key]) && food[key] >= 0);
    assert.ok(provenance.records.some(record => record.id === food.sourceRef), food.sourceRef);
  }
  for (const term of ['walnut','almonds','cashews','pistachios','pecans','hazelnuts','brazil nuts','macadamia','chia','flax','pumpkin seeds','sunflower seeds','sesame','hemp','milk','whey','chicken breast','shrimp','salmon','tilapia','cod','egg','white rice','quinoa','bread','edamame','corn','okra','eggplant','bottle gourd','bitter gourd','cauliflower','cabbage','peas','carrot','potato','green beans','toor dal','moong dal','masoor dal','chana dal','urad dal','roti','idli','dosa','poha','upma','sambar','rajma','chole','curd','paneer','ragi','biryani','goat','pizza']) assert.ok(searchCatalog(term).length, term);
  assert.equal(searchCatalog('fish').some(food => food.name.toLowerCase() === 'fish'), false);
});

test('every catalog row is estimated unless it has auditable record-level evidence', () => {
  for (const food of FOOD_CATALOG) {
    const evidence = food.recordEvidence;
    const exactEvidence = evidence
      && typeof evidence.recordId === 'string' && evidence.recordId.trim()
      && typeof evidence.recordUrl === 'string' && /^https:\/\//.test(evidence.recordUrl)
      && typeof evidence.derivation === 'string' && evidence.derivation.trim();
    assert.ok(food.estimated || exactEvidence, `${food.id} has neither an estimate flag nor exact evidence`);
  }
});

test('catalog and UI disclose mixed reference families as representative estimates', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const disclosure = `${html} ${readme}`;
  for (const family of ['USDA', 'IFCT', 'NIN']) assert.match(disclosure, new RegExp(family, 'i'));
  assert.match(html, /representative estimates/i);
  assert.doesNotMatch(html, /estimates based on USDA FoodData Central\./i);
  assert.match(provenance.fieldNotes.estimated, /without exact record-level evidence/i);
});

test('quantity calculation includes carbohydrates and supports decimals', () => {
  const food = searchCatalog('almonds')[0];
  assert.deepEqual(calculateFood(food, 2), { foodId: food.id, name: food.name, source: food.sourceLabel, unit: food.unit, quantity: 2, calories: food.calories*2, protein: food.protein*2, fibre: food.fibre*2, carbs: food.carbs*2 });
  assert.equal(calculateFood(food, .5).quantity, .5);
  assert.throws(() => calculateFood(food, 0), /quantity/i);
});

test('Open Food Facts requires and normalizes carbohydrate data', () => {
  const base = { 'energy-kcal_100g': 380, proteins_100g: 10, fiber_100g: 7, carbohydrates_100g: 70 };
  const item = normalizeOpenFoodFactsProduct({ code:'456', product_name:'Test cereal', nutriments:base });
  assert.equal(item.carbs, 70);
  for (const field of Object.keys(base)) assert.equal(normalizeOpenFoodFactsProduct({ product_name:'Bad', nutriments:{...base,[field]:-1} }), null);
});

test('balanced suggestions change priority with normalized deficit magnitude', () => {
  const foods = [
    { id:'protein-choice', name:'Protein choice', preparation:'plain', unit:'portion', gramsPerUnit:100, calories:100, protein:20, fibre:1, carbs:0 },
    { id:'fibre-choice', name:'Fibre choice', preparation:'plain', unit:'portion', gramsPerUnit:100, calories:100, protein:1, fibre:10, carbs:0 }
  ];
  const proteinHeavy = rankSuggestions(foods, { calories:500, protein:100, fibre:1 }, 'balanced', 2);
  const fibreHeavy = rankSuggestions(foods, { calories:500, protein:1, fibre:100 }, 'balanced', 2);
  assert.equal(proteinHeavy[0].id, 'protein-choice');
  assert.equal(fibreHeavy[0].id, 'fibre-choice');
  assert.notDeepEqual(proteinHeavy.map(food => food.id), fibreHeavy.map(food => food.id));
});

test('focused filters respond to deficit magnitude and remain deterministic', () => {
  const foods = [
    { id:'protein-choice', name:'Protein choice', preparation:'plain', unit:'portion', gramsPerUnit:100, calories:100, protein:20, fibre:1, carbs:0 },
    { id:'fibre-choice', name:'Fibre choice', preparation:'plain', unit:'portion', gramsPerUnit:100, calories:100, protein:1, fibre:10, carbs:0 }
  ];
  const cases = [
    ['protein', { calories:500, protein:100, fibre:1 }, 'protein-choice'],
    ['protein', { calories:500, protein:1, fibre:100 }, 'fibre-choice'],
    ['fibre', { calories:500, protein:100, fibre:1 }, 'protein-choice'],
    ['fibre', { calories:500, protein:1, fibre:100 }, 'fibre-choice']
  ];
  for (const [filter, remaining, expected] of cases) {
    const first = rankSuggestions(foods, remaining, filter, 2);
    const second = rankSuggestions(foods, remaining, filter, 2);
    assert.equal(first[0].id, expected, `${filter} with ${JSON.stringify(remaining)}`);
    assert.deepEqual(first, second);
  }
});

test('suggestions are deterministic, exclude zero energy, respect filters, and penalize overshoot', () => {
  const remaining = { calories:220, protein:20, fibre:6 };
  const balanced = rankSuggestions(FOOD_CATALOG, remaining, 'balanced', 10);
  assert.deepEqual(balanced, rankSuggestions(FOOD_CATALOG, remaining, 'balanced', 10));
  assert.ok(balanced.every(item => item.calories > 0));
  const protein = rankSuggestions(FOOD_CATALOG, remaining, 'protein', 5);
  const fibre = rankSuggestions(FOOD_CATALOG, remaining, 'fibre', 5);
  assert.ok(protein.reduce((n,x)=>n+x.protein,0) > fibre.reduce((n,x)=>n+x.protein,0));
  assert.ok(fibre.reduce((n,x)=>n+x.fibre,0) > protein.reduce((n,x)=>n+x.fibre,0));
});

test('suggestion action is a selection-only prefill contract', () => {
  const food = FOOD_CATALOG[0];
  assert.deepEqual(suggestionToSelection(food), { type:'select-food', foodId:food.id, quantity:1 });
});
