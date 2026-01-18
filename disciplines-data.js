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
    },
    "Fortitude": {
        1: {
            name: "Endurance",
            desc: "Passive: Adds 1 die to Stamina rolls for soaking bashing/lethal damage. Can use Fortitude to soak aggravated damage.",
            system: "Passive effect.",
            roll: null
        },
        2: {
            name: "Mettle",
            desc: "Passive: Adds 2 dice to Stamina rolls for soaking bashing/lethal damage. Can use Fortitude to soak aggravated damage.",
            system: "Passive effect.",
            roll: null
        },
        3: {
            name: "Resilience",
            desc: "Passive: Adds 3 dice to Stamina rolls for soaking bashing/lethal damage. Can use Fortitude to soak aggravated damage.",
            system: "Passive effect.",
            roll: null
        },
        4: {
            name: "Resistance",
            desc: "Passive: Adds 4 dice to Stamina rolls for soaking bashing/lethal damage. Can use Fortitude to soak aggravated damage.",
            system: "Passive effect.",
            roll: null
        },
        5: {
            name: "Vigor",
            desc: "Passive: Adds 5 dice to Stamina rolls for soaking bashing/lethal damage. Can use Fortitude to soak aggravated damage.",
            system: "Passive effect.",
            roll: null
        },
        6: {
            name: "Personal Armor",
            desc: "Shatters weapons that strike the vampire.",
            system: "Spend 2 BP. When hit, roll Fortitude (Diff 8). If successes exceed attacker's, normal weapon breaks. Attacker takes damage equal to impact.",
            roll: {
                pool: ["Fortitude"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        7: {
            name: "Shared Strength",
            desc: "Lend Fortitude to another being by marking them with blood.",
            system: "Spend 1 WP + X Blood (1 BP per dot shared). Roll Stamina + Survival (Diff 8, or 9 if target is supernatural).",
            roll: {
                pool: ["Stamina", "Survival"],
                diffLabel: "Diff 8 or 9",
                defaultDiff: 8
            }
        },
        8: {
            name: "Adamantine",
            desc: "Like Personal Armor, but the vampire takes NO damage from attacks that shatter on their skin.",
            system: "Functions as Personal Armor, but negates damage if successful.",
            roll: {
                pool: ["Fortitude"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Obfuscate": {
        1: {
            name: "Cloak of Shadows",
            desc: "Hide in shadows/cover. Must remain silent and motionless.",
            system: "No roll required if criteria met. Fades if user moves/attacks or if directly observed.",
            roll: null
        },
        2: {
            name: "Unseen Presence",
            desc: "Move without being seen. Minds slide off the vampire's presence.",
            system: "Wits + Stealth only if risking exposure (e.g. creaky floor). Diff varies. Speaking/attacking breaks effect.",
            roll: {
                pool: ["Wits", "Stealth"],
                diffLabel: "Diff Varies (Env)",
                defaultDiff: 6
            }
        },
        3: {
            name: "Mask of a Thousand Faces",
            desc: "Influence perception to appear as someone else (stranger or specific person).",
            system: "Roll Manipulation + Performance (Difficulty 7). Successes determine accuracy/detail of disguise.",
            roll: {
                pool: ["Manipulation", "Performance"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        4: {
            name: "Vanish from the Mind's Eye",
            desc: "Disappear from plain view, even directly in front of someone.",
            system: "Roll Charisma + Stealth (Diff = Target Wits + Alertness). 3 successes to fully vanish. Startling to witnesses.",
            roll: {
                pool: ["Charisma", "Stealth"],
                diffLabel: "Target Wits+Alert",
                defaultDiff: 6
            }
        },
        5: {
            name: "Cloak the Gathering",
            desc: "Extend Obfuscate to cover a group. Vampire must stay present.",
            system: "Conceals 1 extra person per dot of Stealth. Uses the base power's roll (e.g. Wits+Stealth for Unseen Presence).",
            roll: {
                pool: ["Wits", "Stealth"],
                diffLabel: "Diff Varies",
                defaultDiff: 6
            }
        },
        6: {
            name: "Conceal",
            desc: "Mask a large inanimate object (up to house size) or vehicle.",
            system: "Functions as Unseen Presence. Hides contents. Traffic flows around concealed vehicles.",
            roll: {
                pool: ["Wits", "Stealth"],
                diffLabel: "Diff Varies",
                defaultDiff: 6
            }
        },
        7: {
            name: "Veil of Blissful Ignorance",
            desc: "Force Obfuscate upon an unwilling victim, removing them from others' notice.",
            system: "Touch victim. Spend 1 BP and roll Wits + Stealth (Diff = Victim Appearance + 3). Successes = Duration.",
            roll: {
                pool: ["Wits", "Stealth"],
                diffLabel: "Target App + 3",
                defaultDiff: 6
            }
        },
        8: {
            name: "Old Friend",
            desc: "Probe subconscious to appear as the individual the victim trusts most.",
            system: "Roll Manipulation + Subterfuge (Diff = Perception + Alertness). Affects one victim at a time.",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Target Percep+Alert",
                defaultDiff: 6
            }
        },
        9: {
            name: "Create Name",
            desc: "Create a completely new, flawless identity (face, aura, nature) that fools even Auspex.",
            system: "Extended roll: Intelligence + Subterfuge (Diff 8). 20 successes needed. 3 hours/night.",
            roll: {
                pool: ["Intelligence", "Subterfuge"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "Obtenebration": {
        1: {
            name: "Shadow Play",
            desc: "Control ambient shadows. Gain +1 Stealth/Intimidation, +1 Diff to ranged attacks against you. Can smother victims (Stamina drain).",
            system: "Spend 1 BP for scene. No roll to activate. Opponents hampered by shadows lose 1 die from Stamina pools.",
            roll: null
        },
        2: {
            name: "Shroud of Night",
            desc: "Create a cloud of inky blackness (10ft diam) that obscures light and sound.",
            system: "Roll Manipulation + Occult (Diff 7). Successes = Size. Victims inside suffer +2 Diff (Blind) and -2 Stamina dice.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        3: {
            name: "Arms of the Abyss",
            desc: "Summon tentacles from shadows to grasp or constrict foes.",
            system: "Spend 1 BP. Roll Manipulation + Occult (Diff 7). Each success = 1 Tentacle (Str/Dex = Obtenebration rating).",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        4: {
            name: "Black Metamorphosis",
            desc: "Become a demonic hybrid of matter and shadow. +3 Intimidation, tentacles reduce foe Stamina/Soak by 2.",
            system: "Spend 2 BP. Roll Manipulation + Courage (Diff 7). Failure = No change. Botch = 2 Lethal unsoakable.",
            roll: {
                pool: ["Manipulation", "Courage"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Tenebrous Form",
            desc: "Physically become a patch of shadow. Invulnerable to physical (except fire/sun). Can slither/envelop.",
            system: "Spend 3 BP. Transformation takes time based on Gen. Immune to phys attacks. Can use mental Disciplines.",
            roll: null
        },
        6: {
            name: "The Darkness Within",
            desc: "Vomit a turbulent shadow that engulfs a target, draining blood.",
            system: "Spend 1 BP and roll Willpower (Diff 6). Target loses 1 BP/turn (Resist with Stamina Diff 6).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        7: {
            name: "Shadow Twin",
            desc: "Animate a shadow into a semi-sentient servant.",
            system: "Spend 1 BP and roll Willpower (Diff 8). Twin has half user's stats. Lasts 1 hour/success.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        8: {
            name: "Oubliette",
            desc: "Entrap a victim in a chamber of pure darkness with no air.",
            system: "Spend 1 BP to create. To trap: Contested Wits + Larceny vs Target Dex + Occult (Diff 7).",
            roll: {
                pool: ["Wits", "Larceny"],
                diffLabel: "Contested (Diff 7)",
                defaultDiff: 7
            }
        },
        9: {
            name: "Ahriman's Demesne",
            desc: "Summon a 50ft void that destroys everything within it.",
            system: "Spend 2 WP, concentrate 3 turns. Roll Manipulation + Occult (Diff 6). Successes = Aggravated Damage (automatic levels).",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        }
    },
    "Potence": {
        1: {
            name: "Prowess",
            desc: "Passive: Adds 1 die to Strength rolls.",
            system: "Spend 1 Blood Point to turn Potence dice into automatic successes for one turn. Affects Strength rolls and Melee/Brawl damage.",
            roll: null
        },
        2: {
            name: "Might",
            desc: "Passive: Adds 2 dice to Strength rolls.",
            system: "Spend 1 Blood Point to turn Potence dice into automatic successes for one turn.",
            roll: null
        },
        3: {
            name: "Vigor",
            desc: "Passive: Adds 3 dice to Strength rolls.",
            system: "Spend 1 Blood Point to turn Potence dice into automatic successes for one turn.",
            roll: null
        },
        4: {
            name: "Intensity",
            desc: "Passive: Adds 4 dice to Strength rolls.",
            system: "Spend 1 Blood Point to turn Potence dice into automatic successes for one turn.",
            roll: null
        },
        5: {
            name: "Puissance",
            desc: "Passive: Adds 5 dice to Strength rolls.",
            system: "Spend 1 Blood Point to turn Potence dice into automatic successes for one turn.",
            roll: null
        },
        6: {
            name: "Imprint",
            desc: "Squeeze objects/surfaces to leave permanent imprints or create handholds.",
            system: "Spend 1 BP. Lasts for one scene. Can crush thin objects or dig into steel/stone.",
            roll: null
        },
        7: {
            name: "Earthshock",
            desc: "Strike the ground to create a shockwave geyser under a distant target.",
            system: "Spend 2 BP. Roll Dexterity + Brawl. Attack can be dodged (Diff +2). Range: 10ft per Potence level.",
            roll: {
                pool: ["Dexterity", "Brawl"],
                diffLabel: "Normal Attack",
                defaultDiff: 6
            }
        },
        8: {
            name: "Flick",
            desc: "A slight gesture (snap, wave) unleashes a full-force physical blow at range.",
            system: "Spend 1 BP. Roll Dexterity + Brawl (Diff 6). Range: Perception limit. Deals full punch damage.",
            roll: {
                pool: ["Dexterity", "Brawl"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        }
    },
    "Presence": {
        1: {
            name: "Awe",
            desc: "Draws others to be receptive to the vampire's point of view. Good for mass communication.",
            system: "Spend 1 BP. Roll Charisma + Performance (Diff 7). Successes determine # of people. Persists for scene.",
            roll: {
                pool: ["Charisma", "Performance"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        2: {
            name: "Dread Gaze",
            desc: "Reveal true vampiric nature (fangs, claws, hiss) to terrify a victim into madness or flight.",
            system: "Roll Charisma + Intimidation (Diff = Target Wits + Courage). Successes subtract from victim's dice pools next turn.",
            roll: {
                pool: ["Charisma", "Intimidation"],
                diffLabel: "Target Wits + Courage",
                defaultDiff: 6
            }
        },
        3: {
            name: "Entrancement",
            desc: "Make a victim a willing servant through supernatural devotion.",
            system: "Spend 1 BP. Roll Appearance + Empathy (Diff = Target's current Willpower). Successes = Duration (1 hour to 1 year).",
            roll: {
                pool: ["Appearance", "Empathy"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        4: {
            name: "Summon",
            desc: "Call any person ever met to come to the vampire's location immediately.",
            system: "Spend 1 BP. Roll Charisma + Subterfuge (Diff 5 base, +2 if met briefly). Successes determine speed/haste.",
            roll: {
                pool: ["Charisma", "Subterfuge"],
                diffLabel: "Diff 5 (Base)",
                defaultDiff: 5
            }
        },
        5: {
            name: "Majesty",
            desc: "Inspire universal respect, devotion, and fear. Almost impossible to attack or be rude to.",
            system: "Spend 1 WP. No roll to activate. Subjects must roll Courage (Diff = Charisma + Intimidation) to act against you.",
            roll: {
                pool: ["Charisma", "Intimidation"], 
                diffLabel: "Resist Diff (For Foe)",
                defaultDiff: 6
            }
        },
        6: {
            name: "Love",
            desc: "Simulate a blood bond without the blood. Victim feels intense attachment.",
            system: "Spend 1 BP. Roll Charisma + Subterfuge (Diff = Target's current WP). Successes reduce victim's social dice pools.",
            roll: {
                pool: ["Charisma", "Subterfuge"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        7: {
            name: "Paralyzing Glance",
            desc: "Freeze a victim in sheer terror with a look.",
            system: "Roll Manipulation + Intimidation (Diff = Target's current WP). Victim rendered catatonic for duration based on successes.",
            roll: {
                pool: ["Manipulation", "Intimidation"],
                diffLabel: "Target Current WP",
                defaultDiff: 6
            }
        },
        8: {
            name: "Spark of Rage",
            desc: "Incitate anger, arguments, and frenzy in others with minimal effort.",
            system: "Spend 1 BP. Roll Manipulation + Subterfuge (Diff 8). Vampires must resist Frenzy.",
            roll: {
                pool: ["Manipulation", "Subterfuge"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        9: {
            name: "Pulse of the City",
            desc: "Control the emotional climate of an entire city region.",
            system: "Spend 1 WP. Roll Charisma + Streetwise (Diff 9). Successes determine duration of projected emotion.",
            roll: {
                pool: ["Charisma", "Streetwise"],
                diffLabel: "Difficulty 9",
                defaultDiff: 9
            }
        }
    },
    "Protean": {
        1: {
            name: "Eyes of the Beast",
            desc: "The vampire sees perfectly well in pitch darkness, not requiring a light source. Eyes glow red.",
            system: "No roll. 1 turn to change. +1 Diff to Social rolls with mortals if eyes visible.",
            roll: null
        },
        2: {
            name: "Feral Claws",
            desc: "The vampire's nails transform into long, bestial claws. Wickedly sharp.",
            system: "Spend 1 BP. 1 turn. Claws deal Str+1 Aggravated damage. -2 Diff to climbing.",
            roll: null
        },
        3: {
            name: "Earth Meld",
            desc: "Enables the vampire to become one with the earth, sinking into bare ground.",
            system: "Spend 1 BP. 1 turn. Sink into bare earth. Immune to sun.",
            roll: null
        },
        4: {
            name: "Shape of the Beast",
            desc: "Transform into a wolf or bat.",
            system: "Spend 1 BP. 3 turns (reduce with blood). Wolf (Str+1 Agg, x2 Speed) or Bat (Fly, Str 1).",
            roll: null
        },
        5: {
            name: "Mist Form",
            desc: "Turn into mist. Immune to physical attacks.",
            system: "Spend 1 BP. 3 turns. Insubstantial mist. Immune to physical, -1 die from fire/sun.",
            roll: null
        },
        6: {
            name: "Earth Control",
            desc: "Move through the earth as if it were water.",
            system: "Passive. Move through earth while Melded at half walk speed. Sense surroundings 50yds.",
            roll: null
        },
        7: {
            name: "Shape of the Beast's Wrath",
            desc: "Shift into a huge, monstrous form (War Form).",
            system: "Spend 3 BP. 3 turns. War Form: +7 Physical Attributes (max 5/attr). Deals Str+2 Agg. Social -> 1.",
            roll: null
        },
        8: {
            name: "Spectral Body",
            desc: "Become completely insubstantial but visible. Can ignore gravity.",
            system: "Spend 3 BP. 1 turn. Completely insubstantial but visible. Flight (walk speed). Ignore gravity.",
            roll: null
        },
        9: {
            name: "Inward Focus",
            desc: "Heighten internal efficiency to undreamed levels.",
            system: "Spend 4 BP + 2/turn. Extra actions = Dex. Damage +3 dice. Halve incoming damage after soak.",
            roll: null
        }
    },
    "Quietus": {
        1: {
            name: "Silence of Death",
            desc: "Create a 20ft radius of absolute silence around the vampire.",
            system: "Spend 1 BP. Lasts 1 hour. Silences all noise inside zone.",
            roll: null
        },
        2: {
            name: "Scorpion's Touch",
            desc: "Convert blood to poison that reduces Stamina.",
            system: "Spend BP + Roll Willpower (Diff 6). On hit, target loses Stamina = BP spent. Resist with Stamina + Fortitude.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        3: {
            name: "Dagon's Call",
            desc: "Drown a target in their own blood after touching them.",
            system: "Spend 1 WP. Contested Stamina roll (Diff = Opponent's Perm WP). Successes = Lethal Damage.",
            roll: {
                pool: ["Stamina"],
                diffLabel: "Target Perm WP",
                defaultDiff: 6
            }
        },
        4: {
            name: "Baal's Caress",
            desc: "Coat a bladed weapon with blood to deal Aggravated damage.",
            system: "No roll. Spend 1 BP per hit. Weapon inflicts Aggravated damage.",
            roll: null
        },
        5: {
            name: "Taste of Death",
            desc: "Spit caustic blood at a target.",
            system: "Roll Stamina + Athletics (Diff 6). Range: 10ft per Str+Pot. 2 dice Aggravated dmg per BP spent.",
            roll: {
                pool: ["Stamina", "Athletics"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        6: {
            name: "Selective Silence",
            desc: "Silence only specific targets or objects.",
            system: "Spend 2 BP. Roll Stamina + Stealth (Diff 7). Each success silences one target for mins = Willpower.",
            roll: {
                pool: ["Stamina", "Stealth"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        7: {
            name: "Baal's Bloody Talons",
            desc: "Corrosive blood poison that deals extra damage and destroys weapons.",
            system: "Spend BP. Roll Willpower (Diff 7). Weapon deals Agg + Extra dice (Successes + BP). Weapon degrades.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        8: {
            name: "Songs of Distant Vitae",
            desc: "Overwhelm victim with terrifying flashbacks from their blood's history.",
            system: "Spend 4 BP. Roll Wits + Intimidation vs Target Perm WP (Diff 7). Net successes cause Stun/Fear.",
            roll: {
                pool: ["Wits", "Intimidation"],
                diffLabel: "Target Perm WP",
                defaultDiff: 7
            }
        },
        9: {
            name: "Condemn the Sins of the Father",
            desc: "Apply a lesser Quietus power to a victim's entire lineage.",
            system: "Spend 1 Perm WP + 10 BP. Roll Stamina + Occult (Diff 4 + Generations). Affects all descendants.",
            roll: {
                pool: ["Stamina", "Occult"],
                diffLabel: "4 + Gens",
                defaultDiff: 8
            }
        }
    },
    "Serpentis": {
        1: {
            name: "Eyes of the Serpent",
            desc: "Hypnotic gaze that immobilizes mortals. Supernaturals must resist to act.",
            system: "No roll. Mortals frozen while eye contact maintained. Supernaturals resist with Willpower (Diff 9).",
            roll: null
        },
        2: {
            name: "The Tongue of the Asp",
            desc: "Lengthen tongue to 18 inches, forked. Deals Agg damage and can drink blood on hit.",
            system: "Attack with tongue. Difficulty 6. Damage = Strength (Aggravated). Halves darkness penalties.",
            roll: null
        },
        3: {
            name: "The Skin of the Adder",
            desc: "Transform skin into scaly hide. Flexible and tough.",
            system: "Spend 1 BP + 1 WP. Soak Diff 5. Can soak Agg (claws/fangs) with Stamina. Bite +1 die. Appearance drops to 1.",
            roll: null
        },
        4: {
            name: "The Form of the Cobra",
            desc: "Transform into a huge black cobra (10ft long). Venom is fatal to mortals.",
            system: "Spend 1 BP. 3 turns. Venom kills mortals in 1 min. Supernaturals take (10 - Stamina - Fortitude) Agg damage over 5 mins.",
            roll: null
        },
        5: {
            name: "The Heart of Darkness",
            desc: "Remove heart and hide it. Immune to staking while heart is safe.",
            system: "No roll. -2 Difficulty to resist Frenzy. Staking the removed heart paralyzes the vampire.",
            roll: null
        },
        6: {
            name: "Cobra Fangs",
            desc: "Grow hollow, venomous fangs without full transformation.",
            system: "Spend 1 BP. Bite delivers venom. Kills mortals. Supernaturals take Agg damage over time.",
            roll: null
        },
        7: {
            name: "Divine Image",
            desc: "Take the physical form of a Setite god (Set, Sobek, etc.).",
            system: "Spend 3 BP. +2 Str/Stam, +1 Cha/Man, +2 Willpower. Appearance 1. Lasts one scene.",
            roll: null
        },
        8: {
            name: "Heart Thief",
            desc: "Pull a vampire's heart from their chest in combat.",
            system: "Spend 1 WP. Roll Dex + Brawl (Diff 9). Need 3 successes. Victim takes 1 Agg unsoakable + loses heart benefits.",
            roll: {
                pool: ["Dexterity", "Brawl"],
                diffLabel: "Diff 9 (Need 3 Succ)",
                defaultDiff: 9
            }
        },
        9: {
            name: "Shadow of Apep",
            desc: "Become a giant serpent of fluid darkness. Immune to physical force.",
            system: "Spend 1 WP. Immune to physical attacks (pass through). Fire/Sun/Magic still hurt. +3 Physical Attributes.",
            roll: null
        }
    },
    "Vicissitude": {
        1: {
            name: "Malleable Visage",
            desc: "Alter your own bodily parameters: height, build, voice, facial features, and skin tone.",
            system: "Spend 1 BP per body part. Roll Intelligence + Medicine (Diff 6). Duplicate person/voice needs Perception + Medicine (Diff 8).",
            roll: {
                pool: ["Intelligence", "Medicine"],
                diffLabel: "Difficulty 6 (or 8)",
                defaultDiff: 6
            }
        },
        2: {
            name: "Fleshcraft",
            desc: "Perform drastic, grotesque alterations on other creatures (flesh only, no bone).",
            system: "Spend 1 BP. Grapple victim. Roll Dexterity + Medicine (Diff 5 to 9). Can increase/decrease Attributes or add armor (at cost of Str/Health).",
            roll: {
                pool: ["Dexterity", "Medicine"],
                diffLabel: "Diff Varies (5-9)",
                defaultDiff: 6
            }
        },
        3: {
            name: "Bonecraft",
            desc: "Manipulate bone in the same manner as flesh. Create quills, spikes, or deform victims.",
            system: "Spend 1 BP. Roll Strength + Medicine (Diff 7). Offensive bone spikes cause 1 Lethal self-damage to create. Rib cage attack needs 5 successes.",
            roll: {
                pool: ["Strength", "Medicine"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        4: {
            name: "Horrid Form",
            desc: "Transform into a hideous 8ft monster. Black chitin skin, spines, oily grease.",
            system: "Spend 2 BP. +3 Physical Attributes. Social Attributes drop to 0. Brawl damage +1. Hand-to-hand damage increases.",
            roll: null
        },
        5: {
            name: "Bloodform",
            desc: "Physically transform all or part of the body into sentient vitae.",
            system: "Spend 1 BP per limb converted. Immune to physical attacks (cut/bludgeon/pierce). Vulnerable to Fire/Sun. Can use mental Disciplines.",
            roll: null
        },
        6: {
            name: "Chiropteran Marauder",
            desc: "Transform into a terrifying bipedal bat. Flight and sharp claws.",
            system: "Spend 3 BP. Same bonuses as Horrid Form. Flight (25mph). Hearing rolls -2, Vision rolls +1. Claws deal Str+2 Agg.",
            roll: null
        },
        7: {
            name: "Blood of Acid",
            desc: "Convert blood to viscous acid. Corrodes anything it touches.",
            system: "Passive. Anyone drinking blood or struck by spatter takes 5 dice of Aggravated damage. Cannot Embrace/Ghoul.",
            roll: null
        },
        8: {
            name: "Cocoon",
            desc: "Form an opaque, hard cocoon from excreted fluids. Protects from sun and fire.",
            system: "Spend 3 BP. 10 mins to form. Immune to sunlight. Soak dice = 2x Stamina. Can use mental Disciplines inside.",
            roll: null
        },
        9: {
            name: "Breath of the Dragon",
            desc: "Exhale a deadly gout of flame like a dragon.",
            system: "Exhale flame cloud (6ft area). Deals 2 dice of Aggravated damage to all in area. Ignites flammables.",
            roll: {
                pool: ["Dexterity", "Athletics"], // To aim
                diffLabel: "Dex + Athletics (Aim)",
                defaultDiff: 6
            }
        }
    },
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
    }
};
