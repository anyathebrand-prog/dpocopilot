"use client";
import { useEffect, useRef } from "react";

// "Pencil to ink" (Design Brief §2): a seal presses onto a draft sheet and the sheet turns from graphite to stamp blue.
// Decorative only. three.js is imported inside the effect so it loads on this page alone and never on the server.
const INK = 0x2a3f9d, PAPER = 0xf5f6f3, PENCIL = 0x9aa0a8, SURFACE = 0xffffff;
const LOOP = 4; // seconds per stamp cycle
const PRESS = 1.6; // moment the seal touches the sheet

export function PricingScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 3.2, 7.5);
      camera.lookAt(0, 0.3, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(3, 6, 4);
      scene.add(sun);

      const root = new THREE.Group();
      scene.add(root);

      // Fanned stack of sheets; the top one is the "draft" that gets stamped.
      const sheetGeo = new THREE.BoxGeometry(2.4, 0.03, 3.1);
      [-0.22, -0.1].forEach((rot, i) => {
        const m = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color: i ? SURFACE : PAPER, roughness: 0.9 }));
        m.position.set(-0.25 + i * 0.12, -0.12 + i * 0.05, 0.1 - i * 0.05);
        m.rotation.y = rot;
        root.add(m);
      });
      const sheet = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color: PENCIL, roughness: 0.85 }));
      sheet.name = "sheet";
      root.add(sheet);

      // Text lines on the sheet (thin bars), and the ink ring the seal leaves behind.
      const lineMat = new THREE.MeshStandardMaterial({ color: 0x3d4757, roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const w = i % 3 === 2 ? 1.1 : 1.7;
        const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, 0.07), lineMat);
        line.position.set(-0.95 + w / 2, 0.022, -1.15 + i * 0.3);
        sheet.add(line);
      }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 48), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      ring.name = "ring";
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0.55, 0.02, 0.85);
      root.add(ring);

      // The seal: a handle and a round stamp face.
      const seal = new THREE.Group();
      seal.name = "seal";
      const inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.4, metalness: 0.2 });
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 48), inkMat);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.5, 32), inkMat);
      neck.position.y = 0.32;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16), inkMat);
      knob.position.y = 0.7;
      seal.add(face, neck, knob);
      root.add(seal);

      // Keyframed stamp cycle (AnimationClip + AnimationMixer).
      const t = [0, 1.1, PRESS, 1.8, 2.6, LOOP];
      const up = 1.6, down = 0.09;
      const sx = 0.55, sz = 0.85;
      const pos = new THREE.VectorKeyframeTrack("seal.position", t, [sx, up, sz, sx, up, sz, sx, down, sz, sx, down, sz, sx, up, sz, sx, up, sz]);
      pos.setInterpolation(THREE.InterpolateSmooth);
      const squash = new THREE.VectorKeyframeTrack("seal.scale", [0, PRESS - 0.05, PRESS + 0.05, PRESS + 0.25, LOOP], [1, 1, 1, 1, 1, 1, 1.08, 0.85, 1.08, 1, 1, 1, 1, 1, 1]);
      const pencil = new THREE.Color(PENCIL), paper = new THREE.Color(PAPER), inkTint = new THREE.Color(0xdfe4f6);
      const color = new THREE.ColorKeyframeTrack("sheet.material.color", [0, PRESS, PRESS + 0.35, 3.4, LOOP], [...pencil.toArray(), ...pencil.toArray(), ...inkTint.toArray(), ...paper.toArray(), ...pencil.toArray()]);
      const ink = new THREE.NumberKeyframeTrack("ring.material.opacity", [0, PRESS, PRESS + 0.1, 3.2, LOOP], [0, 0, 1, 1, 0]);
      const clip = new THREE.AnimationClip("stamp", LOOP, [pos, squash, color, ink]);
      const mixer = new THREE.AnimationMixer(root);
      mixer.clipAction(clip).play();

      // Pointer parallax with smooth damping.
      const target = { x: 0, y: 0 }, current = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        target.y = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
      };
      window.addEventListener("pointermove", onMove);

      const resize = () => {
        const { width, height } = el.getBoundingClientRect();
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        if (reduced) renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      const timer = new THREE.Timer();
      timer.connect(document); // pauses delta while the tab is hidden
      let raf = 0, visible = true;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        timer.update();
        const dt = Math.min(timer.getDelta(), 0.1);
        if (!visible) return;
        mixer.update(dt);
        const k = 1 - Math.exp(-dt * 4);
        current.x += (target.x - current.x) * k;
        current.y += (target.y - current.y) * k;
        root.rotation.y = -0.35 + current.x;
        root.rotation.x = current.y;
        root.position.y = Math.sin(timer.getElapsed() * 0.8) * 0.05;
        renderer.render(scene, camera);
      };

      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);

      if (reduced) {
        mixer.setTime(PRESS + 0.4); // a single still frame, stamped
        root.rotation.y = -0.35;
        renderer.render(scene, camera);
      } else frame();

      cleanup = () => {
        cancelAnimationFrame(raf);
        timer.dispose();
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        mixer.stopAllAction();
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div ref={host} className="pr-scene" />;
}
