// Generates the pixel-art Christmas scene as hooks/scene.js for the
// christmas-aurora mod. Deep-blue night, detailed outlined pixel art in the
// style of classic sprite sheets: shaded reindeer with cream chest, white
// dapples and a catchlight eye; Santa's gold-trimmed sleigh with presents;
// green snow-capped pines; green/purple aurora. 480x270 grid, crispEdges.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Writes hooks/scene.js next to this script's parent folder, wherever the
// repository lives. Run: node tools/gen-scene.mjs
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'scene.js')

const W = 480
const H = 270

const C = {
  '0': '#121c38', // deep blue night
  '3': '#eef4f8', // snow white
  'L': '#a9c6ea', // pale ice blue (shading)
  'o': '#f6edd2', // warm moon white
  'O': '#241610', // sprite outline (dark warm brown)
  'b': '#b06a35', // reindeer body
  'u': '#8a4f26', // reindeer shadow / far legs
  'd': '#5c3a22', // dark brown (runners, trunks)
  'c': '#f2d2a0', // cream chest and muzzle
  'h': '#efb27e', // peach (inner ear, skin)
  'a': '#c9b267', // antler light
  'A': '#8a7a3a', // antler dark
  'E': '#2c7a4a', // deep green
  'k': '#4b4b55', // socket gray
  'T': '#1d5a3c', // pine dark
  't': '#2e7d4f', // pine mid
  'r': '#d93a2e', // christmas red
  'R': '#a02820', // dark red shadow
  'g': '#f0c04a', // gold
  'G': '#2fbf6b', // bulb green
  'B': '#4a9df0', // bulb blue
  'p': '#a86ae8', // aurora purple
  'm': '#7df0c8', // aurora mint
}
const NOSE_DIM = '#8c2018'
const NOSE_LIT = '#ff463a'

// ---------- sprite helpers ----------

function checkGrid(name, grid) {
  const w = grid[0].length
  for (const [i, row] of grid.entries()) {
    if (row.length !== w) throw new Error(name + ' row ' + i + ' length ' + row.length + ' wants ' + w)
    if (!/^[.03LoOabcdehknrutgAEGRTBpm]*$/.test(row)) throw new Error(name + ' row ' + i + ' bad char')
  }
}

function mirror(grid) {
  return grid.map(r => [...r].reverse().join(''))
}

// Wrap every filled region with a 1px dark outline, like the reference art.
function withOutline(grid) {
  const h = grid.length
  const w = grid[0].length
  const g2 = blank(w + 2, h + 2).map(r => r.split(''))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) g2[y + 1][x + 1] = grid[y][x]
  }
  const res = g2.map(r => [...r])
  for (let y = 0; y < h + 2; y++) {
    for (let x = 0; x < w + 2; x++) {
      if (g2[y][x] !== '.') continue
      const touches = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => {
        const yy = y + dy
        const xx = x + dx
        return yy >= 0 && yy < h + 2 && xx >= 0 && xx < w + 2 && g2[yy][xx] !== '.' && g2[yy][xx] !== 'O'
      })
      if (touches) res[y][x] = 'O'
    }
  }
  return res.map(r => r.join(''))
}

