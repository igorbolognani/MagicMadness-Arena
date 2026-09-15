import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../..");
const heroRoot = resolve(root, "apps/web/public/assets/heroes");
const textureRoot = resolve(root, "apps/web/public/assets/textures/heroes");

const HEROES = [
  { id: "fire-ember", element: "fire", primary: [1, .21, .07, 1], secondary: [.24, .035, .045, 1], glow: [1, .67, .12, 1], build: "sharp" },
  { id: "water-tide", element: "water", primary: [.03, .48, .88, 1], secondary: [.02, .16, .34, 1], glow: [.37, .91, 1, 1], build: "fluid" },
  { id: "earth-bastion", element: "earth", primary: [.45, .31, .13, 1], secondary: [.16, .12, .07, 1], glow: [.97, .71, .24, 1], build: "broad" },
  { id: "air-gale", element: "air", primary: [.48, .31, .9, 1], secondary: [.12, .09, .29, 1], glow: [.84, .85, 1, 1], build: "light" },
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return output;
}

function createRuneTexture(hero) {
  const size = 128;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const rgb = hero.primary.slice(0, 3).map((value) => Math.round(value * 255));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const rune = Math.abs(x - 32) + Math.abs(y - 32) < 19 || Math.abs(x - y) < 3 || Math.abs(x + y - 63) < 3;
      const grain = ((x * 13 + y * 7 + x * y) % 17) / 100;
      const p = row + 1 + x * 4;
      raw[p] = Math.min(255, Math.round(rgb[0] * (.72 + grain) + (rune ? 42 : 0)));
      raw[p + 1] = Math.min(255, Math.round(rgb[1] * (.72 + grain) + (rune ? 42 : 0)));
      raw[p + 2] = Math.min(255, Math.round(rgb[2] * (.72 + grain) + (rune ? 42 : 0)));
      raw[p + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]);
}

