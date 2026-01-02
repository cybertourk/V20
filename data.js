export const defaultCharacter = {
    name: "",
    player: "",
    chronicle: "",
    nature: "",
    demeanor: "",
    concept: "",
    clan: "",
    generation: 13,
    sire: "",
    
    // Attributes (Flat structure for easier access by key)
    attributes: {
        Strength: 1, Dexterity: 1, Stamina: 1,
        Charisma: 1, Manipulation: 1, Appearance: 1,
        Perception: 1, Intelligence: 1, Wits: 1
    },
    
    // Abilities
    abilities: {
        Alertness: 0, Athletics: 0, Brawl: 0, Dodge: 0, Empathy: 0, Expression: 0, Intimidation: 0, Leadership: 0, Streetwise: 0, Subterfuge: 0,
        "Animal Ken": 0, Crafts: 0, Drive: 0, Etiquette: 0, Firearms: 0, Larceny: 0, Melee: 0, Performance: 0, Stealth: 0, Survival: 0,
        Academics: 0, Computer: 0, Finance: 0, Investigation: 0, Law: 0, Medicine: 0, Occult: 0, Politics: 0, Science: 0, Technology: 0
    },

    disciplines: [],
    backgrounds: [],
    virtues: {
        conscience: 1,
        self_control: 1,
        courage: 1
    },

    merits: [],
    flaws: [],

    path_name: "Humanity",
    bearing_name: "",
    bearing_value: 0,

    willpower: 1,
    willpower_pool: 1,
    blood_pool: 10,
    health: 0,
    experience: 0,
    
    inventory: [],
    vehicles: [],
    history: "",
    goals_short: "",
    goals_long: "",
    description: "",
    languages: "",
    derangements: []
};