function sprite(grid, x, y, extra = '') {
  const runs = new Map()
  const noses = []
  for (let gy = 0; gy < grid.length; gy++) {
    const row = grid[gy]
    let gx = 0
    while (gx < row.length) {
      const ch = row[gx]
      if (ch === '.') { gx++; continue }
      if (ch === 'n') { noses.push([gx, gy]); gx++; continue }
      const key = ch === 'e' ? '3' : ch
      if (!C[key]) throw new Error('no color for char ' + ch)
      let len = 1
      if (ch !== 'e') {
        while (gx + len < row.length && row[gx + len] === ch) len++
      }
      if (!runs.has(key)) runs.set(key, [])
      runs.get(key).push([gx, gy, len])
      gx += len
    }
  }
  let out = '<g transform="translate(' + x + ' ' + y + ')"' + (extra ? ' ' + extra : '') + '>'
  for (const [key, list] of runs) {
    out += '<g fill="' + C[key] + '">'
    for (const [rx, ry, len] of list) {
      out += '<rect x="' + rx + '" y="' + ry + '" width="' + len + '" height="1"/>'
    }
    out += '</g>'
  }
  const byRow = new Map()
  for (const [nx, ny] of noses) {
    if (!byRow.has(ny)) byRow.set(ny, [])
    byRow.get(ny).push(nx)
  }
  for (const [ny, xs] of byRow) {
    xs.sort((q, w2) => q - w2)
    let s = 0
    while (s < xs.length) {
      let len = 1
      while (s + len < xs.length && xs[s + len] === xs[s] + len) len++
      out += '<rect x="' + xs[s] + '" y="' + ny + '" width="' + len + '" height="1" fill="' + NOSE_DIM + '"/>'
      out += '<rect x="' + xs[s] + '" y="' + ny + '" width="' + len + '" height="1" fill="' + NOSE_LIT + '" class="nz"/>'
      s += len
    }
  }
  return out + '</g>'
}

function place(base, sub, ox, oy) {
  for (let sy = 0; sy < sub.length; sy++) {
    const row = base[oy + sy].split('')
    for (let sx = 0; sx < sub[sy].length; sx++) {
      const ch = sub[sy][sx]
      if (ch !== '.') row[ox + sx] = ch
    }
    base[oy + sy] = row.join('')
  }
}

function blank(w, h) {
  return Array.from({ length: h }, () => '.'.repeat(w))
}

// ---------- stepped strip (stairs) path ----------

function strip(topAt, botAt, step = 2) {
  const cols = []
  for (let x = 0; x < W; x += step) cols.push(x)
  const n = cols.length
  let d = 'M' + cols[0] + ' ' + topAt(cols[0])
  for (let i = 0; i < n; i++) {
    d += 'H' + (cols[i] + step)
    if (i < n - 1) {
      const t2 = topAt(cols[i + 1])
      if (t2 !== topAt(cols[i])) d += 'V' + t2
    }
  }
  d += 'V' + botAt(cols[n - 1])
  for (let i = n - 1; i >= 0; i--) {
    d += 'H' + cols[i]
    if (i > 0) {
      const b2 = botAt(cols[i - 1])
      if (b2 !== botAt(cols[i])) d += 'V' + b2
    }
  }
  return d + 'Z'
}

const r1 = n => Math.round(n)

// ---------- the standing buck (side view, faces left) ----------

const DEER = withOutline([
  '..aa..aa...AA..AA...........',
  '..aa..aa...AA..AA...........',
  '...aaaa.....AAAA............',
  'aa..aaa..AA..AAA............',
  '.aaaaa....AAAAA.............',
  '....aa.......AA.............',
  '....aa......AA..............',
  '....aa.....AAbb.............',
  '...bbbbbbbbbbbhb............',
  '..bbbbOObbbbbbb.............',
  '.nnbbbOebbbbbb..............',
  '.nnbbbbbbbbbb...............',
  '..ccbbbbbbbbb...............',
  '...ccbbbbbbbb...............',
  '....ccbbbbbbb...............',
  '....ccbbbbbbb...............',
  '.....ccbbbbbb..........bb...',
  '.....ccbbbbbb.........bccb..',
  '......ccbbbbbbbbbbbbbbbbcc..',
  '......cbbbbbbbbbbbbbbbbbb...',
  '.....ccbbbbbbbbbbbbb33bbb...',
  '.....cbbbbbbbbbbbb3bb3bbb...',
  '.....cbbbbbbbbbbbbb3bbbb....',
  '.....ccbbbbbbbbbbbbbbbbb....',
  '......cchhbbbbbbbbbbbbbb....',
  '......bbb..uu.....bbb..uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......bb...uu.....bb...uu...',
  '......kk...kk.....kk...kk...',
  '......kk...kk.....kk...kk...',
])
checkGrid('DEER', DEER)

