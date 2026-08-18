import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The hero scene: a DUSD core with one orbiting node per live market.
 * Node size follows open interest, colour follows the last tick, orbit speed follows volume.
 */
export default function Core3D({ markets = [], selected, onSelect }) {
  const hostRef = useRef(null);
  const props = useRef({ markets, selected, onSelect });
  props.current = { markets, selected, onSelect };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070a, 0.032);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 3.4, 11.5);
    camera.lookAt(0, 0.4, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8fefb8, 0.72));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(5, 9, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5dffc4, 1.05);
    rim.position.set(-7, 2, -5);
    scene.add(rim);
    const coreLight = new THREE.PointLight(0x3dff8a, 13, 22, 1.8);
    coreLight.position.set(0, 0.6, 0);
    scene.add(coreLight);

    // Core
    const core = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 1),
      new THREE.MeshStandardMaterial({
        color: 0x123d28,
        emissive: 0x2ee27a,
        emissiveIntensity: 1.35,
        metalness: 0.55,
        roughness: 0.18,
        wireframe: true,
      })
    );
    core.add(shell);
    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0c2216,
        emissive: 0x39ff8a,
        emissiveIntensity: 1.85,
        metalness: 0.35,
        roughness: 0.16,
      })
    );
    core.add(nucleus);
    for (const [r, tilt, op] of [
      [2.05, 0.0, 0.78],
      [2.5, 0.6, 0.5],
      [3.0, -0.45, 0.36],
    ]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 8, 128),
        new THREE.MeshBasicMaterial({ color: 0x7dffb8, transparent: true, opacity: op })
      );
      ring.rotation.x = Math.PI / 2 + tilt;
      core.add(ring);
    }
    core.userData.pick = { kind: "core" };
    scene.add(core);

    // Dust
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const r = 6 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      dustPos[i * 3] = Math.cos(a) * r;
      dustPos[i * 3 + 1] = (Math.random() - 0.4) * 9;
      dustPos[i * 3 + 2] = Math.sin(a) * r;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    scene.add(
      new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({ color: 0xb8ffd4, size: 0.045, transparent: true, opacity: 0.72 })
      )
    );

    const nodes = new THREE.Group();
    scene.add(nodes);
    const bySymbol = new Map();

    function labelTexture(text, hot) {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 96;
      const g = c.getContext("2d");
      g.clearRect(0, 0, 256, 96);
      g.font = "700 44px 'Space Grotesk', 'Segoe UI', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = hot ? "#b8ffd4" : "#f3fff8";
      g.fillText(text, 128, 52);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    function sync(list) {
      const seen = new Set();
      const maxOi = Math.max(1, ...list.map((m) => m.oi || 0));
      list.forEach((m, i) => {
        seen.add(m.symbol);
        let rec = bySymbol.get(m.symbol);
        if (!rec) {
          const g = new THREE.Group();
          const mat = new THREE.MeshStandardMaterial({
            color: 0x10261a,
            emissive: 0x2ee27a,
            emissiveIntensity: 1.1,
            metalness: 0.45,
            roughness: 0.22,
          });
          const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), mat);
          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.014, 8, 40),
            new THREE.MeshBasicMaterial({ color: 0x6dffb4, transparent: true, opacity: 0.55 })
          );
          halo.rotation.x = Math.PI / 2;
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: labelTexture(m.symbol.split("-")[0], false), transparent: true })
          );
          sprite.position.y = 0.78;
          sprite.scale.set(1.7, 0.64, 1);
          g.add(body, halo, sprite);
          g.userData.pick = { kind: "market", symbol: m.symbol };
          body.userData.pick = g.userData.pick;
          halo.userData.pick = g.userData.pick;
          nodes.add(g);
          rec = { g, body, halo, sprite, mat, label: "" };
          bySymbol.set(m.symbol, rec);
        }
        rec.market = m;
        rec.index = i;
        rec.total = list.length;
        rec.scale = 0.72 + 0.75 * Math.sqrt((m.oi || 0) / maxOi);
      });
      for (const [sym, rec] of bySymbol) {
        if (!seen.has(sym)) {
          nodes.remove(rec.g);
          bySymbol.delete(sym);
        }
      }
    }

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovering = false;

    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects([core, nodes], true);
      let obj = hits[0]?.object;
      while (obj && !obj.userData.pick) obj = obj.parent;
      return obj?.userData.pick || null;
    };

    const onMove = (e) => {
      const hit = pick(e);
      hovering = !!hit;
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      const r = renderer.domElement.getBoundingClientRect();
      tiltTarget.x = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
      tiltTarget.y = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    };
    const onDown = (e) => {
      const hit = pick(e);
      if (hit?.kind === "market") props.current.onSelect?.(hit.symbol);
    };
    const onLeave = () => {
      tiltTarget.x = 0;
      tiltTarget.y = 0;
    };
    const tilt = { x: 0, y: 0 };
    const tiltTarget = { x: 0, y: 0 };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    function fit() {
      const w = Math.max(2, host.clientWidth);
      const h = Math.max(2, host.clientHeight);
      if (w === camera.userData.w && h === camera.userData.h) return;
      camera.userData.w = w;
      camera.userData.h = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastSync = "";

    const loop = () => {
      const t = clock.getElapsedTime();
      const p = props.current;

      const key = p.markets.map((m) => m.symbol).join("|");
      if (key !== lastSync) {
        lastSync = key;
        sync(p.markets);
      } else if (p.markets.length) {
        const maxOi = Math.max(1, ...p.markets.map((m) => m.oi || 0));
        for (const m of p.markets) {
          const rec = bySymbol.get(m.symbol);
          if (!rec) continue;
          rec.market = m;
          rec.scale = 0.72 + 0.75 * Math.sqrt((m.oi || 0) / maxOi);
        }
      }

      tilt.x += (tiltTarget.x - tilt.x) * 0.06;
      tilt.y += (tiltTarget.y - tilt.y) * 0.06;
      scene.rotation.x = tilt.x;
      scene.rotation.y = tilt.y;

      const spin = reduced ? 0 : t;
      core.rotation.y = spin * 0.18;
      shell.rotation.x = spin * 0.1;
      nucleus.scale.setScalar(1 + Math.sin(t * 1.7) * 0.045);
      coreLight.intensity = 11 + Math.sin(t * 2.3) * 3;

      for (const rec of bySymbol.values()) {
        const { index = 0, total = 1, market } = rec;
        const radius = 3.9 + (index % 3) * 0.55;
        const speed = 0.1 + Math.min(0.22, (market?.volume || 0) / 4e9);
        const angle = (index / total) * Math.PI * 2 + spin * speed;
        const y = Math.sin(spin * 0.5 + index) * 0.42;
        rec.g.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        rec.g.rotation.y = spin * 0.6 + index;
        const hot = p.selected === market?.symbol;
        const target = rec.scale * (hot ? 1.45 : 1);
        rec.g.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
        const up = (market?.change || 0) >= 0;
        rec.mat.emissive.setHex(hot ? 0xb8ffd4 : up ? 0x2ee27a : 0xff5a6a);
        rec.mat.emissiveIntensity = hot ? 2.4 : 1.25;
        rec.halo.material.opacity = hot ? 1 : 0.42;
        rec.halo.scale.setScalar(1 + Math.sin(t * 2 + index) * 0.07);
        const label = `${market?.symbol.split("-")[0]}|${hot}`;
        if (label !== rec.label) {
          rec.sprite.material.map?.dispose();
          rec.sprite.material.map = labelTexture(market.symbol.split("-")[0], hot);
          rec.sprite.material.needsUpdate = true;
          rec.label = label;
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="core3d" ref={hostRef} aria-hidden="true" />;
}
