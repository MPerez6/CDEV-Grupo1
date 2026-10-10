const fs = require('fs');
const path = require('path');

function inspectGlb(filename) {
  const fullPath = path.resolve(__dirname, filename);
  const buf = fs.readFileSync(fullPath);
  const chunk0Length = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
  const gltf = JSON.parse(jsonStr);
  console.log(`=== ${filename} ===`);
  console.log('Meshes:', gltf.meshes?.length);
  if (gltf.meshes) {
    gltf.meshes.forEach((m, i) => {
      console.log(`  Mesh ${i}: ${m.name}`);
    });
  }
  if (gltf.nodes) {
    console.log('Nodes:');
    gltf.nodes.forEach((n, i) => {
      console.log(`  Node ${i}: ${n.name}, scale: ${JSON.stringify(n.scale)}, translation: ${JSON.stringify(n.translation)}`);
    });
  }
  if (gltf.accessors && gltf.meshes) {
    gltf.meshes.forEach((m) => {
      m.primitives?.forEach((p) => {
        if (p.attributes && p.attributes.POSITION !== undefined) {
          const acc = gltf.accessors[p.attributes.POSITION];
          console.log(`  Position bounds min: ${JSON.stringify(acc.min)} max: ${JSON.stringify(acc.max)}`);
        }
      });
    });
  }
}

try {
  inspectGlb('public/models/meat_piece_raw.glb');
  inspectGlb('public/models/outdoor+barbecue+grill+3d+model.glb');
} catch (e) {
  console.error('Error inspecting:', e);
}
