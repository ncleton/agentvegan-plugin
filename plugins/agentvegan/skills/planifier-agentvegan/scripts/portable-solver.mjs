const CONTRACT_VERSION = "agentvegan-solver-context-v1";
const ALGORITHM_VERSION = "agentvegan-portable-solver-v2";
const PROFILE_FINGERPRINT_VERSION = "planning-profile-fingerprint-v3";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = ["Petit-déjeuner", "Déjeuner", "Dîner"];
const ENERGY_TOLERANCE = 0.1;
const NUTRIENTS = [
  "energy_kcal", "protein_g", "fiber_g", "vitamin_b12_ug", "vitamin_d_ug",
  "iodine_ug", "selenium_ug", "dha_epa_mg", "zinc_mg", "calcium_mg",
  "magnesium_mg", "iron_mg", "sodium_mg", "salt_g", "fat_g",
  "saturated_fat_g", "omega3_ala_g",
];
const NUTRIENT_INDEX = Object.freeze(Object.fromEntries(NUTRIENTS.map((key, index) => [key, index])));

const ABSOLUTE_CONSTRAINTS = [
  { key: "protein_g", min: (profile) => Number(profile.weight_kg) * 0.83 },
  { key: "fiber_g", min: () => 30 },
  { key: "vitamin_b12_ug", min: () => 4 },
  { key: "vitamin_d_ug", min: () => 15, max: () => 100 },
  { key: "iodine_ug", min: () => 150, max: () => 600 },
  { key: "selenium_ug", min: () => 70, max: () => 255 },
  { key: "dha_epa_mg", min: () => 250 },
  { key: "zinc_mg", min: (profile) => profile.sex === "female" ? 11 : 14, max: () => 25 },
  { key: "calcium_mg", min: (profile) => Number(profile.age) < 25 ? 1000 : 950, max: () => 2500 },
  { key: "magnesium_mg", min: (profile) => profile.sex === "female" ? 300 : 380 },
  { key: "iron_mg", min: (profile) => profile.sex === "male" ? 11 : 16 },
  { key: "sodium_mg", max: () => 2000, exclusiveMax: true },
  { key: "salt_g", max: () => 5, exclusiveMax: true },
];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonical(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedRecipe(recipe) {
  if (!recipe || typeof recipe !== "object" || !recipe.id || !recipe.title) return null;
  if (!MEALS.includes(recipe.meal)) return null;
  const minimums = {};
  const maximums = {};
  for (const key of NUTRIENTS) {
    const total = finite(recipe.nutrition_totals?.[key]);
    const minimum = finite(recipe.nutrition_bounds?.[key]?.min) ?? total;
    const maximum = finite(recipe.nutrition_bounds?.[key]?.max) ?? total;
    if (minimum === null || maximum === null || minimum < 0 || maximum < minimum) return null;
    minimums[key] = minimum;
    maximums[key] = maximum;
  }
  return {
    id: String(recipe.id),
    title: String(recipe.title),
    meal: recipe.meal,
    sourceKind: String(recipe.sourceKind || "unknown"),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient) => ({
      id: String(ingredient?.id || ""),
      name: String(ingredient?.name || ""),
      amount: String(ingredient?.amount || ""),
      amount_g_or_ml: finite(ingredient?.amount_g_or_ml),
      required: ingredient?.required !== false,
      query: String(ingredient?.query || ingredient?.name || ""),
      product_ref: String(ingredient?.product_ref || ""),
      expected_product: ingredient?.expected_product && typeof ingredient.expected_product === "object"
        ? ingredient.expected_product
        : null,
    })).filter((ingredient) => ingredient.id && ingredient.name) : [],
    dietary: recipe.dietary && typeof recipe.dietary === "object" ? recipe.dietary : null,
    minimums,
    maximums,
  };
}

function addTotals(recipes, side) {
  return Object.fromEntries(NUTRIENTS.map((key) => [
    key,
    recipes.reduce((sum, recipe) => sum + recipe[side][key], 0),
  ]));
}

function ratio(minimums, maximums, nutrient, multiplier) {
  return {
    min: minimums[nutrient] * multiplier / maximums.energy_kcal,
    max: maximums[nutrient] * multiplier / minimums.energy_kcal,
  };
}

