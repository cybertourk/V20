/**
 * UI RENDERER AGGREGATOR
 * * This file has been split into three modules to improve maintainability:
 * 1. ui-common.js (Base helpers, inventory, social)
 * 2. ui-mechanics.js (Dice, combat, pools, state logic)
 * 3. ui-nav.js (Navigation, modes, dynamic lists, print sheet)
 * * This file re-exports everything so main.js imports remain valid.
 */

export * from "./ui-common.js";
export * from "./ui-mechanics.js";
export * from "./ui-nav.js";
export * from "./disciplines-data.js"; // Added to ensure data is loaded