// The calf (drawn facing left; mirrored in the scene to face the buck).
const CALF = withOutline([
  '.bb....bb........',
  '.bhb..bhb........',
  '..bbbbbb.........',
  '..bOebbb.........',
  '.ccbbbbb.........',
  '.cObbbbb.........',
  '..cbbbbb.........',
  '...cbbbbb........',
  '...cbbbbbbbbbbb..',
  '...bbbbbbb33bbb..',
  '...bbbbbb3bb3bbc.',
  '...bbbbbbbbbbbbc.',
  '....ubbbbbbbbbb..',
  '....bb.uu...bb.uu',
  '....bb.uu...bb.uu',
  '....bb.uu...bb.uu',
  '....bb.uu...bb.uu',
  '....kk.kk...kk.kk',
  '....kk.kk...kk.kk',
])
checkGrid('CALF', CALF)

// Natural procedural pine: asymmetric jittered branches, snow settling on
// every exposed ledge, shaded undersides, brown trunk. Each seed differs.
function pine2(h, maxHalf, trunkH, treeSeed) {
  let s = treeSeed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const w = maxHalf * 2 + 5
  const cx = Math.floor(w / 2)
  const cells = Array.from({ length: h + trunkH }, () => Array(w).fill('.'))
  for (let y = 0; y < h; y++) {
    const base = 1 + ((maxHalf - 1) * y) / (h - 1)
    let hl = Math.round(base + (rnd() * 2.4 - 1.2))
    let hr = Math.round(base + (rnd() * 2.4 - 1.2))
    if (y % 3 === 2) {
      hl = Math.max(1, hl - 1)
      hr = Math.max(1, hr - 1)
    }
    if (y > 2 && rnd() < 0.22) hl += 2
    if (y > 2 && rnd() < 0.22) hr += 2
    hl = Math.max(1, Math.min(maxHalf + 2, hl))
    hr = Math.max(1, Math.min(maxHalf + 2, hr))
    for (let x = cx - hl; x <= cx + hr; x++) cells[y][x] = 't'
  }
  for (let y = h; y < h + trunkH; y++) {
    for (let x = cx - 1; x <= cx; x++) cells[y][x] = 'd'
  }
  // shade undersides and the right (moon-away) edge
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] !== 't') continue
      const below = y + 1 < h ? cells[y + 1][x] : '.'
      const right = x + 1 < w ? cells[y][x + 1] : '.'
      if (below === '.' || right === '.') cells[y][x] = 'T'
    }
  }
  // snow settles wherever sky is directly above
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] === '.' || cells[y][x] === 'd') continue
      const above = y > 0 ? cells[y - 1][x] : '.'
      if (above === '.' && rnd() < 0.8) cells[y][x] = '3'
    }
  }
  return cells.map(r => r.join(''))
}

const TREE_B1 = pine2(33, 15, 6, 11)
checkGrid('TREE_B1', TREE_B1)
const TREE_B2 = pine2(34, 16, 6, 23)
checkGrid('TREE_B2', TREE_B2)
const TREE_S1 = pine2(20, 9, 4, 37)
checkGrid('TREE_S1', TREE_S1)
const TREE_S2 = pine2(15, 7, 4, 41)
checkGrid('TREE_S2', TREE_S2)
const TREE_S3 = pine2(20, 9, 4, 53)
checkGrid('TREE_S3', TREE_S3)
const TREE_S4 = pine2(14, 7, 3, 67)
checkGrid('TREE_S4', TREE_S4)

// Warm shaded moon with craters and a darker rim.
const MOON = (() => {
  const R = 16
  const S = R * 2 + 1
  const g = blank(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - R
      const dy = y - R
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      const row = g[y].split('')
      row[x] = d2 > (R - 2) * (R - 2) && dx + dy > R * 0.5 ? 'L' : 'o'
      g[y] = row.join('')
    }
  }
  for (const [cx, cy] of [[11, 12], [21, 20], [19, 7], [9, 21], [23, 12]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const row = g[cy + dy].split('')
      row[cx + dx] = 'L'
      g[cy + dy] = row.join('')
    }
  }
  return g
})()
checkGrid('MOON', MOON)