export function evaluatePortableDay(recipes, profile) {
  const minimums = addTotals(recipes, "minimums");
  const maximums = addTotals(recipes, "maximums");
  const paused = new Set(Array.isArray(profile.paused_nutrients) ? profile.paused_nutrients : []);
  const constraints = [];
  for (const constraint of ABSOLUTE_CONSTRAINTS) {
    const min = paused.has(constraint.key) ? null : constraint.min?.(profile) ?? null;
    const max = constraint.max?.(profile) ?? null;
    const minMet = min === null || minimums[constraint.key] >= min;
    const maxMet = max === null || (constraint.exclusiveMax
      ? maximums[constraint.key] < max
      : maximums[constraint.key] <= max);
    constraints.push({ key: constraint.key, min, max, value_min: minimums[constraint.key], value_max: maximums[constraint.key], met: minMet && maxMet });
  }
  const fat = ratio(minimums, maximums, "fat_g", 9);
  const saturated = ratio(minimums, maximums, "saturated_fat_g", 9);
  const omega3 = ratio(minimums, maximums, "omega3_ala_g", 9);
  constraints.push(
    { key: "fat_energy_ratio", min: 0.35, max: 0.4, value_min: fat.min, value_max: fat.max, met: fat.min >= 0.35 && fat.max <= 0.4 },
    { key: "saturated_fat_energy_ratio", min: null, max: 0.12, value_min: saturated.min, value_max: saturated.max, met: saturated.max <= 0.12 },
    { key: "omega3_ala_energy_ratio", min: 0.01, max: null, value_min: omega3.min, value_max: omega3.max, met: omega3.min >= 0.01 },
  );
  const energyTarget = Number(profile.energy_target_kcal);
  const energyMin = energyTarget * (1 - ENERGY_TOLERANCE);
  const energyMax = energyTarget * (1 + ENERGY_TOLERANCE);
  constraints.push({
    key: "energy_kcal", min: energyMin, max: energyMax,
    value_min: minimums.energy_kcal, value_max: maximums.energy_kcal,
    met: minimums.energy_kcal >= energyMin && maximums.energy_kcal <= energyMax,
  });
  return {
    valid: constraints.every((constraint) => constraint.met),
    recipe_ids: recipes.map((recipe) => recipe.id),
    totals_bounds: Object.fromEntries(NUTRIENTS.map((key) => [key, { min: minimums[key], max: maximums[key] }])),
    constraints,
  };
}

export function describePortableConstraints(profile) {
  const paused = new Set(Array.isArray(profile?.paused_nutrients) ? profile.paused_nutrients : []);
  const energyTarget = Number(profile?.energy_target_kcal);
  return {
    nutrient_order: [...NUTRIENTS],
    absolute: ABSOLUTE_CONSTRAINTS.map((constraint) => ({
      key: constraint.key,
      min: paused.has(constraint.key) ? null : constraint.min?.(profile) ?? null,
      max: constraint.max?.(profile) ?? null,
      max_exclusive: constraint.exclusiveMax === true,
      paused: paused.has(constraint.key),
    })),
    ratios: [
      { key: "fat_energy_ratio", nutrient: "fat_g", kcal_per_unit: 9, min: 0.35, max: 0.4 },
      { key: "saturated_fat_energy_ratio", nutrient: "saturated_fat_g", kcal_per_unit: 9, min: null, max: 0.12 },
      { key: "omega3_ala_energy_ratio", nutrient: "omega3_ala_g", kcal_per_unit: 9, min: 0.01, max: null },
    ],
    energy: {
      key: "energy_kcal",
      target: energyTarget,
      min: energyTarget * (1 - ENERGY_TOLERANCE),
      max: energyTarget * (1 + ENERGY_TOLERANCE),
    },
  };
}

function recipeMeals(recipes) {
  const breakfasts = recipes.filter((recipe) => recipe.meal === MEALS[0]);
  const mains = recipes.filter((recipe) => recipe.meal === MEALS[1] || recipe.meal === MEALS[2]);
  return { breakfasts, mains };
}

