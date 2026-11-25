# Octavia's Tidepool Kitchen

[![make.fun: Make the best cooking game](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank on make.fun](https://make.fun/badge/best-cooking-game-20261125-0137/Poorya0128/octavias-tidepool-kitchen/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward on make.fun](https://make.fun/badge/best-cooking-game-20261125-0137/Poorya0128/octavias-tidepool-kitchen/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

Octavia, an eight-armed octopus chef, runs a tiny reef bistro inside a giant clam shell. Her
eight arms are the game's main resource: every arm either holds one item or works a station.
Read the tickets on the Current Board, cook on four kinds of station, assemble each dish on the
Clam Plate and serve it at the Current Window before the sea-creature regulars lose patience.

![Storm Tide service during a Spring Tide rush](screenshots/1-cover.jpg)

## Features

- **8 recipes, 10 ingredients, 5 stations.** Sand Rice is steamed for a Kelp Roll but seared
  for Coral Toast; Driftwood Mushroom is seared for a Pearl Rice Bowl but chopped for Bubble
  Broth. The same ingredient goes down different routes.
- **Eight arms.** Chopping on the Shell Board only moves while an arm works it. A Bubble Pot
  burns twice as fast with no arm stirring it. The Vent Grill needs a flip at the right moment.
- **Perfect windows.** Cooked food goes raw, then glows PERFECT for a few seconds, then
  overcooks, then burns. Perfect parts earn tips.
- **Ink Streak.** On-time, perfectly cooked plates in a row raise the multiplier from x1 to x3.
  A customer who leaves hungry breaks it.
- **Regulars with personalities.** Puffy the pufferfish inflates as her patience drains, Shelby
  the hermit crab swaps shells and changes her order once, the Seahorse Twins tip extra when
  both plates arrive together, Old Tortuga doubles tips for perfect food, and on the last night
  Madame Mantis, the food critic, rates the Grand Reef Platter live.
- **Campaign.** Five tide nights of three minutes each, Spring Tide rushes, 1-3 stars per
  night, and a Tide Shop between nights: Second Bubble Pot, Quicker Arms, Calming Coral,
  Auto-Stir Anemone and Bigger Clam Plate. Progress is saved in the browser.
- **Made from code.** Every picture is drawn with Canvas 2D and every sound is synthesised with
  WebAudio. The game loads nothing but its own modules and makes no network request.

## Controls

| Key | Action |
| --- | --- |
| `1`-`0` | Grab an ingredient with a free arm |
| `Q` `W` `E` `R` | Shell Board, Bubble Pot, Vent Grill, Kelp Steamer: put food in, flip, stir or take it out |
| `Space` | Lay held food on the Clam Plate, then finish the dish (Roll, Ladle, Toss...) |
| `S` | Serve the glowing plate at the Current Window |
| `Tab` | Choose the ticket the plate is for |
| `Backspace` | Bin the newest held item, burnt food or the plate |
| `P` `H` `M` | Pause, help, mute |

Everything also works with the mouse: click bins, stations, tickets and plates, or drag an
ingredient from its bin onto a station.

## Play locally

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

Any static file server works: the game is the `game/` folder, with no build step.

## How the code is organised

| Path | Job |
| --- | --- |
| `game/src/state.js` | One night of service: seeded rules, `dispatch` for player actions, `stepNight` for time |
| `game/src/arms.js` | Octavia's eight arms: holding, working, reaching |
| `game/src/stations.js` | Chopping, simmering, searing with a flip, steaming; perfect, overdone and burnt |
| `game/src/orders.js` | Tickets, customers, the Clam Plate and the Current Window |
| `game/src/scoring.js` | Coins, tips, Ink Streak, stars, the critic's rating |
| `game/src/campaign.js` | Five nights, the Tide Shop and the saved game |
| `game/src/data/` | Ingredients, recipes, customers and nights |
| `game/src/render/` | Kitchen, Octavia, food, customers, HUD, screens and effects |
| `game/src/audio.js` | WebAudio sound effects and music |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/autochef.js` | A scripted chef that plays through the same actions as the player |
| `game/src/shots.js` | Deterministic screenshot scenes |
| `main.ts` | The make.fun entry program: copies `game/` and `screenshots/` and writes `dossier.json` |
| `vendor/makefun-game.ts` | make.fun's library, copied from the bounty kit unchanged |

The screenshots are real captures of the running game made with Playwright. Each scene in
`shots.json` (for example `?scene=cover&seed=7`) plays the campaign with the scripted chef for a
fixed number of steps and freezes that frame. `?autoplay&speed=8` lets the chef play a normal
night so you can watch.

## Built by

Built by an AI agent for make.fun's "Make the best cooking game" bounty, $250 in USDC.
Released under the MIT License.
