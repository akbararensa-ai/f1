import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHEEL_R = 0.36;
export const FW = [1.75, 0.82];
export const RW = [-1.6, 0.8];
const DS2 = THREE.DoubleSide;

function loft(sec: Array<[number, number, number, number]>, seg = 20, pw = 2.8) {
  const pos: number[] = [];
  const ind: number[] = [];
  for (const [z, hw, yb, yt] of sec) {
    const yc = (yb + yt) / 2;
    const hh = (yt - yb) / 2;
    for (let j = 0; j < seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      pos.push(hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / pw), yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / pw), z);
    }
  }
  for (let r = 0; r < sec.length - 1; r++) {
    for (let j = 0; j < seg; j++) {
      const a = r * seg + j;
      const b = r * seg + ((j + 1) % seg);
      ind.push(a, b, a + seg, b, b + seg, a + seg);
    }
  }
  for (const [r, flip] of [[0, true], [sec.length - 1, false]] as [number, boolean][]) {
    const ci = pos.length / 3;
    const [z, , yb, yt] = sec[r];
    pos.push(0, (yb + yt) / 2, z);
    for (let j = 0; j < seg; j++) {
      const a = r * seg + j;
      const b = r * seg + ((j + 1) % seg);
      if (flip) ind.push(ci, b, a);
      else ind.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(ind);
  g.computeVertexNormals();
  return g;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  return g.translate(x, y, z);
};

function rod(a: [number, number, number], b: [number, number, number], r = 0.022) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const l = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, l, 6).translate(0, l / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize()));
  return g.translate(va.x, va.y, va.z);
}

const prep = (geo: THREE.BufferGeometry) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position') g.deleteAttribute(k);
  }
  g.computeVertexNormals();
  return g;
};

const merge = (list: THREE.BufferGeometry[]) => mergeGeometries(list.map(prep))!;

export const CAR_GEOMETRIES = {
  paint: merge([
    loft([
      [2.95, 0.05, 0.22, 0.3], [2.6, 0.12, 0.18, 0.38], [1.8, 0.22, 0.14, 0.5],
      [1.0, 0.35, 0.12, 0.62], [0.4, 0.42, 0.12, 0.66], [-0.1, 0.42, 0.12, 0.72],
      [-0.4, 0.3, 0.12, 0.98], [-0.9, 0.3, 0.12, 0.88], [-1.6, 0.24, 0.12, 0.66],
      [-2.2, 0.14, 0.14, 0.48], [-2.45, 0.04, 0.2, 0.36]
    ]),
    loft([
      [0.55, 0.45, 0.12, 0.3], [0.35, 0.84, 0.12, 0.52], [-0.3, 0.84, 0.12, 0.55],
      [-1.2, 0.56, 0.12, 0.45], [-1.9, 0.25, 0.14, 0.35]
    ]),
    box(0.02, 0.3, 1.1, 0, 0.9, -1.15), // Shark fin
    box(0.035, 0.52, 0.62, 0.52, 0.8, -2.2), box(0.035, 0.52, 0.62, -0.52, 0.8, -2.2) // Endplates
  ]),
  accent: merge([
    box(0.03, 0.24, 0.6, 0.96, 0.18, 2.6), box(0.03, 0.24, 0.6, -0.96, 0.18, 2.6),
    box(1.72, 0.025, 0.24, 0, 0.2, 2.5, -0.35),
    new THREE.SphereGeometry(0.15, 16, 12).translate(0, 0.78, 0.18), // Driver helmet
    loft([[0.32, 0.24, 0.3, 0.52], [0.0, 0.84, 0.46, 0.54], [-0.6, 0.8, 0.48, 0.55], [-1.2, 0.5, 0.42, 0.47]], 16)
  ]),
  carbon: merge([
    box(1.5, 0.04, 3.9, 0, 0.08, 0.1), // Floor
    box(1.1, 0.22, 0.35, 0, 0.18, -2.2), // Diffuser
    box(1.92, 0.03, 0.44, 0, 0.1, 2.64), // Front wing mainplane
    box(1.04, 0.035, 0.34, 0, 0.9, -2.26), box(0.92, 0.03, 0.2, 0, 0.46, -2.32), box(0.05, 0.48, 0.12, 0, 0.66, -2.15),
    box(0.48, 0.03, 0.78, 0, 0.665, 0.3), // Cockpit opening
    // HALO safety titanium arch
    new THREE.TorusGeometry(0.36, 0.03, 8, 22, Math.PI).rotateX(Math.PI / 2).translate(0, 0.92, 0.16),
    rod([0.36, 0.92, 0.16], [0.36, 0.66, 0.05], 0.03),
    rod([-0.36, 0.92, 0.16], [-0.36, 0.66, 0.05], 0.03),
    rod([0, 0.92, 0.52], [0, 0.6, 0.98], 0.03), // Central halo pillar
    // Mirrors
    box(0.16, 0.07, 0.04, 0.58, 0.74, 0.55), box(0.16, 0.07, 0.04, -0.58, 0.74, 0.55),
    rod([0.3, 0.6, 0.55], [0.54, 0.73, 0.55], 0.012), rod([-0.3, 0.6, 0.55], [-0.54, 0.73, 0.55], 0.012),
    // Suspension wishbones
    ...([FW, RW] as [number, number][]).flatMap(([z, x]) => [1, -1].flatMap(sg => [
      rod([sg * 0.25, 0.46, z + 0.18], [sg * (x - 0.12), 0.44, z]),
      rod([sg * 0.25, 0.46, z - 0.18], [sg * (x - 0.12), 0.44, z]),
      rod([sg * 0.22, 0.22, z + 0.15], [sg * (x - 0.12), 0.26, z]),
      rod([sg * 0.22, 0.22, z - 0.15], [sg * (x - 0.12), 0.26, z])
    ]))
  ]),
  flap: prep(box(1.04, 0.03, 0.24, 0, 0, -0.12)), // DRS movable flap
  light: new THREE.BoxGeometry(0.12, 0.08, 0.03).translate(0, 0.3, -2.47),
};