// ---------- Santa's rig: sleigh with presents, three gallopers ----------

const SLEIGH2 = [
  '.....BB.GG.rr......rr.....',
  '.....BBgGG.rr.uu...rr3....',
  '....gBBgGGgrruuuu..hh3....',
  '....ggggggggggguu..r333...',
  '....rrrrrrrrrrrrrrrrr33...',
  '...rrrrrrrrrrrrrrrrrr.gg..',
  '...rrrrrrrrrrrrrrrrrr.gg..',
  '..rrrrrrrrrrrrrrrrrrrggg..',
  '..rrrrrrrrrrrrrrrrrrrgg...',
  '..RRRRRRRRRRRRRRRRRRR.....',
  '...RRRRRRRRRRRRRRRRR......',
  '....uu....uu....uu...d....',
  '....uu....uu....uu..dd....',
  '.ddddddddddddddddddddd....',
]
checkGrid('SLEIGH2', SLEIGH2)

// A galloping harness deer (faces right): gold antlers, red strap, bell.
const FLY_BODY = [
  '.......g..g....',
  '.......gg.gg...',
  '........ggg....',
  '........bbbbb..',
  '........bbbOeb.',
  '.bb....bbbbbbb.',
  '.bbbbrrbbbbbb..',
  '..bbbrrbbbbb...',
]
const FLY_LEGS_A = [
  '..ub.g...ub....',
  '.ub.......ub...',
  'ub.........ub..',
]
const FLY_LEGS_B = [
  '...ub.g..ub....',
  '...ub....ub....',
  '....b....b.....',
]

function teamGrid(legs) {
  const g = blank(97, 17)
  place(g, SLEIGH2, 0, 1)
  for (const dx of [30, 52, 74]) {
    place(g, FLY_BODY, dx, 2)
    place(g, legs, dx, 10)
  }
  // reins across the gaps
  for (const [x0, x1] of [[26, 31], [45, 53], [67, 75]]) {
    const row = g[8].split('')
    for (let x = x0; x < x1; x++) {
      if (row[x] === '.') row[x] = 'r'
    }
    g[8] = row.join('')
  }
  // the lead deer gets the red nose
  {
    const row = g[6].split('')
    row[88] = 'n'
    g[6] = row.join('')
  }
  return withOutline(g)
}
const TEAM_A = teamGrid(FLY_LEGS_A)
const TEAM_B = teamGrid(FLY_LEGS_B)
checkGrid('TEAM_A', TEAM_A)
checkGrid('TEAM_B', TEAM_B)

// ---------- terrain and aurora ----------

const hillTop = x => 192 + r1(6 * Math.sin(x / 46) + 4 * Math.sin(x / 18 + 2))
const lightTop = x => 204 + r1(5 * Math.sin(x / 40 + 2) + 3 * Math.sin(x / 15))
const snowTop = x => 212 + r1(6 * Math.sin(x / 34 + 1) + 4 * Math.sin(x / 62))

const groundY = (cx, h, sink) => snowTop(cx) + sink - h

const baseA = x => 68 + r1(12 * Math.sin(x / 52) + 6 * Math.sin(x / 22 + 1.2))
const baseA2 = x => 68 + r1(12 * Math.sin(x / 52 + 1.1) + 6 * Math.sin(x / 22 + 2.4))
const baseB = x => 108 + r1(10 * Math.sin(x / 62 + 2.3) + 6 * Math.sin(x / 26 + 0.4))
const baseB2 = x => 108 + r1(10 * Math.sin(x / 62 + 3.1) + 6 * Math.sin(x / 26 + 1.5))

