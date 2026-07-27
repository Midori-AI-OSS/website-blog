type VibeEffectFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) => void;

const FALLBACK_COLOR = '#888888';

function pick<T>(arr: readonly T[], rng: () => number): T {
  const index = Math.floor(rng() * arr.length);
  const value = arr[index];
  if (value !== undefined) return value;
  return arr[0] as T;
}

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let u = Math.imul(state ^ (state >>> 15), 1 | state);
    u = (u + Math.imul(u ^ (u >>> 7), 61 | u)) ^ u;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

function gentleSpeed(speed: number): number {
  return 1 + (speed - 1) * 0.35;
}

function bounceTime(raw: number, max: number): number {
  if (max <= 0) return 0;
  const q = Math.floor(raw / max);
  const r = raw - q * max;
  return q % 2 === 0 ? r : max - r;
}

function wrapTime(raw: number, max: number): number {
  if (max <= 0) return 0;
  return ((raw % max) + max) % max;
}

type Point3 = [number, number, number];
type Point4 = [number, number, number, number];

function rotate3DPoint(
  x: number,
  y: number,
  z: number,
  angleX: number,
  angleY: number,
  angleZ: number,
): Point3 {
  let rx = x;
  let ry = y;
  let rz = z;
  if (angleY !== 0) {
    const c = Math.cos(angleY);
    const s = Math.sin(angleY);
    const tx = rx * c - rz * s;
    rz = rx * s + rz * c;
    rx = tx;
  }
  if (angleX !== 0) {
    const c = Math.cos(angleX);
    const s = Math.sin(angleX);
    const ty = ry * c - rz * s;
    rz = ry * s + rz * c;
    ry = ty;
  }
  if (angleZ !== 0) {
    const c = Math.cos(angleZ);
    const s = Math.sin(angleZ);
    const tx = rx * c - ry * s;
    ry = rx * s + ry * c;
    rx = tx;
  }
  return [rx, ry, rz];
}

function perspective2D(
  x: number,
  y: number,
  z: number,
  distance: number,
  cx: number,
  cy: number,
): [number, number] {
  const d = Math.max(distance, 1e-6);
  const scale = d / (d + z);
  return [cx + x * scale, cy + y * scale];
}

function rotate4DPoint(v: Point4, axisA: number, axisB: number, angle: number): Point4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r: Point4 = [...v];
  const a = r[axisA] ?? 0;
  const b = r[axisB] ?? 0;
  r[axisA] = a * c - b * s;
  r[axisB] = a * s + b * c;
  return r;
}

function project4Dto3D(v: Point4, distance: number): Point3 {
  const w = v[3] ?? 0;
  const d = Math.max(distance, 1e-6);
  const scale = d / (d + w);
  return [v[0] * scale, v[1] * scale, v[2] * scale];
}