export function diagnosePortableFeasibility(context) {
  const recipes = (context?.recipes || []).map(normalizedRecipe).filter(Boolean);
  const { breakfasts, mains } = recipeMeals(recipes);
  const paused = new Set(Array.isArray(context?.profile?.paused_nutrients) ? context.profile.paused_nutrients : []);
  const gaps = [];
  for (const constraint of ABSOLUTE_CONSTRAINTS) {
    if (!constraint.min || paused.has(constraint.key)) continue;
    const required = constraint.min(context.profile);
    const breakfastMaximum = Math.max(...breakfasts.map((recipe) => recipe.maximums[constraint.key]));
    const mainMaximums = mains.map((recipe) => ({ id: recipe.id, value: recipe.maximums[constraint.key] }))
      .sort((left, right) => right.value - left.value);
    const firstMain = mainMaximums[0];
    const secondMain = mainMaximums.find((candidate) => candidate.id !== firstMain?.id);
    const catalogMaximum = breakfastMaximum + (firstMain?.value || 0) + (secondMain?.value || 0);
    if (catalogMaximum < required) gaps.push({ key: constraint.key, required_min: required, catalog_daily_max: catalogMaximum });
  }
  return { feasible: gaps.length === 0, unavoidable_gaps: gaps };
}

function enumerateDays(recipes, profile) {
  const { breakfasts, mains } = recipeMeals(recipes);
  const paused = new Set(Array.isArray(profile.paused_nutrients) ? profile.paused_nutrients : []);
  const preparedConstraints = ABSOLUTE_CONSTRAINTS.map((constraint) => ({
    index: NUTRIENT_INDEX[constraint.key],
    min: paused.has(constraint.key) ? null : constraint.min?.(profile) ?? null,
    max: constraint.max?.(profile) ?? null,
    exclusiveMax: constraint.exclusiveMax === true,
  }));
  const vector = (recipe, side) => NUTRIENTS.map((key) => recipe[side][key]);
  const breakfastVectors = breakfasts.map((recipe) => ({ recipe, minimums: vector(recipe, "minimums"), maximums: vector(recipe, "maximums") }));
  const mainVectors = mains.map((recipe) => ({ recipe, minimums: vector(recipe, "minimums"), maximums: vector(recipe, "maximums") }));
  const energyIndex = NUTRIENT_INDEX.energy_kcal;
  const fatIndex = NUTRIENT_INDEX.fat_g;
  const saturatedFatIndex = NUTRIENT_INDEX.saturated_fat_g;
  const omega3Index = NUTRIENT_INDEX.omega3_ala_g;
  const energyTarget = Number(profile.energy_target_kcal);
  const energyMin = energyTarget * (1 - ENERGY_TOLERANCE);
  const energyMax = energyTarget * (1 + ENERGY_TOLERANCE);
  const candidates = [];
  let evaluated = 0;
  for (const breakfast of breakfastVectors) {
    for (const lunch of mainVectors) {
      for (const dinner of mainVectors) {
        if (lunch.recipe.id === dinner.recipe.id) continue;
        evaluated += 1;
        const minimum = (index) => breakfast.minimums[index] + lunch.minimums[index] + dinner.minimums[index];
        const maximum = (index) => breakfast.maximums[index] + lunch.maximums[index] + dinner.maximums[index];
        let valid = true;
        for (const constraint of preparedConstraints) {
          if (constraint.min !== null && minimum(constraint.index) < constraint.min) { valid = false; break; }
          if (constraint.max !== null && (constraint.exclusiveMax
            ? maximum(constraint.index) >= constraint.max
            : maximum(constraint.index) > constraint.max)) { valid = false; break; }
        }
        if (!valid) continue;
        const minimumEnergy = minimum(energyIndex);
        const maximumEnergy = maximum(energyIndex);
        if (minimumEnergy < energyMin || maximumEnergy > energyMax
          || minimum(fatIndex) * 9 / maximumEnergy < 0.35
          || maximum(fatIndex) * 9 / minimumEnergy > 0.4
          || maximum(saturatedFatIndex) * 9 / minimumEnergy > 0.12
          || minimum(omega3Index) * 9 / maximumEnergy < 0.01) continue;
        const recipeIds = [breakfast.recipe.id, lunch.recipe.id, dinner.recipe.id];
        const energyDistance = Math.abs(((minimumEnergy + maximumEnergy) / 2) - energyTarget);
        candidates.push({ recipes: [breakfast.recipe, lunch.recipe, dinner.recipe], recipe_ids: recipeIds, energy_distance: energyDistance });
      }
    }
  }
  candidates.sort((left, right) => left.energy_distance - right.energy_distance
    || left.recipe_ids.join("|").localeCompare(right.recipe_ids.join("|")));
  return { evaluated, candidates };
}

