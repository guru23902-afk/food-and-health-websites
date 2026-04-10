import numpy as np
import math

class FoodDatabase:
    def __init__(self):
        # Database of food items. Features: [Calories, Protein(g), Fat(g), Carbs(g), Convenience Score]
        # Taste embedding is a 3D mock vector representing taste profile (e.g., Salty, Sweet, Umami)
        self.items = {
            "double_bacon_cheeseburger": {"features": [900, 45, 60, 40, 0.8], "taste_embedding": [0.9, 0.1, 0.8], "category": "burger"},
            "turkey_burger_wheat_bun": {"features": [450, 35, 20, 35, 0.7], "taste_embedding": [0.7, 0.1, 0.6], "category": "burger"},
            "black_bean_veggie_burger": {"features": [350, 20, 15, 45, 0.7], "taste_embedding": [0.6, 0.2, 0.7], "category": "burger"},
            "large_fries": {"features": [500, 5, 25, 65, 0.9], "taste_embedding": [0.8, 0.1, 0.3], "category": "side"},
            "side_salad_vinaigrette": {"features": [120, 2, 8, 10, 0.8], "taste_embedding": [0.3, 0.2, 0.1], "category": "side"},
            "grilled_chicken_bowl": {"features": [550, 50, 15, 45, 0.6], "taste_embedding": [0.7, 0.2, 0.7], "category": "bowl"},
            "chocolate_milkshake": {"features": [800, 15, 40, 100, 0.9], "taste_embedding": [0.1, 0.9, 0.2], "category": "dessert"},
            "protein_smoothie": {"features": [300, 30, 5, 25, 0.8], "taste_embedding": [0.1, 0.8, 0.3], "category": "dessert"}
        }

    def get_food(self, name):
        return self.items.get(name)

def cosine_similarity(v1, v2):
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    return dot / norm if norm > 0 else 0

class UserLatentState:
    def __init__(self, high_stress=False, poor_sleep=False, health_goal="weight_loss"):
        self.high_stress = high_stress
        self.poor_sleep = poor_sleep
        self.health_goal = health_goal
        
        # Determine risk level based on context signals
        self.willpower_modifier = 1.0
        if self.high_stress:
            self.willpower_modifier -= 0.3
        if self.poor_sleep:
            self.willpower_modifier -= 0.3

class AntiGravityDecisionModel:
    def __init__(self, db: FoodDatabase):
        self.db = db
        # Normalization factors for health scoring
        self.max_cals = 1000
        self.max_prot = 60

    def calculate_health_score(self, item_features, goal):
        cals, prot, fat, carbs, conv = item_features
        # Goal: Weight loss + Muscle preservation
        if goal == "weight_loss":
            # Higher score is healthier. Penalize high calories/fat, reward protein.
            cal_penalty = cals / self.max_cals
            prot_reward = prot / self.max_prot
            score = (prot_reward * 1.5) - cal_penalty
            return max(0, min(1, (score + 1) / 2)) # Normalize to 0-1
        return 0.5 

    def propose_smart_swap(self, intended_item_name, user_state: UserLatentState):
        intended_food = self.db.get_food(intended_item_name)
        if not intended_food:
            return "Item not found."

        print(f"--- Smart Swap Evaluator ---")
        print(f"User State: Stress={user_state.high_stress}, Sleep Deprived={user_state.poor_sleep}, Goal={user_state.health_goal}")
        print(f"User Willpower Modifier: {user_state.willpower_modifier:.2f} (Lower means higher friction hurts success)\n")
        
        print(f"Intended Order: {intended_item_name} (Calories: {intended_food['features'][0]} | Protein: {intended_food['features'][1]}g)")
        
        intended_health_score = self.calculate_health_score(intended_food['features'], user_state.health_goal)
        print(f"Baseline Health Score: {intended_health_score:.2f}")
        
        if intended_health_score > 0.7:
            return "Item is already healthy. No swap needed (Anti-Gravity principle: Don't annoy the user)."

        candidates = []
        # Simulate Vector Search (Approximate Nearest Neighbors)
        for name, item in self.db.items.items():
            if name == intended_item_name:
                continue
                
            # Compute taste/category similarity
            taste_sim = cosine_similarity(intended_food['taste_embedding'], item['taste_embedding'])
            
            # Contextual Bandit Logic / Multi-Objective Ranking
            health_score = self.calculate_health_score(item['features'], user_state.health_goal)
            
            # If the user has extremely low willpower due to stress/sleep, we must maximize taste match and convenience over perfect health.
            # If willpower is high, we can push for a hyper-healthy swap.
            friction_penalty = (1.0 - item['features'][4]) * 0.5 # 4 is convenience score
            
            # Ranking equation blending Taste Affinity + Health Uplift against User Friction
            rank_score = (taste_sim * (1.5 - user_state.willpower_modifier)) + \
                         (health_score * user_state.willpower_modifier) - \
                         friction_penalty
                         
            candidates.append((name, rank_score, taste_sim, health_score, item))

        # Sort by best swap candidate
        candidates.sort(key=lambda x: x[1], reverse=True)
        top_swap = candidates[0]
        
        print("\n--- Model Recommendation ---")
        if top_swap[1] > 0.4:
            food = top_swap[4]
            calorie_saved = intended_food['features'][0] - food['features'][0]
            print(f"Recommended Swap: {top_swap[0]}")
            print(f"Stats: Calories: {food['features'][0]} | Protein: {food['features'][1]}g | Match Score: {top_swap[2]:.2f} / Health: {top_swap[3]:.2f}")
            print(f"\n[Frictionless Prompt Generated for UI]:")
            print(f"\"Hey! Since you've had a stressful day, the {top_swap[0]} will hit the spot while saving you {calorie_saved} calories. It's ready in 5 mins. Order instead?\"")
        else:
            print("No good frictionless swap found. Letting the historical order proceed.")
            

if __name__ == "__main__":
    db = FoodDatabase()
    model = AntiGravityDecisionModel(db)
    
    # Simulate a user heading towards a fast food burger joint late at night
    stressed_tired_user = UserLatentState(high_stress=True, poor_sleep=True, health_goal="weight_loss")
    
    model.propose_smart_swap("double_bacon_cheeseburger", stressed_tired_user)
    
    print("\n" + "="*50 + "\n")
    
    # Simulate a user with high willpower going for dessert
    rested_user = UserLatentState(high_stress=False, poor_sleep=False, health_goal="weight_loss")
    model.propose_smart_swap("chocolate_milkshake", rested_user)
