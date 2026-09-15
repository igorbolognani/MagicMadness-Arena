import { rayAabbIntersection, type Aabb, type Vec2 } from "@mma/physics";

/** Visibility graph around expanded collision bounds, evaluated only on a new click/map change. */
export function findWalkPath(from: Vec2, target: Vec2, obstacles: Aabb[], radius = 28): Vec2[] {
  const boxes = obstacles.map(box => ({ min: { x: box.min.x-radius, y: box.min.y-radius }, max: { x: box.max.x+radius, y: box.max.y+radius } }));
  const inside = (p: Vec2) => boxes.some(b => p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y);
  if (inside(target)) return [];
  const clear = (a: Vec2, b: Vec2) => {
    const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy);
    return length < .1 || !boxes.some(box => { const hit=rayAabbIntersection(a,{x:dx/length,y:dy/length},length,box.min,box.max); return hit && hit.distance < length-.1; });
  };
  if (clear(from,target)) return [target];
  const nodes=[from,target,...boxes.flatMap(b => [{x:b.min.x-2,y:b.min.y-2},{x:b.max.x+2,y:b.min.y-2},{x:b.max.x+2,y:b.max.y+2},{x:b.min.x-2,y:b.max.y+2}]).filter(p=>!inside(p))];
  const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),seen=new Set<number>(); costs[0]=0;
  while(seen.size<nodes.length){
    let at=-1;for(let i=0;i<nodes.length;i++)if(!seen.has(i)&&(at===-1||costs[i]!<costs[at]!))at=i;
    if(at<0||!Number.isFinite(costs[at]))return [];
    if(at===1){const path:Vec2[]=[];for(let i=1;i!==0;i=prev[i]!)path.unshift(nodes[i]!);return path;}
    seen.add(at);
    for(let i=1;i<nodes.length;i++){if(seen.has(i)||!clear(nodes[at]!,nodes[i]!))continue;const cost=costs[at]!+Math.hypot(nodes[i]!.x-nodes[at]!.x,nodes[i]!.y-nodes[at]!.y);if(cost<costs[i]!){costs[i]=cost;prev[i]=at;}}
  }
  return [];
}
