import json
import random

first_names = ["Harold", "Pat", "Wendy", "Morgan", "Alex", "Taylor", "Jordan", "Sam", "Chris", "Jamie", "Riley", "Casey", "Skyler", "Dakota", "Quinn", "Avery", "Blake", "Charlie", "Drew", "Emery", "Finley", "Hayden", "Kendall", "Logan", "Micah", "Parker", "Reese", "Rowan", "Sage", "Spencer", "Tatum", "Devon", "Ariel", "Carmen", "Dana", "Ellis", "Frankie", "Harper", "Jackie", "Kerry", "Lee", "Marion", "Noel", "Peyton", "Robin", "Shawn", "Terry", "Val", "Whitney", "Aiden", "Bailey", "Cameron", "Dylan", "Elliott", "Hollis", "Jules", "Lane", "Monroe", "Oakley", "Palmer", "Rory", "Shiloh", "Sutton", "Tori", "Winter"]
last_names = ["Bates", "Nguyen", "Chang", "Steele", "Reyes", "Brooks", "Kim", "Voss", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"]

roles = [
    {"name": "Help Desk Analyst", "specialty": "clerical", "emoji": "📞"},
    {"name": "Support Technician", "specialty": "clerical", "emoji": "🖥️"},
    {"name": "Network Admin", "specialty": "networking", "emoji": "🌐"},
    {"name": "Sysadmin", "specialty": "infrastructure", "emoji": "🗄️"},
    {"name": "Security Analyst", "specialty": "security", "emoji": "🔒"},
    {"name": "Cloud Engineer", "specialty": "cloud", "emoji": "☁️"},
    {"name": "Database Admin", "specialty": "database", "emoji": "💽"},
    {"name": "Process Coordinator", "specialty": "process", "emoji": "📋"},
    {"name": "DevOps Engineer", "specialty": "cloud", "emoji": "🚀"},
    {"name": "IT Asset Manager", "specialty": "clerical", "emoji": "📱"},
]

all_skills = {
    "clerical": ["Clerical Savant", "Customer Service", "Documentation", "Compliance"],
    "networking": ["Network Expert", "Diagnostics", "Infrastructure", "Threat Hunting"],
    "security": ["Security Pro", "Threat Hunting", "Compliance", "Highly Technical"],
    "cloud": ["Cloud Native", "Highly Technical", "Infrastructure", "Automation"],
    "process": ["Process Optimization", "Compliance", "Documentation", "Customer Service"],
    "infrastructure": ["Infrastructure", "Diagnostics", "Highly Technical", "Process Optimization"],
    "database": ["Database Expert", "Query Optimization", "Highly Technical", "Diagnostics"]
}

traits = [
    "Loves mechanical keyboards.", "Drinks 6 cups of coffee a day.", "Has a cat named 'Root'.",
    "Never closes Jira tickets properly.", "Writes bash scripts for everything.",
    "Refuses to use a mouse.", "Always wears a hoodie.", "Has opinions on Vim vs Nano.",
    "Knows the office IP range by heart.", "Brought down prod once in 2012.",
    "Bakes cookies for user support.", "Escalates immediately to Tier 3.",
    "Can't exist without noise-canceling headphones.", "Knows what 'PC LOAD LETTER' means.",
    "Actually reads documentation.", "Maintains a personal wiki.", 
    "Uses a trackball mouse.", "Spends half the day on Reddit."
]

flavors = [
    "A reliable workhorse when the queue gets long.", 
    "Fixes things before the user even submits the ticket.",
    "The go-to person for legacy systems nobody else understands.",
    "Patience of a saint with angry users.",
    "Fastest typist in the western hemisphere.",
    "Treats the server room like a sacred temple.",
    "Thinks every solution involves restarting the router.",
    "Optimizes workflows in their sleep."
]

rarities = [
    {"tier": "common", "weight": 50, "baseCpsRng": (0.8, 1.5), "costRng": (100, 300), "lvlBaseRng": (80, 150), "skillCount": 2},
    {"tier": "uncommon", "weight": 30, "baseCpsRng": (2.0, 4.0), "costRng": (400, 800), "lvlBaseRng": (300, 500), "skillCount": 3},
    {"tier": "rare", "weight": 14, "baseCpsRng": (5.0, 10.0), "costRng": (1200, 3000), "lvlBaseRng": (800, 1500), "skillCount": 3},
    {"tier": "epic", "weight": 5, "baseCpsRng": (15.0, 30.0), "costRng": (6000, 15000), "lvlBaseRng": (3000, 5000), "skillCount": 4},
    {"tier": "legendary", "weight": 1, "baseCpsRng": (40.0, 80.0), "costRng": (30000, 80000), "lvlBaseRng": (8000, 15000), "skillCount": 5}
]

generated_ids = set()
heroes = []

def get_rarity():
    choice = random.randint(1, 100)
    acc = 0
    for r in rarities:
        acc += r["weight"]
        if choice <= acc:
            return r
    return rarities[-1]

for i in range(100):
    first = random.choice(first_names)
    last = random.choice(last_names)
    base_id = f"{first.lower()}_{last.lower()}"
    hero_id = base_id
    counter = 1
    while hero_id in generated_ids:
        hero_id = f"{base_id}_{counter}"
        counter += 1
    generated_ids.add(hero_id)
    
    role = random.choice(roles)
    rarity_data = get_rarity()
    
    pool = all_skills.get(role["specialty"], all_skills["clerical"])
    # ensure enough unique skills by mixing with universal skills
    extended_pool = list(set(pool + ["Customer Service", "Documentation", "Process Optimization", "Diagnostics", "Highly Technical"]))
    hero_skills = random.sample(extended_pool, min(rarity_data["skillCount"], len(extended_pool)))
    
    desc = f"{random.choice(flavors)} {random.choice(traits)}"
    
    base_cps = round(random.uniform(rarity_data["baseCpsRng"][0], rarity_data["baseCpsRng"][1]), 1)
    recruit_cost = random.randint(rarity_data["costRng"][0], rarity_data["costRng"][1])
    lvl_up_base = random.randint(rarity_data["lvlBaseRng"][0], rarity_data["lvlBaseRng"][1])
    
    hero = {
        "id": hero_id,
        "name": f"{first} {last}",
        "role": role["name"],
        "emoji": role["emoji"],
        "rarity": rarity_data["tier"],
        "specialty": role["specialty"],
        "baseCps": base_cps,
        "recruitCost": recruit_cost,
        "levelUpBaseCost": lvl_up_base,
        "desc": desc,
        "skills": hero_skills,
        "portrait": f"assets/portraits/{hero_id}.png"
    }
    heroes.append(hero)

js_content = f"// Auto-generated 100 character pool for the Applicant Job Board\nwindow.RECRUIT_POOL = {json.dumps(heroes, indent=2)};\n"

with open('js/heroes.js', 'w') as f:
    f.write(js_content)

print(f"Generated {len(heroes)} heroes in js/heroes.js!")
