// import { useEffect, useRef } from 'react';

// export function NextjsFlare({ className = '' }) {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext('2d');
//     let animationFrameId;
//     let width = (canvas.width = canvas.offsetWidth);
//     let height = (canvas.height = canvas.offsetHeight);

//     const handleResize = () => {
//       if (!canvas) return;
//       width = canvas.width = canvas.offsetWidth;
//       height = canvas.height = canvas.offsetHeight;
//     };
//     window.addEventListener('resize', handleResize);

//     let t = 0;

//     const render = () => {
//       t += 0.008;
//       ctx.clearRect(0, 0, width, height);

//       // Next.js dynamic flare center point
//       const flareX = width * (0.5 + 0.15 * Math.sin(t));
//       const flareY = height * 0.15 + 10 * Math.cos(t * 0.8);

//       // 1. Broad Ambient Base Glow (Soft background dispersion)
//       const baseGlow = ctx.createRadialGradient(flareX, flareY, 10, flareX, flareY, width * 0.6);
//       baseGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
//       baseGlow.addColorStop(0.3, 'rgba(212, 162, 76, 0.04)');
//       baseGlow.addColorStop(0.6, 'rgba(6, 182, 212, 0.02)');
//       baseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
//       ctx.fillStyle = baseGlow;
//       ctx.fillRect(0, 0, width, height);

//       // 2. Focused Core Lens Aperture (Sharp central light disc)
//       const coreAperture = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 140);
//       coreAperture.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
//       coreAperture.addColorStop(0.25, 'rgba(251, 191, 36, 0.12)');
//       coreAperture.addColorStop(0.7, 'rgba(6, 182, 212, 0.04)');
//       coreAperture.addColorStop(1, 'rgba(0, 0, 0, 0)');
//       ctx.fillStyle = coreAperture;
//       ctx.fillRect(0, 0, width, height);

//       // 3. Horizontal Light Streak (Next.js signature prism beam)
//       const streakW = width * 0.7;
//       const streakGradient = ctx.createLinearGradient(flareX - streakW / 2, flareY, flareX + streakW / 2, flareY);
//       streakGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
//       streakGradient.addColorStop(0.35, 'rgba(251, 191, 36, 0.15)');
//       streakGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
//       streakGradient.addColorStop(0.65, 'rgba(6, 182, 212, 0.15)');
//       streakGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

//       ctx.fillStyle = streakGradient;
//       ctx.fillRect(flareX - streakW / 2, flareY - 1, streakW, 2);

//       // 4. Subtle Prism Flare Rings (Secondary optical reflections)
//       const ring1X = width * 0.5 - (flareX - width * 0.5) * 0.4;
//       const ring1Y = flareY + 30;
//       const ring1 = ctx.createRadialGradient(ring1X, ring1Y, 0, ring1X, ring1Y, 40);
//       ring1.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
//       ring1.addColorStop(1, 'rgba(0, 0, 0, 0)');
//       ctx.fillStyle = ring1;
//       ctx.beginPath();
//       ctx.arc(ring1X, ring1Y, 40, 0, Math.PI * 2);
//       ctx.fill();

//       animationFrameId = requestAnimationFrame(render);
//     };

//     render();

//     return () => {
//       window.removeEventListener('resize', handleResize);
//       cancelAnimationFrame(animationFrameId);
//     };
//   }, []);

//   return (
//     <div className={`pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden ${className}`}>
//       {/* Top Hairline Light Edge */}
//       <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
//       {/* Canvas Optical Renderer */}
//       <canvas ref={canvasRef} className="block h-full w-full opacity-90" />
//     </div>
//   );
// }

// export default NextjsFlare;

