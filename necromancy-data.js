/**
 * V20 NECROMANCY DATA
 * Stores detailed information for Necromancy Paths.
 * Separated from disciplines-data.js for modularity.
 */

export const NECROMANCY_DATA = {
    "The Sepulchre Path": {
        1: {
            name: "Witness of Death",
            desc: "Attune senses to the presence of the incorporeal. Eyes flicker with pale blue fire.",
            system: "Roll Perception + Awareness (Diff 5). Success allows perception of ghosts/Underworld for the scene. Botch means seeing ONLY the dead (+3 diff to interact with living).",
            roll: {
                pool: ["Perception", "Awareness"],
                diffLabel: "Difficulty 5",
                defaultDiff: 5
            }
        },
        2: {
            name: "Summon Soul",
            desc: "Call a ghost back from the Underworld. Requires name and an object the wraith contacted.",
            system: "Spend 1 BP. Roll Manipulation + Occult (Diff 7 or Ghost's WP, whichever higher). Success brings the shade. -1 Diff if using piece of corpse. -2 Diff if object is of great importance to ghost.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Higher of 7 or Ghost's WP",
                defaultDiff: 7
            }
        },
        3: {
            name: "Compel Soul",
            desc: "Command a ghost to perform tasks.",
            system: "Spend 1 BP. Resisted Roll: Manipulation + Occult vs Ghost's Willpower (Diff 6 for both). Net successes determine degree of control/duration.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Resisted (Diff 6)",
                defaultDiff: 6
            }
        },
        4: {
            name: "Haunting",
            desc: "Bind a summoned ghost to a location or object.",
            system: "Spend 1 BP. Roll Manipulation + Occult (Diff = Target WP, min 4). +1 Diff if binding to object. Success = 1 night. Spend WP = 1 week. Perm WP = 1 year + 1 day.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Target's Willpower",
                defaultDiff: 6
            }
        },
        5: {
            name: "Torment",
            desc: "Strike a wraith's ectoplasmic form, inflicting damage.",
            system: "Roll Stamina + Empathy (Diff = Wraith's WP). Each success deals 1 Level of Lethal damage to the wraith.",
            roll: {
                pool: ["Stamina", "Empathy"],
                diffLabel: "Target's Willpower",
                defaultDiff: 6
            }
        }
    },
    "The Bone Path": {
        1: {
            name: "Tremens",
            desc: "Cause a corpse's flesh to shift, twitch, or make simple movements.",
            system: "Spend 1 BP. Roll Dexterity + Occult (Diff 6). Successes determine complexity (1: twitch, 5: specific condition). Cannot attack.",
            roll: {
                pool: ["Dexterity", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        2: {
            name: "Apprentice's Brooms",
            desc: "Animate dead bodies to perform simple, repetitive labor.",
            system: "Spend 1 BP + 1 WP. Roll Wits + Occult (Diff 7). Successes = Number of corpses animated. Bodies perform simple tasks until destroyed. Zombie Stats: Str 3, Dex 2, Sta 4, Brawl 2.",
            roll: {
                pool: ["Wits", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        3: {
            name: "Shambling Hordes",
            desc: "Raise combat-capable zombies that wait for years if necessary to fulfill orders.",
            system: "Spend 1 WP. Roll Wits + Occult (Diff 8). Each success raises 1 corpse (costing 1 BP each). Zombies guard or attack. They wait forever.",
            roll: {
                pool: ["Wits", "Occult"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        4: {
            name: "Soul Stealing",
            desc: "Strip a soul from a living body, leaving it catatonic.",
            system: "Spend 1 WP. Contested Roll: Willpower vs Target's Willpower (Diff 6). Successes = hours soul is exiled. Body remains autonomically alive.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Contested Willpower (Diff 6)",
                defaultDiff: 6
            }
        },
        5: {
            name: "Daemonic Possession",
            desc: "Insert a soul or wraith into a fresh corpse (<30 mins dead).",
            system: "Fresh corpse required. If using a Vampire's corpse, must achieve 5 successes on Resisted Willpower roll vs original owner. Soul uses its own Mental/Social stats, Body's Physical stats.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Resisted (Diff Varies)",
                defaultDiff: 6
            }
        }
    },
    "The Ash Path": {
        1: {
            name: "Shroudsight",
            desc: "See through the Shroud into the Shadowlands to spot ghostly buildings, items, and wraiths.",
            system: "Roll Perception + Awareness (Diff 7). Effects last for a scene. Wraiths may notice they are being watched.",
            roll: {
                pool: ["Perception", "Awareness"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        2: {
            name: "Lifeless Tongues",
            desc: "Converse effortlessly with denizens of the ghostly Underworld.",
            system: "Spend 1 WP. Roll Perception + Occult (Diff 6). Allows conversation without spending blood.",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        3: {
            name: "Dead Hand",
            desc: "Interact physically with ghostly objects or entities. Necromancer becomes solid to wraiths.",
            system: "Spend 1 WP. Roll Wits + Occult (Diff 7). Lasts one scene. Spend 1 BP to extend for another scene.",
            roll: {
                pool: ["Wits", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        4: {
            name: "Ex Nihilo",
            desc: "Physically enter the Underworld. Vampire becomes a solid ghost.",
            system: "Draw door. Spend 2 WP + 2 BP. Roll Stamina + Occult (Diff 8) to enter. To return: Spend 1 WP, Roll Stamina + Occult (Diff 6).",
            roll: {
                pool: ["Stamina", "Occult"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        5: {
            name: "Shroud Mastery",
            desc: "Manipulate the veil between worlds to hinder or help wraiths crossing.",
            system: "Spend 2 WP. State raise/lower. Roll Willpower (Diff 9). Successes change local Shroud rating by 1 (Max 10, Min 3). Reverts 1 pt/hour.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 9",
                defaultDiff: 9
            }
        }
    },
    "The Cenotaph Path": {
        1: {
            name: "A Touch of Death",
            desc: "Detect if an object or person has been touched by a ghost or sense the recent passage of a wraith.",
            system: "Touch subject. Roll Perception + Awareness (Diff 6). Successes determine time depth/detail (1 success = last turn, 5 successes = last week).",
            roll: {
                pool: ["Perception", "Awareness"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        2: {
            name: "Reveal the Catene",
            desc: "Determine if an object is a fetter (tied to a ghost) by handling it.",
            system: "Handle for 3 turns. Spend 1 BP. Roll Perception + Occult (Diff 7). 3+ successes reveal identity of ghost. Botch prevents future use on that item.",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        3: {
            name: "Tread Upon the Grave",
            desc: "Detect locations where the Shroud is thin or altered.",
            system: "Roll Willpower (Diff 8). Once per scene. Success reveals Shroud density. 3+ successes reveal artificial alteration.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        4: {
            name: "Death Knell",
            desc: "Sense when someone dies and becomes a ghost nearby.",
            system: "Auto sense within half-mile. To pinpoint: Spend 1 WP, Roll Perception + Occult (Diff 7). Successes determine accuracy of location.",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        5: {
            name: "Ephemeral Binding",
            desc: "Turn an object or person into a temporary fetter for a ghost using blood.",
            system: "Coat with 1 BP. Spend 1 WP. Roll Manipulation + Occult (Diff 8). Duration: 1 night/success. +1 WP = 1 week/success. Perm WP = 1 year + 1 day.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        }
    },
    "The Corpse in the Monster": {
        1: {
            name: "Masque of Death",
            desc: "Assume a visage of death (corpse-like) or inflict it on another. +2 Intimidation, -2 Dex/App.",
            system: "Self: Spend 1 BP. Others: Spend 1 BP, Touch, Roll Stamina + Medicine (Diff = Target Stamina + 3). Lasts until sunset.",
            roll: {
                pool: ["Stamina", "Medicine"],
                diffLabel: "Target's Stamina + 3",
                defaultDiff: 6
            }
        },
        2: {
            name: "Cold of the Grave",
            desc: "Become cold and dead-like. No wound penalties. +1 die to resist emotion, -1 to use emotion.",
            system: "Spend 1 WP. Lasts for scene. Ignore wound penalties.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty N/A (Spend)",
                defaultDiff: 6
            }
        },
        3: {
            name: "Curse of Life",
            desc: "Inflict undesirable living traits (hunger, sweat, bathroom needs) on undead target.",
            system: "Spend 1 WP. Roll Intelligence + Medicine (Diff 8). Range 20 yards. Target suffers +2 diff to all rolls unless spending 1 WP/scene. Cannot raise Attributes with blood.",
            roll: {
                pool: ["Intelligence", "Medicine"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        4: {
            name: "Gift of the Corpse",
            desc: "Ignore inherent vampiric weaknesses (sun, frenzy, stakes) for a short time.",
            system: "Spend 1 WP. Roll Stamina + Occult (Diff 8). Duration: 1 turn/success. Immune to frenzy. Sun does bashing. Stakes immobilize only.",
            roll: {
                pool: ["Stamina", "Occult"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        5: {
            name: "Gift of Life",
            desc: "Temporarily experience positive aspects of life (eat, sex, sun resistance). Dangerous blood cost.",
            system: "Spend 12 BP continuously. Roll Stamina + Occult (Diff 6). 1 succ needed. Lasts till midnight. Sun soak diffs halved. Frenzy diffs halved. Retain vampiric soak vs bashing.",
            roll: {
                pool: ["Stamina", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        }
    },
    "The Grave's Decay": {
        1: {
            name: "Destroy the Husk",
            desc: "Turn a corpse into a pile of unremarkable dust.",
            system: "Spend 1 BP. Roll Intelligence + Medicine (Diff 6). Takes 5 minus successes in turns.",
            roll: {
                pool: ["Intelligence", "Medicine"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        2: {
            name: "Rigor Mortis",
            desc: "Freeze a target in place, making them rigid like a corpse.",
            system: "Spend 1 WP. Roll Intelligence + Medicine (Diff 7). Successes = turns frozen. Target acts as staked. Breakout: WP (Diff 7) needs 2 succ.",
            roll: {
                pool: ["Intelligence", "Medicine"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        },
        3: {
            name: "Wither",
            desc: "Cripple a limb or organ, causing shriveling and 2 Aggravated wounds.",
            system: "Spend 1 WP. Touch attack (Dex + Brawl). Inflicts 2 Aggravated dmg. Limb useless until healed. (Arm: Str 0, Leg: Lame, Face: -App).",
            roll: {
                pool: ["Dexterity", "Brawl"],
                diffLabel: "Difficulty 6 (Touch)",
                defaultDiff: 6
            }
        },
        4: {
            name: "Corrupt the Undead Flesh",
            desc: "Inflict a virulent magical disease on the target.",
            system: "Spend 1 WP. Roll Intelligence + Medicine (Diff 6). Resisted by Stamina (+Fortitude) vs Diff = Attacker's WP. Disease: Halved Str/Wits, -1 Dex, vomit blood.",
            roll: {
                pool: ["Intelligence", "Medicine"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        5: {
            name: "Dissolve the Flesh",
            desc: "Turn a vampire's flesh to dust with charged vitae.",
            system: "Spend 2 BP + 1 WP. Drip blood. Roll Willpower vs Diff (Target Stamina + 3). Each success = 1 Aggravated wound.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Target's Stamina + 3",
                defaultDiff: 6
            }
        }
    },
    "The Path of the Four Humors": {
        1: {
            name: "Whispers to the Soul",
            desc: "Whisper nightmares into a victim's ear, causing distraction and irritability.",
            system: "Whisper name. Victim rolls Willpower (Diff 8). Fail = Nightmares for days equal to Necromancer's Manipulation. Victim suffers -1 die to all pools. Optional: +1 Rötschreck diff.",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Victim's Roll (Diff 8)",
                defaultDiff: 8
            }
        },
        2: {
            name: "Kiss of the Dark Mother",
            desc: "Mix vitae with black bile to coat teeth/lips. Bite inflicts double aggravated damage.",
            system: "Spend 1 BP (reflexive). Next bite doubles Aggr dmg before soak. Lasts until bite hits or 1 turn cleansing.",
            roll: {
                pool: [],
                diffLabel: "N/A (Damage Bonus)",
                defaultDiff: 6
            }
        },
        3: {
            name: "Dark Humors",
            desc: "Exude a specific humor to coat skin or poison victim. Victim resists with Stamina (Diff 8).",
            system: "Spend 2 BP. Effects: Phlegm (-2 dice pools), Blood (+1 dmg on lethal/agg wounds), Black Bile (Lethal dmg = Caster Stamina), Yellow Bile (+2 Diff to WP rolls, no WP spend).",
            roll: {
                pool: ["Stamina"],
                diffLabel: "Victim's Roll (Diff 8)",
                defaultDiff: 8
            }
        },
        4: {
            name: "Clutching the Shroud",
            desc: "Consume cold corpse blood to become death-like. +2 Soak, sense health/death, speak with ghosts.",
            system: "Drink/Spend 5 BP from cold corpse. Takes time. Scene benefits: +2 Soak (all types), Sense death status, Speak w/ Ghosts (Manip + Occult, Diff varies).",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Diff 5-7 (Local Death)",
                defaultDiff: 6
            }
        },
        5: {
            name: "Black Breath",
            desc: "Exhale a cloud of black bile (5 yards/success). Causes suicide (mortals) or torpor (vampires).",
            system: "Spend 1 WP + 1 BP. Roll Stamina + Athletics (Diff 7). Victim dodges (Dex+Athletics) or resists w/ WP (Diff 8 Mort/7 Supernatural). Fail = Suicide/Torpor. Success = -2 dice.",
            roll: {
                pool: ["Stamina", "Athletics"],
                diffLabel: "Difficulty 7",
                defaultDiff: 7
            }
        }
    },
    "The Vitreous Path": {
        1: {
            name: "Eyes of the Dead",
            desc: "See with the perceptions of the Restless Dead (Deathsight) to judge health and fate.",
            system: "Roll Perception + Occult (Diff 6). 1 succ: detect injury/disease/curse. 3 succ: estimate time/cause of death. 5 succ: exact details. Lasts 1 scene. One target at a time.",
            roll: {
                pool: ["Perception", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        },
        2: {
            name: "Aura of Decay",
            desc: "Project entropy to break down nonliving objects and machines within 1 yard.",
            system: "Spend 1-5 BP. No roll. Objects break down based on BP spent (1=1 week, 5=1 turn). Using affected items counts as a botch. Cannot use while staked.",
            roll: {
                pool: [],
                diffLabel: "N/A (Cost Only)",
                defaultDiff: 6
            }
        },
        3: {
            name: "Soul Feast",
            desc: "Drain entropic energy from a death site or directly from a ghost.",
            system: "Spend 1 WP. Ambient: Drain 1-4 pts (diff penalty in area). Ghost: Attack normal, then resisted WP (Diff 6) to drain. Energy heals/powers disciplines (not rising).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Resisted (Diff 6) if Ghost",
                defaultDiff: 6
            }
        },
        4: {
            name: "Breath of Thanatos",
            desc: "Exhale a cloud of entropy to summon Spectres or inflict wasting illness.",
            system: "Spend 1 BP. Roll Willpower (Diff 8). Disperse: Summons Spectres (radius 1/4 mile per BP). Directed: Dex+Occult (Diff 7) to hit. Inflicts 1 Agg dmg + illness (+2 Social diff).",
            roll: {
                pool: ["Willpower"],
                diffLabel: "Difficulty 8",
                defaultDiff: 8
            }
        },
        5: {
            name: "Night Cry",
            desc: "Unleash a scream of chaos to aid or harm multiple targets.",
            system: "Spend 1 WP. Spend 1 BP per extra target. Roll Manipulation + Occult (Diff 6). Aid: -2 Diff to target actions (1 turn/succ). Harm: 1 Agg wound/succ.",
            roll: {
                pool: ["Manipulation", "Occult"],
                diffLabel: "Difficulty 6",
                defaultDiff: 6
            }
        }
    }
};
