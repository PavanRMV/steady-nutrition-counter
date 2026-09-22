// Built-in estimates based on typical USDA FoodData Central values; not clinical advice.
const f = (id, name, unit, gramsPerUnit, calories, protein, fibre) => Object.freeze({ id, name, unit, gramsPerUnit, calories, protein, fibre, source: 'built-in' });
export const FOOD_CATALOG = Object.freeze([
  f('walnut-count','Walnut','count',4,26.2,0.6,0.28), f('walnut-half','Walnut half','half',2,13.1,0.3,0.14), f('almonds','Almonds','count',1.23,7.1,0.26,0.15), f('cashews','Cashews','count',1.56,8.7,0.28,0.05), f('peanuts','Peanuts','count',1,5.7,0.26,0.09),
  f('milk-whole-cup','Whole milk','cup',244,149,7.7,0), f('milk-2-cup','2% milk','cup',244,122,8.1,0), f('milk-skim-cup','Skim milk','cup',245,83,8.3,0), f('soy-milk-cup','Unsweetened soy milk','cup',243,80,7,2),
  f('whey-protein-scoop','Whey protein powder','scoop',30,120,24,1), f('banana-medium','Banana, medium','count',118,105,1.3,3.1), f('water-cup','Water','cup',237,0,0,0),
  f('chicken-breast-cooked-100g','Chicken breast, cooked skinless','100 g',100,165,31,0), f('shrimp-cooked-100g','Shrimp, cooked','100 g',100,99,24,0),
  f('salmon-atlantic-cooked-100g','Atlantic salmon, cooked','100 g',100,206,22.1,0), f('tuna-light-canned-water-100g','Light tuna, canned in water','100 g',100,116,25.5,0), f('cod-pacific-cooked-100g','Pacific cod, cooked','100 g',100,89,19.9,0), f('tilapia-cooked-100g','Tilapia, cooked','100 g',100,128,26.2,0), f('sardines-canned-oil-100g','Sardines, canned in oil','100 g',100,208,24.6,0),
  f('egg-large','Egg, large','count',50,72,6.3,0), f('egg-white-large','Egg white, large','count',33,17,3.6,0), f('rice-white-cooked-cup','White rice, cooked','cup',158,205,4.3,0.6), f('rice-brown-cooked-cup','Brown rice, cooked','cup',195,216,5,3.5),
  f('oats-dry-serving','Rolled oats, dry','serving',40,150,5,4), f('bread-whole-wheat-slice','Whole-wheat bread','slice',28,69,3.6,1.9), f('bread-white-slice','White bread','slice',25,67,2,0.6), f('greek-yogurt-cup','Greek yogurt, plain nonfat','cup',245,137,24,0), f('yogurt-plain-cup','Plain yogurt, whole milk','cup',245,149,8.5,0),
  f('apple-medium','Apple, medium','count',182,95,0.5,4.4), f('orange-medium','Orange, medium','count',131,62,1.2,3.1), f('strawberries-cup','Strawberries','cup',152,49,1,3), f('blueberries-cup','Blueberries','cup',148,84,1.1,3.6), f('grapes-cup','Grapes','cup',151,104,1.1,1.4), f('avocado-half','Avocado','half',100,160,2,6.7),
  f('broccoli-cooked-cup','Broccoli, cooked','cup',156,55,3.7,5.1), f('spinach-raw-cup','Spinach, raw','cup',30,7,0.9,0.7), f('carrot-medium','Carrot, medium','count',61,25,0.6,1.7), f('sweet-potato-cooked-100g','Sweet potato, cooked','100 g',100,90,2,3.3), f('potato-baked-100g','Potato, baked','100 g',100,93,2.5,2.2), f('peas-cooked-cup','Green peas, cooked','cup',160,134,8.6,8.8),
  f('lentils-cooked-cup','Lentils, cooked','cup',198,230,17.9,15.6), f('black-beans-cooked-cup','Black beans, cooked','cup',172,227,15.2,15), f('chickpeas-cooked-cup','Chickpeas, cooked','cup',164,269,14.5,12.5), f('kidney-beans-cooked-cup','Kidney beans, cooked','cup',177,225,15.3,11.3),
  f('tofu-firm-100g','Tofu, firm','100 g',100,144,17.3,2.3), f('olive-oil-tbsp','Olive oil','tablespoon',13.5,119,0,0), f('peanut-butter-tbsp','Peanut butter','tablespoon',16,94,3.6,1), f('cottage-cheese-cup','Cottage cheese, 2%','cup',226,183,24.2,0)
]);

export function searchCatalog(query, limit = 8) {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return FOOD_CATALOG.filter(food => terms.every(term => `${food.name} ${food.unit}`.toLowerCase().includes(term))).slice(0, limit);
}
const clean = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export function calculateFood(food, quantity) {
  const q = Number(quantity);
  if (!food || !Number.isFinite(q) || q <= 0) throw new Error('Quantity must be greater than zero.');
  return { foodId: food.id, name: food.name, source: food.source || 'built-in', unit: food.unit, quantity: q, calories: clean(food.calories * q), protein: clean(food.protein * q), fibre: clean(food.fibre * q) };
}
export function normalizeOpenFoodFactsProduct(product) {
  const name = String(product?.product_name || '').trim(), n = product?.nutriments || {};
  if (!name) return null;
  const servingGrams = Number.parseFloat(product.serving_size);
  const usable = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
  const hasServing = usable(n['energy-kcal_serving']);
  const suffix = hasServing ? '_serving' : '_100g';
  const values = [n[`energy-kcal${suffix}`], n[`proteins${suffix}`], n[`fiber${suffix}`]];
  if (!values.every(usable)) return null;
  const [calories, protein, fibre] = values.map(Number);
  return { id: `off-${product.code || name.toLowerCase().replace(/\W+/g,'-')}`, name, unit: hasServing ? 'serving' : '100 g', gramsPerUnit: hasServing && Number.isFinite(servingGrams) ? servingGrams : 100, calories: clean(calories), protein: clean(protein), fibre: clean(fibre), source: 'Open Food Facts' };
}
