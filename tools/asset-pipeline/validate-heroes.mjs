import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const ids = ["fire-ember", "water-tide", "earth-bastion", "air-gale"];
const required = ["idle","movement","cast_anticipation","cast_release","hit_reaction","knockback","rising","airborne","falling","landing","death","respawn","victory"];
const results = [];

for (const id of ids) {
  const path = resolve(root, `apps/web/public/assets/heroes/${id}/${id}.glb`);
  const data = readFileSync(path);
  if (data.readUInt32LE(0) !== 0x46546c67 || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) throw new Error(`${id}: invalid GLB header`);
  const jsonLength = data.readUInt32LE(12);
  const jsonType = data.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error(`${id}: first GLB chunk is not JSON`);
  const json = JSON.parse(data.subarray(20, 20 + jsonLength).toString("utf8").trim());
  const binaryHeader = 20 + jsonLength;
  const binaryLength = data.readUInt32LE(binaryHeader);
  const binaryType = data.readUInt32LE(binaryHeader + 4);
  if (binaryType !== 0x004e4942 || binaryHeader + 8 + binaryLength > data.length) throw new Error(`${id}: invalid BIN chunk`);
  if (json.buffers?.length !== 1 || json.buffers[0].byteLength > binaryLength) throw new Error(`${id}: BIN buffer is truncated`);
  const animationNames = json.animations?.map((animation) => animation.name) ?? [];
  const missing = required.filter((name) => !animationNames.includes(name));
  if (missing.length) throw new Error(`${id}: missing clips ${missing.join(", ")}`);
  if (json.skins?.length !== 1 || json.skins[0].joints?.length !== 8) throw new Error(`${id}: expected one eight-joint skin`);
  const count = (key) => json[key]?.length ?? 0;
  const index = (value, key, label) => {
    if (!Number.isInteger(value) || value < 0 || value >= count(key)) throw new Error(`${id}: invalid ${label} ${value}`);
  };
  const invalidChild = json.nodes?.flatMap((node) => node.children ?? []).find((index) => index < 0 || index >= json.nodes.length);
  if (invalidChild !== undefined) throw new Error(`${id}: invalid node child index ${invalidChild}`);
  for (const view of json.bufferViews ?? []) {
    const start = view.byteOffset ?? 0;
    if (view.buffer !== 0 || start < 0 || start + view.byteLength > json.buffers[0].byteLength) throw new Error(`${id}: bufferView outside BIN bounds`);
  }
  for (const accessor of json.accessors ?? []) index(accessor.bufferView, "bufferViews", "accessor bufferView");
  for (const node of json.nodes ?? []) {
    if (node.mesh !== undefined) index(node.mesh, "meshes", "node mesh");
    if (node.skin !== undefined) index(node.skin, "skins", "node skin");
  }
  for (const skin of json.skins ?? []) {
    index(skin.inverseBindMatrices, "accessors", "inverse bind accessor");
    index(skin.skeleton, "nodes", "skin skeleton");
    for (const joint of skin.joints) index(joint, "nodes", "skin joint");
  }
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    if (primitive.material !== undefined) index(primitive.material, "materials", "primitive material");
    if (primitive.indices !== undefined) index(primitive.indices, "accessors", "primitive indices");
    for (const accessor of Object.values(primitive.attributes ?? {})) index(accessor, "accessors", "vertex accessor");
  }
  for (const animation of json.animations ?? []) {
    for (const sampler of animation.samplers ?? []) { index(sampler.input, "accessors", "animation input"); index(sampler.output, "accessors", "animation output"); }
    for (const channel of animation.channels ?? []) {
      if (!Number.isInteger(channel.sampler) || channel.sampler < 0 || channel.sampler >= (animation.samplers?.length ?? 0)) throw new Error(`${id}: invalid animation sampler ${channel.sampler}`);
      index(channel.target?.node, "nodes", "animation target node");
    }
  }
  for (const texture of json.textures ?? []) index(texture.source, "images", "texture source");
  for (const material of json.materials ?? []) {
    const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index;
    if (textureIndex !== undefined) index(textureIndex, "textures", "base color texture");
  }
  for (const image of json.images ?? []) {
    if (typeof image.uri !== "string" || image.uri.startsWith("data:") || image.uri.includes("://")) throw new Error(`${id}: texture URI must be a local relative asset`);
    const imagePath = resolve(dirname(path), image.uri);
    const imageData = readFileSync(imagePath);
    if (imageData.readUInt32BE(0) !== 0x89504e47) throw new Error(`${id}: referenced texture is not PNG`);
  }
  const texturePath = resolve(root, `apps/web/public/assets/textures/heroes/${id}-albedo.png`);
  const texture = readFileSync(texturePath);
  if (texture.readUInt32BE(0) !== 0x89504e47) throw new Error(`${id}: invalid PNG texture`);
  results.push({ id, glbBytes: statSync(path).size, textureBytes: statSync(texturePath).size, joints: 8, animations: animationNames.length });
}
console.log(JSON.stringify({ valid: true, results }, null, 2));
