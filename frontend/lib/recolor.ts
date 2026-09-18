/**
 * Repaints the car in a photograph.
 *
 * There is no segmentation model in the browser here, so the body is found the
 * way a person would describe it: the paint is the large, connected region of
 * one colour sitting in the middle of the frame. We sample that colour, flood
 * fill outwards from the centre while the chromaticity stays close to it, and
 * then re-tint only those pixels — keeping each pixel's own brightness so
 * reflections, shadows and panel highlights survive.
 *
 * Runs entirely on the client against same-origin images, so the canvas never
 * gets tainted and no request leaves the page.
 */

export interface RecolorOptions {
  /** Longest edge of the processed image. Keeps big uploads responsive. */
  maxSize?: number;
}

const DEFAULT_MAX_SIZE = 1280;

/** Chromaticity distance below which a pixel counts as the same paint. */
const CHROMA_TOLERANCE = 0.085;
/** Luma gradient that the region grower treats as a body edge. */
const EDGE_LIMIT = 62;
/**
 * Local roughness above which a pixel is not bodywork. Car paint is smooth;
 * asphalt, gravel, grass and foliage are grainy, and for a white car on a grey
 * road this is the only thing that separates the two.
 */
const TEXTURE_LIMIT = 11;
/** A mask larger than this share of the frame means the fill leaked. */
const MAX_MASK_SHARE = 0.68;

type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  let value = hex.trim().replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int) || value.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim());
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Chromaticity - colour without brightness, so shading does not break matching. */
function chroma(r: number, g: number, b: number): [number, number] {
  const sum = r + g + b || 1;
  return [r / sum, g / sum];
}

function chromaDistance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Finds the paint colour as the dominant colour of the car, not the average
 * one: samples are bucketed by colour and the biggest bucket wins. Taking a
 * median instead lands halfway between the bright bodywork and the dark glass,
 * which then drags the road into the selection.
 *
 * Pixels on strong edges are skipped so trim, shut lines and badges do not
 * pollute the sample.
 */
function samplePaint(
  data: Uint8ClampedArray,
  edges: Float32Array,
  roughness: Float32Array,
  width: number,
  height: number,
): Rgb {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  const x0 = Math.round(width * 0.28);
  const x1 = Math.round(width * 0.72);
  const y0 = Math.round(height * 0.38);
  const y1 = Math.round(height * 0.78);
  const step = Math.max(1, Math.round(Math.min(x1 - x0, y1 - y0) / 40));

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const index = y * width + x;
      if (edges[index] > EDGE_LIMIT || roughness[index] > TEXTURE_LIMIT) continue;
      const i = index * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = luma(r, g, b);
      // Glass, tyres and blown-out highlights are not paint.
      if (l < 40 || l > 248) continue;

      // Bucket by chromaticity and a coarse brightness step, so one panel in
      // sun and the same panel in shade do not split into separate buckets.
      const [cr, cg] = chroma(r, g, b);
      const key = `${Math.round(cr * 40)}:${Math.round(cg * 40)}:${Math.round(l / 46)}`;
      // Samples near the middle of the frame count for more: the subject car
      // is centred, background cars and marquees are not.
      const dx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
      const dy = (y - (y0 + y1) / 2) / ((y1 - y0) / 2);
      const weight = 1 / (1 + dx * dx + dy * dy);

      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      bucket.n += weight;
      buckets.set(key, bucket);
    }
  }

  let best: { r: number; g: number; b: number; n: number } | null = null;
  buckets.forEach((bucket) => {
    if (!best || bucket.n > best.n) best = bucket;
  });
  if (!best) return { r: 128, g: 128, b: 128 };

  const winner = best as { r: number; g: number; b: number; n: number };
  return {
    r: Math.round(winner.r / winner.n),
    g: Math.round(winner.g / winner.n),
    b: Math.round(winner.b / winner.n),
  };
}

