/**
 * V20 DISCIPLINES DATA
 * Stores detailed information for Discipline levels, including descriptions,
 * system rules, and automated roll configurations.
 */

export const DISCIPLINES_DATA = {
    "Dementation": {
        1: {
            name: "Passion",
            desc: "The vampire can stir a victim's emotions, either heightening them to fever pitch or dulling them to apathy. The Malkavian selects an emotion and a target (who must be visible).",
            system: "Roll Charisma + Empathy (difficulty equals the victim’s Humanity or Path rating). Success lasts for one scene.",
            roll: {
                pool: ["Charisma", "Empathy"],
                diffLabel: "Target Humanity", 
                defaultDiff: 6
            }
        },
        2: {
            name: "The Haunting",
            desc: "The vampire can induce hallucinations in the victim's sensory input.",
            system: "Roll Manipulation + Subterfuge (difficulty of the victim's Perception + Self-Control/Instinct).",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Target Perception + Self-Control",
                defaultDiff: 6
            }
        },
        3: {
            name: "Eyes of Chaos",
            desc: "The vampire can perceive the 'patterns' in randomness and insanity, granting insight or seeing through obfuscation.",
            system: "This power is often passive or requires a Perception + Occult roll to decipher patterns.",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Difficulty varies",
                defaultDiff: 6
            }
        },
        4: {
            name: "Voice of Madness",
            desc: "By speaking, the vampire addresses the hidden madness in the souls of their targets, potentially driving them to frenzy.",
            system: "Roll Manipulation + Empathy (difficulty 7). Victims must roll Self-Control/Instinct (difficulty 7) or fly into frenzy.",
            roll: {
                pool: ["Manipulation", "Empathy"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Total Insanity",
            desc: "The vampire pulls a single target into a waking nightmare of their own subconscious construction.",
            system: "Roll Manipulation + Intimidation (difficulty equals target's Willpower). Target gains 5 derangements for the duration.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target Willpower",
                defaultDiff: 6
            }
        }
    },
    "Animalism": {
        1: {
            name: "Feral Whispers",
            desc: "The vampire creates an empathic connection with a beast, allowing communication or issuance of simple commands via eye contact.",
            system: "No roll to talk. To command, roll Manipulation + Animal Ken. Difficulty 6 (Predatory mammals), 7 (Other mammals/predatory birds), 8 (Reptiles/other birds).",
            roll: {
                pool: ["Manipulation", "Animal Ken"],
                diffLabel: "Diff Varies (6-8)",
                defaultDiff: 6
            }
        },
        2: {
            name: "Beckoning",
            desc: "The vampire calls out in the voice of a specific animal type, summoning all such creatures within earshot.",
            system: "Roll Charisma + Survival (difficulty 6) to determine how many animals respond.",
            roll: {
                pool: ["Charisma", "Survival"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        3: {
            name: "Quell the Beast",
            desc: "The vampire asserts their will over a mortal (animal or human), subduing their Beast to quench strong emotions (fear or hope).",
            system: "Roll Manipulation + Intimidation (Cowing) or Manipulation + Empathy (Soothing). Difficulty 7. Extended action (Target Willpower successes needed).",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target WP (Extended)",
                defaultDiff: 7
            }
        },
        4: {
            name: "Subsume the Spirit",
            desc: "The vampire mentally possesses an animal, pushing its spirit aside to control its body.",
            system: "Roll Manipulation + Animal Ken (difficulty 8) while looking into animal's eyes. Successes determine Mental Discipline usage.",
            roll: {
                pool: ["Manipulation", "Animal Ken"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        5: {
            name: "Drawing Out the Beast",
            desc: "The vampire releases their feral urges upon another, causing the victim to frenzy immediately.",
            system: "Roll Manipulation + Self-Control/Instinct (difficulty 8). Failure sends the vampire into frenzy.",
            roll: {
                pool: ["Manipulation", "Self-Control/Instinct"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        6: {
            name: "Animal Succulence",
            desc: "The vampire can draw more sustenance from beasts. Animal blood counts as 2 blood points for every 1 drunk.",
            system: "Passive. No roll. Increases value of animal blood, but heightens craving for human blood over time.",
            roll: null
        },
        7: {
            name: "Conquer the Beast",
            desc: "The vampire can enter or control frenzy at will.",
            system: "Roll Willpower (difficulty 7 for voluntary frenzy, 9 to control involuntary).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Diff 7 or 9",
                defaultDiff: 7
            }
        },
        8: {
            name: "Taunt the Caged Beast",
            desc: "The vampire can unleash the Beast in another individual with a mere touch.",
            system: "Spend 1 WP and roll Manipulation + Empathy (difficulty 7). Victim resists with Self-Control/Instinct (Diff 5 + Successes).",
            roll: {
                pool: ["Manipulation", "Empathy"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        9: {
            name: "Unchain the Beast",
            desc: "The vampire awakens the Beast of an enemy to physically tear them apart from within.",
            system: "Spend 3 BP and roll Manipulation + Intimidation (Diff = Target Self-Control/Instinct + 4). Each success deals 1 Aggravated damage.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target SC + 4",
                defaultDiff: 8
            }
        }
    },
    "Auspex": {
        1: {
            name: "Heightened Senses",
            desc: "Increases acuity of all senses, doubling range/clarity. Can see in pitch black (ranged attacks possible).",
            system: "Reflexive to activate. Reduces difficulty of perception rolls by Auspex rating. Sudden stimuli can blind/deafen.",
            roll: null
        },
        2: {
            name: "Aura Perception",
            desc: "Perceive psychic auras of mortals and supernaturals. Colors reflect emotions and nature.",
            system: "Roll Perception + Empathy (difficulty 8). Successes reveal: 1 (Shade), 2 (Color), 3 (Patterns), 4 (Shifts), 5 (Mixtures).",
            roll: {
                pool: ["Perception", "Empathy"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        3: {
            name: "The Spirit's Touch",
            desc: "Read psychic impressions left on an object by the last person to handle it.",
            system: "Roll Perception + Empathy. Difficulty varies by age/strength of impression (4 fresh/strong to 9 old/weak).",
            roll: {
                pool: ["Perception", "Empathy"],
                diffLabel: "Diff Varies (4-9)",
                defaultDiff: 6
            }
        },
        4: {
            name: "Telepathy",
            desc: "Link minds to communicate silently or read thoughts.",
            system: "Roll Intelligence + Subterfuge (Diff = Target Willpower). 1 success to project/read surface. 5+ for deep secrets.",
            roll: {
                pool: ["Intelligence", "Subterfuge"],
                diffLabel: "Target Willpower",
                defaultDiff: 6
            }
        },
        5: {
            name: "Psychic Projection",
            desc: "Project senses and consciousness out of the physical body as an astral form.",
            system: "Spend 1 WP and roll Perception + Awareness. Diff: 5 (Sight), 7 (Nearby/Familiar), 9 (Far/Unfamiliar).",
            roll: {
                pool: ["Perception", "Awareness"],
                diffLabel: "Diff Varies (5-9)",
                defaultDiff: 7
            }
        },
        6: {
            name: "Clairvoyance",
            desc: "Perceive distant events by concentrating on a familiar person, place, or object.",
            system: "Roll Perception + Empathy (difficulty 6). Success allows viewing for 1 turn per success.",
            roll: {
                pool: ["Perception", "Empathy"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        7: {
            name: "Karmic Sight",
            desc: "Probe the inner workings of a subject's mind and soul, revealing Nature, Demeanor, Path, and Karmic state.",
            system: "Roll Perception + Empathy (Diff = Target Willpower). Successes reveal progressively deeper spiritual info.",
            roll: {
                pool: ["Perception", "Empathy"],
                diffLabel: "Target Willpower",
                defaultDiff: 6
            }
        },
        8: {
            name: "Mirror Reflex",
            desc: "Telepathically anticipate an opponent's physical moves in combat.",
            system: "Spend 1 BP and roll Perception + (Opponent's Combat Skill). Difficulty = Target Manipulation + Skill. Successes add to your dice pool next turn.",
            roll: {
                pool: ["Perception", "Brawl"], // Default to Brawl, user can adjust
                diffLabel: "Target Manip + Skill",
                defaultDiff: 6
            }
        },
        9: {
            name: "Psychic Assault",
            desc: "Direct mind-to-mind attack using sheer force of will to crush the target's psyche.",
            system: "Spend 3 BP and roll Manipulation + Intimidation (contested by Target Willpower). Successes inflict WP loss or Lethal damage.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Contested (Target WP)",
                defaultDiff: 6
            }
        }
    }
};