function selectWeek(candidates) {
  const greedyCounts = new Map();
  const greedyDays = [];
  let greedyScore = 0;
  for (let day = 0; day < DAYS.length; day += 1) {
    let best = null;
    let bestRepeats = Infinity;
    for (const candidate of candidates) {
      if (candidate.recipe_ids.some((id) => (greedyCounts.get(id) || 0) >= 2)) continue;
      const repeats = candidate.recipe_ids.reduce((sum, id) => sum + (greedyCounts.get(id) || 0), 0);
      if (!best || repeats < bestRepeats
        || (repeats === bestRepeats && candidate.energy_distance < best.energy_distance)
        || (repeats === bestRepeats && candidate.energy_distance === best.energy_distance
          && candidate.recipe_ids.join("|").localeCompare(best.recipe_ids.join("|")) < 0)) {
        best = candidate;
        bestRepeats = repeats;
      }
    }
    if (!best) break;
    greedyDays.push(best);
    greedyScore += bestRepeats * 100000 + best.energy_distance;
    for (const id of best.recipe_ids) greedyCounts.set(id, (greedyCounts.get(id) || 0) + 1);
  }
  if (greedyDays.length === DAYS.length) return { days: greedyDays, counts: greedyCounts, score: greedyScore };

  const counts = new Map();
  const days = [];
  const failedStates = new Set();

  function stateKey(day) {
    const used = [...counts.entries()].filter(([, count]) => count > 0).sort(([left], [right]) => left.localeCompare(right));
    return `${day}:${used.map(([id, count]) => `${id}=${count}`).join(",")}`;
  }

  function visit(day, score) {
    if (day === DAYS.length) return { days: [...days], counts: new Map(counts), score };
    const key = stateKey(day);
    if (failedStates.has(key)) return null;
    const eligible = candidates.filter((candidate) => candidate.recipe_ids.every((id) => (counts.get(id) || 0) < 2));
    eligible.sort((left, right) => {
      const leftRepeats = left.recipe_ids.reduce((sum, id) => sum + (counts.get(id) || 0), 0);
      const rightRepeats = right.recipe_ids.reduce((sum, id) => sum + (counts.get(id) || 0), 0);
      return leftRepeats - rightRepeats || left.energy_distance - right.energy_distance
        || left.recipe_ids.join("|").localeCompare(right.recipe_ids.join("|"));
    });
    for (const candidate of eligible) {
      const repeatPenalty = candidate.recipe_ids.reduce((sum, id) => sum + (counts.get(id) || 0) * 100000, 0);
      for (const id of candidate.recipe_ids) counts.set(id, (counts.get(id) || 0) + 1);
      days.push(candidate);
      const selected = visit(day + 1, score + repeatPenalty + candidate.energy_distance);
      if (selected) return selected;
      days.pop();
      for (const id of candidate.recipe_ids) {
        const next = (counts.get(id) || 1) - 1;
        if (next === 0) counts.delete(id); else counts.set(id, next);
      }
    }
    failedStates.add(key);
    return null;
  }

  return visit(0, 0);
}

function assertContext(context) {
  if (context?.contract_version !== CONTRACT_VERSION) throw new Error(`Contexte ${CONTRACT_VERSION} requis.`);
  if (context?.algorithm_version !== ALGORITHM_VERSION) throw new Error(`Algorithme ${ALGORITHM_VERSION} requis.`);
  if (!context.profile || context.profile.complete !== true) throw new Error("Le profil AgentVegan est incomplet.");
  if (!Number.isFinite(Number(context.profile.energy_target_kcal))) throw new Error("Le repère énergétique du profil est absent.");
  if (Number(context.profile.flemme_meals_per_week || 0) !== 0) {
    throw new Error("Le catalogue portable Flemme n’est pas encore certifié pour cette version gratuite. Règle le profil sur 0 repas Flemme pour ce test.");
  }
  const expiry = Date.parse(String(context.expires_at || ""));
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error("Le contexte du solveur a expiré. Recharge-le depuis AgentVegan.");
}