/** Per-pixel luma gradient (Sobel); the car outline shows up as a ridge. */
function edgeMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const grey = new Float32Array(width * height);
  for (let i = 0, p = 0; p < grey.length; p += 1, i += 4) {
    grey[p] = luma(data[i], data[i + 1], data[i + 2]);
  }

  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const tl = grey[i - width - 1];
      const t = grey[i - width];
      const tr = grey[i - width + 1];
      const l = grey[i - 1];
      const r = grey[i + 1];
      const bl = grey[i + width - 1];
      const b = grey[i + width];
      const br = grey[i + width + 1];
      const gx = tl + 2 * l + bl - tr - 2 * r - br;
      const gy = tl + 2 * t + tr - bl - 2 * b - br;
      edges[i] = Math.hypot(gx, gy) / 4;
    }
  }
  return edges;
}

/** Mean gradient in a small window: low on paint, high on tarmac or foliage. */
function roughnessMap(edges: Float32Array, width: number, height: number): Float32Array {
  const radius = 3;
  const horizontal = new Float32Array(edges.length);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = 0; x <= radius && x < width; x += 1) sum += edges[y * width + x];
    let count = Math.min(radius + 1, width);
    for (let x = 0; x < width; x += 1) {
      horizontal[y * width + x] = sum / count;
      const add = x + radius + 1;
      const drop = x - radius;
      if (add < width) {
        sum += edges[y * width + add];
        count += 1;
      }
      if (drop >= 0) {
        sum -= edges[y * width + drop];
        count -= 1;
      }
    }
  }

  const blurred = new Float32Array(edges.length);
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = 0; y <= radius && y < height; y += 1) sum += horizontal[y * width + x];
    let count = Math.min(radius + 1, height);
    for (let y = 0; y < height; y += 1) {
      blurred[y * width + x] = sum / count;
      const add = y + radius + 1;
      const drop = y - radius;
      if (add < height) {
        sum += horizontal[add * width + x];
        count += 1;
      }
      if (drop >= 0) {
        sum -= horizontal[drop * width + x];
        count -= 1;
      }
    }
  }
  return blurred;
}

/**
 * Flood fills the body from a grid of seeds over the car. Three things keep the
 * sky and the tarmac out: the chromaticity of the paint, a brightness window (a
 * silver car and grey asphalt differ mainly in brightness), and the edge map,
 * which stops the fill at the outline of the car.
 */
function buildMask(
  data: Uint8ClampedArray,
  edges: Float32Array,
  roughness: Float32Array,
  width: number,
  height: number,
  paint: Rgb,
  tolerance: number,
): Uint8Array {
  const target = chroma(paint.r, paint.g, paint.b);
  const paintLuma = Math.max(luma(paint.r, paint.g, paint.b), 12);
  // A colourful paint is identified by hue alone; a neutral one (white, silver,
  // grey, black) shares its hue with the road, so brightness has to do the work.
  const colourful = chromaDistance(target, [1 / 3, 1 / 3]) > 0.035;
  const minRatio = colourful ? 0.18 : 0.62;
  const maxRatio = colourful ? 2.3 : 1.55;

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const matches = (index: number): boolean => {
    if (edges[index] > EDGE_LIMIT) return false;
    if (roughness[index] > TEXTURE_LIMIT) return false;
    const i = index * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = luma(r, g, b);
    if (l < 18) return false; // shadow under the car, tyres, grille
    const ratio = l / paintLuma;
    if (ratio < minRatio || ratio > maxRatio) return false;
    return chromaDistance(chroma(r, g, b), target) <= tolerance;
  };

  const push = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    if (!matches(index)) return;
    mask[index] = 255;
    queue[tail++] = index;
  };

  for (let y = Math.round(height * 0.24); y < Math.round(height * 0.86); y += 3) {
    for (let x = Math.round(width * 0.14); x < Math.round(width * 0.86); x += 3) {
      push(y * width + x);
    }
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  return mask;
}

/**
 * Grows the mask over panel gaps, shut lines and trim highlights. The region
 * grower refuses those pixels on purpose (they are edges), which would leave
 * the old paint showing as white seams across the repainted car.
 */
function dilateMask(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  paint: Rgb,
  tolerance: number,
  passes: number,
): Uint8Array {
  const target = chroma(paint.r, paint.g, paint.b);
  const paintLuma = Math.max(luma(paint.r, paint.g, paint.b), 12);
  let current = mask;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (current[index]) continue;
        const neighbour =
          current[index - 1] || current[index + 1] || current[index - width] || current[index + width];
        if (!neighbour) continue;

        const i = index * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = luma(r, g, b);
        if (l < 22) continue; // keep tyres, glass and grilles out
        const ratio = l / paintLuma;
        if (ratio < 0.3 || ratio > 2.4) continue;
        if (chromaDistance(chroma(r, g, b), target) > tolerance) continue;
        next[index] = 255;
      }
    }
    current = next;
  }

  return current;
}

