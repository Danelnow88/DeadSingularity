# Lobby compatibility — 2026-10-08

Production only; combat HUD, input, simulation, saves and desktop layout retained.
Backup: `local/backups/antes-lobby-standard-20261008/`.

Confirmed defects: desktop `#heroName` typography outranked mobile class selectors;
stat chips retained their own desktop sizes; rigid column minimums and hidden
overflow could clip controls. Mobile now overrides the actual ID/stat selectors,
uses shrinkable columns, pins MEJORAS outside the pilot's scrollable content and
permits vertical scrolling when the screen cannot contain every item.

`js/ui/lobbyViewport.js` measures VisualViewport CSS pixels, including offsets,
with innerWidth/innerHeight fallback and resize/restoration listeners. Text size
adjustment is explicitly 100%. Decorative mobile backdrop blur is disabled.

The star pool remains Canvas2D + RAF. Its existing visibility-scoped recovery
timer redraws/restarts only after consecutive checks detect stalled RAF frames;
never in gameplay, portrait, hidden pages or reduced-motion mode. This is tested,
but the physical Brave Android cause/result is still not certified.

Validation: `npm run quality`, `node tools/qa-lobby-runner.cjs`,
`node tools/qa-lobby-runner.cjs --mobile-hud`, `npm run build:web`.
Mobile QA checks actual computed typography, visible MEJORAS, touch interactions,
safe insets, orientation and perspective movement, not just presence in DOM.

Standards: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-size-adjust

## Physical Android evidence still required

The user reports Chrome still clips critical lobby information and Brave still
shows static stars after revision 8217b6e. Automated desktop touch emulation did
not reproduce these physical-browser failures: do not mark them resolved.

Opt-in URL `?lobbydiag=1` now shows actual mobile classification, layout/visual
viewport dimensions and zoom scale, computed typography, panel rectangles and
scrollable/visible heights, atmosphere frame deltas and its exact stop reason.
No user-agent fingerprint, network upload, save writes or simulation changes.
The diagnostic works even if mobile classification fails. Close removes its
timer/listeners; pagehide/visibility pause it. Normal URLs do not create it.

Next boundary: obtain one copied diagnostic from Chrome and one from Brave on
the same S20 FE after several seconds in landscape. If frames advance while the
background appears frozen, investigate visual compositing; if stopped, address
the reported stop reason; if module missing, inspect deployed script loading.
For Chrome compare mobile classification, zoom and content/visible heights
before adding any further device-specific CSS. Shields are not a confirmed cause.

The opt-in panel now has an unmistakable red banner, a 48px minimum white
COPIAR DIAGNÓSTICO button, instructions and a selectable readonly text area.
Clipboard denial selects the text for manual copying instead of requiring a photo.
Confirm the current Pages script cache key is `lobby-diag-20261008h` before
asking the user to find it: the previous request happened before CI deployed it.

## Confirmed physical stop condition (S20 FE, user report)

Landscape diagnostic h: atmosphere active=false, frames=1, time=0,
stopReason=reduced-effects, visual scale=1, viewport 1445x560. The saved gameplay
preference reducedEffects was incorrectly treated as a reduced-motion preference
by the lobby. Its UI promises reduced flashes/camera shake, not a frozen backdrop.
Revision i leaves smooth forward travel active while removing twinkle and trails
in that comfort mode. OS prefers-reduced-motion and particles=false still stop
the backdrop; all saved settings and gameplay effects remain unchanged.

The diagnostic is bottom-right with a bounded height that reserves the masthead
for real fullscreen. It reports document fullscreen state; viewport refresh now
also listens for standard/prefixed fullscreen transitions. Chrome's reported
clipping still requires its physical diagnostic; do not claim it fixed from the
Brave report. Backup: local/backups/antes-lobby-comfort-20261008/.
