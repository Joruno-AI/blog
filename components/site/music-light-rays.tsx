"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `precision highp float;
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

float rayStrength(vec2 source, vec2 reference, vec2 coordinate,
  float seedA, float seedB, float speed) {
  vec2 sourceToCoordinate = coordinate - source;
  vec2 direction = normalize(sourceToCoordinate);
  float angle = dot(direction, reference);
  float distortedAngle = angle + distortion *
    sin(iTime * 2.0 + length(sourceToCoordinate) * 0.01) * 0.2;
  float spread = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoordinate);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp(
    (iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance),
    0.5,
    1.0
  );
  float strength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0,
    1.0
  );
  return strength * lengthFalloff * fadeFalloff * spread;
}

void mainImage(out vec4 color, in vec2 fragmentCoordinate) {
  vec2 coordinate = vec2(fragmentCoordinate.x, iResolution.y - fragmentCoordinate.y);
  vec2 direction = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPosition = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPosition - rayPos);
    direction = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  vec4 first = vec4(1.0) * rayStrength(
    rayPos, direction, coordinate, 36.2214, 21.11349, 1.5 * raysSpeed
  );
  vec4 second = vec4(1.0) * rayStrength(
    rayPos, direction, coordinate, 22.3991, 18.0234, 1.1 * raysSpeed
  );
  color = first * 0.5 + second * 0.4;
  if (noiseAmount > 0.0) {
    float grain = noise(coordinate * 0.01 + iTime * 0.1);
    color.rgb *= 1.0 - noiseAmount + noiseAmount * grain;
  }
  float brightness = 1.0 - coordinate.y / iResolution.y;
  color.x *= 0.1 + brightness * 0.8;
  color.y *= 0.3 + brightness * 0.6;
  color.z *= 0.5 + brightness * 0.5;
  if (saturation != 1.0) {
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, saturation);
  }
  color.rgb *= raysColor;
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
  return rgb ? [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255] : null;
}

function mixColor(left: Rgb, right: Rgb, amount: number): Rgb {
  return left.map((channel, index) =>
    Math.min(1, Math.max(0, channel * (1 - amount) + right[index] * amount)),
  ) as Rgb;
}

/** OGL port of d1ec7b0 LightRaysBackground.astro. */
export function MusicLightRays() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrapper = host?.closest<HTMLElement>("#music-page-wrapper");
    if (!host || !wrapper) return;

    delete host.dataset.webglUnavailable;

    let frame = 0;
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
      cancelAnimationFrame(frame);
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

      const compact = window.matchMedia("(max-width: 767px)");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      controller = new AbortController();
      const renderer = new Renderer({
        canvas,
        alpha: true,
        dpr: Math.min(window.devicePixelRatio, compact.matches ? 1 : 1.35),
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
      const program = new Program(gl, { vertex: VERTEX_SHADER, fragment: FRAGMENT_SHADER, uniforms });
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
        const album = parseColor(getComputedStyle(wrapper).getPropertyValue("--album-color"))
          ?? ([0.48, 0.51, 0.58] as Rgb);
        const isDark = document.documentElement.classList.contains("dark");
        uniforms.raysColor.value = isDark
          ? [245 / 255, 215 / 255, 137 / 255]
          : mixColor(album, [0.38, 0.44, 0.54], 0.28);
        uniforms.saturation.value = isDark ? 1 : 0.86;
        uniforms.noiseAmount.value = isDark ? 0.06 : 0.035;
        if (reduceMotion.matches) render();
      };

      const resize = () => {
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

      window.addEventListener("mousemove", (event) => {
        mouse.x = event.clientX / window.innerWidth;
        mouse.y = event.clientY / window.innerHeight;
      }, { passive: true, signal: controller.signal });
      window.addEventListener("resize", resize, { passive: true, signal: controller.signal });

      themeObserver = new MutationObserver(updatePalette);
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      themeObserver.observe(wrapper, { attributes: true, attributeFilter: ["style"] });
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      let lastFrame = 0;
      const loop = (time: number) => {
        if (disposed) return;
        frame = requestAnimationFrame(loop);
        if (document.hidden || wrapper.classList.contains("hidden")) return;
        const interval = 1000 / (compact.matches ? 24 : 30);
        if (lastFrame && time - lastFrame < interval) return;
        lastFrame = time;
        uniforms.iTime.value = time * 0.001;
        smooth.x = smooth.x * 0.92 + mouse.x * 0.08;
        smooth.y = smooth.y * 0.92 + mouse.y * 0.08;
        uniforms.mousePos.value = [smooth.x, smooth.y];
        render();
      };

      updatePalette();
      resize();
      if (reduceMotion.matches) render();
      else frame = requestAnimationFrame(loop);
    } catch {
      disableWebGL();
    }

    return dispose;
  }, []);

  return <div aria-hidden="true" className="music-light-rays" ref={hostRef} />;
}
