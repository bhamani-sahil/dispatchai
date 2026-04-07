# Layer 1 — Base agent templates per industry type.
# These contain industry knowledge, emergency scenarios, and fallback services.
# Business config (name, hours, pricing) is injected in Layer 2.
# Conversation context (history, slots) is injected in Layer 3.

TEMPLATES: dict[str, dict] = {

    "plumbing": {
        "industry": "plumbing",
        "what_we_do": "everything from leaks and drain clogs to water heaters and pipe replacements",
        "emergency_triggers": "flood, burst pipe, gas leak, sewage backup, no water, water won't shut off",
        "emergency_action": "Tell them to call the emergency line NOW. Add: 'While you wait — shut off your main water valve to stop the flow.'",
        "fallback_services": "Drain Cleaning ($150-300), Leak Repair ($100-250), Toilet Repair ($80-200), Water Heater ($800-1500), Pipe Replacement ($300-1200), Sump Pump ($200-600)",
        "scope_note": "We specialize in plumbing only — for electrical or HVAC issues, suggest they call a specialist.",
        "pricing_note": "Always say 'estimated' — exact quote is given on site by the technician.",
    },

    "hvac": {
        "industry": "heating & cooling",
        "what_we_do": "furnace repairs, AC tune-ups, heat pump installs, and duct cleaning",
        "emergency_triggers": "no heat, no hot water, gas smell, carbon monoxide alarm, furnace won't start, pipes freezing",
        "emergency_action": "Tell them to call the emergency line NOW. For gas smell: 'Leave the house immediately, don't use light switches, call the emergency line and 911.'",
        "fallback_services": "Furnace Repair ($150-400), AC Service ($100-300), Heat Pump Install ($3000-6000), Duct Cleaning ($300-600), Thermostat Install ($80-200), Filter Replacement ($60-120)",
        "scope_note": "We handle HVAC only — for plumbing or electrical issues, suggest they call a specialist.",
        "pricing_note": "Always say 'estimated' — exact quote depends on parts and labour assessed on site.",
    },

    "auto_detailing": {
        "industry": "auto detailing",
        "what_we_do": "interior and exterior detailing, ceramic coating, paint correction, and odour removal",
        "emergency_triggers": "major spill, flood damage, urgent same-day need before an event or sale",
        "emergency_action": "For urgent same-day requests, check availability and let them know if we can squeeze them in. Give the emergency line if they need to reach someone directly.",
        "fallback_services": "Full Detail ($200-350), Interior Only ($120-180), Exterior Wash & Wax ($80-140), Ceramic Coating ($500-1200), Paint Correction ($300-800), Odour Removal ($100-200)",
        "scope_note": "We handle detailing only — for mechanical or body repair issues, suggest an auto shop.",
        "pricing_note": "Pricing depends on vehicle size and condition — always say 'starting from' or 'estimated'.",
    },

    "junk_removal": {
        "industry": "junk removal",
        "what_we_do": "furniture removal, appliance haul-away, estate cleanouts, garage and yard cleanups",
        "emergency_triggers": "same-day urgent removal, flooding aftermath, post-renovation debris",
        "emergency_action": "For same-day urgent jobs, give the emergency line so they can reach someone directly to check truck availability.",
        "fallback_services": "Single Item ($75-150), Half Load ($200-300), Full Load ($350-500), Estate Cleanout (quote on site), Appliance Removal ($80-150), Construction Debris ($250-500)",
        "scope_note": "We handle junk removal and hauling only — we don't do moving or storage.",
        "pricing_note": "Price depends on volume and type of items — always say 'estimated' and we give a firm quote on arrival.",
    },

    "garage_door_repair": {
        "industry": "garage door repair",
        "what_we_do": "spring replacement, opener repair, cable fixes, panel replacement, and new door installs",
        "emergency_triggers": "door stuck open, door won't close, broken spring, snapped cable, vehicle trapped inside",
        "emergency_action": "Door stuck open is a security emergency. Tell them to call the emergency line NOW for same-day service. Add: 'Don't try to manually force the door — you could snap the cable.'",
        "fallback_services": "Spring Replacement ($180-300), Opener Repair ($100-250), Cable Repair ($120-200), Panel Replacement ($200-500), Full Door Install ($800-2000), Safety Sensor Fix ($80-150)",
        "scope_note": "We handle garage doors only — for general home repairs or electrical panel issues, suggest a specialist.",
        "pricing_note": "Always say 'estimated' — parts vary by door brand and size, exact quote given on arrival.",
    },

    "pet_grooming": {
        "industry": "pet grooming",
        "what_we_do": "baths, haircuts, nail trims, ear cleaning, teeth brushing, and de-shedding treatments",
        "emergency_triggers": "matted fur causing skin issues, urgent groom before a trip or event, pet in visible discomfort from overgrown nails",
        "emergency_action": "For urgent same-day needs, give the emergency line so they can check same-day availability directly.",
        "fallback_services": "Full Groom ($60-120), Bath & Brush ($40-80), Nail Trim ($20-35), Teeth Brushing ($15-25), De-Shedding Treatment ($50-90), Puppy First Groom ($50-70)",
        "scope_note": "We do grooming only — for veterinary concerns, always recommend they see their vet.",
        "pricing_note": "Price depends on breed, size, and coat condition — always say 'starting from' or 'estimated'.",
    },

    "general_handyman": {
        "industry": "handyman services",
        "what_we_do": "drywall, painting, furniture assembly, TV mounting, fixture installs, and general home repairs",
        "emergency_triggers": "water damage repair, urgent fix before a showing or event, safety hazard like exposed wiring or broken stairs",
        "emergency_action": "For safety hazards, give the emergency line for same-day assessment. Add: 'Until we arrive, keep the area clear and don't use it.'",
        "fallback_services": "Drywall Patch ($80-200), Painting (room $300-600), TV Mount ($80-150), Furniture Assembly ($60-120), Fixture Install ($80-180), Door Repair ($100-250)",
        "scope_note": "We handle general repairs — for major electrical or plumbing work, we'll refer a licensed specialist.",
        "pricing_note": "Always say 'estimated' — exact quote depends on scope assessed on site.",
    },

    "electrical": {
        "industry": "electrical",
        "what_we_do": "panel upgrades, outlet and switch installs, lighting, EV charger installs, and electrical inspections",
        "emergency_triggers": "power outage, burning smell, sparking outlet, circuit breaker tripping repeatedly, no power to part of home",
        "emergency_action": "Sparking or burning smell is a fire risk — tell them to call the emergency line NOW and turn off the breaker for that area if safe to do so. Don't use the outlet.",
        "fallback_services": "Outlet Install ($80-150), Panel Upgrade ($1500-3500), Lighting Install ($100-300), EV Charger Install ($500-1200), Electrical Inspection ($150-250), Circuit Repair ($100-300)",
        "scope_note": "Licensed electricians only — we don't handle plumbing or HVAC.",
        "pricing_note": "Always say 'estimated' — exact quote given after on-site assessment.",
    },

    "locksmith": {
        "industry": "locksmith",
        "what_we_do": "lockouts, lock rekeying, new lock installs, smart lock setup, and safe opening",
        "emergency_triggers": "locked out of home or car, broken key in lock, lock won't turn, security breach after break-in",
        "emergency_action": "Lockouts are urgent — give the emergency line immediately for same-day response. Add: 'We'll have someone there as fast as possible.'",
        "fallback_services": "Home Lockout ($80-150), Car Lockout ($60-120), Lock Rekey ($50-100 per lock), Lock Install ($100-200), Smart Lock Setup ($150-300), Safe Opening ($150-400)",
        "scope_note": "We handle locks and security only — for alarm systems, suggest a security specialist.",
        "pricing_note": "Always say 'estimated' — final price depends on lock type and job complexity.",
    },

    "car_repair": {
        "industry": "auto repair",
        "what_we_do": "oil changes, brake service, engine diagnostics, tire installs, and general mechanical repairs",
        "emergency_triggers": "car won't start, brake failure, engine warning light, overheating, flat tire",
        "emergency_action": "For brake failure or overheating — tell them to pull over safely and call the emergency line NOW. Don't drive the vehicle.",
        "fallback_services": "Oil Change ($60-120), Brake Service ($200-500), Tire Install ($80-160), Engine Diagnostic ($100-150), Battery Replace ($150-250), Transmission Service ($150-400)",
        "scope_note": "We handle mechanical repairs — for body or paint work, suggest an auto body shop.",
        "pricing_note": "Always say 'estimated' — exact cost depends on parts and labour confirmed after inspection.",
    },

    "carpet_cleaning": {
        "industry": "carpet cleaning",
        "what_we_do": "steam cleaning, stain treatment, upholstery cleaning, area rug cleaning, and odour removal",
        "emergency_triggers": "major spill, flooding, urgent clean before an event or move-out inspection",
        "emergency_action": "For flood or major spill, give the emergency line for same-day response. Add: 'Blot the area — don't rub — to slow the spreading while you wait.'",
        "fallback_services": "Room Steam Clean ($80-150/room), Whole Home ($300-600), Upholstery ($100-250), Area Rug ($60-150), Stain Treatment ($50-100), Odour Removal ($80-150)",
        "scope_note": "We handle carpet and upholstery cleaning only — for hard floor refinishing, suggest a flooring specialist.",
        "pricing_note": "Always say 'estimated' — price depends on square footage and stain severity.",
    },

    "pressure_washing": {
        "industry": "pressure washing",
        "what_we_do": "driveway cleaning, house washing, deck and fence washing, gutter cleaning, and graffiti removal",
        "emergency_triggers": "graffiti removal, pre-sale cleaning on short notice, post-construction cleanup",
        "emergency_action": "For urgent same-day requests give the emergency line to check crew availability.",
        "fallback_services": "Driveway ($150-300), House Wash ($300-600), Deck/Fence ($150-350), Gutter Clean ($100-250), Graffiti Removal ($200-500), Concrete Sealing ($200-500)",
        "scope_note": "We handle exterior pressure washing only — for interior cleaning, suggest a cleaning service.",
        "pricing_note": "Always say 'estimated' — price depends on surface size and level of buildup.",
    },

    "landscaping": {
        "industry": "landscaping",
        "what_we_do": "lawn care, hedge trimming, garden cleanup, sod install, snow removal, and landscape design",
        "emergency_triggers": "storm damage cleanup, fallen tree, urgent prep before a property showing",
        "emergency_action": "For storm damage or fallen tree, give the emergency line for same-day assessment.",
        "fallback_services": "Lawn Mow ($50-100), Hedge Trim ($80-200), Garden Cleanup ($150-400), Sod Install ($1500-4000), Snow Removal (seasonal contract), Landscape Design (quote on site)",
        "scope_note": "We handle outdoor landscaping only — for irrigation or sprinkler systems, ask and we'll let you know if we cover it.",
        "pricing_note": "Always say 'estimated' — price depends on property size and scope of work.",
    },

    "appliance_repair": {
        "industry": "appliance repair",
        "what_we_do": "fridge, washer, dryer, dishwasher, oven, and range repairs",
        "emergency_triggers": "fridge not cooling, water leak from washer, gas oven smell, appliance sparking",
        "emergency_action": "For gas smell or sparking appliance — tell them to unplug it or shut off the gas valve and call the emergency line NOW.",
        "fallback_services": "Fridge Repair ($120-300), Washer/Dryer ($100-250), Dishwasher ($100-200), Oven/Range ($100-280), Diagnostic Fee ($80, waived on repair), Same-Day Service (additional $50)",
        "scope_note": "We repair major home appliances — we don't handle small appliances or HVAC units.",
        "pricing_note": "Always say 'estimated' — parts cost varies by brand and model, confirmed after diagnosis.",
    },

    "door_repair": {
        "industry": "door repair",
        "what_we_do": "interior and exterior door repairs, frame fixes, hinge replacement, weatherstripping, and new door installs",
        "emergency_triggers": "door won't lock, door kicked in, door stuck shut, security concern after break-in",
        "emergency_action": "For a kicked-in door or security breach, give the emergency line for same-day emergency boarding or repair.",
        "fallback_services": "Door Adjustment ($80-150), Hinge Replace ($60-120), Lock Install ($100-200), Frame Repair ($150-350), Weatherstrip ($60-100), Full Door Install ($400-1200)",
        "scope_note": "We handle doors only — for windows or siding, suggest a general contractor.",
        "pricing_note": "Always say 'estimated' — final cost depends on door type and damage assessed on site.",
    },

}

# Fallback for unknown agent types
DEFAULT_TEMPLATE = TEMPLATES["general_handyman"]


def get_template(agent_type: str) -> dict:
    return TEMPLATES.get(agent_type, DEFAULT_TEMPLATE)
