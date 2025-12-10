import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';
import './LightRays.css';

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

interface LightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  className?: string;
}

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (
  origin: RaysOrigin,
  w: number,
  h: number
): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

type Vec2 = [number, number];
type Vec3 = [number, number, number];

interface Uniforms {
  iTime: { value: number };
  iResolution: { value: Vec2 };
  rayPos: { value: Vec2 };
  rayDir: { value: Vec2 };
  raysColor: { value: Vec3 };
  raysSpeed: { value: number };
  lightSpread: { value: number };
  rayLength: { value: number };
  pulsating: { value: number };
  fadeDistance: { value: number };
  saturation: { value: number };
  mousePos: { value: Vec2 };
  mouseInfluence: { value: number };
  noiseAmount: { value: number };
  distortion: { value: number };
}

const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<Uniforms | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // For mobile, set visible immediately to ensure animation starts
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setIsVisible(true);
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) {
        console.warn('LightRays: Container ref not available');
        return;
      }

      // Defer WebGL initialization significantly to prioritize content rendering
      // Use requestIdleCallback for better performance
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        await new Promise(resolve => {
          requestIdleCallback(() => resolve(undefined), { timeout: 2000 });
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (!containerRef.current) return;

      // Ensure container has dimensions
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn('LightRays: Container has no dimensions', rect);
        // Retry after a short delay
        setTimeout(() => initializeWebGL(), 100);
        return;
      }

      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, LightRays animation will not be visible');
        // Add a CSS fallback animation
        if (containerRef.current) {
          containerRef.current.style.background = 'radial-gradient(circle at top center, rgba(0, 255, 255, 0.4), transparent 70%)';
          containerRef.current.style.animation = 'pulse 3s ease-in-out infinite';
        }
        return;
      }

      console.log('LightRays: WebGL supported, initializing...');

      try {
        // Detect mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        const renderer = new Renderer({
          dpr: isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2),
          alpha: true,
          powerPreference: isMobile ? 'default' : 'high-performance',
          antialias: !isMobile // Disable antialiasing on mobile for better performance
        });

        rendererRef.current = renderer;

        const rendererGl = renderer.gl;

        // Ensure canvas has proper dimensions and is visible
        rendererGl.canvas.style.width = '100%';
        rendererGl.canvas.style.height = '100%';
        rendererGl.canvas.style.display = 'block';
        rendererGl.canvas.style.position = 'absolute';
        rendererGl.canvas.style.top = '0';
        rendererGl.canvas.style.left = '0';
        rendererGl.canvas.style.opacity = '1';
        rendererGl.canvas.style.visibility = 'visible';
        rendererGl.canvas.style.zIndex = '1';
        // Critical: Disable pointer events so clicks pass through to buttons
        rendererGl.canvas.style.pointerEvents = 'none';
        rendererGl.canvas.style.touchAction = 'none';
        
        // Enable blending for better visibility
        rendererGl.enable(rendererGl.BLEND);
        rendererGl.blendFunc(rendererGl.SRC_ALPHA, rendererGl.ONE_MINUS_SRC_ALPHA);

        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        containerRef.current.appendChild(rendererGl.canvas);

        const vert = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

        const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
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
  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);
  fragColor = rays1 * 0.5 + rays2 * 0.4;
  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }
  float brightness = 1.0 - (coord.y / iResolution.y);
  // Increased brightness multipliers for better visibility on mobile
  fragColor.x *= 0.3 + brightness * 0.9;
  fragColor.y *= 0.5 + brightness * 0.8;
  fragColor.z *= 0.7 + brightness * 0.7;
  // Boost overall intensity for mobile visibility
  fragColor.rgb *= 1.5;
  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }
  fragColor.rgb *= raysColor;
  // Ensure minimum visibility
  fragColor.a = max(fragColor.a, 0.3);
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

        const uniforms: Uniforms = {
          iTime: { value: 0 },
          iResolution: { value: [1, 1] },
          rayPos: { value: [0, 0] },
          rayDir: { value: [0, 1] },
          raysColor: { value: hexToRgb(raysColor) },
          raysSpeed: { value: raysSpeed },
          lightSpread: { value: lightSpread },
          rayLength: { value: rayLength },
          pulsating: { value: pulsating ? 1.0 : 0.0 },
          fadeDistance: { value: fadeDistance },
          saturation: { value: saturation },
          mousePos: { value: [0.5, 0.5] },
          mouseInfluence: { value: mouseInfluence },
          noiseAmount: { value: noiseAmount },
          distortion: { value: distortion }
        };

        uniformsRef.current = uniforms;

        const geometry = new Triangle(rendererGl);
        const program = new Program(rendererGl, {
          vertex: vert,
          fragment: frag,
          uniforms
        });

        const mesh = new Mesh(rendererGl, { geometry, program });

        meshRef.current = mesh;

        const updatePlacement = () => {
          if (!containerRef.current || !renderer) return;
          renderer.dpr = Math.min(window.devicePixelRatio, 2);
          const rect = containerRef.current.getBoundingClientRect();
          const wCSS = rect.width || containerRef.current.clientWidth;
          const hCSS = rect.height || containerRef.current.clientHeight;
          // Ensure minimum dimensions for mobile
          const width = Math.max(wCSS, 100);
          const height = Math.max(hCSS, 100);
          
          if (width === 0 || height === 0) {
            console.warn('LightRays: Container dimensions are zero', { width, height, rect });
            return;
          }
          
          renderer.setSize(width, height);
          const dpr = renderer.dpr;
          const w = width * dpr;
          const h = height * dpr;
          uniforms.iResolution.value = [w, h];
          const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
          uniforms.rayPos.value = anchor;
          uniforms.rayDir.value = dir;
        };

        const loop = (t: number) => {
          if (!rendererRef.current || !uniformsRef.current || !meshRef.current) {
            return;
          }

          uniforms.iTime.value = t * 0.001;

          if (followMouse && mouseInfluence > 0.0) {
            const smoothing = 0.92;
            smoothMouseRef.current.x = smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing);
            smoothMouseRef.current.y = smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing);
            uniforms.mousePos.value = [smoothMouseRef.current.x, smoothMouseRef.current.y];
          }

          try {
            renderer.render({ scene: mesh });
            animationIdRef.current = requestAnimationFrame(loop);
          } catch (error) {
            console.warn('WebGL rendering error:', error);
            return;
          }
        };

        window.addEventListener('resize', updatePlacement);
        // Force initial update with multiple attempts for mobile
        updatePlacement();
        setTimeout(updatePlacement, 50);
        setTimeout(updatePlacement, 200);
        setTimeout(() => {
          console.log('LightRays: Animation initialized', {
            width: containerRef.current?.clientWidth,
            height: containerRef.current?.clientHeight,
            canvas: rendererGl.canvas.width,
            canvasHeight: rendererGl.canvas.height
          });
        }, 300);
        animationIdRef.current = requestAnimationFrame(loop);

        cleanupFunctionRef.current = () => {
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }

          window.removeEventListener('resize', updatePlacement);

          if (renderer) {
            try {
              const canvas = renderer.gl.canvas;
              const loseContextExt = renderer.gl.getExtension('WEBGL_lose_context');
              if (loseContextExt) {
                loseContextExt.loseContext();
              }
              if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
              }
            } catch (error) {
              console.warn('Error during WebGL cleanup:', error);
            }
          }

          rendererRef.current = null;
          uniformsRef.current = null;
          meshRef.current = null;
        };
      } catch (error) {
        console.error('Failed to initialize WebGL for LightRays:', error);
        // Add CSS fallback on error
        if (containerRef.current) {
          containerRef.current.style.background = 'radial-gradient(circle at top center, rgba(0, 255, 255, 0.4), transparent 70%)';
          containerRef.current.style.animation = 'pulse 3s ease-in-out infinite';
        }
      }
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
  }, [
    isVisible,
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current) return;

    const u = uniformsRef.current;
    const renderer = rendererRef.current;

    u.raysColor.value = hexToRgb(raysColor);
    u.raysSpeed.value = raysSpeed;
    u.lightSpread.value = lightSpread;
    u.rayLength.value = rayLength;
    u.pulsating.value = pulsating ? 1.0 : 0.0;
    u.fadeDistance.value = fadeDistance;
    u.saturation.value = saturation;
    u.mouseInfluence.value = mouseInfluence;
    u.noiseAmount.value = noiseAmount;
    u.distortion.value = distortion;

    const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
    const dpr = renderer.dpr;
    const { anchor, dir } = getAnchorAndDir(raysOrigin, wCSS * dpr, hCSS * dpr);
    u.rayPos.value = anchor;
    u.rayDir.value = dir;
  }, [
    raysColor,
    raysSpeed,
    lightSpread,
    raysOrigin,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current = { x, y };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !rendererRef.current) return;
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;
      
      // Check if touch is on an interactive element (button, link, etc.)
      const target = e.target as HTMLElement;
      if (target && (
        target.closest('a') || 
        target.closest('button') || 
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')
      )) {
        // Don't prevent default for interactive elements
        return;
      }
      
      // Only prevent default if touch is actually on the animation container
      const rect = containerRef.current.getBoundingClientRect();
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      
      if (
        touchX >= rect.left &&
        touchX <= rect.right &&
        touchY >= rect.top &&
        touchY <= rect.bottom
      ) {
        // Only prevent default if touch is on the container and not on an interactive element
        const elementAtPoint = document.elementFromPoint(touchX, touchY);
        if (elementAtPoint && (
          elementAtPoint.closest('a') ||
          elementAtPoint.closest('button') ||
          elementAtPoint.closest('[role="button"]')
        )) {
          return; // Don't prevent default for buttons/links
        }
        e.preventDefault(); // Prevent scrolling only when interacting with animation
      }
      
      const x = (touchX - rect.left) / rect.width;
      const y = (touchY - rect.top) / rect.height;
      mouseRef.current = { x, y };
    };

    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      // Add touch support for mobile devices
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchstart', handleTouchMove, { passive: false });
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchstart', handleTouchMove);
      };
    }
  }, [followMouse]);

  return <div ref={containerRef} className={`light-rays-container ${className}`.trim()} />;
};

export default LightRays;