function auroraBand(base, mainH, tailH, tailFill, mainColor, coreColor, crestFill) {
  let out = ''
  out += '<path fill="' + tailFill + '" d="' + strip(x => base(x) - mainH - tailH, x => base(x) - mainH, 3) + '"/>'
  out += '<path fill="' + mainColor + '" d="' + strip(x => base(x) - mainH, x => base(x) - 2, 3) + '"/>'
  out += '<path fill="' + coreColor + '" d="' + strip(x => base(x) - mainH + 3, x => base(x) - mainH + 5, 3) + '"/>'
  out += '<path fill="' + crestFill + '" d="' + strip(x => base(x) - 2, x => base(x) + 2, 3) + '"/>'
  return out
}

const wireY = x => 6 + r1(5 * (1 - Math.cos((2 * Math.PI * (x % 60)) / 60)))

// ---------- scatter ----------

let seed = 20261225
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

function flakes(count, size) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * (W - size))
    const y = Math.floor(rand() * (H - size))
    out += '<rect x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '"/>'
  }
  return out
}

const STARS = (() => {
  let out = ''
  const cls = ['', '', ' class="st1"', '', ' class="st2"', '', ' class="st3"']
  let i = 0
  let placed = 0
  while (placed < 40) {
    const x = Math.floor(rand() * 474) + 3
    const y = Math.floor(rand() * 112) + 4
    if (x > 368 && x < 424 && y < 60) continue // moon box
    const big = placed % 7 === 3
    if (big) {
      out += '<g opacity=".85"' + cls[i % cls.length] + '>'
      out += '<rect x="' + x + '" y="' + (y - 1) + '" width="1" height="3" fill="' + C['3'] + '"/>'
      out += '<rect x="' + (x - 1) + '" y="' + y + '" width="3" height="1" fill="' + C['3'] + '"/>'
      out += '</g>'
    } else {
      out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + C['3'] + '" opacity=".8"' + cls[i % cls.length] + '/>'
    }
    i++
    placed++
  }
  return out
})()

// Sparkles on the snow and hills.
const SPARKLES = (() => {
  let out = ''
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rand() * 470) + 5
    const y = snowTop(x) + 6 + Math.floor(rand() * 40)
    out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + C['L'] + '"/>'
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * 470) + 5
    const y = hillTop(x) + 2 + Math.floor(rand() * 8)
    out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + C['3'] + '"/>'
  }
  return out
})()

// ---------- bulbs ----------

const BULB_CYCLE = [
  ['r', 'dR'],
  ['g', 'dY'],
  ['G', 'dGr'],
  ['B', 'dBl'],
]

function bulbs() {
  let out = ''
  const phase = ['bl', 'bl b1', 'bl b2', 'bl b3']
  let i = 0
  for (let k = 0; k < 8; k++) {
    const x = 30 + 60 * k
    const [ch, pat] = BULB_CYCLE[i % 4]
    out += '<rect x="' + (x - 1) + '" y="15" width="2" height="2" fill="' + C['k'] + '"/>'
    out += '<g class="' + phase[i % 4] + '">'
    out += '<rect x="' + (x - 4) + '" y="16" width="8" height="8" fill="url(#' + pat + ')"/>'
    out += '<rect x="' + (x - 2) + '" y="18" width="4" height="4" fill="' + C[ch] + '"/>'
    out += '<rect x="' + (x - 2) + '" y="18" width="1" height="1" fill="' + C['3'] + '"/>'
    out += '</g>'
    i++
  }
  for (let k = 1; k < 8; k++) {
    const x = 60 * k
    const [ch] = BULB_CYCLE[i % 4]
    out += '<rect x="' + x + '" y="8" width="1" height="1" fill="' + C['k'] + '"/>'
    out += '<g class="' + phase[i % 4] + '">'
    out += '<rect x="' + (x - 1) + '" y="9" width="3" height="3" fill="' + C[ch] + '"/>'
    out += '<rect x="' + (x - 1) + '" y="9" width="1" height="1" fill="' + C['3'] + '"/>'
    out += '</g>'
    i++
  }
  return out
}

