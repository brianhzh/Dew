import type { Effects } from '../types.ts'

export type EngineInput = {
  vigor: number
  maturity: number
  baseline: number
  effects: Partial<Effects>
  pestsActive: boolean
}

type Pest = { s: number; tp: number; sp: number }
type Seg = { x1: number; y1: number; x2: number; y2: number }
type Particle = {
  type: 'hail' | 'rain' | 'frost' | 'leaf'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  b?: boolean
  r?: number
  c?: string
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rules: Record<string, string> = {
  X: 'F+[[X]-X]-F[-FX]+X',
  F: 'FF',
}

function expand(n: number) {
  let s = 'X'
  for (let i = 0; i < n; i++) {
    let o = ''
    for (let j = 0; j < s.length; j++) o += rules[s[j]] || s[j]
    s = o
  }
  return s
}

function iterFor(m: number) {
  return 2 + Math.round(m / 33)
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%)`
}

export class PlantEngine {
  private ctx: CanvasRenderingContext2D
  private W = 360
  private H = 280
  private seed: number
  private scaleCap: number
  private targetV = 100
  private dispV = 100
  private maturity = 100
  private iter = 5
  private lstr = expand(5)
  private t = 0
  private storm = 0
  private stormT = 0
  private wind = 0.08
  private windT = 0.08
  private flash = 0
  private flashQ = -1
  private shake = 0
  private rain = 0
  private rainT = 0
  private cold = 0
  private coldT = 0
  private drought = 0
  private droughtT = 0
  private regrow = 1
  private particles: Particle[] = []
  private pests: Pest[] = []
  private segs: Seg[] = []
  private raf = 0
  private lastEffects = ''

  constructor(
    ctx: CanvasRenderingContext2D,
    opts?: { seed?: number; height?: number; scaleCap?: number },
  ) {
    this.ctx = ctx
    this.seed = opts?.seed ?? 1337
    this.H = opts?.height ?? 280
    this.scaleCap = opts?.scaleCap ?? 1
  }

  resize(width: number, height: number, dpr: number) {
    this.W = width
    this.H = height
    const cv = this.ctx.canvas
    cv.width = width * dpr
    cv.height = height * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  apply(input: EngineInput) {
    this.targetV = input.vigor
    this.maturity = input.maturity
    const e = input.effects
    const key = JSON.stringify({ e, p: input.pestsActive })
    const first = !this.lastEffects
    const hasWeather = !!(
      e.frost ||
      e.hail ||
      e.lightning ||
      e.shake ||
      e.rain ||
      e.falling_leaves ||
      e.pests
    )
    if (key !== this.lastEffects) {
      this.lastEffects = key
      if (!first || hasWeather || input.pestsActive) this.trigger(e, input.pestsActive)
    }
    this.droughtT = e.drought ?? 0
  }

  private trigger(e: Partial<Effects>, pestsActive: boolean) {
    if (e.rain) {
      this.rainT = 1
      this.regrow = 0.7
    }
    if (e.frost) {
      this.coldT = 1
      this.windT = 0.35
      this.burst(6, '150,110,60')
    }
    if (e.hail || e.lightning || e.shake) {
      this.stormT = e.lightning || e.shake ? 1 : 0.55
      this.windT = e.lightning ? 1.1 : 0.7
      if (e.lightning) {
        this.flash = 1
        this.flashQ = 22
      }
      if (e.shake) this.shake = 9
      if (e.falling_leaves) this.burst(e.lightning ? 34 : 14, '110,80,45')
    } else if (e.falling_leaves) {
      this.burst(6, '150,110,60')
    }
    if (e.pests || pestsActive) this.spawnPests()
    if (!pestsActive && !e.pests) this.pests = []
  }

  private spawnPests() {
    if (this.pests.length) return
    for (let i = 0; i < 7; i++) {
      this.pests.push({
        s: -1,
        tp: Math.random(),
        sp: 0.02 + Math.random() * 0.02,
      })
    }
  }

  start() {
    const loop = () => {
      this.tick()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  private walk(draw: boolean, scale: number, ox: number, oy: number) {
    const ctx = this.ctx
    const rng = mulberry32(this.seed)
    const v = this.dispV / 100
    const sag = (1 - v) * 0.9
    const baseAng = 22 + rng() * 2
    const st: number[][] = []
    let x = 0
    let y = 0
    let ang = -90
    let depth = 0
    const seg = 6.2
    let minx = 0
    let maxx = 0
    let miny = 0
    let maxy = 0
    const leafHue = lerp(120, 28, 1 - v)
    const leafSat = lerp(55, 38, 1 - v)
    const leafLit = lerp(44, 32, 1 - v)
    const leafSize = lerp(7, 3, 1 - v) * this.regrow
    const stemHue = lerp(92, 30, 1 - v)
    const stemSat = lerp(40, 26, 1 - v)
    const str = this.lstr
    for (let i = 0; i < str.length; i++) {
      const c = str[i]
      if (c === 'F') {
        const sway =
          Math.sin(this.t * 0.06 + depth * 0.7) * this.wind * 9 * (0.3 + depth * 0.15)
        const a = ((ang + sag * depth * 3 + sway) * Math.PI) / 180
        const nx = x + Math.cos(a) * seg
        const ny = y + Math.sin(a) * seg
        if (draw) {
          const sx1 = ox + x * scale
          const sy1 = oy + y * scale
          const sx2 = ox + nx * scale
          const sy2 = oy + ny * scale
          ctx.strokeStyle = hsl(stemHue, stemSat, lerp(34, 24, depth / 9))
          ctx.lineWidth = Math.max(1, 6 - depth * 0.7) * scale * 0.4
          ctx.beginPath()
          ctx.moveTo(sx1, sy1)
          ctx.lineTo(sx2, sy2)
          ctx.stroke()
          this.segs.push({ x1: sx1, y1: sy1, x2: sx2, y2: sy2 })
        } else {
          if (nx < minx) minx = nx
          if (nx > maxx) maxx = nx
          if (ny < miny) miny = ny
          if (ny > maxy) maxy = ny
        }
        x = nx
        y = ny
      } else if (c === '+') ang += baseAng + (rng() - 0.5) * 10
      else if (c === '-') ang -= baseAng + (rng() - 0.5) * 10
      else if (c === '[') {
        st.push([x, y, ang, depth])
        depth++
      } else if (c === ']') {
        const keep = rng()
        if (draw && keep < v * 0.85 + 0.18) {
          const px = ox + x * scale
          const py = oy + y * scale
          let sz = leafSize * scale * 0.5
          if (v > 0.82 && keep < 0.35) {
            ctx.fillStyle = keep < 0.18 ? '#E9A0C0' : '#F4C7DB'
            sz *= 1.15
          } else {
            ctx.fillStyle = hsl(leafHue + (rng() - 0.5) * 16, leafSat, leafLit)
          }
          ctx.beginPath()
          ctx.ellipse(px, py, sz, sz * 1.5, rng() * Math.PI, 0, 6.283)
          ctx.fill()
        }
        const p = st.pop()
        if (p) {
          x = p[0]
          y = p[1]
          ang = p[2]
          depth = p[3]
        }
      }
    }
    return { minx, maxx, miny, maxy }
  }

  private drawSky() {
    const ctx = this.ctx
    let th = 200
    let ts = 45
    let tl = 84
    let bh = 120
    let bs = 38
    let bl = 93
    th = lerp(th, 205, this.storm)
    ts = lerp(ts, 8, this.storm)
    tl = lerp(tl, 64, this.storm)
    bh = lerp(bh, 210, this.storm)
    bs = lerp(bs, 6, this.storm)
    bl = lerp(bl, 74, this.storm)
    ts = lerp(ts, ts * 0.6, this.cold)
    tl = lerp(tl, 91, this.cold)
    bl = lerp(bl, 96, this.cold)
    tl = lerp(tl, tl - 9, this.rain)
    bl = lerp(bl, bl - 7, this.rain)
    tl = lerp(tl, tl + 8, this.drought)
    bl = lerp(bl, bl + 6, this.drought)
    ts = lerp(ts, ts * 0.5, this.drought)
    const g = ctx.createLinearGradient(0, 0, 0, this.H)
    g.addColorStop(0, hsl(th, ts, tl))
    g.addColorStop(1, hsl(bh, bs, bl))
    ctx.fillStyle = g
    ctx.fillRect(-20, -20, this.W + 40, this.H + 40)
    const sl = lerp(30, 21, this.rain)
    ctx.fillStyle = hsl(28, 42, sl)
    ctx.beginPath()
    ctx.ellipse(this.W / 2, this.H - 8, this.W * 0.34, 26, 0, 0, 6.283)
    ctx.fill()
    ctx.fillStyle = hsl(28, 40, sl + 6)
    ctx.beginPath()
    ctx.ellipse(this.W / 2, this.H - 14, this.W * 0.3, 18, 0, 0, 6.283)
    ctx.fill()
  }

  private spawn() {
    if (this.storm > 0.18) {
      const n = Math.floor(this.storm * 7)
      for (let i = 0; i < n; i++) {
        this.particles.push({
          type: 'hail',
          x: Math.random() * this.W * 1.3 - this.W * 0.1,
          y: -10,
          vx: -1.5 - this.wind * 2 + Math.random(),
          vy: 6 + Math.random() * 4,
          life: 200,
          b: false,
        })
      }
    }
    if (this.rain > 0.2) {
      const m = Math.floor(this.rain * 5)
      for (let j = 0; j < m; j++) {
        this.particles.push({
          type: 'rain',
          x: Math.random() * this.W * 1.1,
          y: -10,
          vx: -0.6,
          vy: 7 + Math.random() * 3,
          life: 120,
        })
      }
    }
    if (this.cold > 0.3 && Math.random() < this.cold * 0.6) {
      this.particles.push({
        type: 'frost',
        x: Math.random() * this.W,
        y: -5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.5 + Math.random() * 0.6,
        life: 260,
        r: 0,
      })
    }
  }

  private burst(n: number, col: string) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'leaf',
        x: this.W / 2 + (Math.random() - 0.5) * this.W * 0.4,
        y: this.H * 0.32 + Math.random() * this.H * 0.22,
        vx: (Math.random() - 0.5) * 2.4,
        vy: Math.random() * 1.2,
        life: 45 + Math.random() * 30,
        r: Math.random() * 3,
        c: col,
      })
    }
  }

  private stepParticles(front: boolean) {
    const ctx = this.ctx
    const gy = this.H - 22
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const isFront = p.type === 'hail' || p.type === 'leaf'
      if (isFront !== front) continue
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.type === 'hail') {
        p.vy += 0.15
        if (p.y >= gy) {
          if (!p.b) {
            p.b = true
            p.vy = -p.vy * 0.35
            p.vx *= 0.5
            p.y = gy
          } else p.life = 0
        }
        ctx.fillStyle = 'rgba(236,241,246,0.95)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.2, 0, 6.283)
        ctx.fill()
      } else if (p.type === 'rain') {
        if (p.y > gy) p.life = 0
        ctx.strokeStyle = 'rgba(120,150,190,0.55)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.6)
        ctx.stroke()
      } else if (p.type === 'frost') {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, p.life / 120).toFixed(2)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, 6.283)
        ctx.fill()
      } else if (p.type === 'leaf') {
        p.vy += 0.05
        p.vx += Math.sin(this.t * 0.1 + (p.r ?? 0)) * 0.05
        p.r = (p.r ?? 0) + 0.15
        ctx.fillStyle = `rgba(${p.c},${Math.max(0, p.life / 60).toFixed(2)})`
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, 3, 1.8, p.r, 0, 6.283)
        ctx.fill()
      }
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private stepPests() {
    const ctx = this.ctx
    if (!this.segs.length) return
    for (let i = 0; i < this.pests.length; i++) {
      const q = this.pests[i]
      if (q.s >= this.segs.length || q.s < 0)
        q.s = Math.floor(Math.random() * this.segs.length)
      let s = this.segs[q.s]
      q.tp += q.sp
      if (q.tp > 1) {
        const nx = this.segs[q.s + 1]
        if (nx && Math.abs(nx.x1 - s.x2) < 2 && Math.abs(nx.y1 - s.y2) < 2) q.s++
        else q.s = Math.floor(Math.random() * this.segs.length)
        q.tp = 0
        s = this.segs[q.s]
      }
      const px = lerp(s.x1, s.x2, q.tp)
      const py = lerp(s.y1, s.y2, q.tp)
      const an = Math.atan2(s.y2 - s.y1, s.x2 - s.x1)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(an)
      ctx.fillStyle = '#2a2a1e'
      ctx.beginPath()
      ctx.ellipse(0, 0, 2.6, 1.6, 0, 0, 6.283)
      ctx.fill()
      ctx.fillStyle = '#4a4a30'
      ctx.beginPath()
      ctx.arc(2.2, 0, 1.1, 0, 6.283)
      ctx.fill()
      ctx.restore()
    }
  }

  private tick() {
    const ctx = this.ctx
    this.t++
    this.dispV += (this.targetV - this.dispV) * 0.06
    this.storm += (this.stormT - this.storm) * 0.05
    this.stormT *= 0.993
    this.wind += (this.windT - this.wind) * 0.04
    this.windT += (0.08 - this.windT) * 0.008
    this.rain += (this.rainT - this.rain) * 0.05
    this.rainT *= 0.993
    this.cold += (this.coldT - this.cold) * 0.05
    this.coldT *= 0.988
    this.drought += (this.droughtT - this.drought) * 0.04
    this.regrow += (1 - this.regrow) * 0.03
    if (this.flashQ > 0) this.flashQ--
    if (this.flashQ === 0) {
      this.flash = 0.85
      this.flashQ = -1
    }
    this.flash *= 0.8
    this.shake *= 0.85
    const ni = iterFor(this.maturity)
    if (ni !== this.iter) {
      this.iter = ni
      this.lstr = expand(this.iter)
    }
    ctx.save()
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
    this.drawSky()
    this.spawn()
    this.stepParticles(false)
    this.segs = []
    const b = this.walk(false, 1, 0, 0)
    const pw = b.maxx - b.minx || 1
    const ph = b.maxy - b.miny || 1
    const scale =
      Math.min((this.W * 0.8) / pw, (this.H * 0.74) / ph) * this.scaleCap
    const ox = this.W / 2 - ((b.minx + b.maxx) / 2) * scale
    const oy = this.H - 22 - b.maxy * scale
    this.walk(true, scale, ox, oy)
    this.stepPests()
    this.stepParticles(true)
    if (this.flash > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${(this.flash * 0.32).toFixed(2)})`
      ctx.fillRect(-20, -20, this.W + 40, this.H + 40)
    }
    ctx.restore()
  }
}
