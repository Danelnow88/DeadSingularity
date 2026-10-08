# Mobile ergonomics - 2026-10-08

## Scope and continuity

Production is `index.html` in DeadSingularity V1. No prototype files, balance,
audio, saves or gameplay simulation changed. Backup of edited files:
`local/backups/antes-mobile-ergonomia-20261008/`. Working baseline: `4c6a466`.

The reported S20 FE issue was investigated with real coarse/touch capability
emulation, not only `?mobile=1`. Default animation was active, but slow and
subtle on small screens. Physical Samsung/Android behavior is not claimed
verified: confirm the published revision on the actual phone.

## Presentation and input changes

- Lobby approach speed: mobile 0.18 depth units/s (previously 0.065), desktop
  0.09. More bright mobile stars and bounded radial streaks make advance visible.
  Still honors OS reduced motion, reduced effects and particles disabled;
  `NV.lobbyAtmosphere.getSnapshot().stopReason` explains a stationary background.
  Independent seeded RNG, fixed pools, original 30/20 Hz and DPR limits retained.
- DASH/SPECIAL: two 84x84 CSS-pixel targets near the right thumb, status preserved.
- Stick: 116px visible base, minimum 210x180px contact zone, floating grab origin.
  Analog intensity feeds `NV.input.setMoveVector`, with 8px dead zone and capped
  normalized diagonal/max speed; directional bridge retained for older runtimes.
- Weapon/item dock: one 270x52px row above the right actions, outside boss/dash
  bars. Tap = next; horizontal swipe left = next, right = previous. Keyboard
  activation still works. Existing cycle APIs are authoritative, no copied inventory.
- Item count is separate from the name. USAR is a distinct 54x52px target,
  disabled with no items; it consumes exactly one selected item through the same API.
- Capture, cancellation, blur, pause, state change and resize release inputs.
- Cache keys updated for the affected production CSS/JS; no new binary assets.

## Verification commands and evidence

```
npm run quality
node tools/qa-lobby-runner.cjs
node tools/qa-lobby-runner.cjs --mobile-hud
npm run build:web
npm run qa:alpha -- --soak-seconds=10
node tools/qa-lobby-runner.cjs --mobile-hud --url=https://danelnow88.github.io/DeadSingularity/
```

`tools/qa-mobile.cjs` uses a disposable profile, Chromium touch/device emulation,
actual touch dispatch and a validated temporary checkpoint with owned weapons,
items and a real boss. Tests 915x412, 800x360, 844x390, 740x360, 640x320, 568x320,
1280x573, an additional CSS safe-inset contract case, and portrait menu/orientation gating.
Checks hit geometry, non-overlap, source icon pixels, actual player movement,
independent held fingers, ability activation, both switch directions, consumption,
pause and forward background. Software rendering is confined to this QA runner
so hidden/RDP captures include static Canvas icons; production GPU policy is unchanged.

Reports/screenshots: `local/validation/mobile-ergonomics/`; published-site checks
use `mobile-ergonomics-live/`. `--quick` is a single-size diagnostic only, NOT the
release gate. CI runs the full route and saves evidence before Pages may publish.
Portrait runs in a separate disposable Electron process/profile to prevent a
hidden Windows compositor hang when carrying landscape device emulation state.

Remaining physical acceptance: test comfort on the S20 FE and another phone,
both browser chrome visible and fullscreen. Emulation cannot certify thumb reach,
Android/Samsung Browser quirks or physical device performance universally.
