/**
 * V20 THAUMATURGY DATA
 * Stores detailed information for Thaumaturgy Paths and Rituals.
 * Separated from disciplines-data.js for modularity.
 */

export const THAUMATURGY_DATA = {
    "Path of Blood": {
        1: {
            name: "A Taste for Blood",
            desc: "Determine how much blood is in a victim, their generation, and if they are a vampire/ghoul.",
            system: "Taste touch of blood. Roll Willpower (Diff 4). Successes reveal info (1: Vamp/Mort/Ghoul, 2: Blood Pool, 3: Generation, etc.)",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Blood Rage",
            desc: "Force another vampire to spend blood against their will.",
            system: "Touch target. Spend 1 BP. Roll Willpower (Diff 5). Each success forces target to spend 1 BP (often inducing hunger/frenzy).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Blood of Potency",
            desc: "Temporarily lower your own Generation.",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Successes lower Gen by 1 (max to 4th or 5th Gen usually). Lasts 1 hour.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Theft of Vitae",
            desc: "Steal blood from a target at a distance.",
            system: "Spend 1 BP. Roll Willpower (Diff 7). Successes = Blood points stolen and transferred to you.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Cauldron of Blood",
            desc: "Boil a subject's blood in their veins, causing massive damage.",
            system: "Spend 1 WP. Touch target. Roll Willpower (Diff 8). Successes = Blood Points boiled. 1 BP boiled = 1 Lethal (Mortal) or 1 Agg (Vampire) damage.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Hands of Destruction": {
        1: {
            name: "Decay",
            desc: "Accelerate the decrepitude of an inanimate target (or dead organic matter).",
            system: "Roll Willpower (Diff 4). Object ages 10 years per minute of touch.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Gnarl Wood",
            desc: "Warp and bend wooden objects with a glance.",
            system: "Spend BP. Roll Willpower (Diff 5). Warps 50 lbs of wood per BP spent.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Acidic Touch",
            desc: "Secrete bilious, acidic fluid from the body. Corrodes metal, wood, and flesh.",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Acid damage is Aggravated. Burns through steel/wood.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Atrophy",
            desc: "Wither a victim's limb, leaving a mummified husk.",
            system: "Touch target. Roll Willpower (Diff 7). Victim resists with Stamina + Athletics (Diff 8). Failure = Crippled limb.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Turn to Dust",
            desc: "Accelerate decrepitude in a victim, aging them decades in moments.",
            system: "Touch target. Roll Willpower (Diff 8). Victim resists with Stamina + Courage (Diff 8). Net successes = Aging (10 years/success).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Elemental Mastery": {
        1: {
            name: "Elemental Strength",
            desc: "Draw upon the strength and resilience of the earth or objects to increase physical prowess.",
            system: "Spend 1 BP. Roll Willpower (Diff 4). Allocate 3 temporary dots to Strength and/or Stamina. Duration = Successes (turns). Spend 1 WP to extend by 1 turn.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Wooden Tongues",
            desc: "Speak with the spirit of any inanimate object to learn what it has experienced.",
            system: "Spend 1 BP. Roll Willpower (Diff 5). Successes determine clarity and relevance of information.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Animate the Unmoving",
            desc: "Cause inanimate objects to move and act as directed. Flexible within reason (guns twist, statues walk).",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Spend 1 WP if < 4 successes. Duration: Line of sight or 1 hour.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Elemental Form",
            desc: "Take the shape of any inanimate object of roughly equal mass (e.g. desk, bicycle).",
            system: "Spend 1 BP. Roll Willpower (Diff 7). 3+ successes needed to use senses/Disciplines in form. Lasts for the night.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Summon Elemental",
            desc: "Summon a spirit of fire, air, earth, or water.",
            system: "Spend 1 BP. Roll Willpower (Diff 8) to summon. Then roll Manipulation + Occult (Diff = Casting Successes + 4) to control.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Green Path": {
        1: {
            name: "Herbal Wisdom",
            desc: "Commune with the spirit of a plant to gain information.",
            system: "Touch plant. Roll Willpower (Diff 4). Successes determine clarity and amount of info.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Speed the Season's Passing",
            desc: "Accelerate plant growth or decay with a touch.",
            system: "Touch plant. Roll Willpower (Diff 5). 1 success for brief spurt, 5 for instant fruit/dust. Can weaken wooden weapons.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Dance of Vines",
            desc: "Animate a mass of vegetation up to user's size.",
            system: "Roll Willpower (Diff 6). Duration: 1 turn/success. Plants have Str/Dex = 1/2 User WP, Brawl = User Brawl - 1.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Verdant Haven",
            desc: "Weave a temporary, impenetrable shelter from vegetation.",
            system: "Roll Willpower (Diff 7). 3 turns to form. Entry requires Wits+Survival > Successes. Protects from sun.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Awaken the Forest Giants",
            desc: "Animate an entire tree to move and fight.",
            system: "Spend 1 BP + 1 BP/success. Roll Willpower (Diff 8). Duration: 1 turn/success. Tree has Str/Stam = Thaumaturgy Rating.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Lure of Flames": {
        1: {
            name: "Candle",
            desc: "Create a small flame (candle-sized). Fire requires no fuel but burns normally once released.",
            system: "Spend 1 BP. Roll Willpower (Diff 4). Successes determine accuracy/range. 1 success = in hand. Fire deals 1 Aggravated dmg/turn (Diff 3 to soak).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Palm of Flame",
            desc: "Create a handful of flame. Can be thrown.",
            system: "Spend 1 BP. Roll Willpower (Diff 5). Successes determine accuracy/range. Fire deals 1 Aggravated dmg/turn (Diff 4 to soak).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Campfire",
            desc: "Create a campfire-sized flame.",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Successes determine accuracy/range. Fire deals 2 Aggravated dmg/turn (Diff 5 to soak).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Bonfire",
            desc: "Create a large bonfire-sized flame.",
            system: "Spend 1 BP. Roll Willpower (Diff 7). Successes determine accuracy/range. Fire deals 2 Aggravated dmg/turn (Diff 7 to soak).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Inferno",
            desc: "Create a massive inferno.",
            system: "Spend 1 BP. Roll Willpower (Diff 8). Successes determine accuracy/range. Fire deals 3 Aggravated dmg/turn (Diff 9 to soak).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Neptune's Might": {
        1: {
            name: "Eyes of the Sea",
            desc: "Peer into a body of standing water to view events that transpired on, in, or around it in the past.",
            system: "Roll Willpower (Diff 4). Successes determine time depth (1 day to 10 years). Requires standing water.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Prison of Water",
            desc: "Animate water to imprison a subject in unbreakable chains of fluid.",
            system: "Roll Willpower (Diff 5). Victim must score equal successes on Strength roll (Diff 8) to break free. Needs water source.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Blood to Water",
            desc: "Transmute liquids to water with a touch. deadly to mortals, weakening to vampires.",
            system: "Touch. Roll Willpower (Diff 6). Successes = Blood Points converted to water. 1 success kills mortals. Vampires suffer wound penalties for BP lost.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Flowing Wall",
            desc: "Animate water to rise up and form an impassable barrier.",
            system: "Touch water. Spend 1 BP + 3 WP. Roll Willpower (Diff 7). 1 success = 10ft x 10ft. Supernaturals need 3 WP successes (Diff 9) to pass.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Dehydrate",
            desc: "Attack living or unliving targets by extracting water from their bodies.",
            system: "Roll Willpower (Diff 8). Victim resists with Stamina + Fortitude (Diff 9). Net successes = Lethal dmg (Mortal) or BP loss (Vampire). Victim must roll Courage (Diff = Caster Succ + 3) or be stunned.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Movement of the Mind": {
        1: {
            name: "One Pound (0.5 kg)",
            desc: "Telekinetically lift, spin, or manipulate objects weighing up to 1 lb / 0.5 kg.",
            system: "Spend 1 BP. Roll Willpower (Diff 4). Duration based on successes (1 turn to Scene). Living subjects contest with Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Twenty Pounds (10 kg)",
            desc: "Telekinetically lift, spin, or manipulate objects weighing up to 20 lbs / 10 kg.",
            system: "Spend 1 BP. Roll Willpower (Diff 5). Duration based on successes. Living subjects contest with Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Two Hundred Pounds (100 kg)",
            desc: "Telekinetically lift up to 200 lbs / 100 kg. Can levitate self (fly at running speed).",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Flight possible. Living subjects contest with Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Five Hundred Pounds (250 kg)",
            desc: "Telekinetically lift up to 500 lbs / 250 kg. Can 'throw' objects dealing damage (Str = Path Rating).",
            system: "Spend 1 BP. Roll Willpower (Diff 7). Thrown objects use Path Rating as Strength. Living subjects contest with Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "One Thousand Pounds (500 kg)",
            desc: "Telekinetically lift, spin, or manipulate objects weighing up to 1000 lbs / 500 kg.",
            system: "Spend 1 BP. Roll Willpower (Diff 8). Duration based on successes. Living subjects contest with Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Path of Conjuring": {
        1: {
            name: "Summon the Simple Form",
            desc: "Conjure simple, inanimate objects (no moving parts, single material).",
            system: "Spend 1 Willpower point per turn to maintain. Successes determine quality (1 shoddy, 5 perfect).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Permanency",
            desc: "Conjured simple objects are permanent. No WP maintenance cost.",
            system: "Invest 3 Blood Points to make the object real. No maintenance required.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Magic of the Smith",
            desc: "Conjure complex objects with moving parts and multiple materials (e.g., guns, bicycles).",
            system: "Permanent. Cost 5 Blood Points. Complex items may require Craft/Science roll in addition to basic roll.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Reverse Conjuration",
            desc: "Banish previously conjured objects (even those created by others) into non-existence.",
            system: "Extended action. Accumulate successes equal to original caster's successes to banish.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Power Over Life",
            desc: "Create simulacra of creatures or people. Mindless, follow simple instructions.",
            system: "Spend 10 Blood Points. Simulacra last 1 week before vanishing. Can be Possessed (Dominate 5).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Path of Corruption": {
        1: {
            name: "Contradict",
            desc: "Interrupt a subject's thought processes, forcing them to reverse their current course of action.",
            system: "Roll Willpower (Diff 4). Target resists with Perception + Subterfuge (Diff = Caster Successes + 2).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Subvert",
            desc: "Release a subject's dark, self-destructive side. Victim acts on suppressed temptations.",
            system: "Eye contact. Roll Willpower (Diff 5). Target resists with Perception + Subterfuge (Diff = Target's Manip + Subterfuge). Duration based on successes.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Dissociate",
            desc: "Break social ties of interpersonal relationships. Victim becomes withdrawn and suspicious.",
            system: "Touch. Roll Willpower (Diff 6). Target resists with Willpower (Diff = Caster's Manip + Empathy). Victim loses 3 dice from Social rolls.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Addiction",
            desc: "Create a powerful psychological dependence on a sensation, substance, or action.",
            system: "Touch. Roll Willpower (Diff 7). Victim resists with Self-Control/Instinct (Diff = Caster Successes + 3). Failure creates instant addiction.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Dependence",
            desc: "Tie the victim's soul to the caster, causing lethargy and helplessness when not in their presence.",
            system: "Conversation. Roll Willpower (Diff 8). Victim rolls Self-Control/Instinct (Diff = Caster Successes + 3). Failure bonds victim for 1 night/success.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Path of Mars": {
        1: {
            name: "War Cry",
            desc: "Focus will to become less susceptible to fear. Adds 1 to Courage and effectively +1 to Willpower rating for resisting hostile effects.",
            system: "Spend 1 BP. Roll Willpower (Diff 4). Lasts one scene. Can only be used once per scene.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Strike True",
            desc: "Next Melee or Brawl attack strikes infallibly (automatic hit). Considered 1 success, no extra damage dice.",
            system: "Spend 1 BP. Roll Willpower (Diff 5). Attack hits automatically. Cannot be used with multiple attacks/split pools.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Wind Dance",
            desc: "Move in a blur, gaining a preternatural edge in dodging.",
            system: "Spend 1 BP. Roll Willpower (Diff 6). Player can dodge any number of attacks with full dice pool for one scene. (Must still split for Attack+Dodge).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Fearless Heart",
            desc: "Augment warrior abilities. +1 to all Physical Attributes for one scene.",
            system: "Spend 1 BP. Roll Willpower (Diff 7). Grants +1 Str, Dex, Stam (can exceed gen max). Must rest 2 hours after or lose blood.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Comrades at Arms",
            desc: "Bestow a lower-level Path of Mars power onto another character.",
            system: "Invoke lower power (pay cost/roll). Then Roll Willpower (Diff 8) and pay cost again to bestow on target.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Path of Technomancy": {
        1: {
            name: "Analyze",
            desc: "Project perceptions into a device to understand its purpose and operation. Can analyze software (+2 diff).",
            system: "Touch device. Roll Willpower (Diff 4). Successes determine depth of knowledge (1 basic, 3 competent, 5 full potential). Duration: Intelligence minutes.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "Burnout",
            desc: "Cause a power surge to damage or destroy electronic devices.",
            system: "Range 10x Willpower yards (+1 diff if not touching). Roll Willpower (Diff 5). Successes determine damage (1 temp, 3 broken, 5 destroyed). Hardened systems resist.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Encrypt/Decrypt",
            desc: "Mystically scramble a device's controls or media content to prevent unauthorized access.",
            system: "Touch device. Roll Willpower (Diff 6). Successes increase difficulty for others to access. Lasts weeks = Permanent Willpower.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Remote Access",
            desc: "Operate an electronic device within line of sight without physical contact.",
            system: "Roll Willpower (Diff 7). Successes = Max dice from relevant Ability usable during control. Duration: Successes in turns.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Telecommute",
            desc: "Project consciousness into the Internet to travel and control devices remotely.",
            system: "Touch device. Spend 1 WP. Roll Willpower (Diff 8). Duration: 5 mins/success. Range based on successes (25 miles to global).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Path of the Father's Vengeance": {
        1: {
            name: "Zillah's Litany",
            desc: "Reveals existing blood bonds and Vinculi tied to the subject. Reveals names and psychic impressions of the masters.",
            system: "Roll Willpower (Diff 4). Success reveals bonds/Vinculi on the subject.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 4",
                defaultDiff: 4
            }
        },
        2: {
            name: "The Crone's Pride",
            desc: "Reduces the target's Appearance to zero. Most Social rolls fail automatically.",
            system: "Roll Willpower (Diff 5). Appearance becomes 0. Social rolls fail (except Intimidation). Lasts one night.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        3: {
            name: "Feast of Ashes",
            desc: "Victim cannot consume blood, only ashes. Ash blood points only allow rising, no Disciplines/healing.",
            system: "Roll Willpower (Diff 6). Victim vomits blood, eats ash (1 pint = 1 BP). Ash BP only used to rise. Lasts one week.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Uriel's Disfavor",
            desc: "Light causes pain. Bright light inflicts Aggravated damage.",
            system: "Roll Willpower (Diff 7). Bright light deals 1 Aggravated damage per turn. Lasts one week.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Valediction",
            desc: "Reverts a diabolist subject to their original Generation, stripping stolen power.",
            system: "Spend 3 turns speaking verse. Roll Willpower (Diff 8). Subject reverts to original Generation (losing Traits > max). Lasts one week.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Weather Control": {
        1: {
            name: "Fog and Breeze",
            desc: "Create fog (sight/hearing impaired, range halved), light breeze (smell impaired), or minor temp change (+/- 10°F/5°C).",
            system: "Roll Willpower (Diff varies based on current weather). Successes = time to take effect (1 day to instant). Area 3-4 miles.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Diff Varies (Weather)",
                defaultDiff: 6
            }
        },
        2: {
            name: "Rain or Snow",
            desc: "Create rain or snow. Perception rolls impaired (+2 diff). Drive rolls (+2 diff).",
            system: "Roll Willpower. Duration/Intensity depends on successes/current weather.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Diff Varies",
                defaultDiff: 6
            }
        },
        3: {
            name: "High Winds",
            desc: "Winds ~30mph. Ranged attacks difficult (+1 firearm, +2 thrown/archery). Dex roll (Diff 6) to stand. Temp change +/- 20°F/10°C.",
            system: "Roll Willpower. Winds buffet area.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Diff Varies",
                defaultDiff: 6
            }
        },
        4: {
            name: "Storm",
            desc: "Combines effects of Rain and High Winds.",
            system: "Roll Willpower. Creates storm conditions.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Diff Varies",
                defaultDiff: 6
            }
        },
        5: {
            name: "Lightning Strike",
            desc: "Call down lightning. Inflicts 10 dice of lethal damage. Armor does not soak.",
            system: "Roll Willpower (to summon) + Perception + Occult (to hit target). Diff 6 (Open), 8 (Shelter), 10 (Indoors).",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Target Shelter (6-10)",
                defaultDiff: 6
            }
        }
    },
    "Thaumaturgical Countermagic": {
        1: {
            name: "Two Dice",
            desc: "The character can attempt to cancel only those powers and rituals that directly affect him, his garments, and objects on his person.",
            system: "Spend 1 BP. Roll 2 dice (Difficulty = Difficulty of the power in use). Each success cancels one of the opponent's successes. Can only oppose powers of equal or lower rating. Halved pool vs non-Thaumaturgy.",
            roll: {
                pool: ["2 Dice"], 
                diffLabel: "Power's Difficulty",
                defaultDiff: 6
            }
        },
        2: {
            name: "Four Dice",
            desc: "Same restrictions as level 1.",
            system: "Spend 1 BP. Roll 4 dice (Difficulty = Difficulty of the power in use). Each success cancels one of the opponent's successes. Can only oppose powers of equal or lower rating. Halved pool vs non-Thaumaturgy.",
            roll: {
                pool: ["4 Dice"],
                diffLabel: "Power's Difficulty",
                defaultDiff: 6
            }
        },
        3: {
            name: "Six Dice",
            desc: "The character can attempt to cancel a Thaumaturgy power that affects anyone or anything in physical contact with him.",
            system: "Spend 1 BP. Roll 6 dice (Difficulty = Difficulty of the power in use). Each success cancels one of the opponent's successes. Can only oppose powers of equal or lower rating. Halved pool vs non-Thaumaturgy.",
            roll: {
                pool: ["6 Dice"],
                diffLabel: "Power's Difficulty",
                defaultDiff: 6
            }
        },
        4: {
            name: "Eight Dice",
            desc: "Same restrictions as level 3.",
            system: "Spend 1 BP. Roll 8 dice (Difficulty = Difficulty of the power in use). Each success cancels one of the opponent's successes. Can only oppose powers of equal or lower rating. Halved pool vs non-Thaumaturgy.",
            roll: {
                pool: ["8 Dice"],
                diffLabel: "Power's Difficulty",
                defaultDiff: 6
            }
        },
        5: {
            name: "Ten Dice",
            desc: "The character can now attempt to cancel a power or ritual that targets anything within a radius equal to his Willpower in yards/meters, or one being used within that radius.",
            system: "Spend 1 BP. Roll 10 dice (Difficulty = Difficulty of the power in use). Each success cancels one of the opponent's successes. Can only oppose powers of equal or lower rating. Halved pool vs non-Thaumaturgy.",
            roll: {
                pool: ["10 Dice"],
                diffLabel: "Power's Difficulty",
                defaultDiff: 6
            }
        }
    }
};
