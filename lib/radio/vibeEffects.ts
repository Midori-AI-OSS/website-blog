type VibeEffectFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
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

function floatingOrbs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 12 + Math.floor(rng() * 9);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const orbs: { x: number; y: number; dx: number; dy: number; r: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    orbs.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.5,
      dy: (localRng() - 0.5) * 0.5,
      r: 8 + localRng() * 52,
      color: pick(colors, localRng),
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const orb of orbs) {
    orb.x += orb.dx * speed;
    orb.y += orb.dy * speed;
    if (orb.x < 0) {
      orb.x = 0;
      orb.dx *= -1;
    }
    if (orb.x > w) {
      orb.x = w;
      orb.dx *= -1;
    }
    if (orb.y < 0) {
      orb.y = 0;
      orb.dy *= -1;
    }
    if (orb.y > h) {
      orb.y = h;
      orb.dy *= -1;
    }
    ctx.globalAlpha = 0.05 + Math.sin(t * 2 + orb.x * 0.01) * 0.125 + 0.125;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
  }
  ctx.restore();
}

function constellationWeb(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 15 + Math.floor(rng() * 16);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const points: { x: number; y: number; dx: number; dy: number }[] = [];
  const maxDist = Math.min(w, h) * 0.3;

  for (let i = 0; i < count; i++) {
    points.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.3,
      dy: (localRng() - 0.5) * 0.3,
    });
  }

  for (const p of points) {
    p.x += p.dx * speed;
    p.y += p.dy * speed;
    if (p.x < 0) {
      p.x = 0;
      p.dx *= -1;
    }
    if (p.x > w) {
      p.x = w;
      p.dx *= -1;
    }
    if (p.y < 0) {
      p.y = 0;
      p.dy *= -1;
    }
    if (p.y > h) {
      p.y = h;
      p.dy *= -1;
    }
  }

  ctx.strokeStyle = colors[0] ?? '#ffffff';
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 3 + Math.floor(rng() * 3);
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
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 200 + Math.floor(rng() * 301);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const particles: { x: number; y: number; dx: number; dy: number; color: string; size: number }[] =
    [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 1.2,
      dy: (localRng() - 0.5) * 1.2,
      color: pick(colors, localRng),
      size: 1 + localRng() * 3,
    });
  }

  ctx.fillStyle = 'rgba(10,12,18,0.05)';
  ctx.fillRect(0, 0, w, h);

  for (const p of particles) {
    p.x += p.dx * speed;
    p.y += p.dy * speed;
    if (p.x < 0) {
      p.x = 0;
      p.dx *= -1;
    }
    if (p.x > w) {
      p.x = w;
      p.dx *= -1;
    }
    if (p.y < 0) {
      p.y = 0;
      p.dy *= -1;
    }
    if (p.y > h) {
      p.y = h;
      p.dy *= -1;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 20 + Math.floor(rng() * 21);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const bokehs: { x: number; y: number; dx: number; dy: number; r: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    bokehs.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.6,
      dy: (localRng() - 0.5) * 0.6,
      r: 20 + localRng() * 80,
      color: pick(colors, localRng),
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const b of bokehs) {
    b.x += b.dx * speed;
    b.y += b.dy * speed;
    if (b.x < 0) {
      b.x = 0;
      b.dx *= -1;
    }
    if (b.x > w) {
      b.x = w;
      b.dx *= -1;
    }
    if (b.y < 0) {
      b.y = 0;
      b.dy *= -1;
    }
    if (b.y > h) {
      b.y = h;
      b.dy *= -1;
    }
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, b.color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.15 + Math.sin(t * 1.5 + b.x * 0.005) * 0.05;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function voronoiTiles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 15 + Math.floor(rng() * 16);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const seeds: { x: number; y: number; dx: number; dy: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    seeds.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.3,
      dy: (localRng() - 0.5) * 0.3,
      color: pick(colors, localRng),
    });
  }

  for (const s of seeds) {
    s.x += s.dx * speed;
    s.y += s.dy * speed;
    if (s.x < 0) {
      s.x = 0;
      s.dx *= -1;
    }
    if (s.x > w) {
      s.x = w;
      s.dx *= -1;
    }
    if (s.y < 0) {
      s.y = 0;
      s.dy *= -1;
    }
    if (s.y > h) {
      s.y = h;
      s.dy *= -1;
    }
  }

  const step = 4;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      let minDist = Infinity;
      let nearest = 0;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        if (!s) continue;
        const dx = px - s.x;
        const dy = py - s.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      ctx.fillStyle = seeds[nearest]?.color ?? FALLBACK_COLOR;
      ctx.globalAlpha = 0.07;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function geometricWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 3 + Math.floor(rng() * 3);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const amp = 20 + rng() * 60;
    const freq = 0.005 + rng() * 0.01;
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 15 + Math.floor(rng() * 16);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const flies: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    phase: number;
    freq: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    flies.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.8,
      dy: (localRng() - 0.5) * 0.8,
      phase: localRng() * Math.PI * 2,
      freq: 0.5 + localRng() * 2.5,
      color: pick(colors, localRng),
    });
  }

  for (const fly of flies) {
    fly.x += fly.dx * speed;
    fly.y += fly.dy * speed;
    if (fly.x < 0) {
      fly.x = 0;
      fly.dx *= -1;
    }
    if (fly.x > w) {
      fly.x = w;
      fly.dx *= -1;
    }
    if (fly.y < 0) {
      fly.y = 0;
      fly.dy *= -1;
    }
    if (fly.y > h) {
      fly.y = h;
      fly.dy *= -1;
    }
    const pulse = (Math.sin(t * speed * fly.freq + fly.phase) + 1) / 2;
    const alpha = pulse * 0.6;
    const grad = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, 18);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.3, fly.color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(fly.x, fly.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function smokeMist(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 4 + Math.floor(rng() * 5);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const cx = w * 0.2 + (w * 0.6 * i) / (count - 1 || 1);
    const cy = h * 0.3 + Math.sin(t * speed * 0.6 + i) * h * 0.2;
    const radius = 100 + Math.sin(t * speed * 0.4 + i * 1.5) * 60;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(10, radius));
    grad.addColorStop(0, colors[i % colors.length] ?? FALLBACK_COLOR);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.12 + Math.sin(t * speed * 0.7 + i) * 0.04;
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
  _rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const c1x = w * 0.3;
  const c1y = h * 0.4;
  const c2x = w * 0.7;
  const c2y = h * 0.6;
  const step = 4;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      const d1 = Math.sqrt((px - c1x) ** 2 + (py - c1y) ** 2) * 0.005;
      const d2 = Math.sqrt((px - c2x) ** 2 + (py - c2y) ** 2) * 0.005;
      const v = Math.sin(d1 + t * speed) + Math.sin(d2 - t * speed * 1.3);
      const idx = Math.abs(Math.floor(((v + 2) / 4) * colors.length)) % colors.length;
      ctx.fillStyle = colors[idx] ?? FALLBACK_COLOR;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function lavaLamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 3 + Math.floor(rng() * 4);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
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
    ctx.globalAlpha = 0.5;
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 100 + Math.floor(rng() * 151);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const stars: {
    x: number;
    y: number;
    depth: number;
    size: number;
    phase: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const depth = 1 + Math.floor(localRng() * 3);
    stars.push({
      x: localRng() * w,
      y: localRng() * h,
      depth,
      size: depth === 1 ? 1 : depth === 2 ? 1.5 : 2,
      phase: localRng() * Math.PI * 2,
      color: pick(colors, localRng),
    });
  }

  for (const star of stars) {
    const driftSpeed = star.depth * 0.15 * speed;
    star.x += driftSpeed;
    if (star.x > w) star.x = 0;
    const pulse = Math.sin(t * speed * 0.3 + star.phase) * 0.2 + 0.6;
    ctx.globalAlpha = pulse * 0.6;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function flowField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 500 + Math.floor(rng() * 501);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const gridCols = Math.ceil(w / 20);
  const gridRows = Math.ceil(h / 20);
  const grid: number[] = [];
  for (let i = 0; i < gridCols * gridRows; i++) {
    grid.push(localRng() * Math.PI * 2);
  }

  const particles: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: localRng() * w,
      y: localRng() * h,
      color: pick(colors, localRng),
    });
  }

  ctx.fillStyle = 'rgba(10,12,18,0.03)';
  ctx.fillRect(0, 0, w, h);

  for (const p of particles) {
    const col = Math.floor(p.x / 20);
    const row = Math.floor(p.y / 20);
    const idx = Math.min(col + row * gridCols, grid.length - 1);
    const angle = grid[idx] ?? 0;
    p.x += Math.cos(angle) * speed * 0.8;
    p.y += Math.sin(angle) * speed * 0.8;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function kaleidoscope(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const segments = 6 + Math.floor(rng() * 7);
  const shapes: { x: number; y: number; size: number; color: string }[] = [];
  const localRng = seededRng(Math.floor(rng() * 2147483647));
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
  const rotation = t * speed * 0.1;
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  type Ring = { x: number; y: number; bornAt: number; color: string };
  const maxRings = 12;
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const ringPool: Ring[] = [];
  let lastSpawn = 0;
  for (let i = 0; i < maxRings; i++) {
    ringPool.push({
      x: localRng() * w,
      y: localRng() * h,
      bornAt: -i * 3,
      color: pick(colors, localRng),
    });
  }
  lastSpawn = -4;

  if (t - lastSpawn > 2 + localRng() * 3) {
    lastSpawn = t;
    ringPool.push({
      x: localRng() * w,
      y: localRng() * h,
      bornAt: t,
      color: pick(colors, localRng),
    });
    if (ringPool.length > maxRings) ringPool.shift();
  }

  for (const ring of ringPool) {
    const age = t - ring.bornAt;
    if (age < 0) continue;
    const radius = age * 40 * speed;
    const alpha = Math.max(0, 1 - age / 4) * 0.5;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
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
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 4 + Math.floor(rng() * 5);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const pts: { x: number; y: number; dx: number; dy: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    pts.push({
      x: localRng() * w,
      y: localRng() * h,
      dx: (localRng() - 0.5) * 0.5,
      dy: (localRng() - 0.5) * 0.5,
      color: pick(colors, localRng),
    });
  }

  for (const pt of pts) {
    pt.x += pt.dx * speed;
    pt.y += pt.dy * speed;
    if (pt.x < 0) {
      pt.x = 0;
      pt.dx *= -1;
    }
    if (pt.x > w) {
      pt.x = w;
      pt.dx *= -1;
    }
    if (pt.y < 0) {
      pt.y = 0;
      pt.dy *= -1;
    }
    if (pt.y > h) {
      pt.y = h;
      pt.dy *= -1;
    }
  }

  const step = 6;
  for (let px = 0; px < w; px += step) {
    for (let py = 0; py < h; py += step) {
      let r = 0;
      let g = 0;
      let bVal = 0;
      let totalWeight = 0;

      for (const pt of pts) {
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
      ctx.globalAlpha = 0.25;
      ctx.fillRect(px, py, step, step);
    }
  }
  ctx.globalAlpha = 1;
}

function diamondDust(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const count = 30 + Math.floor(rng() * 31);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const specs: { x: number; y: number; size: number; angle: number; color: string }[] = [];

  for (let i = 0; i < count; i++) {
    specs.push({
      x: localRng() * w,
      y: localRng() * h,
      size: 2 + localRng() * 3,
      angle: localRng() * Math.PI * 2,
      color: pick(colors, localRng),
    });
  }

  for (const spec of specs) {
    const alpha = Math.abs(Math.sin(spec.angle + t * speed)) * 0.6;
    if (alpha < 0.02) continue;
    ctx.save();
    ctx.translate(spec.x, spec.y);
    ctx.rotate(t * 0.3 + spec.angle);
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const hCount = 8 + Math.floor(rng() * 8);
  const vCount = 8 + Math.floor(rng() * 8);
  const localRng = seededRng(Math.floor(rng() * 2147483647));

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
  rng: () => number,
  t: number,
  colors: string[],
  _speed: number,
) {
  const centers: { x: number; y: number; color: string }[] = [];
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const count = 3 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    centers.push({
      x: w * 0.2 + localRng() * w * 0.6,
      y: h * 0.2 + localRng() * h * 0.6,
      color: colors[i % colors.length] ?? FALLBACK_COLOR,
    });
  }

  const period = 2 + localRng();
  for (const center of centers) {
    const phase = (t % period) / period;
    for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
      const ringPhase = (phase + ringIdx / 3) % 1;
      const radius = ringPhase * Math.max(w, h) * 0.6;
      const alpha = (1 - ringPhase) * 0.35;
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const rootCount = 2 + Math.floor(rng() * 3);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const hexSize = 20 + Math.floor(rng() * 20);
  const hexW = hexSize * 2;
  const hexH = Math.sqrt(3) * hexSize;
  const cols = Math.ceil(w / (hexW * 0.75)) + 1;
  const rows = Math.ceil(h / hexH) + 1;
  const localRng = seededRng(Math.floor(rng() * 2147483647));

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
      ctx.globalAlpha = 0.1;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function spiralGalaxy(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const armCount = 3 + Math.floor(rng() * 3);
  const particlesPerArm = 100 + Math.floor(rng() * 101);
  const _localRng = seededRng(Math.floor(rng() * 2147483647));
  const cx = w / 2;
  const cy = h / 2;

  for (let arm = 0; arm < armCount; arm++) {
    const baseAngle = (Math.PI * 2 * arm) / armCount;
    const color = colors[arm % colors.length] ?? FALLBACK_COLOR;
    for (let p = 0; p < particlesPerArm; p++) {
      const tParam = p / particlesPerArm;
      const r = tParam * Math.min(w, h) * 0.5;
      const angle = baseAngle + tParam * 4 + t * speed * 0.3;
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const bandCount = 3 + Math.floor(rng() * 4);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < bandCount; i++) {
    const xPos = w * 0.15 + Math.sin(t * speed * 0.3 + i * 1.2) * w * 0.25;
    const bandWidth = 30 + rng() * 60;
    const grad = ctx.createLinearGradient(xPos, 0, xPos + bandWidth, 0);
    const color = colors[i % colors.length] ?? FALLBACK_COLOR;
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function rainStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  _t: number,
  colors: string[],
  speed: number,
) {
  const count = 40 + Math.floor(rng() * 41);
  const localRng = seededRng(Math.floor(rng() * 2147483647));
  const angle = (30 + localRng() * 20) * (Math.PI / 180);
  const streaks: { x: number; y: number; len: number; color: string; speedF: number }[] = [];

  for (let i = 0; i < count; i++) {
    streaks.push({
      x: localRng() * w,
      y: localRng() * h,
      len: 20 + localRng() * 60,
      color: pick(colors, localRng),
      speedF: 0.5 + localRng() * 1.5,
    });
  }

  for (const s of streaks) {
    s.y += s.speedF * speed;
    if (s.y > h + s.len) {
      s.y = -s.len;
      s.x = localRng() * w;
    }
    const ex = s.x + Math.cos(angle) * s.len;
    const ey = s.y + Math.sin(angle) * s.len;
    ctx.globalAlpha = 0.1 + localRng() * 0.3;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
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
  rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const layerCount = 3 + Math.floor(rng() * 3);
  const _localRng = seededRng(Math.floor(rng() * 2147483647));

  for (let layer = 0; layer < layerCount; layer++) {
    const yBase = (h / (layerCount + 1)) * (layer + 1);
    const drift = layer * 0.4 * speed;
    ctx.save();
    ctx.globalAlpha = 0.15;
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
  _rng: () => number,
  t: number,
  colors: string[],
  speed: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.3;
  const angleY = t * speed * 0.3;
  const angleX = t * speed * 0.25;

  const rotate = (x: number, y: number, z: number): [number, number] => {
    const rx = x * Math.cos(angleY) - z * Math.sin(angleY);
    let rz = x * Math.sin(angleY) + z * Math.cos(angleY);
    const ry = y * Math.cos(angleX) - rz * Math.sin(angleX);
    rz = y * Math.sin(angleX) + rz * Math.cos(angleX);
    const scale = 200 / (200 + rz);
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
];

export const VIBE_EFFECT_COUNT = VIBE_EFFECTS.length;
