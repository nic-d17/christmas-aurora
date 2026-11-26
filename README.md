# Christmas Aurora

A Christmas night look for the Claude Code desktop app. It sets a deep arctic-blue dark theme (aurora-teal accent, berry red, pine green, golden amber, Nord code highlighting) and draws an animated backdrop behind the conversation: the northern lights rippling over a starry sky, three layers of falling snow, snow-capped pines — the two tall ones dressed with gold stars, garlands and blinking ornaments — a string of glowing holiday lights along the top, two reindeer on the snow — one with a softly pulsing red nose — and Santa's sleigh gliding past the moon every minute and a half.

No setup is needed: once the plugin is enabled, the theme applies when a session starts. The scene is pure SVG with slow CSS animation, honors reduced-motion settings (it renders as a finished still), and draws only in the desktop and mobile apps — terminals are untouched.

## Install

At the prompt of a terminal session:

```
/plugin install christmas-aurora --marketplace nic-d17/christmas-aurora
```

Answer `y` to add the marketplace, then choose the user scope so it loads in every session.

From a shell:

```
claude plugin install christmas-aurora --marketplace nic-d17/christmas-aurora
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `nic-d17/christmas-aurora`, then **Add plugin**.

## Editing the scene

`hooks/scene.js` is generated — never edit it by hand. Change `tools/gen-scene.mjs` (sprites are ASCII grids) and run:

```
node tools/gen-scene.mjs
```

It rewrites `hooks/scene.js`, prints sprite previews and the SVG byte count (hard cap 131,072).
