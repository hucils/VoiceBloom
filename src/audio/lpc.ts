/**
 * Linear prediction (LPC) and polynomial root finding, used to estimate
 * formants (vocal tract resonances).
 */

export interface Complex {
  re: number;
  im: number;
}

export function autocorrelation(frame: ArrayLike<number>, maxLag: number): Float64Array {
  const result = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < frame.length; i++) sum += frame[i]! * frame[i - lag]!;
    result[lag] = sum;
  }
  return result;
}

/**
 * Levinson–Durbin recursion. Returns [1, a1, …, ap] for the prediction-error
 * filter A(z) = 1 + a1·z⁻¹ + … + ap·z⁻ᵖ, or null if the input is silent or
 * numerically degenerate.
 */
export function levinsonDurbin(r: ArrayLike<number>, order: number): Float64Array | null {
  if (r.length <= order || !(r[0]! > 0)) return null;
  let a = new Float64Array(order + 1);
  a[0] = 1;
  let error = r[0]!;
  for (let i = 1; i <= order; i++) {
    let accumulator = r[i]!;
    for (let j = 1; j < i; j++) accumulator += a[j]! * r[i - j]!;
    const reflection = -accumulator / error;
    if (!Number.isFinite(reflection) || Math.abs(reflection) >= 1) return null;
    const next = new Float64Array(order + 1);
    next[0] = 1;
    for (let j = 1; j < i; j++) next[j] = a[j]! + reflection * a[i - j]!;
    next[i] = reflection;
    a = next;
    error *= 1 - reflection * reflection;
    if (!(error > 0)) return null;
  }
  return a;
}

/**
 * Complex roots of c[0]·zⁿ + c[1]·zⁿ⁻¹ + … + c[n], via Durand–Kerner
 * (Weierstrass) iteration. Adequate for the low-degree, well-conditioned
 * polynomials LPC produces.
 */
export function polynomialRoots(
  coefficients: ArrayLike<number>,
  maxIterations = 500,
  tolerance = 1e-12,
): Complex[] {
  const degree = coefficients.length - 1;
  if (degree < 1 || coefficients[0] === 0) return [];
  const lead = coefficients[0]!;
  const c = Array.from({ length: degree + 1 }, (_, i) => coefficients[i]! / lead);

  const re = new Float64Array(degree);
  const im = new Float64Array(degree);
  for (let k = 0; k < degree; k++) {
    // Spread the starting guesses around a circle; the offset avoids symmetric stalls.
    const angle = (2 * Math.PI * k) / degree + 0.4;
    re[k] = 0.9 * Math.cos(angle);
    im[k] = 0.9 * Math.sin(angle);
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let largestStep = 0;
    for (let k = 0; k < degree; k++) {
      const zr = re[k]!;
      const zi = im[k]!;
      // p(z) by Horner's method.
      let pr = 1;
      let pi = 0;
      for (let j = 1; j <= degree; j++) {
        const nextRe = pr * zr - pi * zi + c[j]!;
        pi = pr * zi + pi * zr;
        pr = nextRe;
      }
      // Π (z_k − z_j) over the other estimates.
      let dr = 1;
      let di = 0;
      for (let j = 0; j < degree; j++) {
        if (j === k) continue;
        const xr = zr - re[j]!;
        const xi = zi - im[j]!;
        const nextRe = dr * xr - di * xi;
        di = dr * xi + di * xr;
        dr = nextRe;
      }
      const magnitude = dr * dr + di * di;
      if (magnitude === 0) {
        re[k] = zr + 1e-6; // nudge coincident estimates apart
        continue;
      }
      const stepRe = (pr * dr + pi * di) / magnitude;
      const stepIm = (pi * dr - pr * di) / magnitude;
      re[k] = zr - stepRe;
      im[k] = zi - stepIm;
      largestStep = Math.max(largestStep, Math.hypot(stepRe, stepIm));
    }
    if (largestStep < tolerance) break;
  }

  return Array.from({ length: degree }, (_, k) => ({ re: re[k]!, im: im[k]! }));
}
