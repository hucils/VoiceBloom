/**
 * Halves the sample rate. A windowed-sinc low-pass filter removes content
 * above the new Nyquist frequency first, so it cannot alias into the result.
 */
const TAPS = 31;

function designLowPass(cutoff: number): Float64Array {
  // `cutoff` is a fraction of the input sample rate (0 … 0.5).
  const middle = (TAPS - 1) / 2;
  const kernel = new Float64Array(TAPS);
  let sum = 0;
  for (let n = 0; n < TAPS; n++) {
    const x = n - middle;
    const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
    const blackman =
      0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (TAPS - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (TAPS - 1));
    kernel[n] = sinc * blackman;
    sum += kernel[n]!;
  }
  for (let n = 0; n < TAPS; n++) kernel[n] = kernel[n]! / sum;
  return kernel;
}

// Pass band up to 45% of the output rate (e.g. 3.6 kHz when going from 16 to 8 kHz).
const HALF_BAND = designLowPass(0.225);

export function decimateByTwo(samples: Float32Array): Float32Array {
  const middle = (TAPS - 1) / 2;
  const output = new Float32Array(Math.floor(samples.length / 2));
  for (let k = 0; k < output.length; k++) {
    const centre = 2 * k;
    let value = 0;
    for (let j = 0; j < TAPS; j++) {
      const index = centre + j - middle;
      if (index >= 0 && index < samples.length) value += HALF_BAND[j]! * samples[index]!;
    }
    output[k] = value;
  }
  return output;
}
