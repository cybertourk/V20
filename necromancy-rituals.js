/**
 * V20 NECROMANCY RITUALS DATA
 * Stores detailed information for Necromancy Rituals by Level.
 * Separated from necromancy-data.js to reduce file size.
 */

export const NECROMANCY_RITUALS = {
    1: {
        "Call of the Hungry Dead": {
            name: "Call of the Hungry Dead",
            desc: "Causes the victim to hear maddening snatches of conversation from across the Shroud. Requires burning a hair from the target's head in a black candle.",
            system: "Casting time: 10 minutes. Victim hears howls and unearthly demands. If unprepared, may go briefly mad.",
            level: 1
        },
        "Eldritch Beacon": {
            name: "Eldritch Beacon",
            desc: "Highlights the carrier in the Shadowlands with a sickly green-white aura. Requires a sphere of green wax carried by the target.",
            system: "Casting time: 15 minutes. Duration: 1 hour per success. Ghostly powers affect the carrier with greater ease/severity.",
            level: 1
        },
        "Insight": {
            name: "Insight",
            desc: "Allows the necromancer to see the last thing a corpse witnessed by staring into its eyes. Vision is visible only to the caster.",
            system: "Casting time: 5 minutes. Successes determine clarity (1: basic sense, 5: full sensory hour). Botch: Caster sees their own Final Death (Rötschreck). Cannot be used on Golconda vampires or bodies missing eyes.",
            level: 1
        },
        "Knowing Stone": {
            name: "Knowing Stone",
            desc: "Tracks a target's whereabouts (living or dead). Caster paints target's name on a stone with their own blood and dances in a trance.",
            system: "Spirits whisper the location. Stone remains active until All Saints Day unless recharged with blood.",
            level: 1
        },
        "Minestra di Morte": {
            name: "Minestra di Morte",
            desc: "Reveals if a dead person became a Wraith or Spectre. Caster cooks a piece of the corpse with herbs and vitae, then eats it.",
            system: "Requires 1/2 liter vitae. Consumption does not bond or increase blood pool. Without 'Eat Food' merit, caster vomits but still gains info.",
            level: 1
        },
        "Ritual of the Smoking Mirror": {
            name: "Ritual of the Smoking Mirror",
            desc: "Uses a blood-coated obsidian mirror to see the supernatural. Choose one aspect: Lifesight (Aura Perception) or Deathsight (See Ghosts/Entropy).",
            system: "Mirror must cut the user's flesh. Lasts one scene. Lifesight acts as Auspex 2. Deathsight acts as Eyes of the Dead (Vitreous Path 1).",
            level: 1
        }
    },
    2: {
        "Eyes of the Grave": {
            name: "Eyes of the Grave",
            desc: "Causes the target to experience random visions of their own death over a week. Requires soil from a fresh grave.",
            system: "Casting time: 2 hours. Victim must roll Courage (Diff 7) during visions or panic. Interferes with concentration.",
            level: 2
        },
        "The Hand of Glory": {
            name: "The Hand of Glory",
            desc: "A mummified hand that puts mortals in a household to deep sleep. Requires preparation of a murderer's severed hand.",
            system: "Lighting the fingers puts mortals to sleep (no effect on supernaturals). One finger refuses to light for each unaffected occupant. Extinguished only by milk. Lasts one scene.",
            level: 2
        },
        "Occhio d'Uomo Morto": {
            name: "Occhio d'Uomo Morto",
            desc: "Permanently replaces caster's eye with a corpse's eye to gain Shroudsight. Reduces Appearance by 1.",
            system: "Permanent Shroudsight. If Spectre's eye: can hear vague Spectre whispers (Perception+Occult). +1 Diff to visual Perception. +1 Diff to be affected by eye-contact powers. Ghost hates caster (-1 Diff to attack caster).",
            level: 2
        },
        "Puppet": {
            name: "Puppet",
            desc: "Prepares a subject (willing or unwilling) for ghostly possession by smearing grave soil on face.",
            system: "Casting time: 1 hour. Wraiths gain 2 automatic successes to possess the subject for the remainder of the night.",
            level: 2
        },
        "The Ritual of Pochtli": {
            name: "The Ritual of Pochtli",
            desc: "Cooperative ritual allowing multiple necromancers to pool successes for another Path or Ritual. Requires drinking from a mortal vessel.",
            system: "Participants share knowledge and pool successes/failures for the primary ritual. All must know Pochtli and the target magic. A single botch fails the entire group.",
            level: 2
        },
        "Two Centimes": {
            name: "Two Centimes",
            desc: "Projects a mortal's soul into the Underworld ('killing' them with pennies on eyes). Mortal spies on the dead.",
            system: "Mortal becomes a 'ghost among ghosts' (cannot affect environment). Can report back to caster. Used for spying or terror.",
            level: 2
        }
    },
    3: {
        "Blood Dance": {
            name: "Blood Dance",
            desc: "Summons a specific ghost to a sand-sigil for communication. Requires 2 hours of dancing/chanting and precise sand/salt patterns.",
            system: "Ghost appears for 1 hour. Allows communication.",
            level: 3
        },
        "Divine Sign": {
            name: "Divine Sign",
            desc: "Predicts a living target's actions or gains intimate link to a wraith using their birth date.",
            system: "Living: Predict next action. Wraith: Acts as a Fetter connection for other Necromancy effects.",
            level: 3
        },
        "Din of the Damned": {
            name: "Din of the Damned",
            desc: "Wards a room against eavesdropping (physical or supernatural) using a line of crematorium ash.",
            system: "Casting: 30 mins. Eavesdropper must roll Percep + Occult (Diff 7) > Caster's successes. Fail = ghostly wailing. Botch = Deafness.",
            level: 3
        },
        "Nightmare Drums": {
            name: "Nightmare Drums",
            desc: "Sends ghosts to haunt a victim with nightmares. Requires burning a blood-coated possession while drums beat.",
            system: "Ghosts negotiate a favor in return for haunting. Victim suffers nightmares (no specific mechanic listed, usually interferes with sleep/willpower).",
            level: 3
        },
        "Ritual of the Unearthed Fetter": {
            name: "Ritual of the Unearthed Fetter",
            desc: "Attunes a ghost's finger bone to become a supernatural compass and Fetter. Requires name and gravestone chip.",
            system: "Casting: 3 hours. Bone acts as Fetter for Sepulchre Path and tracking.",
            level: 3
        },
        "Tempesta Scudo": {
            name: "Tempesta Scudo",
            desc: "Combat ritual creating a barrier against ghosts. Requires dancing and spitting blood.",
            system: "Turn 1: Dex + Perform (Diff 7). Turn 2: Take 1 Bashing, Spend 1 BP, Roll Ritual. Effect: Ghosts +2 Diff within circle.",
            level: 3
        }
    },
    4: {
        "Baleful Doll": {
            name: "Baleful Doll",
            desc: "A doll linked to a target's spirit. Requires 4-5 hours crafting, caster's blood, and victim's clothing.",
            system: "Injuring doll (pins) deals 6 dice Bashing dmg to target. Destroying doll deals 6 dice Lethal dmg to target.",
            level: 4
        },
        "Bastone Diabolico": {
            name: "Bastone Diabolico",
            desc: "Creates a 'devil stick' from a living donor's leg bone coated in lead/runes. Requires beating donor to death.",
            system: "Activate: Spend 1 WP (Scene). Hits drain 1 Passion from ghosts. +1 Aggravated dmg vs walking dead (not vamps). Ghosts avoid carrier (+1 Diff to attract).",
            level: 4
        },
        "Cadaver's Touch": {
            name: "Cadaver's Touch",
            desc: "Turns a mortal target into a corpselike ruin (cold, weak pulse). Requires melting a wax doll over 3 hours.",
            system: "Target appears dead/corpselike. +2 Difficulty to all Social rolls. Lasts until wax doll solidifies. Spell breaks if wax boils off.",
            level: 4
        },
        "Peek Past the Shroud": {
            name: "Peek Past the Shroud",
            desc: "Enchants ergot fungi to grant Shroudsight when eaten.",
            system: "Creates 3 doses per success. Ingesting gives Shroudsight for Stamina hours. Botch creates poison (8 dice Lethal damage).",
            level: 4
        },
        "Ritual of Xipe Totec": {
            name: "Ritual of Xipe Totec",
            desc: "Flays a victim and allows caster to wear their skin as a flawless disguise. Skin heals over caster.",
            system: "Disguise is visually perfect (no voice/mannerisms). No effect on supernaturals. Must bathe skin in 1 BP nightly. Removal causes 1 unsoakable lethal to caster.",
            level: 4
        }
    },
    5: {
        "Chill of Oblivion": {
            name: "Chill of Oblivion",
            desc: "Infuses subject with grave chill. Requires melting 1ft ice cube on chest (3 bashing to mortals). Subject naked on earth.",
            system: "Casting: 12 hours. Lasts 'Occult' nights. Agg fire dmg treated as lethal. Can extinguish fire (WP Diff 9). Drawbacks: Black aura veins, cold aura, hostility from ghosts.",
            level: 5
        },
        "Dead Man's Hand": {
            name: "Dead Man's Hand",
            desc: "Causes victim to decompose alive. Requires rag with victim's fluids inside a severed human hand.",
            system: "Spend 2 BP per victim Stamina. Victim loses health levels (Bruised to Incapacitated in ~35 hours). Mortal dies >12 hrs incapacitation. Vampire torpored. Stops if rag removed.",
            level: 5
        },
        "Esilio": {
            name: "Esilio",
            desc: "Opens a vortex to Underworld in caster's body to destroy ghosts. Requires 'Words of Exile'.",
            system: "Spend 1 BP + 1 WP. Each success destroys 1 ghost (requires clinch). Each success inflicts 1 unsoakable lethal on caster. Permanent Humanity loss (-1).",
            level: 5
        },
        "Grasp the Ghostly": {
            name: "Grasp the Ghostly",
            desc: "Brings an object from the Underworld into the real world. Must replace with material item of equal mass.",
            system: "Casting: 6 hours. Target must be a 'relic' (destroyed real-world item). Artifacts vanish. Items fade after ~1 year.",
            level: 5
        }
    }
};