/**
 * Keeps the substantial connected regions and drops the confetti. Shut lines
 * and trim split a car into a handful of panels, so this keeps every region
 * that is a meaningful fraction of the biggest one - the bonnet and the doors
 * survive, stray patches of tarmac do not.
 */
function majorRegions(mask: Uint8Array, width: number, height: number): Uint8Array {
  const labels = new Int32Array(mask.length).fill(-1);
  const queue = new Int32Array(mask.length);
  const regions: number[][] = [];
  let label = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start] >= 0) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = label;
    const members: number[] = [];

    while (head < tail) {
      const index = queue[head++];
      members.push(index);
      const x = index % width;
      const y = (index / width) | 0;

      const visit = (next: number) => {
        if (!mask[next] || labels[next] >= 0) return;
        labels[next] = label;
        queue[tail++] = next;
      };
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }

    regions.push(members);
    label += 1;
  }

  const biggest = regions.reduce((max, region) => Math.max(max, region.length), 0);
  const cleaned = new Uint8Array(mask.length);
  regions
    .filter((region) => region.length >= biggest * 0.06)
    .forEach((region) => region.forEach((index) => {
      cleaned[index] = 255;
    }));
  return cleaned;
}

/**
 * Decides whether the fill escaped the car. The reliable tell is the ground:
 * tarmac runs the full width of the frame, so a mask that fills both bottom
 * corners has run out onto the road. The sky test catches the same thing above.
 */
function leaked(mask: Uint8Array, width: number, height: number): boolean {
  const band = Math.max(2, Math.round(height * 0.04));
  const column = Math.max(2, Math.round(width * 0.06));

  const share = (x0: number, x1: number, y0: number, y1: number) => {
    let count = 0;
    let total = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        total += 1;
        if (mask[y * width + x]) count += 1;
      }
    }
    return total === 0 ? 0 : count / total;
  };

  const bottomLeft = share(0, column, height - band, height);
  const bottomRight = share(width - column, width, height - band, height);
  const topLeft = share(0, column, 0, band);
  const topRight = share(width - column, width, 0, band);

  // Both bottom corners: standing on painted tarmac.
  if (bottomLeft > 0.5 && bottomRight > 0.5) return true;
  // Both top corners: the sky (or a wall behind the car) came along.
  if (topLeft > 0.5 && topRight > 0.5) return true;
  return false;
}

function maskShare(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) count += 1;
  return count / mask.length;
}

/** Two-pass box blur so the repainted area does not show a hard cut-out edge. */
function featherMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const radius = 1;
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        sum += mask[y * width + nx];
        n += 1;
      }
      horizontal[y * width + x] = sum / n;
    }
  }
  const blurred = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        sum += horizontal[ny * width + x];
        n += 1;
      }
      blurred[y * width + x] = sum / n;
    }
  }
  return blurred;
}

/**
 * Is this mask actually a car? A believable body mask is one solid blob around
 * the middle of the frame. Stripes, a marquee behind the car or a windscreen
 * full of reflections produce thin, scattered or off-centre masks, and
 * repainting those looks broken — better to show the original photo.
 */
function looksLikeCar(mask: Uint8Array, width: number, height: number): boolean {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let filled = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      filled += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (filled === 0) return false;

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  // A car spans a good part of the photo...
  if (boxWidth < width * 0.4 || boxHeight < height * 0.3) return false;
  // ...it is solid rather than a scatter of stripes...
  if (filled / (boxWidth * boxHeight) < 0.22) return false;

  // ...and it covers the middle of the frame, where the subject sits.
  let centreHits = 0;
  let centreTotal = 0;
  for (let y = Math.round(height * 0.42); y < Math.round(height * 0.72); y += 1) {
    for (let x = Math.round(width * 0.34); x < Math.round(width * 0.66); x += 1) {
      centreTotal += 1;
      if (mask[y * width + x]) centreHits += 1;
    }
  }
  return centreTotal > 0 && centreHits / centreTotal > 0.4;
}

