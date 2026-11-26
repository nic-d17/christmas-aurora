import type { Register, ThemeMessageRule, ThemeSetArgs, ThemeStyle } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// Near-black 1-bit chrome with christmas roles: aurora-green accent, berry
// red, leaf green, gold and aurora violet. Dark only, since the scene is a
// night sky.
const { theme } = makeColors({
  label: 'Christmas Aurora',
  only: 'dark',
  roles: {
    accent: '#35b58b',
    danger: '#dd4a40',
    success: '#4aae4f',
    warning: '#d2a03f',
    pro: '#9b7fe8',
  },
  codeTheme: { dark: 'nord' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0e1730',
        'surface-1': '#141f3a',
        'surface-2': '#192541',
        'surface-3': '#1b2845',
        'text-primary': '#f2f6fc',
        'text-secondary': '#c7d3ec',
        'text-muted': '#9aa9cc',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: {
    scene: 'christmas-night',
    glass: { blur: 6, tint: '#0e1730', opacity: 0.5 },
  },
}

// Square rows with pixel snow piled along their top edge. The 9-slice
// vector is the box's whole shape: bordered panel, pale shadow line, and
// stepped white mounds overhanging the top. The mound heights evolve as a
// seeded random walk; a timer cycles the phases so the drifts creep and
// resettle like snow accumulating.
const FLAT_MOUNDS = 'M0 4H48V9H0Z'

function moundPath(hs: readonly number[]): string {
  let d = 'M0 ' + (hs[0] ?? 4)
  for (let i = 0; i < hs.length; i++) {
    d += 'H' + (i + 1) * 4
    const cur = hs[i] ?? 4
    const nx = hs[i + 1]
    if (nx !== undefined && nx !== cur) d += 'V' + nx
  }
  return d + 'V9H0Z'
}

function makePhases(): string[] {
  let s = 77
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  let hs = Array.from({ length: 12 }, () => 2 + Math.floor(rnd() * 5))
  const phases: string[] = []
  for (let p = 0; p < 6; p++) {
    hs = hs.map(h => Math.min(7, Math.max(1, h + (rnd() < 0.5 ? -1 : 1))))
    phases.push(moundPath(hs))
  }
  return phases
}

const PHASES = makePhases()
const ORDER = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]

type StyleColor = NonNullable<ThemeMessageRule['color']>

function snowCap(bg: StyleColor, border: StyleColor, mounds: string): NonNullable<ThemeMessageRule['fill']> {
  return {
    vector: {
      viewBox: 48,
      slice: [12, 8, 8, 8] as const,
      repeat: true,
      paths: [
        { d: 'M0 7H48V48H0Z', color: border },
        { d: 'M1 8H47V47H1Z', color: bg },
        { d: 'M0 9H48V10H0Z', color: '#a9c6ea' },
        { d: mounds, color: '#eef4f8' },
      ],
    },
  }
}

const USER_BOX: ThemeMessageRule = {
  color: '#f2f6fc',
  backgroundColor: '#192541',
  paddingTop: 14,
  paddingX: 14,
  paddingBottom: 10,
}
const ASSISTANT_BOX: ThemeMessageRule = {
  color: '#f2f6fc',
  backgroundColor: '#141f3a',
  paddingTop: 14,
  paddingX: 14,
  paddingBottom: 10,
}

function styleFor(k: number): ThemeStyle {
  const u1 = PHASES[k % 6] ?? FLAT_MOUNDS
  const u2 = PHASES[(k + 2) % 6] ?? FLAT_MOUNDS
  const a1 = PHASES[(k + 3) % 6] ?? FLAT_MOUNDS
  const a2 = PHASES[(k + 5) % 6] ?? FLAT_MOUNDS
  return {
    UserMessage: [
      { ...USER_BOX, fill: snowCap('#192541', '#31446e', u1) },
      { ...USER_BOX, fill: snowCap('#192541', '#31446e', u2) },
    ],
    AssistantMessage: [
      { ...ASSISTANT_BOX, fill: snowCap('#141f3a', '#233457', a1) },
      { ...ASSISTANT_BOX, fill: snowCap('#141f3a', '#233457', a2) },
    ],
    ToolUse: {
      color: '#c7d3ec',
      backgroundColor: '#141f3a',
      radius: 0,
    },
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // An older build may refuse `style`; set the look without it then.
    const set = await $.theme.set({ ...LOOK, style: styleFor(0) }).catch(() => $.theme.set(LOOK))

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    // The snow on the boxes creeps: every few seconds the drifts take the
    // next step of their random walk.
    let tick = 0
    $.clock.every(4000, async () => {
      tick = (tick + 1) % ORDER.length
      await $.theme.set({ ...LOOK, style: styleFor(ORDER[tick] ?? 0) }).catch(() => {})
    })

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.plugin !== 'christmas-aurora' || e.props.scene !== 'christmas-night') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A fine pixel-art Christmas night in deep blue: snow falls over pines, two of them dressed with gold stars, sagging garlands and blinking ornaments, brown reindeer stand below with a red-nosed Rudolph, green and purple northern lights ripple above, Santa's red sleigh crosses the moon and a garland of colored bulbs blinks along the top"
        isInteractive
      />
    )
  })
}