export async function createSolverContext({ profile, recipes, catalogFingerprint = null, generatedAt = new Date(), ttlMs = 15 * 60_000 } = {}) {
  const normalized = (Array.isArray(recipes) ? recipes : []).map(normalizedRecipe).filter(Boolean);
  const filtered = normalized.filter((recipe) => profile?.gluten_free_only !== true || recipe.dietary?.gluten_free === true);
  if (filtered.filter((recipe) => recipe.meal === MEALS[0]).length < 1 || filtered.filter((recipe) => recipe.meal !== MEALS[0]).length < 2) {
    throw new Error("Le catalogue public ne contient pas assez de recettes compatibles avec le profil.");
  }
  const compactRecipes = filtered.map(({ minimums, maximums, ...recipe }) => ({
    ...recipe,
    nutrition_bounds: Object.fromEntries(NUTRIENTS.map((key) => [key, { min: minimums[key], max: maximums[key] }])),
    nutrition_totals: Object.fromEntries(NUTRIENTS.map((key) => [key, minimums[key]])),
  }));
  const generatedAtDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const resolvedCatalogFingerprint = typeof catalogFingerprint === "string" && /^[0-9a-f]{64}$/iu.test(catalogFingerprint)
    ? catalogFingerprint.toLowerCase()
    : await sha256(compactRecipes);
  return {
    contract_version: CONTRACT_VERSION,
    context_id: globalThis.crypto.randomUUID(),
    algorithm_version: ALGORITHM_VERSION,
    profile_fingerprint_version: PROFILE_FINGERPRINT_VERSION,
    profile_fingerprint: String(profile?.profile_fingerprint || ""),
    catalog_fingerprint: resolvedCatalogFingerprint,
    generated_at: generatedAtDate.toISOString(),
    expires_at: new Date(generatedAtDate.getTime() + ttlMs).toISOString(),
    profile,
    recipes: compactRecipes,
  };
}

export async function solvePortableWeek(context, { excluded_recipe_ids = [] } = {}) {
  assertContext(context);
  const feasibility = diagnosePortableFeasibility(context);
  if (!feasibility.feasible) {
    const error = new Error(`Le catalogue ne peut pas prouver ${feasibility.unavoidable_gaps.map((gap) => gap.key).join(", ")} avec les contraintes actives du profil.`);
    error.code = "CATALOG_NUTRITION_GAP";
    error.details = feasibility.unavoidable_gaps;
    error.nextAction = "Ouvre le profil pour que la personne choisisse explicitement les nutriments à suspendre, ou enrichis le catalogue avec des aliments ordinaires dont les teneurs sont vérifiées.";
    throw error;
  }
  const excluded = new Set(excluded_recipe_ids.map(String));
  const recipes = context.recipes.map(normalizedRecipe).filter((recipe) => recipe && !excluded.has(recipe.id));
  const enumeration = enumerateDays(recipes, context.profile);
  if (!enumeration.candidates.length) throw new Error(`Aucune journée certifiable après ${enumeration.evaluated} combinaisons vérifiées.`);
  const selected = selectWeek(enumeration.candidates);
  if (!selected) throw new Error("Aucune semaine diversifiée ne peut être construite avec le catalogue courant.");
  const planId = globalThis.crypto.randomUUID();
  const slots = selected.days.flatMap((day, dayIndex) => day.recipes.map((recipe, mealIndex) => ({
    slot_id: `${dayIndex + 1}-${mealIndex + 1}`,
    day: DAYS[dayIndex],
    meal: MEALS[mealIndex],
    recipe_id: recipe.id,
    recipe_title: recipe.title,
  })));
  const dailyProofs = selected.days.map((day, dayIndex) => ({ day: DAYS[dayIndex], ...evaluatePortableDay(day.recipes, context.profile) }));
  const signed = {
    contract_version: "agentvegan-portable-plan-certificate-v1",
    algorithm_version: ALGORITHM_VERSION,
    context_id: context.context_id,
    plan_id: planId,
    profile_fingerprint_version: context.profile_fingerprint_version,
    profile_fingerprint: context.profile_fingerprint,
    catalog_fingerprint: context.catalog_fingerprint,
    context_generated_at: context.generated_at,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    provider: "picnic",
    slots,
    daily_proofs: dailyProofs,
    excluded_recipe_ids: [...excluded].sort(),
  };
  return {
    ...signed,
    plan_hash: await sha256(signed),
    search: { evaluated_combination_count: enumeration.evaluated, valid_combination_count: enumeration.candidates.length },
  };
}

