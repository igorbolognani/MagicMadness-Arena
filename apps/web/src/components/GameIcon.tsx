import type { SVGProps } from "react";
import { skillVfxManifest } from "../game/skillVfxManifest";

type IconProps = SVGProps<SVGSVGElement> & { label?: string };

function Frame({ label, children, ...props }: IconProps) {
  return <svg viewBox="0 0 64 64" role={label ? "img" : undefined} aria-hidden={label ? undefined : true} aria-label={label} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
}

export function ElementIcon({ element, ...props }: IconProps & { element: string }) {
  if (element === "water") return <Frame {...props}><path d="M32 7C23 20 14 29 14 41a18 18 0 0 0 36 0C50 29 41 20 32 7Z" /><path d="M22 42c5 4 15 4 20-2" /></Frame>;
  if (element === "earth") return <Frame {...props}><path d="m32 6 23 15-9 30H18L9 21 32 6Z" /><path d="m19 38 10-14 7 9 7-7 7 12" /></Frame>;
  if (element === "air") return <Frame {...props}><path d="M8 24h31c8 0 8-12 0-12-4 0-7 2-8 5" /><path d="M7 34h42c10 0 10 15 0 15-5 0-8-3-9-7" /><path d="M13 44h17" /></Frame>;
  return <Frame {...props}><path d="M35 5c2 12-7 14-5 24 4-2 8-7 9-12 10 8 15 17 12 27-3 11-12 16-21 15-12-1-20-10-18-22 2-10 10-16 15-24 1 8 3 11 8 14" /><path d="M31 55c-7-3-9-10-5-16 2-3 5-5 7-9 1 5 5 8 6 13 1 6-3 10-8 12Z" /></Frame>;
}

export function SkillIcon({ behavior, element, skillId, ...props }: IconProps & { behavior: string; element: string; skillId?: string }) {
  const identity = skillId ? skillVfxManifest[skillId] : undefined;
  return <span className={`game-icon-stack element-${element}`}><ElementIcon element={element} {...props} />{behavior === "wall" ? <i className="skill-mark wall-mark" /> : behavior === "pull" ? <i className="skill-mark pull-mark" /> : behavior === "dash" ? <i className="skill-mark dash-mark" /> : behavior === "field" || behavior === "radial" ? <i className="skill-mark field-mark" /> : <i className="skill-mark projectile-mark" />}{identity && <b className="skill-identity-mark" aria-hidden="true">{identity.iconMark}</b>}</span>;
}
