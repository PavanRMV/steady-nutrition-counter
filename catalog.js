// Focused offline catalog. Nutrients are per named portion, not medical advice.
const SOURCES = {
  USDA: ['Representative estimate informed by USDA FoodData Central', 'USDA-FDC-SR-LEGACY-2018'],
  IFCT: ['Representative estimate informed by IFCT 2017 (ICMR-NIN)', 'IFCT-2017'],
  RECIPE: ['Generic recipe estimate informed by ICMR-NIN guidance', 'NIN-DIETARY-GUIDELINES-2024-RECIPES']
};
const f = (id,name,category,preparation,unit,gramsPerUnit,calories,protein,fibre,carbs,source='USDA',estimated=true) => {
  const [sourceLabel,sourceRef] = SOURCES[source];
  return Object.freeze({id,name,category,preparation,unit,gramsPerUnit,calories,protein,fibre,carbs,sourceLabel,sourceRef,estimated});
};
export const FOOD_CATALOG = Object.freeze([
  f('egg-large-boiled','Egg, large','eggs','hard-boiled','egg',50,78,6.3,0,0.6),
  f('egg-large-scrambled','Egg, large','eggs','scrambled with no added fat','egg',50,74,6.3,0,0.7),
  f('egg-white-large-cooked','Egg white, large','eggs','cooked','egg white',33,17,3.6,0,0.2),
  f('chicken-breast-roasted-100g','Chicken breast','poultry','roasted, skinless','100 g',100,165,31,0,0),
  f('chicken-thigh-roasted-100g','Chicken thigh','poultry','roasted, skinless','100 g',100,209,26,0,0),
  f('chicken-biryani-cup','Chicken biryani','prepared dishes','generic rice-and-chicken recipe','cup',250,360,18,2.5,52,'RECIPE',true),
  f('salmon-atlantic-cooked-100g','Atlantic salmon','fish','dry-heat cooked','100 g',100,206,22.1,0,0),
  f('tilapia-cooked-100g','Tilapia','fish','dry-heat cooked','100 g',100,128,26.2,0,0),
  f('cod-pacific-cooked-100g','Pacific cod','fish','dry-heat cooked','100 g',100,89,19.9,0,0),
  f('tuna-light-water-100g','Light tuna','fish','canned in water, drained','100 g',100,116,25.5,0,0),
  f('sardines-oil-drained-100g','Sardines','fish','canned in oil, drained','100 g',100,208,24.6,0,0),
  f('rohu-cooked-100g','Rohu carp','fish','cooked, no added fat','100 g',100,117,20,0,0,'IFCT'),
  f('catla-cooked-100g','Catla carp','fish','cooked, no added fat','100 g',100,125,19,0,0,'IFCT'),
  f('shrimp-cooked-100g','Shrimp','seafood','cooked','100 g',100,99,24,0,0.2),
  f('goat-roasted-100g','Goat meat','meat','roasted, lean','100 g',100,143,27,0,0),
  f('banana-raw-medium','Banana','fruit','raw, medium edible portion','medium banana',118,105,1.3,3.1,27),
  f('date-medjool-one','Medjool date','fruit','dried, pitted edible portion','date',24,66,0.4,1.6,18),
  f('almonds-28g','Almonds','nuts','raw','28 g',28,164,6,3.5,6.1),
  f('walnuts-28g','Walnuts','nuts','raw','28 g',28,185,4.3,1.9,3.9),
  f('cashews-28g','Cashews','nuts','dry roasted, unsalted','28 g',28,163,4.3,0.9,9.2),
  f('pistachios-28g','Pistachios','nuts','dry roasted, unsalted','28 g',28,160,5.7,3,7.7),
  f('peanuts-28g','Peanuts','nuts','dry roasted, unsalted','28 g',28,166,6.9,2.4,6),
  f('pecans-28g','Pecans','nuts','raw','28 g',28,196,2.6,2.7,3.9),
  f('hazelnuts-28g','Hazelnuts','nuts','raw','28 g',28,178,4.2,2.8,4.7),
  f('brazil-nuts-28g','Brazil nuts','nuts','raw','28 g',28,187,4.1,2.1,3.3),
  f('macadamia-28g','Macadamia nuts','nuts','raw','28 g',28,204,2.2,2.4,3.9),
  f('chia-seeds-28g','Chia seeds','seeds','dried','28 g',28,138,4.7,9.8,11.9),
  f('flaxseed-ground-14g','Flax seeds','seeds','ground','tablespoon',14,75,2.6,3.8,4),
  f('pumpkin-seeds-28g','Pumpkin seeds','seeds','roasted kernels, unsalted','28 g',28,160,8.5,1.7,4),
  f('sunflower-seeds-28g','Sunflower seeds','seeds','dry roasted, unsalted','28 g',28,165,5.5,3.2,6.8),
  f('sesame-seeds-9g','Sesame seeds','seeds','whole, dried','tablespoon',9,52,1.6,1.1,2.1),
  f('hemp-seeds-28g','Hemp seeds','seeds','hulled','28 g',28,166,9.5,1.2,2.6),
  f('edamame-cooked-cup','Edamame','legumes','cooked, shelled','cup',155,188,18.4,8.1,13.8),
  f('corn-sweet-cooked-cup','Sweet corn','vegetables','boiled, drained','cup',164,143,5.1,3.6,31.3),
  f('rice-white-cooked-cup','White rice','grains','long-grain, cooked','cup',158,205,4.3,0.6,44.5),
  f('quinoa-cooked-cup','Quinoa','grains','cooked','cup',185,222,8.1,5.2,39.4),
  f('whey-protein-scoop','Whey protein powder','supplements','generic concentrate powder','30 g scoop',30,120,24,1,3,'USDA',true),
  f('milk-whole-cup','Whole milk','dairy','pasteurized','cup',244,149,7.7,0,11.7),
  f('milk-2pct-cup','2% milk','dairy','pasteurized','cup',244,122,8.1,0,11.7),
  f('milk-skim-cup','Skim milk','dairy','pasteurized','cup',245,83,8.3,0,12.2),
  f('curd-whole-cup','Curd / plain yogurt','dairy','whole-milk, unsweetened','cup',245,149,8.5,0,11.4),
  f('paneer-100g','Paneer','dairy','whole-milk fresh cheese','100 g',100,265,18.3,0,1.2,'IFCT'),
  f('spinach-palak-cooked-cup','Palak / spinach','Indian vegetables','boiled, drained','cup',180,41,5.3,4.3,6.8),
  f('okra-bhindi-cooked-cup','Bhindi / okra','Indian vegetables','boiled, drained','cup',160,56,3,5.4,12.1),
  f('eggplant-baingan-cooked-cup','Baingan / eggplant','Indian vegetables','cooked, no added fat','cup',99,35,0.8,2.5,8.6),
  f('bottle-gourd-lauki-cooked-cup','Lauki / bottle gourd','Indian vegetables','boiled, drained','cup',146,22,0.9,1.8,5.4,'IFCT'),
  f('bitter-gourd-karela-cooked-cup','Karela / bitter gourd','Indian vegetables','boiled, drained','cup',124,24,1,2.5,5.4,'IFCT'),
  f('cauliflower-gobi-cooked-cup','Gobi / cauliflower','Indian vegetables','boiled, drained','cup',124,29,2.3,2.9,5.1),
  f('cabbage-cooked-cup','Cabbage','Indian vegetables','boiled, drained','cup',150,34,1.9,2.8,8.2),
  f('peas-green-cooked-cup','Green peas','Indian vegetables','boiled, drained','cup',160,134,8.6,8.8,25),
  f('carrot-cooked-cup','Carrot','Indian vegetables','boiled, sliced','cup',156,55,1.2,4.7,12.8),
  f('potato-boiled-medium','Potato','Indian vegetables','boiled, flesh and skin','medium',173,150,3.5,3.1,34),
  f('green-beans-cooked-cup','Green beans','Indian vegetables','boiled, drained','cup',125,44,2.4,4,10),
  f('tomato-raw-medium','Tomato','vegetables','raw','medium',123,22,1.1,1.5,4.8),
  f('broccoli-cooked-cup','Broccoli','vegetables','boiled, drained','cup',156,55,3.7,5.1,11.2),
  f('sweet-potato-cooked-100g','Sweet potato','vegetables','baked','100 g',100,90,2,3.3,20.7),
  f('toor-dal-cooked-cup','Toor dal / pigeon peas','dals','boiled, no added fat','cup',168,203,11.4,11.3,36,'IFCT'),
  f('moong-dal-cooked-cup','Moong dal','dals','split mung beans, boiled','cup',202,212,14.2,15.4,38.7,'IFCT'),
  f('masoor-dal-cooked-cup','Masoor dal','dals','red lentils, boiled','cup',198,230,17.9,15.6,39.9,'IFCT'),
  f('chana-dal-cooked-cup','Chana dal','dals','split Bengal gram, boiled','cup',180,269,14.5,12.5,45,'IFCT'),
  f('urad-dal-cooked-cup','Urad dal','dals','split black gram, boiled','cup',180,230,15,13,41,'IFCT'),
  f('kidney-beans-rajma-cooked-cup','Kidney beans / rajma','legumes','boiled, drained','cup',177,225,15.3,11.3,40.4),
  f('chickpeas-kabuli-cooked-cup','Chickpeas / kabuli chana','legumes','boiled, drained','cup',164,269,14.5,12.5,45),
  f('yellow-peas-cooked-cup','Yellow split peas','legumes','boiled','cup',196,231,16.4,16.3,41.4),
  f('black-chickpeas-cooked-cup','Kala chana','legumes','boiled, drained','cup',164,269,14.5,12.5,45,'IFCT'),
  f('roti-whole-wheat-medium','Roti / chapati','Indian staples','whole-wheat, no ghee','medium roti',40,120,3.8,3.2,22,'RECIPE',true),
  f('idli-plain-one','Idli','Indian staples','steamed rice-lentil cake','idli',50,73,2.2,1,15,'RECIPE',true),
  f('dosa-plain-one','Dosa','Indian staples','plain fermented rice-lentil crepe','medium dosa',100,168,4.5,1.5,29,'RECIPE',true),
  f('poha-cooked-cup','Poha','Indian staples','generic vegetable flattened-rice recipe','cup',180,250,5,4,45,'RECIPE',true),
  f('upma-cooked-cup','Upma','Indian staples','generic vegetable semolina recipe','cup',200,245,7,4,42,'RECIPE',true),
  f('sambar-cup','Sambar','Indian dishes','generic lentil-vegetable stew','cup',240,140,7,6,22,'RECIPE',true),
  f('rajma-curry-cup','Rajma curry','Indian dishes','generic kidney-bean curry','cup',240,260,14,11,42,'RECIPE',true),
  f('chole-curry-cup','Chole curry','Indian dishes','generic chickpea curry','cup',240,290,13,11,44,'RECIPE',true),
  f('ragi-malt-milk-cup','Ragi drink','Indian beverages','finger millet malt with milk, unsweetened','cup',240,180,7,3,30,'RECIPE',true),
  f('bread-whole-wheat-slice','Whole-wheat bread','bread','commercial, toasted or untoasted','slice',28,69,3.6,1.9,11.6),
  f('bread-white-slice','White bread','bread','commercial, toasted or untoasted','slice',25,67,2,0.6,12.5),
  f('pizza-cheese-slice','Cheese pizza','prepared dishes','regular-crust, generic','slice',107,285,12.2,2.5,35.7,'USDA',true),
  f('pizza-chicken-slice','Chicken pizza','prepared dishes','regular-crust, generic','slice',120,300,16,2.5,36,'RECIPE',true),
  f('oats-rolled-dry-40g','Rolled oats','grains','dry','40 g',40,150,5,4,27),
  f('peanut-butter-tbsp','Peanut butter','nuts','smooth, no added serving ingredients','tablespoon',16,94,3.6,1,3.2),
  f('tofu-firm-100g','Firm tofu','soy foods','prepared with calcium','100 g',100,144,17.3,2.3,2.8)
]);