export async function createPortableCertificateFromSelection(context, week) {
  assertContext(context);
  if (!Array.isArray(week) || week.length !== DAYS.length) {
    const error = new Error("Le planning doit contenir exactement 7 journées.");
    error.code = "WEEK_SELECTION_INVALID";
    throw error;
  }
  const recipeIndex = new Map(context.recipes.map(normalizedRecipe).filter(Boolean).map((recipe) => [recipe.id, recipe]));
  const slots = [];
  const dailyProofs = [];
  const recipeCounts = new Map();
  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
    const selection = week[dayIndex] || {};
    const recipeIds = [selection.breakfast_recipe_id, selection.lunch_recipe_id, selection.dinner_recipe_id].map(String);
    if (new Set(recipeIds).size !== recipeIds.length) {
      const error = new Error(`${DAYS[dayIndex]} doit utiliser trois recettes différentes.`);
      error.code = "DAY_SELECTION_INVALID";
      error.details = [{ day: DAYS[dayIndex], reason: "duplicate_recipe", recipe_ids: recipeIds }];
      throw error;
    }
    const recipes = recipeIds.map((recipeId) => recipeIndex.get(recipeId));
    if (recipes.some((recipe) => !recipe)) {
      const error = new Error(`${DAYS[dayIndex]} référence une recette absente du contexte.`);
      error.code = "DAY_SELECTION_INVALID";
      error.details = [{ day: DAYS[dayIndex], reason: "unknown_recipe", recipe_ids: recipeIds }];
      throw error;
    }
    if (recipes[0].meal !== MEALS[0] || recipes.slice(1).some((recipe) => recipe.meal === MEALS[0])) {
      const error = new Error(`${DAYS[dayIndex]} ne respecte pas les types de repas demandés.`);
      error.code = "DAY_SELECTION_INVALID";
      error.details = [{ day: DAYS[dayIndex], reason: "meal_type", recipe_ids: recipeIds }];
      throw error;
    }
    const proof = evaluatePortableDay(recipes, context.profile);
    if (!proof.valid) {
      const error = new Error(`${DAYS[dayIndex]} ne respecte pas encore les contraintes nutritionnelles.`);
      error.code = "DAY_NOT_CERTIFIABLE";
      error.nextAction = "Remplace les recettes de cette journée en comparant leurs nutrition_bounds dans le contexte, puis rappelle save_week_plan. N'appelle pas list_recipes.";
      error.details = [{
        day: DAYS[dayIndex],
        recipe_ids: recipeIds,
        failed_constraints: proof.constraints.filter((constraint) => !constraint.met),
      }];
      throw error;
    }
    dailyProofs.push({ day: DAYS[dayIndex], ...proof });
    recipes.forEach((recipe, mealIndex) => {
      recipeCounts.set(recipe.id, (recipeCounts.get(recipe.id) || 0) + 1);
      slots.push({
        slot_id: `${dayIndex + 1}-${mealIndex + 1}`,
        day: DAYS[dayIndex],
        meal: MEALS[mealIndex],
        recipe_id: recipe.id,
        recipe_title: recipe.title,
      });
    });
  }
  const overusedRecipes = [...recipeCounts.entries()].filter(([, count]) => count > 2);
  if (overusedRecipes.length) {
    const error = new Error("La rotation autorise au maximum deux occurrences de chaque recette.");
    error.code = "WEEK_ROTATION_INVALID";
    error.nextAction = "Remplace les recettes trop répétées, puis rappelle save_week_plan. N'appelle pas list_recipes.";
    error.details = overusedRecipes.map(([recipe_id, count]) => ({ recipe_id, count, maximum: 2 }));
    throw error;
  }
  const now = new Date();
  const signed = {
    contract_version: "agentvegan-portable-plan-certificate-v1",
    algorithm_version: ALGORITHM_VERSION,
    context_id: context.context_id,
    plan_id: globalThis.crypto.randomUUID(),
    profile_fingerprint_version: context.profile_fingerprint_version,
    profile_fingerprint: context.profile_fingerprint,
    catalog_fingerprint: context.catalog_fingerprint,
    context_generated_at: context.generated_at,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 24 * 60 * 60_000).toISOString(),
    provider: "picnic",
    slots,
    daily_proofs: dailyProofs,
    excluded_recipe_ids: [],
  };
  return { ...signed, plan_hash: await sha256(signed), search: { performed_by: "chatgpt", validated_day_count: DAYS.length } };
}

