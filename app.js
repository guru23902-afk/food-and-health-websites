// Food Database Configuration
const foodDatabase = {
  double_bacon_cheeseburger: { name: "Double Bacon Cheeseburger", features: [900, 45, 60, 40, 0.8], taste_embedding: [0.9, 0.1, 0.8], category: "burger", emoji: "🍔" },
  turkey_burger_wheat_bun: { name: "Turkey Burger (Wheat Bun)", features: [450, 35, 20, 35, 0.7], taste_embedding: [0.7, 0.1, 0.6], category: "burger", emoji: "🥪" },
  black_bean_veggie_burger: { name: "Black Bean Veggie Burger", features: [350, 20, 15, 45, 0.7], taste_embedding: [0.6, 0.2, 0.7], category: "burger", emoji: "🍔" },
  large_fries: { name: "Large Fries", features: [500, 5, 25, 65, 0.9], taste_embedding: [0.8, 0.1, 0.3], category: "side", emoji: "🍟" },
  side_salad_vinaigrette: { name: "Side Salad (Vinaigrette)", features: [120, 2, 8, 10, 0.8], taste_embedding: [0.3, 0.2, 0.1], category: "side", emoji: "🥗" },
  grilled_chicken_bowl: { name: "Grilled Chicken Bowl", features: [550, 50, 15, 45, 0.6], taste_embedding: [0.7, 0.2, 0.7], category: "bowl", emoji: "🍲" },
  chocolate_milkshake: { name: "Chocolate Milkshake", features: [800, 15, 40, 100, 0.9], taste_embedding: [0.1, 0.9, 0.2], category: "dessert", emoji: "🥤" },
  protein_smoothie: { name: "Protein Smoothie", features: [300, 30, 5, 25, 0.8], taste_embedding: [0.1, 0.8, 0.3], category: "dessert", emoji: "🫐" }
};

const MAX_CALS = 1000;
const MAX_PROT = 60;

function cosineSimilarity(v1, v2) {
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  const norm = Math.sqrt(norm1) * Math.sqrt(norm2);
  return norm === 0 ? 0 : dot / norm;
}

function calculateHealthScore(features, goal) {
  const [cals, prot, fat, carbs, conv] = features;
  if (goal === "weight_loss") {
    const calPenalty = cals / MAX_CALS;
    const protReward = prot / MAX_PROT;
    const score = (protReward * 1.5) - calPenalty;
    return Math.max(0, Math.min(1, (score + 1) / 2));
  }
  return 0.5;
}

function evaluateSwap() {
  const intendedKey = document.getElementById("intendedFood").value;
  const stressLevel = parseFloat(document.getElementById("stressSlider").value);
  const sleepLevel = parseFloat(document.getElementById("sleepSlider").value);
  
  // Calculate willpower based on dynamic inputs (1.0 = Max Willpower, 0 = Zero Willpower)
  // Higher stress reduces willpower. Lower sleep reduces willpower.
  // We model sleep differently here: slider value 10 = well rested, 0 = sleep deprived.
  const stressPenalty = (stressLevel / 10) * 0.4;
  const sleepPenalty = ((10 - sleepLevel) / 10) * 0.4;
  let willpowerModifier = 1.0 - stressPenalty - sleepPenalty;
  
  const intendedFood = foodDatabase[intendedKey];
  const intendedScore = calculateHealthScore(intendedFood.features, "weight_loss");

  let candidates = [];
  for (const [key, item] of Object.entries(foodDatabase)) {
    if (key === intendedKey) continue;

    const tasteSim = cosineSimilarity(intendedFood.taste_embedding, item.taste_embedding);
    const healthScore = calculateHealthScore(item.features, "weight_loss");
    const frictionPenalty = (1.0 - item.features[4]) * 0.5;

    // The core equation from the system design model
    const rankScore = (tasteSim * (1.5 - willpowerModifier)) + 
                      (healthScore * willpowerModifier) - 
                      frictionPenalty;

    candidates.push({ key, rankScore, tasteSim, healthScore, features: item.features, name: item.name, emoji: item.emoji });
  }

  candidates.sort((a, b) => b.rankScore - a.rankScore);
  const topSwap = candidates[0];

  updateUI(intendedFood, intendedScore, topSwap, willpowerModifier);
}

function updateUI(intended, baselineScore, bestSwap, willpower) {
  // Update Willpower Gauge
  const wpText = Math.round(willpower * 100) + '%';
  document.getElementById('willpowerStatus').innerText = wpText;
  
  const resultsDiv = document.getElementById('resultsContainer');
  resultsDiv.classList.add('fade-in');
  
  if (baselineScore > 0.8) {
    document.getElementById('swapSuggestion').innerHTML = '<h3>Great Choice!</h3><p>Your intended order is already super healthy. No intervention needed.</p>';
    return;
  }

  if (bestSwap.rankScore > 0.4) {
    const caloriesSaved = intended.features[0] - bestSwap.features[0];
    let contextMessage = "Since you've had a busy day";
    if (willpower < 0.6) contextMessage = "Since you're running low on energy right now";
    if (willpower > 0.8) contextMessage = "Since you're crushing it today";

    document.getElementById('swapSuggestion').innerHTML = `
      <div class="swap-card">
        <div class="swap-header">
           <span class="emoji">${bestSwap.emoji}</span>
           <div>
             <h3>Recommended Smart Swap</h3>
             <p class="swap-title">${bestSwap.name}</p>
           </div>
        </div>
        <div class="stats-row">
            <div class="stat-box">
                <span class="stat-lbl">Calories</span>
                <span class="stat-val highlight_green">${bestSwap.features[0]}</span>
            </div>
            <div class="stat-box">
                <span class="stat-lbl">Protein</span>
                <span class="stat-val">${bestSwap.features[1]}g</span>
            </div>
            <div class="stat-box">
                <span class="stat-lbl">Taste Match</span>
                <span class="stat-val">${Math.round(bestSwap.tasteSim * 100)}%</span>
            </div>
        </div>
        <div class="nudge-prompt">
          <p>"Hey! ${contextMessage}, this swap will hit the spot while saving you <strong>${caloriesSaved} calories</strong>. Ready to order?"</p>
          <button class="accept-btn">Accept Swap</button>
        </div>
      </div>
    `;
  }
}

// Initial evaluation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', evaluateSwap);
    });
    evaluateSwap();
});