// Dress a generated tree like a proper Christmas tree: a twinkling gold
// star on the apex, sagging gold garland strands, and fat blinking
// ornaments with catchlights. Green bulbs are skipped on purpose - they
// vanish against the foliage.
const STAR = [
  '...g...',
  '...g...',
  '..ggg..',
  'gggeggg',
  '..ggg..',
  '...g...',
  '...A...',
]
checkGrid('STAR', STAR)
const ORN_CYCLE = ['r', 'g', 'B', 'p']

function treeDeco(grid) {
  const phase = ['bl', 'bl b2', 'bl b1', 'bl b3']
  const spans = grid.map(row => {
    let a = -1
    let b = -1
    for (let x = 0; x < row.length; x++) {
      const c = row[x]
      if (c === 't' || c === 'T' || c === '3') {
        if (a < 0) a = x
        b = x
      }
    }
    return [a, b]
  })
  let out = ''
  // center the star over the crown's average midline, kept attached to row 0
  let cs = 0
  let cn = 0
  for (let y = 0; y < 3 && y < spans.length; y++) {
    const [a, b] = spans[y]
    if (a >= 0) {
      cs += (a + b) / 2
      cn++
    }
  }
  const [a0, b0] = spans[0]
  const apex = Math.max(a0, Math.min(b0, Math.round(cs / cn)))
  out += '<g class="st2">' + sprite(STAR, apex - 3, -6) + '</g>'
  const garland = new Set()
  for (let y = 7; y < grid.length; y += 6) {
    const [a, b] = spans[y]
    if (a < 0 || b - a < 6) continue
    garland.add(y)
    const q = Math.max(1, Math.round((b - a) / 4))
    out += '<g fill="' + C['g'] + '">'
    out += '<rect x="' + a + '" y="' + y + '" width="' + q + '" height="1"/>'
    out += '<rect x="' + (a + q) + '" y="' + (y + 1) + '" width="' + (b - a + 1 - 2 * q) + '" height="1"/>'
    out += '<rect x="' + (b - q + 1) + '" y="' + y + '" width="' + q + '" height="1"/>'
    out += '</g>'
  }
  let i = 0
  for (let y = 8; y < grid.length - 1; y++) {
    if ((y - 8) % 3 !== 0 || garland.has(y) || garland.has(y + 1)) continue
    const [a, b] = spans[y]
    if (a < 0 || b - a < 5) continue
    if (spans[y + 1][0] < 0) continue
    const slots = b - a >= 15 ? [0.25, 0.7] : [0.3 + 0.35 * (i % 2)]
    for (const f of slots) {
      const x = Math.max(a + 1, Math.min(b - 2, a + Math.round((b - a) * f) + ((i * 5) % 3) - 1))
      const ch = ORN_CYCLE[i % 4]
      out += '<g class="' + phase[i % 4] + '">'
      out += '<rect x="' + x + '" y="' + y + '" width="2" height="2" fill="' + C[ch] + '"/>'
      out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + C['3'] + '"/>'
      out += '</g>'
      i++
    }
  }
  return out
}

// ---------- assemble ----------