export async function validatePortableCertificate(context, certificate, { accountId = null } = {}) {
  assertContext(context);
  if (certificate?.contract_version !== "agentvegan-portable-plan-certificate-v1") throw new Error("Certificat portable invalide.");
  if (certificate.algorithm_version !== ALGORITHM_VERSION) throw new Error("Version du solveur inattendue.");
  if (certificate.context_id !== context.context_id) throw new Error("Le certificat appartient à un autre contexte de calcul.");
  if (certificate.profile_fingerprint !== context.profile_fingerprint || certificate.catalog_fingerprint !== context.catalog_fingerprint) {
    throw new Error("Le certificat ne correspond plus au profil ou au catalogue courant.");
  }
  if (!Array.isArray(certificate.slots) || certificate.slots.length !== 21 || !Array.isArray(certificate.daily_proofs) || certificate.daily_proofs.length !== 7) {
    throw new Error("Le certificat doit contenir exactement 21 repas et 7 preuves journalières.");
  }
  const recipeIndex = new Map(context.recipes.map(normalizedRecipe).filter(Boolean).map((recipe) => [recipe.id, recipe]));
  const proofs = [];
  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
    const daySlots = certificate.slots.filter((slot) => slot.day === DAYS[dayIndex]);
    if (daySlots.length !== 3) throw new Error(`${DAYS[dayIndex]} ne contient pas trois repas.`);
    const ordered = MEALS.map((meal) => daySlots.find((slot) => slot.meal === meal));
    if (ordered.some((slot) => !slot)) throw new Error(`${DAYS[dayIndex]} contient des créneaux invalides.`);
    const recipes = ordered.map((slot) => recipeIndex.get(String(slot.recipe_id)));
    if (recipes.some((recipe) => !recipe)) throw new Error(`${DAYS[dayIndex]} référence une recette absente.`);
    if (recipes[0].meal !== MEALS[0] || recipes.slice(1).some((recipe) => recipe.meal === MEALS[0])) throw new Error(`${DAYS[dayIndex]} contient un type de repas incompatible.`);
    const proof = evaluatePortableDay(recipes, context.profile);
    if (!proof.valid) throw new Error(`${DAYS[dayIndex]} ne respecte plus les contraintes nutritionnelles.`);
    proofs.push({ day: DAYS[dayIndex], ...proof });
  }
  const { plan_hash: suppliedHash, search: _search, ...signed } = certificate;
  const expectedHash = await sha256(signed);
  if (suppliedHash !== expectedHash) throw new Error("L’empreinte du certificat est invalide.");
  if (accountId !== null && !/^oauth_[0-9a-f]{64}$/u.test(String(accountId))) throw new Error("Le compte MCP de validation est invalide.");
  return { ...certificate, daily_proofs: proofs };
}

export const PORTABLE_SOLVER_CONTRACT = Object.freeze({
  context_version: CONTRACT_VERSION,
  algorithm_version: ALGORITHM_VERSION,
  certificate_version: "agentvegan-portable-plan-certificate-v1",
});