/**
 * Guards against half-repainted cars. Every pixel inside the body's bounding
 * box that shares the paint colour should have ended up in the mask; when a
 * large share did not, the fill stopped part-way (a shaded bumper, a reflection)
 * and repainting would leave the car in two colours.
 */
function coversItsColour(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  paint: Rgb,
  tolerance: number,
): boolean {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return false;

  const target = chroma(paint.r, paint.g, paint.b);
  const paintLuma = Math.max(luma(paint.r, paint.g, paint.b), 12);
  let candidates = 0;
  let covered = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const index = y * width + x;
      const i = index * 4;
      const l = luma(data[i], data[i + 1], data[i + 2]);
      const ratio = l / paintLuma;
      if (ratio < 0.55 || ratio > 1.8) continue;
      if (chromaDistance(chroma(data[i], data[i + 1], data[i + 2]), target) > tolerance) continue;
      candidates += 1;
      if (mask[index]) covered += 1;
    }
  }

  return candidates === 0 ? false : covered / candidates > 0.62;
}

function drawToCanvas(image: HTMLImageElement, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/**
 * Returns a data URL of the photo with the car's paint swapped for `hex`,
 * or null when the body could not be isolated (the caller then shows the
 * original photo rather than a wrongly painted one).
 */
export function recolorCarPhoto(
  image: HTMLImageElement,
  hex: string,
  options: RecolorOptions = {},
): string | null {
  const surface = drawToCanvas(image, options.maxSize ?? DEFAULT_MAX_SIZE);
  if (!surface) return null;
  const { canvas, ctx, width, height } = surface;

  let frame: ImageData;
  try {
    frame = ctx.getImageData(0, 0, width, height);
  } catch {
    return null; // cross-origin image: nothing we can do client-side.
  }
  const data = frame.data;

  const edges = edgeMap(data, width, height);
  const roughness = roughnessMap(edges, width, height);
  const paint = samplePaint(data, edges, roughness, width, height);
  const paintLuma = Math.max(luma(paint.r, paint.g, paint.b), 12);

  // Black and near-black cars carry almost no colour information: a repaint
  // reads as blotches on the glass and trim rather than as new paint.
  if (paintLuma < 62) return null;

  let tolerance = CHROMA_TOLERANCE;
  let mask = buildMask(data, edges, roughness, width, height, paint, tolerance);
  // A leaked fill (sky or tarmac joined the car) looks far worse than a
  // conservative one, so tighten and retry before giving up.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (maskShare(mask) <= MAX_MASK_SHARE && !leaked(mask, width, height)) break;
    tolerance *= 0.65;
    mask = buildMask(data, edges, roughness, width, height, paint, tolerance);
  }
  mask = majorRegions(dilateMask(mask, data, width, height, paint, tolerance * 1.7, 3), width, height);

  const share = maskShare(mask);
  if (share < 0.05 || share > MAX_MASK_SHARE) return null;
  if (leaked(mask, width, height) || !looksLikeCar(mask, width, height)) return null;
  if (!coversItsColour(mask, data, width, height, paint, tolerance)) return null;

  const soft = featherMask(mask, width, height);
  const target = hexToRgb(hex);

  for (let index = 0; index < soft.length; index += 1) {
    const alpha = soft[index] / 255;
    if (alpha <= 0.01) continue;

    const i = index * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = luma(r, g, b);

    // Each pixel keeps its own brightness relative to the sampled paint, so
    // shading, reflections and panel gaps carry over to the new colour.
    const ratio = Math.min(l / paintLuma, 2.6);
    // Specular highlights stay white instead of turning into bright paint.
    const specular = Math.max(0, Math.min(1, (l - 210) / 45));

    const painted = (channel: number) => {
      const tinted = Math.min(255, channel * ratio);
      return tinted * (1 - specular) + 255 * specular;
    };

    data[i] = r + (painted(target.r) - r) * alpha;
    data[i + 1] = g + (painted(target.g) - g) * alpha;
    data[i + 2] = b + (painted(target.b) - b) * alpha;
  }

  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Loads a same-origin image for canvas processing. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}
