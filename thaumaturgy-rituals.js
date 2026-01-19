/**
 * V20 THAUMATURGY RITUALS DATA
 * Stores detailed information for Thaumaturgy Rituals by Level.
 * Separated from thaumaturgy-data.js to reduce file size.
 */

export const THAUMATURGY_RITUALS = {
    1: {
        "Bind the Accusing Tongue": {
            name: "Bind the Accusing Tongue",
            desc: "This ancient ritual lays a compulsion upon the subject that prevents them from speaking ill of the caster. Requires a picture/effigy of the target, a lock of their hair, and a black silken cord.",
            system: "The caster winds the cord around the hair and image. The target must score more successes on a Willpower roll (difficulty of the caster's Thaumaturgy rating + 3) than the caster scored in order to say anything negative about the caster. Lasts until the target succeeds or the cord is unwound.",
            level: 1
        },
        "Blood Rush": {
            name: "Blood Rush",
            desc: "Creates the sensation of drinking blood in the vampire without actually feeding. Used to prevent frenzy when confronted with fresh blood. Requires the fang of a predatory animal.",
            system: "Takes 1 turn to enact. Allows the vampire to resist hunger-based frenzy for up to one hour.",
            level: 1
        },
        "Communicate with Kindred Sire": {
            name: "Communicate with Kindred Sire",
            desc: "Allows the caster to join minds with their sire, speaking telepathically over any distance. Requires an item once owned by the sire.",
            system: "Caster meditates for 30 minutes. Conversation lasts 10 minutes per success on the activation roll.",
            level: 1
        },
        "Defense of the Sacred Haven": {
            name: "Defense of the Sacred Haven",
            desc: "Prevents sunlight from entering an area within 20 feet (6 meters). Sunlight reflects off windows or fails to pass through doors. Caster draws sigils in their own blood on windows/doors.",
            system: "Requires 1 hour to perform and costs 1 Blood Point. Lasts as long as the thaumaturge stays within the 20-foot radius.",
            level: 1
        },
        "Deflection of Wooden Doom": {
            name: "Deflection of Wooden Doom",
            desc: "Protects the caster from being staked. The first stake that would pierce the heart disintegrates. Requires a circle of wood and a splinter under the tongue.",
            system: "Requires 1 hour to perform. Lasts until the following dawn or dusk. Nullified if the splinter is removed.",
            level: 1
        },
        "Devil's Touch": {
            name: "Devil's Touch",
            desc: "Curses a mortal to be treated as loathsome by everyone they encounter. Requires a penny placed on the individual.",
            system: "Lasts one night (disappears at sunrise). Works only on mortals. All social interaction with the target is hostile.",
            level: 1
        },
        "Domino of Life": {
            name: "Domino of Life",
            desc: "Simulates a specific human characteristic (eating, breathing, warmth, skin tone) for one night. Requires a vial of fresh human blood.",
            system: "Adds one die to pools for passing as human. Only one trait can be replicated per casting.",
            level: 1
        },
        "Engaging the Vessel of Transference": {
            name: "Engaging the Vessel of Transference",
            desc: "Enchants a container to swap its contents with the blood of anyone holding it. Used to covertly blood bond or obtain samples. Container must be sealed with caster's blood and a sigil.",
            system: "Takes 3 hours (reduced by 15 mins per success). Requires 1 BP sealed inside. Activates on bare skin contact.",
            level: 1
        },
        "Illuminate the Trail of Prey": {
            name: "Illuminate the Trail of Prey",
            desc: "Causes the path of a subject to glow to the caster's eyes. Nullified by water or reaching destination. Requires burning a white satin ribbon held for 24 hours.",
            system: "Caster needs a mental picture or name. Trail glows brighter the fresher it is.",
            level: 1
        },
        "Incantation of the Shepherd": {
            name: "Incantation of the Shepherd",
            desc: "Locates members of the caster's Herd. Caster spins with a glass object held to eyes.",
            system: "Gives location relative to caster. Range 10 miles per Herd dot (5 miles if none). If no Herd background, locates closest 3 vessels fed from 3x.",
            level: 1
        },
        "Purity of Flesh": {
            name: "Purity of Flesh",
            desc: "Cleanses body of foreign material (drugs, poison, bullets, tattoo ink). Caster meditates in a circle of 13 sharp stones.",
            system: "Player spends 1 BP before rolling. Removes physical items; does not cure diseases of the blood or enchantment.",
            level: 1
        },
        "Wake with Evening's Freshness": {
            name: "Wake with Evening's Freshness",
            desc: "Allows awakening at signs of danger during the day. Requires ashes of burned feathers spread over sleeping area.",
            system: "Performed immediately before sleep. If danger arises, caster wakes and ignores Humanity dice caps for the first two turns.",
            level: 1
        },
        "Widow's Spite": {
            name: "Widow's Spite",
            desc: "Causes pain, itch, or sensation in target via a wax or cloth doll. Used for scorn/malice.",
            system: "Produces no mechanical damage, only physical stimulus/distraction.",
            level: 1
        }
    },
    2: {
        "Blood Walk": {
            name: "Blood Walk",
            desc: "Traces the subject's Kindred lineage and blood bonds from a blood sample. Useful for learning Generation, Clan, and Regnants/Thralls.",
            system: "Takes 3 hours (less with successes). Requires 1 BP from subject. 1 Success: See back 1 Gen (to 4th). 3 Successes: Learn all blood bond parties.",
            level: 2
        },
        "Burning Blade": {
            name: "Burning Blade",
            desc: "Temporarily enchants a melee weapon to inflict unhealable aggravated wounds. Weapon flickers with green flame. Caster must cut their own palm (1 lethal unsoakable damage).",
            system: "Cost: 3 BP absorbed by weapon. Weapon inflicts Aggravated damage for a number of successful attacks equal to successes rolled. Cannot 'save' agg strikes.",
            level: 2
        },
        "Donning the Mask of Shadows": {
            name: "Donning the Mask of Shadows",
            desc: "Renders the subject translucent and muffled (not true invisibility). Hard to detect by sight or hearing.",
            system: "Can cast on multiple subjects (equal to Occult rating). Detected only by Auspex > Obfuscate 3. Lasts hours equal to successes.",
            level: 2
        },
        "Eyes of the Night Hawk": {
            name: "Eyes of the Night Hawk",
            desc: "Possess the eyes/ears of a predatory bird. Caster must touch bird to initiate. At end, must put out bird's eyes or suffer 3 nights blindness.",
            system: "Bird returns after flight. Caster mentally controls destination but cannot command combat/tasks. Ends at sunrise.",
            level: 2
        },
        "Machine Blitz": {
            name: "Machine Blitz",
            desc: "Causes machines more complex than a rope-and-pulley to go haywire/stop (engines, phones, life-support). Requires rusted metal or knotted rope.",
            system: "Stops machines instantly as long as caster concentrates. No control granted, just cessation of function.",
            level: 2
        },
        "Principal Focus of Vitae Infusion": {
            name: "Principal Focus of Vitae Infusion",
            desc: "Imbues 1 BP into a small object (coin/marble size). Object turns red/slick. Breaking/releasing it yields the blood.",
            system: "Stores 1 BP. If made for an ally, contains caster's blood (risk of Bond). Ally must be present at creation.",
            level: 2
        },
        "Recure of the Homeland": {
            name: "Recure of the Homeland",
            desc: "Heals aggravated wounds using dirt from mortal birthplace mixed with 2 BP. Self-only.",
            system: "Creates healing paste. One handful heals 1 Aggravated wound. Limit 1 handful per night.",
            level: 2
        },
        "Ward Versus Ghouls": {
            name: "Ward Versus Ghouls",
            desc: "Glyph that causes pain to ghouls who touch an object. 1 BP poured over object. 10 hours to complete.",
            system: "Ghouls touching object suffer 3 dice lethal damage. Crossing/touching consciously requires 1 Willpower point. Wards only one specific object (e.g. door handle, not whole car).",
            level: 2
        },
        "Warding Circle versus Ghouls": {
            name: "Warding Circle versus Ghouls",
            desc: "Creates a circle (default 10ft radius) that Ghouls cannot pass without being burned. Requires 3 BP mortal blood.",
            system: "Ghouls attempting to cross must win Willpower contest (Diff: Thaum + 3). Failure inflicts 3 dice bashing damage and blocks entry. Lasts rest of night (short) or year and a day (long).",
            level: 2
        }
    },
    3: {
        "Clinging of the Insect": {
            name: "Clinging of the Insect",
            desc: "Allows the caster to cling to walls or ceilings like a spider. Requires a live spider under the tongue.",
            system: "Move at half normal rate on walls/ceilings. Lasts one scene or until spider is spat out.",
            level: 3
        },
        "Flesh of Fiery Touch": {
            name: "Flesh of Fiery Touch",
            desc: "Defensive ritual. Anyone touching the subject's skin suffers burns. Subject must swallow a glowing ember (1 agg dmg). Skin takes on a metallic bronze hue.",
            system: "Takes 2 hours. Subject takes 1 unsoakable Aggravated dmg. Toucher takes 1 Aggravated dmg (Diff 6 soak) per voluntary touch. Lasts until sunset.",
            level: 3
        },
        "Incorporeal Passage": {
            name: "Incorporeal Passage",
            desc: "Makes caster insubstantial (can walk through walls, immune to physical attacks). Must follow straight path. Requires a mirror shard.",
            system: "Lasts hours equal to successes on Wits + Survival (diff 6). Cannot move down through earth. Prematurely ends if mirror shard turned away.",
            level: 3
        },
        "Mirror of Second Sight": {
            name: "Mirror of Second Sight",
            desc: "Oval mirror bathed in blood that reflects the true form of supernatural beings (Lupines, Faeries, Ghosts, Mages, True Faith).",
            system: "Requires 1 BP. Mirror reflects true forms (e.g., Man-Wolf for Garou, Nimbus for Mages).",
            level: 3
        },
        "Pavis of Foul Presence": {
            name: "Pavis of Foul Presence",
            desc: "Reverses effects of Presence used against the caster back upon the user. Requires blue silken cord around neck.",
            system: "Lasts until sunrise or until it reverses a number of effects equal to successes. Only affects targeted Presence powers (not passive Majesty).",
            level: 3
        },
        "Sanguine Assistant": {
            name: "Sanguine Assistant",
            desc: "Conjures a temporary servant (1ft high) from lab debris and blood. Trustworthy and immune to mind control.",
            system: "Cost: 5 BP. Servant lasts 1 night/success. Str/Sta 1, Dex/Mental = Caster. Social starts at 0, increases by 1/night. Abilities = Caster - 1.",
            level: 3
        },
        "Shaft of Belated Quiescence": {
            name: "Shaft of Belated Quiescence",
            desc: "Rowan wood stake that breaks off in victim and burrows to the heart over time.",
            system: "Attack: Dex+Melee (Diff 6, Str+1 L). If 1+ dmg dealt, tip breaks. Burrowing: Extended roll (Thaum diff 9) 1/hour. Total 15 successes = Heart paralyzed (Kindred) or Death (Mortal). Surgery to remove is difficult.",
            level: 3
        },
        "Ward versus Lupines": {
            name: "Ward versus Lupines",
            desc: "Identical to Ward versus Ghouls (Level 2) but affects Werewolves. Uses silver dust instead of blood.",
            system: "Lupines touching object suffer 3 dice lethal damage. Crossing/touching consciously requires 1 Willpower point.",
            level: 3
        }
    },
    4: {
        "Bone of Lies": {
            name: "Bone of Lies",
            desc: "Enchants a mortal bone to compel the holder to tell the truth. The bone grows blacker as magic is consumed. Binds the spirit of the deceased.",
            system: "Bone must be 200+ years old. Absorbs 10 BP during casting. Each lie consumes 1 BP and forces immediate truth. Bone useless when black/empty.",
            level: 4
        },
        "Firewalker": {
            name: "Firewalker",
            desc: "Imbues unnatural resistance to fire. Caster must cut off and burn the tip of their own finger (painful, no health damage).",
            system: "Lasts 1 hour. Caster may cast on others. If subject has no Fortitude, soak fire with Stamina. If subject has Fortitude, soak with Stamina + Fortitude.",
            level: 4
        },
        "Heart of Stone": {
            name: "Heart of Stone",
            desc: "Transmutes heart to solid rock. Impervious to staking but kills emotions. Caster lies naked with candle over heart (1 agg damage).",
            system: "Takes 9 hours. Self-only. Benefits: +2x Thaum rating to soak heart attacks, immune to Shaft of Belated Quiescence, +3 Diff to be emotionally manipulated. Drawbacks: Conscience/Empathy drop to 1 (or 0), Social pools halved (except Intimidation).",
            level: 4
        },
        "Splinter Servant": {
            name: "Splinter Servant",
            desc: "Enchants a stake bound in nightshade twine. When torn, it animates into a humanoid form and attacks the target's heart to stake them.",
            system: "Takes 12 hours. Servant stats: Attack pool = Caster's Wits+Occult. Damage = Thaum rating. Move = 30 yards/turn. 3 Health Levels. Attacks heart (Diff 9). Life = 5 turns per success.",
            level: 4
        },
        "Ward versus Kindred": {
            name: "Ward versus Kindred",
            desc: "Identical to Ward versus Ghouls but affects Vampires. Requires a point of the caster's own blood.",
            system: "Cainites touching object suffer 3 dice lethal damage. Crossing/touching consciously requires 1 Willpower point. Does not affect caster.",
            level: 4
        }
    },
    5: {
        "Blood Contract": {
            name: "Blood Contract",
            desc: "Creates an unbreakable agreement written and signed in blood. Both parties compelled to fulfill terms.",
            system: "Takes 3 nights. Breaking terms is impossible without burning the document (which might spontaneously combust if forbidden). Costs 1 BP to create, 1 BP to sign.",
            level: 5
        },
        "Enchant Talisman": {
            name: "Enchant Talisman",
            desc: "Enchants a personal magical item (staff, sword, violin) to amplify will and magic. Must be rigid and approx. 1 yard long.",
            system: "Requires 6 hours/night for one moon cycle. Costs 1 BP/night. Benefits: +1 Diff to magic targeting caster, +2 dice Primary Path, +1 die Rituals/Weapon hit. Caster senses location.",
            level: 5
        },
        "Escape to a True Friend": {
            name: "Escape to a True Friend",
            desc: "Teleports caster to their most trusted friend. Requires a charred circle on the ground. Can take 1 passenger.",
            system: "Takes 6 nights (6 hours/night). Costs 3 BP/night. Circle reusable. Caster steps in and speaks friend's name to transport instantly.",
            level: 5
        },
        "Paper Flesh": {
            name: "Paper Flesh",
            desc: "Enfeebles the subject, making skin brittle and weak. Inscribes true name on paper, cut self, burn paper.",
            system: "Subject's Stamina and Fortitude drop to 1 each. For every Generation below 8th, retain 1 extra point (up to original). Lasts one night.",
            level: 5
        },
        "Ward versus Spirits": {
            name: "Ward versus Spirits",
            desc: "Identical to Ward versus Ghouls but affects Spirits (including summoned Elementals). Uses sea salt.",
            system: "Spirits suffer 3 dice lethal damage. Crossing requires Willpower. Variants: Ward versus Ghosts (powdered marble), Ward versus Demons (holy water).",
            level: 5
        }
    }
};
