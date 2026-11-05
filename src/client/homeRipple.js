// Sunny skin home effect (see homeEffects.js): every few seconds a ripple
// spreads out from the dark pool at the girl's feet, like a drop falling in,
// and gently bends the shards as it passes; then all is still again. Between
// ripples the canvas is empty and nothing runs.
//
// A WebGL shader draws the background image, warped around an expanding
// ring, only where the ring is: elsewhere the canvas is transparent and the
// CSS background shows through. Positions are in the image's own pixels
// (public/assets/home/active/sunny/pc/, 1500×1049), so they hold at any
// window size.
import { rand, backgroundImage, cover, overlay } from './homeBg.js';

const POOL = [510, 1019]; // centre of the pool at her feet
const FLAT = 4; // the pool, seen in perspective, is this much wider than tall
const GIRL = [505, 500]; // her centre line and the top of her head; the warp fades out around her
const calm = () => rand(3000, 8000); // the gap between ripples

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform sampler2D img;
uniform vec2 imgSize, offset, pool, girl;
uniform float scale, height, radius, amp, wavelength;
void main() {
  vec2 p = vec2(gl_FragCoord.x, height - gl_FragCoord.y);
  vec2 ip = (p - offset) / scale;              // this pixel, in image pixels
  vec2 d = ip - pool;
  d.y *= ${FLAT.toFixed(1)};
  float x = (length(d) - radius) / wavelength; // distance from the ring, in waves
  float env = exp(-x * x / 2.0);               // a few rings around the front
  // Keep her still: no warp within a soft capsule around her figure.
  vec2 g = vec2(ip.x - girl.x, ip.y - clamp(ip.y, girl.y, pool.y));
  float keep = smoothstep(40.0, 120.0, length(g));
  float wave = sin(x * 6.2832) * env * amp * keep;
  vec2 dir = normalize(d + 1e-4);
  dir.y /= ${FLAT.toFixed(1)};
  vec3 col = texture2D(img, (ip - dir * wave) / imgSize).rgb;
  col += 0.012 * wave;                         // a faint glint on the crests
  float a = smoothstep(0.02, 0.15, env * keep);
  gl_FragColor = vec4(col * a, a);
}`;

export function ripple(el) {
  const canvas = overlay(el);
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true });
  if (!gl) {
    canvas.remove();
    return () => {};
  }
  const image = backgroundImage(el);
  const prog = program(gl);
  const u = (name) => gl.getUniformLocation(prog, name);
  let texture = null;
  let sized = false;
  let timer = setTimeout(start, rand(1000, 2500));
  let raf = 0;
  const resize = new ResizeObserver(() => { sized = false; });
  resize.observe(el);

  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    resize.disconnect();
    canvas.remove();
  };

  function start() {
    const im = image();
    if (!im) {
      timer = setTimeout(start, calm()); // not loaded yet: skip; the next tries again
      return;
    }
    if (!texture) texture = upload(gl, im);
    if (!sized) {
      canvas.fit();
      const fit = cover(canvas.width, canvas.height, im.naturalWidth, im.naturalHeight);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('imgSize'), im.naturalWidth, im.naturalHeight);
      gl.uniform2f(u('offset'), fit.x, fit.y);
      gl.uniform1f(u('scale'), fit.s);
      gl.uniform1f(u('height'), canvas.height);
      gl.uniform2f(u('pool'), POOL[0], POOL[1]);
      gl.uniform2f(u('girl'), GIRL[0], GIRL[1]);
      sized = true;
    }
    const strength = rand(0.6, 1);
    const duration = rand(3500, 5000);
    const reach = rand(1100, 1600); // how far it spreads, in image pixels
    gl.uniform1f(u('wavelength'), rand(28, 40));
    const t0 = performance.now();
    const tick = (now) => {
      const t = (now - t0) / duration;
      if (t >= 1) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        timer = setTimeout(start, calm());
        return;
      }
      const eased = 1 - (1 - t) ** 2; // quick at first, slowing as it spreads
      gl.uniform1f(u('radius'), reach * eased);
      // Swell in over the first moments, then die away.
      gl.uniform1f(u('amp'), 7 * strength * Math.min(1, t * 8) * (1 - t) ** 1.5);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
}

function program(gl) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  return prog;
}

function upload(gl, im) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
