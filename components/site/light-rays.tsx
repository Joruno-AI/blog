"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float fadeDistance;
uniform float saturation;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float distortedAngle = cosAngle + distortion *
    sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(
    max(distortedAngle, 0.0),
    1.0 / max(lightSpread, 0.001)
  );
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp(
    (maxDistance - distance) / maxDistance,
    0.0,
    1.0
  );
  float fadeFalloff = clamp(
    (iResolution.x * fadeDistance - distance) /
      (iResolution.x * fadeDistance),
    0.5,
    1.0
  );
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0,
    1.0
  );
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) * rayStrength(
    rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed
  );
  vec4 rays2 = vec4(1.0) * rayStrength(
    rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed
  );
  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= 1.0 - noiseAmount + noiseAmount * n;
  }

  float brightness = 1.0 - coord.y / iResolution.y;
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }
  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

type Rgb = [number, number, number];

function parseColor(value: string): Rgb | null {
  const hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value.trim());
  if (hex) {
    return [
      Number.parseInt(hex[1], 16) / 255,
      Number.parseInt(hex[2], 16) / 255,
      Number.parseInt(hex[3], 16) / 255,
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value.trim());
  return rgb
    ? [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255]
    : null;
}

function mixColor(a: Rgb, b: Rgb, amount: number): Rgb {
  return a.map((channel, index) =>
    Math.min(1, Math.max(0, channel * (1 - amount) + b[index] * amount)),
  ) as Rgb;
}

/** Exact React port of the final Astro LightRays background. */
export function LightRays() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    delete host.dataset.webglUnavailable;

    let animationFrame = 0;
    let controller: AbortController | null = null;
    let themeObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let context: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    let gl: Renderer["gl"] | null = null;
    let disposed = false;

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(animationFrame);
      controller?.abort();
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      const activeContext = gl ?? context;
      if (!activeContext) return;
      try {
        activeContext.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        // The browser may already have released the decorative context.
      }
      canvas?.remove();
    };

    const disableWebGL = () => {
      host.dataset.webglUnavailable = "true";
      dispose();
    };

    try {
      canvas = document.createElement("canvas");
      const contextAttributes = {
        alpha: true,
        antialias: false,
        depth: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        stencil: false,
      } satisfies WebGLContextAttributes;
      const webgl2 = canvas.getContext("webgl2", contextAttributes) as WebGL2RenderingContext | null;
      context = webgl2 || (canvas.getContext("webgl", contextAttributes) as WebGLRenderingContext | null);
      if (!context) {
        disableWebGL();
        return dispose;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const compact = window.matchMedia("(max-width: 767px)");
      controller = new AbortController();
      const renderer = new Renderer({
        canvas,
        dpr: Math.min(window.devicePixelRatio, compact.matches ? 1 : 1.35),
        alpha: true,
        webgl: webgl2 ? 2 : 1,
      });
      gl = renderer.gl;
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      host.appendChild(gl.canvas);

      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: [0.72, 0.76, 0.84] as Rgb },
        raysSpeed: { value: 1.2 },
        lightSpread: { value: 0.9 },
        rayLength: { value: 2.2 },
        fadeDistance: { value: 1 },
        saturation: { value: 1 },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: 0.12 },
        noiseAmount: { value: 0.06 },
        distortion: { value: 0.02 },
      };

      const geometry = new Triangle(gl);
      const program = new Program(gl, { vertex: VERTEX, fragment: FRAGMENT, uniforms });
      const mesh = new Mesh(gl, { geometry, program });
      const mouse = { x: 0.5, y: 0.5 };
      const smooth = { x: 0.5, y: 0.5 };

      const render = () => {
        if (disposed) return false;
        try {
          renderer.render({ scene: mesh });
          return true;
        } catch {
          disableWebGL();
          return false;
        }
      };

      const updatePalette = () => {
        const rootStyle = getComputedStyle(document.documentElement);
        const album =
          parseColor(rootStyle.getPropertyValue("--music-album-color")) ??
          parseColor(rootStyle.getPropertyValue("--music-light-ray")) ??
          ([26 / 255, 26 / 255, 46 / 255] as Rgb);
        const dark = document.documentElement.classList.contains("dark");
        uniforms.raysColor.value = dark
          ? [245 / 255, 215 / 255, 137 / 255]
          : mixColor(album, [0.12, 0.14, 0.18], 0.82);
        uniforms.lightSpread.value = dark ? 0.9 : 0.5;
        uniforms.mouseInfluence.value = dark ? 0.12 : 0.18;
        uniforms.distortion.value = dark ? 0.02 : 0.028;
        uniforms.saturation.value = dark ? 1 : 0.86;
        uniforms.noiseAmount.value = dark ? 0.06 : 0.035;
        if (reduceMotion.matches) render();
      };

      const updatePlacement = () => {
        if (disposed) return;
        renderer.dpr = Math.min(window.devicePixelRatio, compact.matches ? 1 : 1.35);
        const widthCss = host.clientWidth || window.innerWidth;
        const heightCss = host.clientHeight || window.innerHeight;
        renderer.setSize(widthCss, heightCss);
        const width = widthCss * renderer.dpr;
        const height = heightCss * renderer.dpr;
        uniforms.iResolution.value = [width, height];
        uniforms.rayPos.value = [width * 0.5, height * -0.2];
        uniforms.rayDir.value = [0, 1];
        if (reduceMotion.matches) render();
      };

      themeObserver = new MutationObserver(updatePalette);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
      resizeObserver = new ResizeObserver(updatePlacement);
      resizeObserver.observe(host);

      window.addEventListener(
        "mousemove",
        (event) => {
          mouse.x = event.clientX / window.innerWidth;
          mouse.y = event.clientY / window.innerHeight;
        },
        { signal: controller.signal, passive: true },
      );

      let lastFrame = 0;
      const loop = (time: number) => {
        if (disposed) return;
        animationFrame = requestAnimationFrame(loop);
        if (
          document.hidden ||
          !host.isConnected ||
          !document.documentElement.classList.contains("dark")
        ) return;
        const frameInterval = 1000 / (compact.matches ? 24 : 30);
        if (lastFrame && time - lastFrame < frameInterval) return;
        lastFrame = time;
        uniforms.iTime.value = time * 0.001;
        smooth.x = smooth.x * 0.93 + mouse.x * 0.07;
        smooth.y = smooth.y * 0.93 + mouse.y * 0.07;
        uniforms.mousePos.value = [smooth.x, smooth.y];
        render();
      };

      updatePalette();
      updatePlacement();
      if (reduceMotion.matches) render();
      else animationFrame = requestAnimationFrame(loop);
    } catch {
      disableWebGL();
    }

    return dispose;
  }, []);

  return (
    <div ref={hostRef} className="ambient-light-rays" aria-hidden="true">
      <span className="ambient-cover" />
      <span className="ambient-light" />
      <span className="ambient-noise" />
    </div>
  );
}