function drawWireframeEdges(
  ctx: CanvasRenderingContext2D,
  projected: [number, number][],
  edges: [number, number][],
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.shadowBlur = 4;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = alpha;
  for (const [a, b] of edges) {
    const pa = projected[a];
    const pb = projected[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function floatingOrbs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 12 + Math.floor(localRng() * 9);
  const orbs: {
    ix: number;
    iy: number;
    dx: number;
    dy: number;
    r: number;
    color: string;
    phaseOffset: number;
    pulseRate: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    orbs.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.8,
      dy: (localRng() - 0.5) * 0.8,
      r: 8 + localRng() * 52,
      color: pick(colors, localRng),
      phaseOffset: localRng() * Math.PI * 2,
      pulseRate: 0.15 + localRng() * 0.3,
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gs = gentleSpeed(speed);
  for (const orb of orbs) {
    const x = bounceTime(orb.ix + orb.dx * gs * t, w);
    const y = bounceTime(orb.iy + orb.dy * gs * t, h);
    ctx.globalAlpha = 0.06 + Math.sin(t * orb.pulseRate + orb.phaseOffset + x * 0.01) * 0.1 + 0.1;
    ctx.beginPath();
    ctx.arc(x, y, orb.r, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
  }
  ctx.restore();
}

function constellationWeb(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 15 + Math.floor(localRng() * 16);
  const points: { ix: number; iy: number; dx: number; dy: number }[] = [];
  const maxDist = Math.min(w, h) * 0.3;

  for (let i = 0; i < count; i++) {
    points.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.3,
      dy: (localRng() - 0.5) * 0.3,
    });
  }

  const gs = gentleSpeed(speed);
  const computed: { x: number; y: number }[] = [];
  for (const p of points) {
    computed.push({
      x: bounceTime(p.ix + p.dx * gs * t, w),
      y: bounceTime(p.iy + p.dy * gs * t, h),
    });
  }

  ctx.strokeStyle = colors[0] ?? '#ffffff';
  for (let i = 0; i < computed.length; i++) {
    for (let j = i + 1; j < computed.length; j++) {
      const a = computed[i];
      const b = computed[j];
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        ctx.globalAlpha = Math.max(0, (1 - dist / maxDist) * 0.25);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function auroraRibbons(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 3 + Math.floor(localRng() * 3);
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < count; i++) {
    const yBase = (h / (count + 1)) * (i + 1);
    const phase = i * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= w; x += 4) {
      const displacement = Math.sin(x * 0.004 + t * speed + phase) * 60;
      ctx.lineTo(x, yBase + displacement);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - 60, 0, yBase + 60);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, colors[i % colors.length] ?? FALLBACK_COLOR);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function particleStream(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 150 + Math.floor(localRng() * 200);
  const particles: {
    ix: number;
    iy: number;
    dx: number;
    dy: number;
    color: string;
    size: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 1.2,
      dy: (localRng() - 0.5) * 1.2,
      color: pick(colors, localRng),
      size: 1 + localRng() * 3,
    });
  }

  for (const p of particles) {
    const x = bounceTime(p.ix + p.dx * speed * t, w);
    const y = bounceTime(p.iy + p.dy * speed * t, h);
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bokehField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 20 + Math.floor(localRng() * 21);
  const bokehs: {
    ix: number;
    iy: number;
    dx: number;
    dy: number;
    r: number;
    color: string;
    phaseOffset: number;
    pulseRate: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    bokehs.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.9,
      dy: (localRng() - 0.5) * 0.9,
      r: 20 + localRng() * 80,
      color: pick(colors, localRng),
      phaseOffset: localRng() * Math.PI * 2,
      pulseRate: 0.15 + localRng() * 0.3,
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gs = gentleSpeed(speed);
  for (const b of bokehs) {
    const x = bounceTime(b.ix + b.dx * gs * t, w);
    const y = bounceTime(b.iy + b.dy * gs * t, h);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.13 + Math.sin(t * b.pulseRate + b.phaseOffset + x * 0.005) * 0.06;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function voronoiTiles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 15 + Math.floor(localRng() * 16);
  const seedsArr: { ix: number; iy: number; dx: number; dy: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    seedsArr.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.3,
      dy: (localRng() - 0.5) * 0.3,
      color: pick(colors, localRng),
    });
  }

  const gs = gentleSpeed(speed);
  const computed: { x: number; y: number; color: string }[] = seedsArr.map((s) => ({
    x: bounceTime(s.ix + s.dx * gs * t, w),
    y: bounceTime(s.iy + s.dy * gs * t, h),
    color: s.color,
  }));

  const step = 6;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      let minDist = Infinity;
      let nearest = 0;
      for (let i = 0; i < computed.length; i++) {
        const s = computed[i];
        if (!s) continue;
        const dx = px - s.x;
        const dy = py - s.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      ctx.fillStyle = computed[nearest]?.color ?? FALLBACK_COLOR;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function geometricWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 3 + Math.floor(localRng() * 3);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const amp = 20 + localRng() * 60;
    const freq = 0.005 + localRng() * 0.01;
    const phase = i * 1.8;
    const color = colors[i % colors.length] ?? FALLBACK_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 + Math.sin(phase + t * speed) * amp);
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin(x * freq + phase + t * speed) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h + 20);
    ctx.lineTo(0, h + 20);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
  }
  ctx.restore();
}

function fireflies(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 15 + Math.floor(localRng() * 16);
  const flies: {
    ix: number;
    iy: number;
    dx: number;
    dy: number;
    phase: number;
    freq: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    flies.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.8,
      dy: (localRng() - 0.5) * 0.8,
      phase: localRng() * Math.PI * 2,
      freq: 0.3 + localRng() * 0.9,
      color: pick(colors, localRng),
    });
  }

  const gs = gentleSpeed(speed);
  for (const fly of flies) {
    const x = bounceTime(fly.ix + fly.dx * gs * t, w);
    const y = bounceTime(fly.iy + fly.dy * gs * t, h);
    const pulse = (Math.sin(t * speed * fly.freq + fly.phase) + 1) / 2;
    const alpha = pulse * 0.6;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.3, fly.color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function smokeMist(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 4 + Math.floor(localRng() * 5);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const cx = w * 0.2 + (w * 0.6 * i) / (count - 1 || 1);
    const cy = h * 0.3 + Math.sin(t * speed * 0.6 + i) * h * 0.2;
    const radius = 100 + Math.sin(t * speed * 0.4 + i * 1.5) * 60;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(10, radius));
    grad.addColorStop(0, colors[i % colors.length] ?? FALLBACK_COLOR);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.1 + Math.sin(t * speed * 0.7 + i) * 0.04;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(10, radius), 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function classicPlasma(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const c1x = w * 0.3;
  const c1y = h * 0.4;
  const c2x = w * 0.7;
  const c2y = h * 0.6;
  const step = 6;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      const d1 = Math.sqrt((px - c1x) ** 2 + (py - c1y) ** 2) * 0.005;
      const d2 = Math.sqrt((px - c2x) ** 2 + (py - c2y) ** 2) * 0.005;
      const v = Math.sin(d1 + t * speed) + Math.sin(d2 - t * speed * 1.3);
      const idx = Math.abs(Math.floor(((v + 2) / 4) * colors.length)) % colors.length;
      ctx.fillStyle = colors[idx] ?? FALLBACK_COLOR;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function lavaLamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 3 + Math.floor(localRng() * 4);
  const blobs: {
    x: number;
    y: number;
    baseY: number;
    amplitude: number;
    freq: number;
    radius: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    blobs.push({
      x: w * 0.2 + localRng() * w * 0.6,
      baseY: h * 0.3 + localRng() * h * 0.4,
      y: 0,
      amplitude: 30 + localRng() * 70,
      freq: 0.3 + localRng() * 0.6,
      radius: 40 + localRng() * 100,
      color: pick(colors, localRng),
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighten';
  for (const blob of blobs) {
    blob.y = blob.baseY + Math.sin(t * speed * blob.freq + blob.x * 0.01) * blob.amplitude;
    if (blob.y < 0) blob.y = 0;
    if (blob.y > h) blob.y = h;
    const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    grad.addColorStop(0, blob.color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function starfield(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 100 + Math.floor(localRng() * 151);
  const stars: {
    ix: number;
    y: number;
    depth: number;
    size: number;
    phase: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const depth = 1 + Math.floor(localRng() * 3);
    stars.push({
      ix: localRng() * w,
      y: localRng() * h,
      depth,
      size: depth === 1 ? 1 : depth === 2 ? 1.5 : 2,
      phase: localRng() * Math.PI * 2,
      color: pick(colors, localRng),
    });
  }

  const gs = gentleSpeed(speed);
  for (const star of stars) {
    const x = wrapTime(star.ix + star.depth * 0.15 * gs * t, w);
    const pulse = Math.sin(t * speed * 0.3 + star.phase) * 0.2 + 0.6;
    ctx.globalAlpha = pulse * 0.6;
    ctx.beginPath();
    ctx.arc(x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function flowField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 300 + Math.floor(localRng() * 400);
  const gridCols = Math.ceil(w / 20);
  const gridRows = Math.ceil(h / 20);
  const grid: number[] = [];
  for (let i = 0; i < gridCols * gridRows; i++) {
    grid.push(localRng() * Math.PI * 2);
  }

  const particles: { ix: number; iy: number; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      ix: localRng() * w,
      iy: localRng() * h,
      color: pick(colors, localRng),
    });
  }

  const gs = gentleSpeed(speed) * 0.8;
  for (const p of particles) {
    const col = Math.floor(p.ix / 20);
    const row = Math.floor(p.iy / 20);
    const idx = Math.min(col + row * gridCols, grid.length - 1);
    const angle = grid[idx] ?? 0;
    const x = wrapTime(p.ix + Math.cos(angle) * gs * t, w);
    const y = wrapTime(p.iy + Math.sin(angle) * gs * t, h);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function kaleidoscope(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const segments = 6 + Math.floor(localRng() * 7);
  const shapes: { x: number; y: number; size: number; color: string }[] = [];
  for (let i = 0; i < 12; i++) {
    shapes.push({
      x: localRng() * w * 0.4,
      y: localRng() * h * 0.4,
      size: 10 + localRng() * 30,
      color: pick(colors, localRng),
    });
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  const rotation = t * gentleSpeed(speed) * 0.1;
  for (let i = 0; i < segments; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / segments + rotation);
    if (i % 2 === 0) {
      ctx.scale(1, -1);
    }
    for (const s of shapes) {
      const dist = s.x + Math.sin(t * speed * 0.5 + i) * 10;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(dist, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function rippleRings(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const maxRings = 8;
  const rings: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    phaseOffset: number;
    period: number;
  }[] = [];
  for (let i = 0; i < maxRings; i++) {
    rings.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 15,
      dy: (localRng() - 0.5) * 15,
      color: pick(colors, localRng),
      phaseOffset: localRng() * Math.PI * 2,
      period: 10 + localRng() * 8,
    });
  }

  const gs = gentleSpeed(speed);
  const maxDim = Math.max(w, h);
  for (const ring of rings) {
    const cx = wrapTime(ring.x + ring.dx * gs * t * 0.03, w);
    const cy = wrapTime(ring.y + ring.dy * gs * t * 0.03, h);
    const phase = ((t * gs) / ring.period + ring.phaseOffset / (Math.PI * 2)) % 1;
    const sinPhase = (Math.sin(phase * Math.PI * 2) + 1) / 2;
    const radius = sinPhase * maxDim * 0.5;
    const alpha = Math.sin(phase * Math.PI * 2) * 0.15 + 0.2;
    if (alpha <= 0.005) continue;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function gradientMesh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 4 + Math.floor(localRng() * 5);
  const pts: { ix: number; iy: number; dx: number; dy: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    pts.push({
      ix: localRng() * w,
      iy: localRng() * h,
      dx: (localRng() - 0.5) * 0.5,
      dy: (localRng() - 0.5) * 0.5,
      color: pick(colors, localRng),
    });
  }

  const gs = gentleSpeed(speed);
  const computed: { x: number; y: number; color: string }[] = pts.map((p) => ({
    x: bounceTime(p.ix + p.dx * gs * t, w),
    y: bounceTime(p.iy + p.dy * gs * t, h),
    color: p.color,
  }));

  const step = 8;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      let r = 0;
      let g = 0;
      let bVal = 0;
      let totalWeight = 0;

      for (const pt of computed) {
        const dx = px - pt.x;
        const dy = py - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const weight = 1 / Math.max(1, dist);
        totalWeight += weight;
        const hex = pt.color.replace('#', '');
        r += Number.parseInt(hex.slice(0, 2), 16) * weight;
        g += Number.parseInt(hex.slice(2, 4), 16) * weight;
        bVal += Number.parseInt(hex.slice(4, 6), 16) * weight;
      }

      r = Math.round(r / totalWeight);
      g = Math.round(g / totalWeight);
      bVal = Math.round(bVal / totalWeight);
      ctx.fillStyle = `rgb(${r},${g},${bVal})`;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function diamondDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 30 + Math.floor(localRng() * 31);
  const specs: {
    x: number;
    y: number;
    size: number;
    angle: number;
    color: string;
    twinkleRate: number;
    spinRate: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    specs.push({
      x: localRng() * w,
      y: localRng() * h,
      size: 2 + localRng() * 3,
      angle: localRng() * Math.PI * 2,
      color: pick(colors, localRng),
      twinkleRate: 0.15 + localRng() * 0.6,
      spinRate: 0.08 + localRng() * 0.25,
    });
  }

  const gs = gentleSpeed(speed);
  for (const spec of specs) {
    const alpha = Math.abs(Math.sin(spec.angle + t * gs * spec.twinkleRate)) * 0.6;
    if (alpha < 0.02) continue;
    ctx.save();
    ctx.translate(spec.x, spec.y);
    ctx.rotate(t * gs * spec.spinRate + spec.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spec.color;
    ctx.fillRect(-spec.size / 2, -spec.size / 2, spec.size, spec.size);
    ctx.restore();
  }
}

function threadWeave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const hCount = 8 + Math.floor(localRng() * 8);
  const vCount = 8 + Math.floor(localRng() * 8);

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < hCount; i++) {
    const y = (h / (hCount + 1)) * (i + 1);
    const color = colors[i % colors.length] ?? FALLBACK_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 4) {
      const wave = Math.sin(x * 0.003 + t * speed * 0.4 + i * 0.7) * 8;
      ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5 + localRng() * 1;
    ctx.stroke();
  }

  for (let i = 0; i < vCount; i++) {
    const x = (w / (vCount + 1)) * (i + 1);
    const color = colors[(i + 2) % colors.length] ?? FALLBACK_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= h; y += 4) {
      const wave = Math.sin(y * 0.003 + t * speed * 0.4 + i * 0.7) * 8;
      ctx.lineTo(x + wave, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5 + localRng() * 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function pulseRings(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const centers: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: string;
    phaseOffset: number;
    period: number;
  }[] = [];
  const count = 3 + Math.floor(localRng() * 3);

  for (let i = 0; i < count; i++) {
    centers.push({
      x: w * 0.2 + localRng() * w * 0.6,
      y: h * 0.2 + localRng() * h * 0.6,
      dx: (localRng() - 0.5) * 20,
      dy: (localRng() - 0.5) * 20,
      color: colors[i % colors.length] ?? FALLBACK_COLOR,
      phaseOffset: localRng() * Math.PI * 2,
      period: 10 + localRng() * 6,
    });
  }

  const gs = gentleSpeed(speed);
  const maxDim = Math.max(w, h);
  for (const center of centers) {
    const cx = wrapTime(center.x + center.dx * gs * t * 0.03, w);
    const cy = wrapTime(center.y + center.dy * gs * t * 0.03, h);
    const basePhase = ((t * gs) / center.period + center.phaseOffset / (Math.PI * 2)) % 1;
    for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
      const ringPhaseRaw = (basePhase + ringIdx / 3) % 1;
      const sinPhase = (Math.sin(ringPhaseRaw * Math.PI * 2) + 1) / 2;
      const radius = sinPhase * maxDim * 0.5;
      const alpha = Math.sin(ringPhaseRaw * Math.PI * 2) * 0.15 + 0.2;
      if (alpha <= 0.005) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = center.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function vineGrowth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const rootCount = 2 + Math.floor(localRng() * 3);
  const branches: {
    x: number;
    y: number;
    angle: number;
    length: number;
    color: string;
    generation: number;
  }[] = [];

  for (let r = 0; r < rootCount; r++) {
    const sx = w * 0.2 + localRng() * w * 0.6;
    const sy = h * 0.85;
    for (let gen = 0; gen < 3; gen++) {
      const parentLen = gen === 0 ? 60 : 30;
      const spread = gen === 0 ? 0.4 : 0.8;
      const count = gen === 0 ? 1 : 2;
      for (let b = 0; b < count; b++) {
        branches.push({
          x: sx,
          y: sy,
          angle: -Math.PI / 2 + (localRng() - 0.5) * spread,
          length: parentLen + localRng() * 20,
          color: colors[(r * 3 + gen) % colors.length] ?? FALLBACK_COLOR,
          generation: gen,
        });
      }
    }
  }

  ctx.globalAlpha = 0.4;
  for (const branch of branches) {
    const extend = (Math.sin(t * speed * 0.5 + branch.x * 0.01) + 1) / 2;
    const len = branch.length * extend;
    const ex = branch.x + Math.cos(branch.angle) * len;
    const ey = branch.y + Math.sin(branch.angle) * len;
    ctx.beginPath();
    ctx.moveTo(branch.x, branch.y);
    ctx.quadraticCurveTo(
      branch.x + Math.cos(branch.angle) * len * 0.5,
      branch.y + Math.sin(branch.angle) * len * 0.5 - 10,
      ex,
      ey,
    );
    ctx.strokeStyle = branch.color;
    ctx.lineWidth = 1 + branch.generation * 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function honeycombShift(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const hexSize = 20 + Math.floor(localRng() * 20);
  const hexW = hexSize * 2;
  const hexH = Math.sqrt(3) * hexSize;
  const cols = Math.ceil(w / (hexW * 0.75)) + 1;
  const rows = Math.ceil(h / hexH) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * hexW * 0.75;
      const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
      const phase = localRng() * 10;
      const hueShift = Math.sin(t * speed * 0.5 + phase) * 0.3;
      const colorIdx = Math.floor((hueShift + 1) * (colors.length / 2)) % colors.length;
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const angle = (Math.PI / 3) * v - Math.PI / 6;
        const vx = cx + hexSize * Math.cos(angle);
        const vy = cy + hexSize * Math.sin(angle);
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fillStyle = colors[colorIdx] ?? FALLBACK_COLOR;
      ctx.globalAlpha = 0.15;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function spiralGalaxy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const armCount = 3 + Math.floor(localRng() * 3);
  const particlesPerArm = 100 + Math.floor(localRng() * 101);
  const cx = w / 2;
  const cy = h / 2;

  for (let arm = 0; arm < armCount; arm++) {
    const baseAngle = (Math.PI * 2 * arm) / armCount;
    const color = colors[arm % colors.length] ?? FALLBACK_COLOR;
    for (let p = 0; p < particlesPerArm; p++) {
      const tParam = p / particlesPerArm;
      const r = tParam * Math.min(w, h) * 0.5;
      const angle = baseAngle + tParam * 4 + t * gentleSpeed(speed) * 0.3;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const alpha = tParam * 0.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, 1 + tParam * 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function glassPrism(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const bandCount = 3 + Math.floor(localRng() * 4);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < bandCount; i++) {
    const xPos = w * 0.15 + Math.sin(t * speed * 0.3 + i * 1.2) * w * 0.25;
    const bandWidth = 30 + localRng() * 60;
    const grad = ctx.createLinearGradient(xPos, 0, xPos + bandWidth, 0);
    const color = colors[i % colors.length] ?? FALLBACK_COLOR;
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function rainStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const count = 40 + Math.floor(localRng() * 41);
  const angle = (30 + localRng() * 20) * (Math.PI / 180);
  const streaks: { x: number; iy: number; len: number; color: string; speedF: number }[] = [];

  for (let i = 0; i < count; i++) {
    streaks.push({
      x: localRng() * w,
      iy: localRng() * h,
      len: 20 + localRng() * 60,
      color: pick(colors, localRng),
      speedF: 0.5 + localRng() * 1.5,
    });
  }

  const gs = gentleSpeed(speed);
  for (const s of streaks) {
    const y = wrapTime(s.iy + s.speedF * gs * t, h + s.len) - s.len;
    const ex = s.x + Math.cos(angle) * s.len;
    const ey = y + Math.sin(angle) * s.len;
    ctx.globalAlpha = 0.1 + localRng() * 0.3;
    ctx.beginPath();
    ctx.moveTo(s.x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function cloudLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const layerCount = 3 + Math.floor(localRng() * 3);

  for (let layer = 0; layer < layerCount; layer++) {
    const yBase = (h / (layerCount + 1)) * (layer + 1);
    const drift = layer * 0.4 * speed;
    ctx.save();
    ctx.globalAlpha = 0.12;
    const grad = ctx.createLinearGradient(0, yBase - 30, 0, yBase + 30);
    const color = colors[layer % colors.length] ?? FALLBACK_COLOR;
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, yBase + 30);
    for (let x = 0; x <= w; x += 4) {
      const noise =
        Math.sin(x * 0.006 + t * drift + layer) * 25 + Math.sin(x * 0.012 + t * drift * 1.5) * 15;
      ctx.lineTo(x, yBase + noise);
    }
    ctx.lineTo(w, yBase + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function wireframeDiamond(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.3;
  const angleY = t * gentleSpeed(speed) * 0.3;
  const angleX = t * gentleSpeed(speed) * 0.25;

  const rotate = (x: number, y: number, z: number): [number, number] => {
    const rx = x * Math.cos(angleY) - z * Math.sin(angleY);
    let rz = x * Math.sin(angleY) + z * Math.cos(angleY);
    const ry = y * Math.cos(angleX) - rz * Math.sin(angleX);
    rz = y * Math.sin(angleX) + rz * Math.cos(angleX);
    const perspective = Math.max(size * 3, 1);
    const scale = perspective / (perspective + rz);
    return [cx + rx * scale, cy + ry * scale];
  };

  const top: [number, number, number] = [0, -size, 0];
  const bottom: [number, number, number] = [0, size, 0];
  const front: [number, number, number] = [0, 0, size];
  const back: [number, number, number] = [0, 0, -size];
  const left: [number, number, number] = [-size, 0, 0];
  const right: [number, number, number] = [size, 0, 0];

  const vertices = [top, bottom, front, back, left, right];
  const projected = vertices.map((v) => rotate(v[0], v[1], v[2]));

  const edgePairs: [number, number][] = [
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [2, 4],
    [2, 5],
    [3, 4],
    [3, 5],
  ];
  const edges = [...edgePairs];

  ctx.save();
  ctx.shadowBlur = 6;
  const colorIdx =
    Math.floor(((Math.sin(t * speed * 0.5) + 1) / 2) * colors.length) % colors.length;
  const edgeColor = colors[colorIdx] ?? FALLBACK_COLOR;
  ctx.shadowColor = edgeColor;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;

  for (const [a, b] of edges) {
    const pa = projected[a];
    const pb = projected[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa[0], pa[1]);
    ctx.lineTo(pb[0], pb[1]);
    ctx.stroke();
  }

  ctx.restore();
}

function wireframeCube(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const sx = (0.18 + localRng() * 0.08) * w;
  const sy = (0.15 + localRng() * 0.1) * h;
  const sz = (0.14 + localRng() * 0.12) * Math.min(w, h);
  const dist = Math.min(w, h) * 0.55;

  const verts: Point3[] = [];
  for (let ix = -1; ix <= 1; ix += 2)
    for (let iy = -1; iy <= 1; iy += 2)
      for (let iz = -1; iz <= 1; iz += 2) verts.push([ix * sx, iy * sy, iz * sz]);

  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const xor = i ^ j;
      if (xor !== 0 && (xor & (xor - 1)) === 0) edges.push([i, j]);
    }

  const gs = gentleSpeed(speed);
  const ax = t * gs * 0.25 + localRng() * Math.PI * 2;
  const ay = t * gs * 0.3 + localRng() * Math.PI * 2;
  const az = t * gs * 0.12;

  const projected = verts.map(([x, y, z]) => {
    const [rx, ry, rz] = rotate3DPoint(x, y, z, ax, ay, az);
    return perspective2D(rx, ry, rz, dist, cx, cy);
  });

  const ci = Math.floor(t * speed * 0.12) % colors.length;
  drawWireframeEdges(ctx, projected, edges, colors[ci] ?? FALLBACK_COLOR, 0.6);
}

function wireframeIcosahedron(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const baseScale = Math.min(w, h) * 0.28;
  const dist = Math.min(w, h) * 0.55;
  const phi = (1 + Math.sqrt(5)) / 2;

  const rawVerts: [number, number, number][] = [];
  for (let i = -1; i <= 1; i += 2) {
    rawVerts.push([0, i, phi], [0, i, -phi], [phi, 0, i], [-phi, 0, i], [i, phi, 0], [i, -phi, 0]);
  }
  const verts: Point3[] = rawVerts.map(([a, b, c]) => [
    a * baseScale,
    b * baseScale,
    c * baseScale,
  ]);

  const edges: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      const a = verts[i];
      const b = verts[j];
      if (!a || !b) continue;
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (Math.abs(d2 - 4 * baseScale * baseScale) < 0.01) edges.push([i, j]);
    }
  }

  const gs = gentleSpeed(speed);
  const ax = t * gs * 0.2 + localRng() * Math.PI * 2;
  const ay = t * gs * 0.28 + localRng() * Math.PI * 2;
  const az = t * gs * 0.08;

  const projected = verts.map(([x, y, z]) => {
    const [rx, ry, rz] = rotate3DPoint(x, y, z, ax, ay, az);
    return perspective2D(rx, ry, rz, dist, cx, cy);
  });

  const ci = Math.floor(t * speed * 0.1) % colors.length;
  drawWireframeEdges(ctx, projected, edges, colors[ci] ?? FALLBACK_COLOR, 0.55);
}

function wireframeTorus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const baseScale = Math.min(w, h) * 0.28;
  const R = baseScale * (0.65 + localRng() * 0.3);
  const r = baseScale * (0.25 + localRng() * 0.2);
  const uCount = 16;
  const vCount = 10;
  const dist = Math.min(w, h) * 0.6;

  const grid: Point3[][] = [];
  for (let iu = 0; iu < uCount; iu++) {
    const u = (iu / uCount) * Math.PI * 2;
    const row: Point3[] = [];
    for (let iv = 0; iv < vCount; iv++) {
      const v = (iv / vCount) * Math.PI * 2;
      row.push([
        (R + r * Math.cos(v)) * Math.cos(u),
        (R + r * Math.cos(v)) * Math.sin(u),
        r * Math.sin(v),
      ]);
    }
    grid.push(row);
  }

  const gs = gentleSpeed(speed);
  const ax = t * gs * 0.2 + localRng() * Math.PI * 2;
  const ay = t * gs * 0.3 + localRng() * Math.PI * 2;

  const projected = grid.map((row) =>
    row.map(([x, y, z]) => {
      const [rx, ry, rz] = rotate3DPoint(x, y, z, ax, ay, 0);
      return perspective2D(rx, ry, rz, dist, cx, cy);
    }),
  );

  const ci = Math.floor(t * speed * 0.1) % colors.length;
  const color = colors[ci] ?? FALLBACK_COLOR;

  ctx.save();
  ctx.shadowBlur = 3;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.5;

  for (let iu = 0; iu < uCount; iu++) {
    for (let iv = 0; iv < vCount; iv++) {
      const p = projected[iu]?.[iv];
      const pv = projected[iu]?.[(iv + 1) % vCount];
      const pu = projected[(iu + 1) % uCount]?.[iv];
      if (!p || !pv || !pu) continue;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(pv[0], pv[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(pu[0], pu[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function wireframeSphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * (0.22 + localRng() * 0.12);
  const latCount = 14;
  const lonCount = 12;
  const dist = Math.min(w, h) * 0.55;

  const gs = gentleSpeed(speed);
  const ax = t * gs * 0.22 + localRng() * Math.PI * 2;
  const ay = t * gs * 0.18 + localRng() * Math.PI * 2;

  const ci = Math.floor(t * speed * 0.08) % colors.length;
  const color = colors[ci] ?? FALLBACK_COLOR;

  ctx.save();
  ctx.shadowBlur = 3;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.48;

  for (let ilat = 0; ilat <= latCount; ilat++) {
    const phi = (ilat / latCount) * Math.PI;
    let first = true;
    ctx.beginPath();
    for (let ilon = 0; ilon <= lonCount; ilon++) {
      const theta = (ilon / lonCount) * Math.PI * 2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const [rx, ry, rz] = rotate3DPoint(x, y, z, ax, ay, 0);
      const proj = perspective2D(rx, ry, rz, dist, cx, cy);
      if (first) {
        ctx.moveTo(proj[0], proj[1]);
        first = false;
      } else {
        ctx.lineTo(proj[0], proj[1]);
      }
    }
    ctx.stroke();
  }

  for (let ilon = 0; ilon < lonCount; ilon++) {
    const theta = (ilon / lonCount) * Math.PI * 2;
    let first = true;
    ctx.beginPath();
    for (let ilat = 0; ilat <= latCount; ilat++) {
      const phi = (ilat / latCount) * Math.PI;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const [rx, ry, rz] = rotate3DPoint(x, y, z, ax, ay, 0);
      const proj = perspective2D(rx, ry, rz, dist, cx, cy);
      if (first) {
        ctx.moveTo(proj[0], proj[1]);
        first = false;
      } else {
        ctx.lineTo(proj[0], proj[1]);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function wireframeTunnel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const frameCount = 14;
  const vertsPerFrame = 8;
  const baseRadius = Math.min(w, h) * 0.3;
  const depthRange = Math.min(w, h) * 0.7;
  const twist = (localRng() - 0.5) * 0.4;
  const dist = Math.min(w, h) * 0.45;

  const gs = gentleSpeed(speed);
  const ax = t * gs * 0.15;
  const ay = t * gs * 0.1;

  const frames: [number, number][][] = [];
  for (let i = 0; i < frameCount; i++) {
    const zRatio = i / frameCount;
    const scroll = (zRatio + t * gs * 0.2) % 1;
    const z = scroll * depthRange * 2 - depthRange;
    const scale = dist / Math.max(dist + z, 1e-6);

    const frame: [number, number][] = [];
    for (let v = 0; v < vertsPerFrame; v++) {
      const angle = (v / vertsPerFrame) * Math.PI * 2 + z * twist;
      const sx = Math.cos(angle) * baseRadius * scale;
      const sy = Math.sin(angle) * baseRadius * scale;
      const [rx, ry, rz] = rotate3DPoint(sx, sy, z, ax, ay, 0);
      const proj = perspective2D(rx, ry, rz, dist, cx, cy);
      frame.push(proj);
    }
    frames.push(frame);
  }

  const ci = Math.floor(t * speed * 0.08) % colors.length;
  const color = colors[ci] ?? FALLBACK_COLOR;

  ctx.save();
  ctx.shadowBlur = 3;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.45;

  for (let i = 0; i < frameCount; i++) {
    const frame = frames[i];
    if (!frame) continue;
    ctx.beginPath();
    const first = frame[0];
    if (!first) continue;
    ctx.moveTo(first[0], first[1]);
    for (let v = 1; v < vertsPerFrame; v++) {
      const pv = frame[v];
      if (!pv) continue;
      ctx.lineTo(pv[0], pv[1]);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.3 + (0.25 * i) / frameCount;
    ctx.stroke();

    if (i < frameCount - 1) {
      const next = frames[i + 1];
      if (!next) continue;
      ctx.globalAlpha = 0.2;
      for (let v = 0; v < vertsPerFrame; v++) {
        const pf = frame[v];
        const pn = next[v];
        if (!pf || !pn) continue;
        ctx.beginPath();
        ctx.moveTo(pf[0], pf[1]);
        ctx.lineTo(pn[0], pn[1]);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function wireframeTesseract(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.22;
  const dist4D = 3.5;
  const dist3D = Math.min(w, h) * 0.5;

  const verts4D: Point4[] = [];
  for (let i = 0; i < 16; i++) {
    verts4D.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  }

  const edges4D: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j;
      if (xor !== 0 && (xor & (xor - 1)) === 0) edges4D.push([i, j]);
    }
  }

  const gs = gentleSpeed(speed);
  const axy = t * gs * 0.18;
  const axw = t * gs * 0.25 + localRng() * Math.PI * 2;
  const ayw = t * gs * 0.22 + localRng() * Math.PI * 2;
  const azw = t * gs * 0.15;

  const projected3D: Point3[] = verts4D.map((v) => {
    let p = v;
    p = rotate4DPoint(p, 0, 1, axy);
    p = rotate4DPoint(p, 0, 3, axw);
    p = rotate4DPoint(p, 1, 3, ayw);
    p = rotate4DPoint(p, 2, 3, azw);
    return project4Dto3D(p, dist4D);
  });

  const ax = t * gs * 0.08;
  const ay = t * gs * 0.1;
  const projected = projected3D.map(([x, y, z]) => {
    const sx = x * scale;
    const sy = y * scale;
    const sz = z * scale;
    const [rx, ry, rz] = rotate3DPoint(sx, sy, sz, ax, ay, 0);
    return perspective2D(rx, ry, rz, dist3D, cx, cy);
  });

  const ci = Math.floor(t * speed * 0.12) % colors.length;
  drawWireframeEdges(ctx, projected, edges4D, colors[ci] ?? FALLBACK_COLOR, 0.55);
}

function wireframe16Cell(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.24;
  const dist4D = 3.5;
  const dist3D = Math.min(w, h) * 0.5;

  const verts4D: Point4[] = [
    [1, 0, 0, 0],
    [-1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, -1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, -1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, -1],
  ];

  const edges4D: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      if (j !== (i ^ 1)) edges4D.push([i, j]);
    }
  }

  const gs = gentleSpeed(speed);
  const axy = t * gs * 0.2;
  const axw = t * gs * 0.22 + localRng() * Math.PI * 2;
  const ayw = t * gs * 0.26 + localRng() * Math.PI * 2;
  const azw = t * gs * 0.18 + localRng() * Math.PI * 2;

  const projected3D: Point3[] = verts4D.map((v) => {
    let p = v;
    p = rotate4DPoint(p, 0, 1, axy);
    p = rotate4DPoint(p, 0, 3, axw);
    p = rotate4DPoint(p, 1, 3, ayw);
    p = rotate4DPoint(p, 2, 3, azw);
    return project4Dto3D(p, dist4D);
  });

  const ax = t * gs * 0.06;
  const ay = t * gs * 0.09;
  const projected = projected3D.map(([x, y, z]) => {
    const sx = x * scale;
    const sy = y * scale;
    const sz = z * scale;
    const [rx, ry, rz] = rotate3DPoint(sx, sy, sz, ax, ay, 0);
    return perspective2D(rx, ry, rz, dist3D, cx, cy);
  });

  const ci = Math.floor(t * speed * 0.1) % colors.length;
  drawWireframeEdges(ctx, projected, edges4D, colors[ci] ?? FALLBACK_COLOR, 0.5);
}

function spiralVortex(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const armCount = 3 + Math.floor(localRng() * 4);
  const maxR = Math.min(w, h) * 0.44;
  const turns = 3 + Math.floor(localRng() * 4);
  const clockwise = localRng() > 0.5 ? 1 : -1;
  const gs = gentleSpeed(speed);

  ctx.save();
  ctx.lineWidth = 1.3;

  for (let arm = 0; arm < armCount; arm++) {
    const phase = (arm / armCount) * Math.PI * 2;
    const color = colors[arm % colors.length] ?? FALLBACK_COLOR;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = color;

    ctx.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const r = frac * maxR;
      const angle = clockwise * (frac * turns * Math.PI * 2 + phase + t * gs * 0.4);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.globalAlpha = 0.55;
    ctx.stroke();
  }
  ctx.restore();
}

function roseSpiral(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  t: number,
  colors: string[],
  speed: number,
) {
  const localRng = seededRng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const petals = 3 + Math.floor(localRng() * 5);
  const layers = 2 + Math.floor(localRng() * 3);
  const maxR = Math.min(w, h) * 0.38;
  const gs = gentleSpeed(speed);

  ctx.save();
  ctx.lineWidth = 1.1;

  for (let layer = 0; layer < layers; layer++) {
    const color = colors[layer % colors.length] ?? FALLBACK_COLOR;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = color;

    const dir = localRng() > 0.5 ? 1 : -1;
    const phase = layer * 0.8 + t * gs * 0.12 * (layer + 1) * dir;
    const scale = 0.6 + layer * 0.2;

    ctx.beginPath();
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2 * 4;
      const r = Math.cos(petals * theta + phase) * maxR * scale;
      const px = cx + Math.cos(theta) * r;
      const py = cy + Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.globalAlpha = 0.38;
    ctx.stroke();
  }
  ctx.restore();
}

export const VIBE_EFFECTS: readonly { name: string; fn: VibeEffectFn }[] = [
  { name: 'floatingOrbs', fn: floatingOrbs },
  { name: 'constellationWeb', fn: constellationWeb },
  { name: 'auroraRibbons', fn: auroraRibbons },
  { name: 'particleStream', fn: particleStream },
  { name: 'bokehField', fn: bokehField },
  { name: 'voronoiTiles', fn: voronoiTiles },
  { name: 'geometricWaves', fn: geometricWaves },
  { name: 'fireflies', fn: fireflies },
  { name: 'smokeMist', fn: smokeMist },
  { name: 'classicPlasma', fn: classicPlasma },
  { name: 'lavaLamp', fn: lavaLamp },
  { name: 'starfield', fn: starfield },
  { name: 'flowField', fn: flowField },
  { name: 'kaleidoscope', fn: kaleidoscope },
  { name: 'rippleRings', fn: rippleRings },
  { name: 'gradientMesh', fn: gradientMesh },
  { name: 'diamondDust', fn: diamondDust },
  { name: 'threadWeave', fn: threadWeave },
  { name: 'pulseRings', fn: pulseRings },
  { name: 'vineGrowth', fn: vineGrowth },
  { name: 'honeycombShift', fn: honeycombShift },
  { name: 'spiralGalaxy', fn: spiralGalaxy },
  { name: 'glassPrism', fn: glassPrism },
  { name: 'rainStreaks', fn: rainStreaks },
  { name: 'cloudLayers', fn: cloudLayers },
  { name: 'wireframeDiamond', fn: wireframeDiamond },
  { name: 'wireframeCube', fn: wireframeCube },
  { name: 'wireframeIcosahedron', fn: wireframeIcosahedron },
  { name: 'wireframeTorus', fn: wireframeTorus },
  { name: 'wireframeSphere', fn: wireframeSphere },
  { name: 'wireframeTunnel', fn: wireframeTunnel },
  { name: 'wireframeTesseract', fn: wireframeTesseract },
  { name: 'wireframe16Cell', fn: wireframe16Cell },
  { name: 'spiralVortex', fn: spiralVortex },
  { name: 'roseSpiral', fn: roseSpiral },
];

export const VIBE_EFFECT_COUNT = VIBE_EFFECTS.length;
