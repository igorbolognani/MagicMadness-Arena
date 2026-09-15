import { useEffect, useMemo, useRef, useState } from "react";
import { heroDefinitions, skillDefinitions, type HeroId } from "@mma/content";
import { getSkillVfxPackage } from "./skillVfxManifest";
import { preloadHeroAssets } from "./HeroAssetLoader";
import { getHeroAssetPackage, type HeroAnimationClip } from "./heroAssetManifest";
import { VisualLabScene, HERO_ANIMATION_CLIPS, type VisualLabAssetState, type VisualLabMetrics } from "./VisualLabScene";
import type { VfxQuality } from "./VfxPool";

type ChecklistKey = "asset" | "scale" | "ground" | "face" | "silhouette" | "animations" | "material" | "vfx" | "showcase" | "topDown";
const checklistLabels: Record<ChecklistKey, string> = {
  asset: "Asset loaded",
  scale: "Scale correct",
  ground: "Feet grounded",
  face: "Face readable",
  silhouette: "Silhouette readable",
  animations: "Animations valid",
  material: "Materials valid",
  vfx: "Skill VFX valid",
  showcase: "Showcase camera valid",
  topDown: "Top-down camera valid",
};

const emptyMetrics: VisualLabMetrics = {
  fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, geometries: 0, textures: 0, activeObjects: 0, particleCount: 0, cacheEntries: 0,
  pools: Object.fromEntries(["projectiles", "impacts", "particles", "rings", "trails", "fields", "walls", "previews"].map((name) => [name, { active: 0, idle: 0, created: 0, rejected: 0, capacity: 0, byKey: {} }])) as VisualLabMetrics["pools"],
};