const STYLE = `
.pfa{animation:onoff 3.2s steps(1) infinite}
.pfb{animation:offon 3.2s steps(1) infinite}
.gfa{animation:onoff 1s steps(1) infinite}
.gfb{animation:offon 1s steps(1) infinite}
.bl{animation:dimup 2.4s steps(1) infinite}
.b1{animation-delay:-.6s}
.b2{animation-delay:-1.2s}
.b3{animation-delay:-1.8s}
.nz{animation:dimup 3s steps(1) infinite}
.st1{animation:dimup 5s steps(1) infinite}
.st2{animation:dimup 6.4s steps(1) infinite;animation-delay:-2s}
.st3{animation:dimup 7.6s steps(1) infinite;animation-delay:-3.5s}
.sfa{animation:pfall 26s steps(108) infinite}
.sfb{animation:pfall 18s steps(90) infinite}
.sfc{animation:pfall 12s steps(54) infinite}
.swa{animation:psway 11s steps(5) infinite alternate}
.swb{animation:psway 9s steps(4) infinite alternate}
.swc{animation:psway 7s steps(3) infinite alternate}
.sl{animation:pfly 80s steps(190) infinite}
@keyframes onoff{0%,100%{opacity:1}50%{opacity:0}}
@keyframes offon{0%,100%{opacity:0}50%{opacity:1}}
@keyframes dimup{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes pfall{from{transform:translateY(0)}to{transform:translateY(270px)}}
@keyframes psway{from{transform:translateX(-3px)}to{transform:translateX(3px)}}
@keyframes pfly{0%{transform:translate(-110px,30px)}50%{transform:translate(190px,22px)}100%{transform:translate(500px,30px)}}
`.trim()

function dither(id, color) {
  return '<pattern id="' + id + '" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="1" height="1" fill="' + color + '"/><rect x="1" y="1" width="1" height="1" fill="' + color + '"/></pattern>'
}

let svg = '<svg viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">'
svg += '<style>' + STYLE + '</style>'
svg += '<defs>'
svg += dither('dW', C['L'])
svg += dither('dSk', '#1b2a52')
svg += dither('dR', C['r'])
svg += dither('dY', C['g'])
svg += dither('dGr', C['G'])
svg += dither('dBl', C['B'])
svg += dither('dPu', C['p'])
svg += dither('dMi', C['m'])
svg += dither('dPk', '#ef8ad4')
svg += '<g id="pfA" fill="' + C['3'] + '">' + flakes(40, 1) + '</g>'
svg += '<g id="pfB" fill="' + C['3'] + '">' + flakes(26, 2) + '</g>'
svg += '<g id="pfC" fill="' + C['3'] + '">' + flakes(14, 3) + flakes(4, 4) + '</g>'
svg += '</defs>'

// sky, with a lighter dithered band near the horizon
svg += '<rect x="0" y="0" width="480" height="270" fill="' + C['0'] + '"/>'
svg += '<path fill="url(#dSk)" d="' + strip(() => 150, x => hillTop(x), 3) + '"/>'
svg += STARS
svg += sprite(MOON, 380, 16)

// aurora, two frames: green and purple bands with bright cores
svg += '<g class="pfa" opacity="1">'
svg += auroraBand(baseA, 12, 14, 'url(#dGr)', '#3fd98a', C['m'], 'url(#dMi)')
svg += '<g opacity=".85">' + auroraBand(baseB, 8, 12, 'url(#dPu)', C['p'], '#d2b1f5', 'url(#dPk)') + '</g>'
svg += '</g>'
svg += '<g class="pfb" opacity="0">'
svg += auroraBand(baseA2, 12, 14, 'url(#dGr)', '#3fd98a', C['m'], 'url(#dMi)')
svg += '<g opacity=".85">' + auroraBand(baseB2, 8, 12, 'url(#dPu)', C['p'], '#d2b1f5', 'url(#dPk)') + '</g>'
svg += '</g>'

// Santa's rig
svg += '<g class="sl" transform="translate(270 30)">'
svg += '<g class="gfa" opacity="1">' + sprite(TEAM_A, 0, 0) + '</g>'
svg += '<g class="gfb" opacity="0">' + sprite(TEAM_B, 0, 0) + '</g>'
svg += '</g>'