// Cockpit interior: detailed F1 rectangular steering wheel with grips, screen & dials
export function createCockpitSteeringWheel(): THREE.Group {
  const wheel = new THREE.Group();
  
  // Wheel base body (carbon fiber / Alcantara)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.6, metalness: 0.2 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.9 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
  const accentRed = new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.4 });
  const accentBlue = new THREE.MeshStandardMaterial({ color: 0x1e8fff, roughness: 0.4 });
  const accentYellow = new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.4 });

  // Main steering body plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.025), bodyMat);
  wheel.add(plate);

  // Ergonomic grips left & right
  const leftGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.19, 12), gripMat);
  leftGrip.position.set(-0.13, 0, 0.005);
  wheel.add(leftGrip);

  const rightGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.19, 12), gripMat);
  rightGrip.position.set(0.13, 0, 0.005);
  wheel.add(rightGrip);

  // Digital telemetry LCD screen on steering wheel
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.075), screenMat);
  screen.position.set(0, 0.015, 0.014);
  wheel.add(screen);

  // Rotary dials & buttons on wheel face
  const dialGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10).rotateX(Math.PI / 2);
  const btnGeo = new THREE.BoxGeometry(0.014, 0.014, 0.008);

  const d1 = new THREE.Mesh(dialGeo, accentYellow);
  d1.position.set(-0.04, -0.05, 0.014);
  const d2 = new THREE.Mesh(dialGeo, accentBlue);
  d2.position.set(0.04, -0.05, 0.014);
  wheel.add(d1, d2);

  // Buttons (DRS / Radio / Neutral / Pit Limiter)
  const b1 = new THREE.Mesh(btnGeo, accentRed);
  b1.position.set(-0.09, 0.045, 0.014);
  const b2 = new THREE.Mesh(btnGeo, accentBlue);
  b2.position.set(0.09, 0.045, 0.014);
  wheel.add(b1, b2);

  // Shift LED bar top of wheel
  for (let i = 0; i < 9; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.006, 0.005),
      new THREE.MeshBasicMaterial({ color: i < 3 ? 0x00ff66 : i < 6 ? 0xff2222 : 0x3388ff })
    );
    led.position.set(-0.055 + i * 0.0135, 0.068, 0.014);
    wheel.add(led);
  }

  // Positioning inside car cockpit relative to driver eye (0, 0.78, 0.18)
  wheel.position.set(0, 0.69, 0.58);
  wheel.rotation.x = -0.22; // angled towards driver
  return wheel;
}


export function createWheelGeometry(w: number): THREE.BufferGeometry {
  const tire = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, w, 32, 1).rotateZ(Math.PI / 2);
  const rim: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.25, 0.25, w + 0.012, 24).rotateZ(Math.PI / 2)];
  for (const sg of [1, -1]) {
    for (let k = 0; k < 5; k++) {
      rim.push(new THREE.BoxGeometry(0.02, 0.44, 0.045).rotateX((k * Math.PI) / 5).translate(sg * (w / 2 + 0.012), 0, 0));
    }
  }
  const stripe = [1, -1].map(sg =>
    new THREE.TorusGeometry(WHEEL_R * 0.83, 0.016, 6, 32).rotateY(Math.PI / 2).translate(sg * (w / 2 + 0.004), 0, 0)
  );
  return mergeGeometries([prep(tire), mergeGeometries(rim.map(prep))!, mergeGeometries(stripe.map(prep))!], true)!;
}