export function VisualLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<VisualLabScene | null>(null);
  const [renderer, setRenderer] = useState<"checking" | "ready" | "unavailable">("checking");
  const [assetStates, setAssetStates] = useState<Record<string, VisualLabAssetState>>({});
  const [metrics, setMetrics] = useState<VisualLabMetrics>(emptyMetrics);
  const [hero, setHero] = useState<HeroId | "all">("all");
  const [clip, setClip] = useState<HeroAnimationClip>("idle");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState<VfxQuality>("high");
  const [background, setBackground] = useState<"dark" | "light" | "arena">("dark");
  const [camera, setCamera] = useState<"showcase" | "top-down">("showcase");
  const [wireframe, setWireframe] = useState(false);
  const [skeleton, setSkeleton] = useState(false);
  const [stress, setStress] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(skillDefinitions[0]?.id ?? "fire-ember-bolt");
  const [checklist, setChecklist] = useState<Record<string, Partial<Record<ChecklistKey, boolean>>>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const runtime = new VisualLabScene(
      canvas,
      (state) => setAssetStates((current) => ({ ...current, [state.heroId]: state })),
      setMetrics,
      setRenderer,
    );
    runtimeRef.current = runtime;
    heroDefinitions.forEach((entry) => {
      setAssetStates((current) => ({ ...current, [entry.id]: { heroId: entry.id, visualPackageId: entry.visualPackageId, state: "loading" } }));
      void preloadHeroAssets([entry.visualPackageId]).then(() => {
        setAssetStates((current) => ({ ...current, [entry.id]: { heroId: entry.id, visualPackageId: entry.visualPackageId, state: "ready" } }));
      }).catch((error) => {
        setAssetStates((current) => ({ ...current, [entry.id]: { heroId: entry.id, visualPackageId: entry.visualPackageId, state: "error", error: error instanceof Error ? error.message : "GLB preload failed" } }));
      });
    });
    void runtime.initialize();
    return () => { runtime.dispose(); runtimeRef.current = null; };
  }, []);

  useEffect(() => runtimeRef.current?.setHero(hero), [hero]);
  useEffect(() => runtimeRef.current?.playClip(clip), [clip]);
  useEffect(() => runtimeRef.current?.setPaused(paused), [paused]);
  useEffect(() => runtimeRef.current?.setPlaybackSpeed(speed), [speed]);
  useEffect(() => runtimeRef.current?.setQuality(quality), [quality]);
  useEffect(() => runtimeRef.current?.setBackground(background), [background]);
  useEffect(() => runtimeRef.current?.setCamera(camera), [camera]);
  useEffect(() => runtimeRef.current?.setWireframe(wireframe), [wireframe]);
  useEffect(() => runtimeRef.current?.setSkeletonVisible(skeleton), [skeleton]);
  useEffect(() => runtimeRef.current?.setStress(stress), [stress]);

  useEffect(() => {
    for (const state of Object.values(assetStates)) {
      if (state.state === "ready") setChecklist((current) => ({ ...current, [state.heroId]: { ...current[state.heroId], asset: true } }));
    }
  }, [assetStates]);

  const selectedPackage = useMemo(() => hero === "all" ? null : getHeroAssetPackage(heroDefinitions.find((entry) => entry.id === hero)?.visualPackageId ?? "hero-ember-chibi-glb-v3"), [hero]);
  const checklistHero = hero === "all" ? "fire-ember" : hero;

  function toggleChecklist(heroId: HeroId, key: ChecklistKey): void {
    setChecklist((current) => ({ ...current, [heroId]: { ...current[heroId], [key]: !current[heroId]?.[key] } }));
  }

  return (
    <main className="visual-lab" data-testid="visual-lab">
      <header className="visual-lab-header">
        <div><span className="mini-label">INTERNAL TOOL · AUTHENTICATED</span><h1>3D Visual Lab</h1></div>
        <div className={`visual-lab-renderer ${renderer}`}><span className="pulse-dot" />{renderer === "ready" ? "WEBGL ACTIVE" : renderer === "unavailable" ? "WEBGL UNAVAILABLE" : "CHECKING RENDERER"}</div>
      </header>
      <div className="visual-lab-layout">
        <aside className="visual-lab-controls">
          <section><h2>Inspection</h2><label>Hero<select value={hero} onChange={(event) => setHero(event.target.value as HeroId | "all")}><option value="all">All four</option>{heroDefinitions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>Animation<select value={clip} onChange={(event) => setClip(event.target.value as HeroAnimationClip)}>{HERO_ANIMATION_CLIPS.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select></label><div className="lab-inline"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => runtimeRef.current?.testCrossfade()}>Crossfade test</button></div><label>Animation speed <strong>{speed.toFixed(2)}×</strong><input type="range" min="0.1" max="2.5" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label></section>
          <section><h2>Presentation</h2><label>Camera<select value={camera} onChange={(event) => setCamera(event.target.value as "showcase" | "top-down")}><option value="showcase">Showcase</option><option value="top-down">Top-down</option></select></label><label>Background<select value={background} onChange={(event) => setBackground(event.target.value as typeof background)}><option value="dark">Dark</option><option value="light">Light</option><option value="arena">Arena</option></select></label><label>Quality<select value={quality} onChange={(event) => setQuality(event.target.value as VfxQuality)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="lab-check"><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} /> Wireframe</label><label className="lab-check"><input type="checkbox" checked={skeleton} onChange={(event) => setSkeleton(event.target.checked)} /> Skeleton / joints</label></section>
          <section><h2>Loaded packages</h2>{heroDefinitions.map((entry) => { const state = assetStates[entry.id]; return <div className={`lab-asset-row ${state?.state ?? "loading"}`} key={entry.id}><span>{entry.name}</span><small>{entry.visualPackageId}</small><strong>{state?.state ?? "loading"}</strong>{state?.error && <em>{state.error}</em>}</div>; })}{selectedPackage && <div className="lab-package-detail"><span>{selectedPackage.glb}</span><span>{selectedPackage.animations[clip]}</span></div>}</section>
        </aside>
        <section className="visual-lab-stage">
          <canvas ref={canvasRef} data-testid="visual-lab-canvas" aria-label="Interactive 3D visual inspection scene" />
          {renderer === "unavailable" && <div className="visual-lab-unavailable"><strong>WebGL is unavailable in this browser.</strong><span>Controls, manifests and functional checks remain visible; visual checks must stay unmarked until observed on a compatible device.</span></div>}
          <div className="visual-lab-hint">DRAG TO ROTATE · WHEEL TO ZOOM · CAMERA DOES NOT ALTER SIMULATION</div>
          <div className="visual-lab-skill-panel"><div className="lab-skill-heading"><span><strong>Skill VFX sequencer</strong><small>anticipation → delivery → impact → dissipation</small></span><div><button onClick={() => runtimeRef.current?.triggerSkill(selectedSkill)}>Fire selected</button><button onClick={() => runtimeRef.current?.triggerSkill(selectedSkill, 12)}>Pool burst ×12</button></div></div><div className="lab-skill-grid">{skillDefinitions.map((skill) => { const pack = getSkillVfxPackage(skill.id); return <button key={skill.id} className={selectedSkill === skill.id ? "active" : ""} onClick={() => { setSelectedSkill(skill.id); runtimeRef.current?.triggerSkill(skill.id); }}><strong>{pack.iconMark} {skill.name}</strong><small>{pack.preview} · {pack.motion}</small></button>; })}</div></div>
        </section>
        <aside className="visual-lab-diagnostics">
          <section className="lab-stress"><div><h2>Stress scene</h2><span>5 heroes · repeated skills · fields · walls · Wind Surge</span></div><button className={stress ? "active" : ""} onClick={() => setStress((value) => !value)}>{stress ? "Stop stress" : "Start stress"}</button></section>
          <section><h2>Live renderer metrics</h2><p className="lab-observation-note">Raw values only. They are not approved evidence until observed on a WebGL-capable device.</p><div className="lab-metric-grid"><span><small>FPS approx.</small><strong>{metrics.fps.toFixed(1)}</strong></span><span><small>Frame</small><strong>{metrics.frameMs.toFixed(1)} ms</strong></span><span><small>Draw calls</small><strong>{metrics.drawCalls}</strong></span><span><small>Triangles</small><strong>{metrics.triangles.toLocaleString()}</strong></span><span><small>Geometries</small><strong>{metrics.geometries}</strong></span><span><small>Textures</small><strong>{metrics.textures}</strong></span><span><small>Active objects</small><strong>{metrics.activeObjects}</strong></span><span><small>Particles</small><strong>{metrics.particleCount}</strong></span></div></section>
          <section><h2>Pool use / capacity</h2><div className="lab-pool-list">{Object.entries(metrics.pools).map(([name, stats]) => <div key={name}><span>{name}</span><strong>{stats.active} / {stats.capacity}</strong><small>idle {stats.idle} · created {stats.created} · rejected {stats.rejected}</small></div>)}</div></section>
          <section><h2>Visual checklist · {heroDefinitions.find((entry) => entry.id === checklistHero)?.name}</h2><p className="lab-observation-note">Only mark items personally observed. Asset loading is set automatically from the loader.</p><div className="lab-checklist">{(Object.keys(checklistLabels) as ChecklistKey[]).map((key) => <label key={key}><input type="checkbox" checked={Boolean(checklist[checklistHero]?.[key])} onChange={() => toggleChecklist(checklistHero, key)} />{checklistLabels[key]}</label>)}</div></section>
        </aside>
      </div>
    </main>
  );
}