function quaternion(axis, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

function buildHero(hero) {
  const json = {
    asset: { version: "2.0", generator: "MagicMadness original hero pipeline 2.0 — sculpted parametric surfaces" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [], meshes: [], skins: [], animations: [], accessors: [], bufferViews: [], buffers: [],
    images: [{ uri: `../../textures/heroes/${hero.id}-albedo.png`, name: `${hero.id}-albedo` }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    textures: [{ source: 0, sampler: 0 }],
    materials: [
      { name: "Elemental cloth", pbrMetallicRoughness: { baseColorFactor: [1,1,1,1], baseColorTexture: { index: 0 }, metallicFactor: .06, roughnessFactor: .68 } },
      { name: "Elemental armor", pbrMetallicRoughness: { baseColorFactor: hero.secondary, metallicFactor: .24, roughnessFactor: .5 } },
      { name: "Skin", pbrMetallicRoughness: { baseColorFactor: [1,.67,.48,1], metallicFactor: 0, roughnessFactor: .88 } },
      { name: "Elemental emissive", pbrMetallicRoughness: { baseColorFactor: hero.glow, metallicFactor: .08, roughnessFactor: .3 }, emissiveFactor: hero.glow.slice(0,3), emissiveStrength: 1.1 },
      { name: "Face", pbrMetallicRoughness: { baseColorFactor: [.025,.03,.08,1], metallicFactor: .05, roughnessFactor: .38 } },
    ],
    extensionsUsed: ["KHR_materials_emissive_strength"],
  };
  const chunks = [];
  let byteOffset = 0;
  function append(typed, target) {
    const source = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const padding = (4 - (byteOffset % 4)) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); byteOffset += padding; }
    const view = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset, byteLength: source.length, ...(target ? { target } : {}) });
    chunks.push(source); byteOffset += source.length;
    return view;
  }
  function accessor(typed, type, componentType, count, target, extra = {}) {
    const index = json.accessors.length;
    json.accessors.push({ bufferView: append(typed, target), componentType, count, type, ...extra });
    return index;
  }
  const groups = Array.from({ length: 5 }, () => ({ p: [], n: [], uv: [], j: [], w: [], i: [] }));
  function vertex(group, position, normal, uv, bone) {
    const index = group.p.length / 3;
    group.p.push(...position); group.n.push(...normal); group.uv.push(...uv);
    const blend = bone === 7 ? Math.max(0, Math.min(.7, (position[1] - 44) / 30)) : 0;
    group.j.push(bone,1,0,0); group.w.push(1-blend,blend,0,0);
    return index;
  }
  function box(center, size, bone, material) {
    const g = groups[material];
    const [cx,cy,cz] = center, [sx,sy,sz] = size.map(v => v / 2);
    const faces = [
      [[1,0,0], [[sx,-sy,-sz],[sx,sy,-sz],[sx,sy,sz],[sx,-sy,sz]]],
      [[-1,0,0], [[-sx,-sy,sz],[-sx,sy,sz],[-sx,sy,-sz],[-sx,-sy,-sz]]],
      [[0,1,0], [[-sx,sy,-sz],[-sx,sy,sz],[sx,sy,sz],[sx,sy,-sz]]],
      [[0,-1,0], [[-sx,-sy,sz],[-sx,-sy,-sz],[sx,-sy,-sz],[sx,-sy,sz]]],
      [[0,0,1], [[-sx,-sy,sz],[sx,-sy,sz],[sx,sy,sz],[-sx,sy,sz]]],
      [[0,0,-1], [[sx,-sy,-sz],[-sx,-sy,-sz],[-sx,sy,-sz],[sx,sy,-sz]]],
    ];
    for (const [normal, corners] of faces) {
      const base = g.p.length / 3;
      corners.forEach((p, k) => vertex(g, [cx+p[0],cy+p[1],cz+p[2]], normal, [[0,0],[1,0],[1,1],[0,1]][k], bone));
      g.i.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
  function ellipsoid(center, radius, bone, material, segments = 16, rings = 12) {
    const g = groups[material];
    const base = g.p.length / 3;
    for (let y = 0; y <= rings; y += 1) {
      const v = y / rings, phi = v * Math.PI;
      for (let x = 0; x <= segments; x += 1) {
        const u = x / segments, theta = u * Math.PI * 2;
        const normal = [Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)];
        vertex(g, [center[0]+normal[0]*radius[0], center[1]+normal[1]*radius[1], center[2]+normal[2]*radius[2]], normal.map((n,i)=>n/radius[i]).map((n,_,all)=>n/Math.hypot(...all)), [u,1-v], bone);
      }
    }
    for (let y = 0; y < rings; y += 1) for (let x = 0; x < segments; x += 1) {
      const a = base + y*(segments+1)+x, b=a+segments+1;
      g.i.push(a,a+1,b,b,a+1,b+1);
    }
  }
  function cone(center, radius, height, bone, material, sides = 8) {
    const g = groups[material];
    const apex = vertex(g, [center[0],center[1]+height/2,center[2]], [0,1,0], [.5,1], bone);
    const baseCenter = vertex(g, [center[0],center[1]-height/2,center[2]], [0,-1,0], [.5,.5], bone);
    for (let side = 0; side < sides; side += 1) {
      const a = side/sides*Math.PI*2, b=(side+1)/sides*Math.PI*2;
      const v1 = vertex(g,[center[0]+Math.cos(a)*radius,center[1]-height/2,center[2]+Math.sin(a)*radius],[Math.cos(a),radius/height,Math.sin(a)],[side/sides,0],bone);
      const v2 = vertex(g,[center[0]+Math.cos(b)*radius,center[1]-height/2,center[2]+Math.sin(b)*radius],[Math.cos(b),radius/height,Math.sin(b)],[(side+1)/sides,0],bone);
      g.i.push(apex,v1,v2,baseCenter,v2,v1);
    }
  }

  // Continuous lofts and curved tapered strands, not block assemblies. The
  // same exported skinned surfaces are used by the lobby and the arena.
  function smoothPath(points, subdivisions=4) {
    const result=[];
    for(let i=0;i<points.length-1;i++) for(let step=0;step<subdivisions;step++) {
      const t=step/subdivisions,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
      result.push(b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t)));
    }
    result.push(points[points.length-1]);return result;
  }
  function loft(sections, bone, material, sides = 20) {
    sections = smoothPath(sections, 3);
    const g = groups[material], base = g.p.length / 3;
    sections.forEach(([cx,y,cz,rx,rz], row) => {
      for (let i=0;i<=sides;i++) {
        const a=i/sides*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
        const before=sections[Math.max(0,row-1)], after=sections[Math.min(sections.length-1,row+1)];
        const dy=Math.max(.1,after[1]-before[1]);
        const slope=((after[3]-before[3])*ca*ca+(after[4]-before[4])*sa*sa)/dy;
        const n=[ca,-slope,sa], length=Math.hypot(...n);
        vertex(g,[cx+ca*rx,y,cz+sa*rz],n.map(v=>v/length),[i/sides,row/(sections.length-1)],bone);
      }
    });
    for(let row=0;row<sections.length-1;row++) for(let i=0;i<sides;i++) {
      const a=base+row*(sides+1)+i,b=a+sides+1; g.i.push(a,b,a+1,b,b+1,a+1);
    }
  }
  function strand(points, bone, material, radius=4) {
    points = smoothPath(points);
    const g=groups[material],base=g.p.length/3,sides=10;
    points.forEach((p,row)=>{
      const prev=points[Math.max(0,row-1)],next=points[Math.min(points.length-1,row+1)];
      let tangent=next.map((v,i)=>v-prev[i]); const len=Math.hypot(...tangent)||1;tangent=tangent.map(v=>v/len);
      let u=[tangent[1],-tangent[0],0]; if(Math.hypot(...u)<.01) u=[1,0,0]; const ul=Math.hypot(...u);u=u.map(v=>v/ul);
      const v=[tangent[1]*u[2]-tangent[2]*u[1],tangent[2]*u[0]-tangent[0]*u[2],tangent[0]*u[1]-tangent[1]*u[0]];
      const r=radius*Math.pow(1-row/points.length,.65);
      for(let i=0;i<=sides;i++) {const a=i/sides*Math.PI*2,n=u.map((x,k)=>x*Math.cos(a)+v[k]*Math.sin(a));vertex(g,p.map((x,k)=>x+n[k]*r),n,[i/sides,row/points.length],bone);}
    });
    for(let row=0;row<points.length-1;row++) for(let i=0;i<sides;i++){const a=base+row*(sides+1)+i,b=a+sides+1;g.i.push(a,a+1,b,b,a+1,b+1);}
  }
  const broad=hero.build==="broad",light=hero.build==="light";
  // A tailored robe, broad shoulders and rounded boots under a large expressive face.
  loft([[0,20,0,24,17],[0,25,0,25,18],[0,38,0,18,13],[0,50,0,broad?25:19,14],[0,59,0,18,12],[0,64,0,10,8]],1,0);
  ellipsoid([0,76,1],[broad?25:22,23,broad?22:20],2,2);
  ellipsoid([-23,48,0],[broad?14:9,18,11],3,0);ellipsoid([23,48,0],[broad?14:9,9+9,11],4,0);
  ellipsoid([-24,34,4],[broad?10:7,8,7],3,2);ellipsoid([24,34,4],[broad?10:7,8,7],4,2);
  ellipsoid([-10,12,4],[broad?11:9,12,13],5,1);ellipsoid([10,12,4],[broad?11:9,12,13],6,1);
  // Whites, dark pupils, brows and a subtle nose give a face at portrait distance.
  for(const x of [-8,8]) {ellipsoid([x,78,19.7],[5,6,2.2],2,3);ellipsoid([x,77.5,21.7],[2.8,4,1.2],2,4);ellipsoid([x-.7,79,22.5],[.9,1.3,.6],2,2);strand([[x-5,85,19],[x,87,21],[x+5,85,19]],2,1,1.8);}
  ellipsoid([0,72,22],[2.4,2.4,2.3],2,2);strand([[-3,67,20],[0,66,21],[3,67,20]],2,4,.7);
  // Curved collar, belt and layered embroidered hem.
  loft([[0,58,0,20,15],[0,61,0,19,14],[0,64,0,10,9]],1,1);
  loft([[0,35,0,20,14.5],[0,39,0,19,14]],1,1);
  loft([[0,20,0,24.7,17.8],[0,23,0,25.7,18.7],[0,25,0,25,18]],1,3);
  ellipsoid([0,38,15],[4,5,2],1,3);
  // Cape fans from a narrow shoulder anchor and is blended into the spine.
  loft([[0,20,-19,23,3],[0,30,-20,21,4],[0,44,-17,18,4],[0,57,-11,14,3],[0,61,-8,8,2]],7,1);
  strand([[29,24,6],[30,49,5],[29,71,4],[32,83,5]],4,1,3);
  ellipsoid([32,83,5],[8,10,8],4,3);
  if(hero.element==="fire") {
    // Swept flame locks surround a readable face; crescent horns frame the crown.
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;strand([[Math.cos(a)*17,88,Math.sin(a)*14],[Math.cos(a)*20,100,Math.sin(a)*16-3],[Math.cos(a)*12,112,Math.sin(a)*10-9],[0,120,-12]],2,i%2?0:1,7);}
    for(const sign of [-1,1]) strand([[sign*18,88,0],[sign*27,98,-2],[sign*27,111,-4],[sign*20,118,-3]],2,3,5);
    ellipsoid([0,49,15],[8,10,3],1,3);
  } else if(hero.element==="water") {
    // Wave-combed hair, shell-like shoulder fins and a flowing double mantle.
    for(let i=0;i<7;i++){const x=(i-3)*5;strand([[x,91,9],[x+6,104,2],[x+13,101,-10],[x+8,78,-20]],2,0,7);}
    for(const sign of [-1,1]) {strand([[sign*15,55,-10],[sign*29,62,-12],[sign*36,46,-15],[sign*27,30,-23]],sign<0?3:4,3,6);strand([[sign*8,57,-15],[sign*21,42,-25],[sign*26,24,-27],[sign*36,18,-20]],7,0,7);}
    for(let i=0;i<5;i++) strand([[32,78,5],[26+i*3,91,5],[28+i*2,96,4]],4,3,2);
  } else if(hero.element==="earth") {
    // Rounded stone helmet around an open face, riveted pauldrons and convex shield.
    loft([[0,80,-2,25,22],[0,91,-2,26,21],[0,99,-2,20,16],[0,103,-2,5,5]],2,1);
    for(const sign of [-1,1]) {ellipsoid([sign*27,55,0],[16,12,17],sign<0?3:4,1);ellipsoid([sign*24,39,3],[11,10,10],sign<0?3:4,1);ellipsoid([sign*27,60,14],[4,4,2],sign<0?3:4,3);}
    ellipsoid([-36,43,8],[8,25,22],3,1);ellipsoid([-36,44,25],[7,21,5],3,3);ellipsoid([-36,44,29],[5,8,3],3,1);
    strand([[0,98,18],[0,105,0],[0,99,-22]],2,3,4);
  } else {
    // Swept hair, a floating circlet and individual curved feather ribbons.
    for(let i=0;i<6;i++){const x=(i-2.5)*6;strand([[x,88,13],[x-4,99,6],[x-13,102,-4],[x-21,93,-9]],2,0,6);}
    for(const sign of [-1,1]) for(let i=0;i<4;i++) strand([[sign*10,54,-14],[sign*(25+i*4),66-i*4,-21],[sign*(42+i*3),79-i*9,-26],[sign*(48+i*3),92-i*11,-23]],7,i%2?0:3,4);
    const halo=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;halo.push([Math.cos(a)*23,110,Math.sin(a)*19]);}strand(halo,2,3,2.8);
  }

  const primitives = groups.map((g, materialIndex) => {
    if (!g.i.length) return null;
    const min = [Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
    for (let i=0;i<g.p.length;i+=3) for (let d=0;d<3;d+=1) { min[d]=Math.min(min[d],g.p[i+d]); max[d]=Math.max(max[d],g.p[i+d]); }
    return { attributes: {
      POSITION: accessor(new Float32Array(g.p),"VEC3",5126,g.p.length/3,34962,{min,max}),
      NORMAL: accessor(new Float32Array(g.n),"VEC3",5126,g.n.length/3,34962),
      TEXCOORD_0: accessor(new Float32Array(g.uv),"VEC2",5126,g.uv.length/2,34962),
      JOINTS_0: accessor(new Uint16Array(g.j),"VEC4",5123,g.j.length/4,34962),
      WEIGHTS_0: accessor(new Float32Array(g.w),"VEC4",5126,g.w.length/4,34962),
    }, indices: accessor(new Uint16Array(g.i),"SCALAR",5123,g.i.length,34963), material: materialIndex };
  }).filter(Boolean);
  json.meshes.push({ name: `${hero.id}-skinned-mesh`, primitives });

  const boneNames = ["Hips","Spine","Head","Arm.L","Arm.R","Leg.L","Leg.R","Back"];
  const local = [[0,25,0],[0,18,0],[0,30,0],[-22,14,0],[22,14,0],[-10,-20,0],[10,-20,0],[0,12,-10]];
  const global = [[0,25,0],[0,43,0],[0,73,0],[-22,57,0],[22,57,0],[-10,5,0],[10,5,0],[0,55,-10]];
  json.nodes.push({ name: `${hero.id}-model`, children: [1,2] });
  json.nodes.push({ name: `${hero.id}-body`, mesh: 0, skin: 0 });
  boneNames.forEach((name,index) => json.nodes.push({ name, translation: local[index], children: index===0?[3,7,8]:index===1?[4,5,6,9]:undefined }));
  const inverse = [];
  global.forEach(([x,y,z]) => inverse.push(1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1));
  json.skins.push({ name: `${hero.id}-rig`, inverseBindMatrices: accessor(new Float32Array(inverse),"MAT4",5126,8), skeleton: 2, joints: [2,3,4,5,6,7,8,9] });

  const baseTranslation = Object.fromEntries(boneNames.map((name,index)=>[name,local[index]]));
  function clip(name, duration, tracks, loop = true) {
    const animation = { name, samplers: [], channels: [], extras: { loop } };
    for (const track of tracks) {
      const times = track.times ?? [0,duration/2,duration];
      const input = accessor(new Float32Array(times),"SCALAR",5126,times.length,undefined,{min:[0],max:[duration]});
      const values = track.values;
      const output = accessor(new Float32Array(values),track.path==="rotation"?"VEC4":"VEC3",5126,values.length/(track.path==="rotation"?4:3));
      const sampler = animation.samplers.length;
      animation.samplers.push({ input, output, interpolation: "LINEAR" });
      animation.channels.push({ sampler, target: { node: 2+boneNames.indexOf(track.bone), path: track.path } });
    }
    json.animations.push(animation);
  }
  const qx = a => quaternion([1,0,0],a), qz = a => quaternion([0,0,1],a);
  const rot = (bone, a,b,c, axis="x") => ({ bone,path:"rotation",values:[...(axis==="z"?qz(a):qx(a)),...(axis==="z"?qz(b):qx(b)),...(axis==="z"?qz(c):qx(c))] });
  const move = (bone, offsets, duration) => ({ bone,path:"translation",times:[0,duration/2,duration],values:offsets.flatMap(o=>baseTranslation[bone].map((v,i)=>v+o[i])) });
  clip("idle",2.4,[rot("Spine",-.03,.04,-.03),rot("Arm.L",.08,-.08,.08),rot("Arm.R",-.08,.08,-.08)]);
  clip("movement",.72,[rot("Leg.L",-.55,.55,-.55),rot("Leg.R",.55,-.55,.55),rot("Arm.L",.42,-.42,.42),rot("Arm.R",-.42,.42,-.42)]);
  clip("cast_anticipation",.48,[rot("Spine",0,-.2,-.28),rot("Arm.R",0,-.85,-1.2),rot("Arm.L",0,.35,.55)],false);
  clip("cast_release",.34,[rot("Spine",-.28,.18,0),rot("Arm.R",-1.2,.75,.05),rot("Arm.L",.55,-.2,0)],false);
  clip("hit_reaction",.32,[rot("Spine",0,.36,0,"z"),rot("Head",0,-.25,0,"z")],false);
  clip("knockback",.56,[rot("Spine",0,-.48,-.25),rot("Arm.L",0,.72,.35),rot("Arm.R",0,.72,.35)],false);
  clip("rising",.38,[move("Hips",[[0,0,0],[0,12,0],[0,24,0]],.38),rot("Spine",0,-.16,-.24)],false);
  clip("airborne",.82,[rot("Leg.L",-.15,.35,-.15),rot("Leg.R",.35,-.15,.35),rot("Arm.L",.4,.7,.4),rot("Arm.R",.4,.7,.4)]);
  clip("falling",.42,[move("Hips",[[0,24,0],[0,12,0],[0,0,0]],.42),rot("Spine",-.2,.1,.2)],false);
  clip("landing",.3,[move("Hips",[[0,0,0],[0,-8,0],[0,0,0]],.3),rot("Spine",.2,.42,0)],false);
  clip("death",1.05,[rot("Spine",0,1.15,1.48,"z"),rot("Head",0,.38,.55,"z"),move("Hips",[[0,0,0],[0,-12,0],[0,-22,0]],1.05)],false);
  clip("respawn",.9,[move("Hips",[[0,-28,0],[0,8,0],[0,0,0]],.9),rot("Spine",.4,-.15,0)],false);
  clip("victory",1.4,[rot("Arm.L",0,-1.55,0,"z"),rot("Arm.R",0,1.55,0,"z"),move("Hips",[[0,0,0],[0,8,0],[0,0,0]],1.4)]);

  const bin = Buffer.concat(chunks);
  json.buffers.push({ byteLength: bin.length });
  const jsonData = Buffer.from(JSON.stringify(json));
  const jsonPad = (4-jsonData.length%4)%4, binPad=(4-bin.length%4)%4;
  const jsonChunk = Buffer.concat([jsonData,Buffer.alloc(jsonPad,0x20)]), binChunk=Buffer.concat([bin,Buffer.alloc(binPad)]);
  const glb = Buffer.alloc(12+8+jsonChunk.length+8+binChunk.length);
  glb.writeUInt32LE(0x46546c67,0); glb.writeUInt32LE(2,4); glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(jsonChunk.length,12); glb.writeUInt32LE(0x4e4f534a,16); jsonChunk.copy(glb,20);
  const offset=20+jsonChunk.length; glb.writeUInt32LE(binChunk.length,offset); glb.writeUInt32LE(0x004e4942,offset+4); binChunk.copy(glb,offset+8);
  return glb;
}

mkdirSync(heroRoot,{recursive:true}); mkdirSync(textureRoot,{recursive:true});
const metrics=[];
for (const hero of HEROES) {
  const texture=createRuneTexture(hero); const glb=buildHero(hero);
  const heroDir=resolve(heroRoot,hero.id); mkdirSync(heroDir,{recursive:true});
  writeFileSync(resolve(heroDir,`${hero.id}.glb`),glb);
  writeFileSync(resolve(textureRoot,`${hero.id}-albedo.png`),texture);
  metrics.push({hero:hero.id,glbBytes:glb.length,textureBytes:texture.length});
}
const report={generatedAt:new Date().toISOString(),generator:"tools/asset-pipeline/generate-heroes.mjs",blenderAvailable:false,assets:metrics};
mkdirSync(resolve(root,"docs/performance"),{recursive:true});
writeFileSync(resolve(root,"docs/performance/hero-asset-budget.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
