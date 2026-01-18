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
        },
        6: {
            name: "Lingering Malaise",
            desc: "Infects the victim's mind with a permanent derangement.",
            system: "Roll Manipulation + Empathy (Diff = Target's current Willpower). Target resists with Permanent Willpower (Diff 8).",
            roll: {
                pool: ["Manipulation", "Empathy"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        7: {
            name: "Shattered Mirror",
            desc: "Transfers the vampire's own deranged mindset into a victim, spreading insanity like a virus.",
            system: "Roll Charisma + Subterfuge (Diff = Target's current WP) vs Target's Wits + Self-Control (Diff = User's current WP).",
            roll: {
                pool: ["Charisma", "Subterfuge"],
                diffLabel: "Contested (Target WP)",
                defaultDiff: 6
            }
        },
        8: {
            name: "Restructure",
            desc: "Twists a victim's psyche at the most basic level, changing their Nature permanently.",
            system: "Roll Manipulation + Subterfuge (Diff = Target's Wits + Subterfuge). Successes must equal/exceed Target's Self-Control.",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Target Wits+Subt",
                defaultDiff: 7
            }
        },
        9: {
            name: "Lunatic Eruption",
            desc: "A psychic nuclear bomb that incites every intelligent being within miles into an orgy of bloodlust and rage.",
            system: "Spend 4 WP and roll Stamina + Intimidation (Diff 8). Area depends on successes (1 block to entire metro area).",
            roll: {
                pool: ["Stamina", "Intimidation"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
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
                pool: ["Perception", "Brawl"], 
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
    },
    "Celerity": {
        1: {
            name: "Alacrity",
            desc: "Moves with extraordinary speed. Passive: Adds 1 die to Dexterity rolls.",
            system: "Spend 1 Blood Point to take 1 extra physical action at the end of the turn (ignoring multiple action penalties).",
            roll: null
        },
        2: {
            name: "Swiftness",
            desc: "Passive: Adds 2 dice to Dexterity rolls.",
            system: "Spend 1 Blood Point to take up to 2 extra physical actions at the end of the turn.",
            roll: null
        },
        3: {
            name: "Rapidity",
            desc: "Passive: Adds 3 dice to Dexterity rolls.",
            system: "Spend 1 Blood Point to take up to 3 extra physical actions at the end of the turn.",
            roll: null
        },
        4: {
            name: "Legerity",
            desc: "Passive: Adds 4 dice to Dexterity rolls.",
            system: "Spend 1 Blood Point to take up to 4 extra physical actions at the end of the turn.",
            roll: null
        },
        5: {
            name: "Fleetness",
            desc: "Passive: Adds 5 dice to Dexterity rolls.",
            system: "Spend 1 Blood Point to take up to 5 extra physical actions at the end of the turn.",
            roll: null
        },
        6: {
            name: "Projectile",
            desc: "Transfer preternatural speed into a thrown or fired object.",
            system: "Spend 1 BP. Decide how many Celerity dots to invest; each dot becomes an automatic success to damage if the attack hits.",
            roll: null
        },
        7: {
            name: "Flower of Death",
            desc: "Apply full Celerity rating to every hand-to-hand or melee attack made during the scene.",
            system: "Spend 4 BP. Bonus Dexterity dice are added to every melee/brawl attack pool for the scene.",
            roll: null
        },
        8: {
            name: "Zephyr",
            desc: "Run so fast you can traverse water, walls, or ceilings.",
            system: "Spend 1 BP + 1 WP. Cannot attack while moving. Observers need Perception + Alertness (Diff 7) to see you.",
            roll: null
        }
    },
    "Chimerstry": {
        1: {
            name: "Ignis Fatuus",
            desc: "Conjure a minor, static mirage confounding one sense (e.g. smell, sight). No substance.",
            system: "Spend 1 Willpower. Lasts until creator leaves or is disbelieved.",
            roll: null
        },
        2: {
            name: "Fata Morgana",
            desc: "Create static illusions appealing to all senses. No solid presence.",
            system: "Spend 1 Willpower + 1 Blood Point. Persists until dispelled.",
            roll: null
        },
        3: {
            name: "Apparition",
            desc: "Give motion to an illusion created with Ignis Fatuus or Fata Morgana.",
            system: "Spend 1 Blood Point per specific motion. Complex actions require Willpower roll.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        4: {
            name: "Permanency",
            desc: "Allows a mirage to persist indefinitely, even when the vampire cannot see it.",
            system: "Spend 1 Blood Point to make the illusion permanent until dissolved.",
            roll: null
        },
        5: {
            name: "Horrid Reality",
            desc: "Project hallucinations directly into a victim's mind, causing real damage (lethal, unsoakable).",
            system: "Spend 2 Willpower. Roll Manipulation + Subterfuge (Diff = Perception + Self-Control/Instinct). Each success = 1 Lethal (Mind).",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Target Percep + SC",
                defaultDiff: 6
            }
        },
        6: {
            name: "Fatuus Mastery",
            desc: "Removes WP/BP cost for levels 1-3. Maintain illusions with less concentration.",
            system: "Passive. Negates costs for Ignis Fatuus, Fata Morgana, Apparition.",
            roll: null
        },
        7: {
            name: "Far Fatuus",
            desc: "Project illusions to any area the vampire can see or visualize (familiarity affects difficulty).",
            system: "Roll Perception + Subterfuge. Diff 6 (Familiar) to 9 (Described). Then use other Chimerstry powers.",
            roll: {
                pool: ["Perception", "Subterfuge"],
                diffLabel: "Diff Varies (6-9)",
                defaultDiff: 6
            }
        },
        8: {
            name: "Synesthesia",
            desc: "Shuffle a victim's senses, making meaningful interaction impossible.",
            system: "Spend 1 WP and roll Manipulation + Intimidation (Diff = Target WP). For crowds, Diff 7.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target WP (or 7)",
                defaultDiff: 6
            }
        },
        9: {
            name: "Mayaparisatya",
            desc: "Alter or create real objects/creatures, or erase them from existence.",
            system: "Spend 10 BP + 1 Permanent WP. Roll Manipulation + Subterfuge. Diff 6 (Objects) or Target WP (Creatures).",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Diff 6 or Target WP",
                defaultDiff: 6
            }
        }
    },
    "Dominate": {
        1: {
            name: "Command",
            desc: "Lock eyes and speak a one-word command that must be obeyed instantly (e.g. 'Stop', 'Run').",
            system: "Roll Manipulation + Intimidation (Diff = Target's current Willpower). Cannot force self-harm.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        2: {
            name: "Mesmerize",
            desc: "Implant a false thought or hypnotic suggestion in the subject's subconscious.",
            system: "Roll Manipulation + Leadership (Diff = Target's current Willpower). Successes determine complexity possible.",
            roll: {
                pool: ["Manipulation", "Leadership"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        3: {
            name: "The Forgetful Mind",
            desc: "Delve into memories, stealing or re-creating them. Operates like hypnosis (asking questions).",
            system: "Roll Wits + Subterfuge (Diff = Target's current Willpower). Successes determine degree of alteration.",
            roll: {
                pool: ["Wits", "Subterfuge"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        4: {
            name: "Conditioning",
            desc: "Make a subject more pliant over time, eventually removing their free will entirely.",
            system: "Extended action. Roll Charisma + Leadership (Diff = Target's current Willpower). Needs 5-10x Target's Self-Control.",
            roll: {
                pool: ["Charisma", "Leadership"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        5: {
            name: "Possession",
            desc: "Move consciousness into a mortal's body, controlling it completely while own body is torpid.",
            system: "Strip Target WP first (Charisma + Intimidation vs Willpower). Then roll Manipulation + Intimidation (Diff 7) to possess.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Diff 7 (After WP Strip)",
                defaultDiff: 7
            }
        },
        6: {
            name: "Chain the Psyche",
            desc: "Inflict incapacitating pain on a conditioned victim who attempts to break commands.",
            system: "Spend 1 BP. If victim resists, roll Manipulation + Intimidation (Diff = Victim Stamina + Empathy). Successes = Turns of agony.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target Stamina + Empathy",
                defaultDiff: 6
            }
        },
        7: {
            name: "Obedience",
            desc: "Command loyalty with the lightest brush of a hand instead of eye contact.",
            system: "Passive. Allows Dominate to work via skin contact. Eye contact still works.",
            roll: null
        },
        8: {
            name: "Mass Manipulation",
            desc: "Command small crowds by manipulating the strongest minds within the group.",
            system: "Roll for main Dominate power. Difficulty is highest WP in group. Extra successes target additional people.",
            roll: null
        },
        9: {
            name: "Speak Through the Blood",
            desc: "Issue commands to every vampire of your lineage (descendants), even across continents.",
            system: "Spend 1 Permanent WP. Roll Manipulation + Leadership (Diff 4 + Generations). Commands take ~10 years to manifest.",
            roll: {
                pool: ["Manipulation", "Leadership"],
                diffLabel: "4 + Generations",
                defaultDiff: 8
            }
        }
    }
};