const clean = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
export function searchCatalog(query,limit=8){const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);if(!terms.length)return[];return FOOD_CATALOG.filter(x=>terms.every(t=>`${x.name} ${x.category} ${x.preparation} ${x.unit}`.toLowerCase().includes(t))).slice(0,limit);}
export function calculateFood(food,quantity){const q=Number(quantity);if(!food||!Number.isFinite(q)||q<=0)throw new Error('Quantity must be greater than zero.');return{foodId:food.id,name:food.name,source:food.sourceLabel,unit:food.unit,quantity:q,calories:clean(food.calories*q),protein:clean(food.protein*q),fibre:clean(food.fibre*q),carbs:clean(food.carbs*q)};}
export function normalizeOpenFoodFactsProduct(product){const name=String(product?.product_name||'').trim(),n=product?.nutriments||{};if(!name)return null;const grams=Number.parseFloat(product.serving_size);const usable=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0;const serving=usable(n['energy-kcal_serving']);const suffix=serving?'_serving':'_100g';const values=[n[`energy-kcal${suffix}`],n[`proteins${suffix}`],n[`fiber${suffix}`],n[`carbohydrates${suffix}`]];if(!values.every(usable))return null;const [calories,protein,fibre,carbs]=values.map(Number);return{id:`off-${product.code||name.toLowerCase().replace(/\W+/g,'-')}`,name,unit:serving?'serving':'100 g',gramsPerUnit:serving&&Number.isFinite(grams)?grams:100,calories:clean(calories),protein:clean(protein),fibre:clean(fibre),carbs:clean(carbs),source:'Open Food Facts'};}
export function suggestionToSelection(food){return{type:'select-food',foodId:food.id,quantity:1};}
export function rankSuggestions(catalog,remaining,filter='balanced',limit=8){
  const rem={calories:Math.max(1,Number(remaining.calories)||0),protein:Math.max(0,Number(remaining.protein)||0),fibre:Math.max(0,Number(remaining.fibre)||0)};
  const focus=filter==='protein'?{p:2.5,f:.5}:filter==='fibre'?{p:.5,f:2.5}:{p:1,f:1};
  const need={p:rem.protein/110,f:rem.fibre/35};
  return catalog.filter(x=>x.calories>0&&x.gramsPerUnit>=8).map(food=>{
    const pDensity=food.protein/food.calories*100,fDensity=food.fibre/food.calories*100;
    const benefit=focus.p*need.p*pDensity+focus.f*need.f*fDensity;
    const overshoot=Math.max(0,food.calories-rem.calories)/rem.calories*18;
    const practical=Math.abs(food.calories-Math.min(rem.calories,250))/250;
    const score=benefit-overshoot-practical;
    const why=filter==='protein'?`${clean(food.protein)} g protein in this portion; compare with your remaining targets.`:filter==='fibre'?`${clean(food.fibre)} g fibre in this portion; compare with your remaining targets.`:`Balances ${clean(food.protein)} g protein and ${clean(food.fibre)} g fibre for the remaining targets.`;
    return{...food,score:clean(score),why};
  }).sort((a,b)=>b.score-a.score||a.calories-b.calories||a.id.localeCompare(b.id)).slice(0,limit);
}