// ground: dithered far hills, pale-blue near band, then white snow
svg += '<path fill="url(#dW)" d="' + strip(hillTop, () => 270) + '"/>'
svg += '<path fill="' + C['L'] + '" d="' + strip(lightTop, () => 270) + '"/>'
svg += '<path fill="' + C['3'] + '" d="' + strip(snowTop, () => 270) + '"/>'
// drift shadow lines across the snow
svg += '<path fill="' + C['L'] + '" d="' + strip(x => 230 + r1(3 * Math.sin(x / 37 + 1)), x => 231 + r1(3 * Math.sin(x / 37 + 1)), 4) + '"/>'
svg += '<path fill="' + C['L'] + '" d="' + strip(x => 248 + r1(3 * Math.sin(x / 29 + 4)), x => 249 + r1(3 * Math.sin(x / 29 + 4)), 4) + '"/>'
svg += SPARKLES
// aurora glints on the snow
svg += '<rect x="200" y="232" width="28" height="3" fill="url(#dGr)"/>'
svg += '<rect x="300" y="243" width="20" height="3" fill="url(#dPu)"/>'
svg += '<rect x="56" y="247" width="24" height="3" fill="url(#dGr)"/>'
svg += '<rect x="392" y="240" width="24" height="3" fill="url(#dPu)"/>'

// trees
const bigTree1Y = groundY(31, TREE_B1.length, 5)
svg += sprite(TREE_B1, 14, bigTree1Y)
svg += '<g transform="translate(14 ' + bigTree1Y + ')">' + treeDeco(TREE_B1) + '</g>'
const s1Y = groundY(61, TREE_S1.length, 5)
svg += sprite(TREE_S1, 50, s1Y)
svg += '<g transform="translate(50 ' + s1Y + ')">' + treeDeco(TREE_S1) + '</g>'
svg += sprite(TREE_S2, 0, groundY(10, TREE_S2.length, 6))
const bigTreeY = groundY(432, TREE_B2.length, 5)
svg += sprite(TREE_B2, 414, bigTreeY)
svg += '<g transform="translate(414 ' + bigTreeY + ')">' + treeDeco(TREE_B2) + '</g>'
const s3Y = groundY(399, TREE_S3.length, 5)
svg += sprite(TREE_S3, 388, s3Y)
svg += '<g transform="translate(388 ' + s3Y + ')">' + treeDeco(TREE_S3) + '</g>'
svg += sprite(TREE_S4, 457, groundY(466, TREE_S4.length, 6))

// reindeer: the buck faces left, the calf (mirrored) faces him
svg += sprite(DEER, 148, groundY(164, DEER.length, 3))
svg += sprite(mirror(CALF), 110, groundY(119, CALF.length, 3))

// garland across the top
svg += '<path fill="' + C['3'] + '" d="' + strip(wireY, x => wireY(x) + 2, 2) + '"/>'
svg += bulbs()

// snow, three layers
svg += '<g class="swa" opacity=".45"><g class="sfa"><use href="#pfA"/><use href="#pfA" y="-270"/></g></g>'
svg += '<g class="swb" opacity=".7"><g class="sfb"><use href="#pfB"/><use href="#pfB" y="-270"/></g></g>'
svg += '<g class="swc" opacity=".95"><g class="sfc"><use href="#pfC"/><use href="#pfC" y="-270"/></g></g>'

svg += '</svg>'

// ---------- checks ----------

if (svg.length > 131072) throw new Error('scene too big: ' + svg.length)
for (const m of svg.matchAll(/href="([^"]*)"/g)) {
  if (!m[1].startsWith('#')) throw new Error('non-local href: ' + m[1])
}
if (/[\\<>]/.test(svg.replace(/<[^>]*>/g, ''))) throw new Error('stray angle bracket or backslash in text content')
if (svg.includes('`') || svg.includes('${')) throw new Error('template hazard')

const file = '// Generated by gen-scene.mjs. Edit the generator, not this file.\n'
  + 'export const SCENE = ' + JSON.stringify(svg) + '\n'
writeFileSync(OUT, file)

// ---------- preview ----------

for (const [name, g] of [['TREE_B2', TREE_B2], ['TREE_S1', TREE_S1]]) {
  console.log('--- ' + name)
  console.log(g.join('\n'))
}
console.log('scene bytes: ' + svg.length)
console.log('wrote ' + OUT)
