import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import type { HeroDefinition } from "@mma/content";
import { instantiateHeroAsset } from "./HeroAssetLoader";

export function HeroShowcase({ hero }: { hero: HeroDefinition }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef(hero);
  const rotationRef = useRef({ y: 0, dragging: false, lastX: 0 });
  const [rendererStatus, setRendererStatus] = useState<"checking" | "loading" | "ready" | "unavailable" | "asset-error">("checking");

  useEffect(() => { heroRef.current = hero; }, [hero]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (window.location.pathname === "/game/visual-lab" && canvas.closest(".client-ambient")) return undefined;
    const showcaseCanvas = canvas;
    setRendererStatus("checking");
    showcaseCanvas.dataset.renderer = "checking";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      showcaseCanvas.dataset.renderer = "unavailable";
      setRendererStatus("unavailable");
      return undefined;
    }
    setRendererStatus("ready");
    showcaseCanvas.dataset.renderer = "three-webgl";
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      showcaseCanvas.dataset.renderer = "unavailable";
      setRendererStatus("unavailable");
    };
    const handleContextRestored = () => {
      showcaseCanvas.dataset.renderer = "three-webgl";
      setRendererStatus("ready");
    };
    showcaseCanvas.addEventListener("webglcontextlost", handleContextLost, false);
    showcaseCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);
    camera.position.set(0, 250, 440);
    camera.lookAt(0, 54, 0);
    const ambient = new THREE.HemisphereLight(0xb9cbff, 0x10172d, 2.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe6c5, 4.2);
    key.position.set(-180, 360, 240);
    scene.add(key);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(118, 132, 13, 64), new THREE.MeshStandardMaterial({ color: 0x111d3a, roughness: 0.7, metalness: 0.2 }));
    platform.position.y = 6;
    scene.add(platform);
    const platformRing = new THREE.Mesh(new THREE.TorusGeometry(112, 3, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf4d35e, transparent: true, opacity: 0.72 }));
    platformRing.rotation.x = Math.PI / 2;
    platformRing.position.y = 14;
    scene.add(platformRing);
    const chibiAnchor = new THREE.Group();
    chibiAnchor.scale.setScalar(1.34);
    chibiAnchor.position.y = 13;
    scene.add(chibiAnchor);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(34, 40), new THREE.MeshBasicMaterial({ color: 0x02040b, transparent: true, opacity: .48, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1;
    chibiAnchor.add(shadow);
    const selectionRing = new THREE.Mesh(new THREE.TorusGeometry(38, 2.4, 8, 48), new THREE.MeshBasicMaterial({ color: 0xf4d35e, transparent: true, opacity: .78 }));
    selectionRing.rotation.x = Math.PI / 2;
    chibiAnchor.add(selectionRing);
    let animationController: Awaited<ReturnType<typeof instantiateHeroAsset>>["controller"] | null = null;
    let assetMounted = false;
    setRendererStatus("loading");
    void instantiateHeroAsset(heroRef.current).then((asset) => {
      if (!assetMounted) return;
      chibiAnchor.add(asset.object);
      animationController = asset.controller;
      animationController.play({ clip: "idle", cueId: `showcase-${heroRef.current.id}`, oneShot: false, priority: 1 });
      showcaseCanvas.dataset.asset = heroRef.current.visualPackageId;
      setRendererStatus("ready");
    }).catch(() => {
      if (!assetMounted) return;
      showcaseCanvas.dataset.asset = "error";
      setRendererStatus("asset-error");
    });
    assetMounted = true;

    function resize() {
      const rect = showcaseCanvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(showcaseCanvas);
    resize();
    let frame = 0;
    const render = (time: number) => {
      if (!rotationRef.current.dragging) rotationRef.current.y += 0.0025;
      chibiAnchor.rotation.y = rotationRef.current.y;
      animationController?.update(1 / 60);
      selectionRing.rotation.z = time * 0.0008;
      platformRing.rotation.z = time * 0.00025;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      showcaseCanvas.removeEventListener("webglcontextlost", handleContextLost);
      showcaseCanvas.removeEventListener("webglcontextrestored", handleContextRestored);
      assetMounted = false;
      animationController?.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        if (renderable.geometry) renderable.geometry.dispose();
        const value = renderable.material;
        if (Array.isArray(value)) value.forEach((entry) => entry.dispose());
        else if (value) value.dispose();
      });
    };
  }, [hero.id]);

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    rotationRef.current.dragging = true;
    rotationRef.current.lastX = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!rotationRef.current.dragging) return;
    rotationRef.current.y += (event.clientX - rotationRef.current.lastX) * 0.012;
    rotationRef.current.lastX = event.clientX;
  }
  function handlePointerUp() { rotationRef.current.dragging = false; }

  return <div className="hero-showcase"><canvas ref={canvasRef} data-testid="hero-showcase" data-renderer="checking" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} aria-label={`${hero.name} 3D hero showcase`} />{rendererStatus === "unavailable" ? <div className="showcase-unavailable" role="status"><strong>3D showcase unavailable</strong><span>WebGL is not available in this browser.</span></div> : rendererStatus === "asset-error" ? <div className="showcase-unavailable" role="status"><strong>Hero asset unavailable</strong><span>The GLB package could not be loaded.</span></div> : <span className="showcase-hint">{rendererStatus === "loading" ? "LOADING RIGGED GLB…" : "DRAG TO ROTATE · 360°"}</span>}</div>;
}
