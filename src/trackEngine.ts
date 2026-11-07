import * as THREE from 'three';
import { TrackDef } from './types.ts';

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface TrackData {
  def: TrackDef;
  curve: THREE.CatmullRomCurve3;
  L: number;
  N: number;
  DS: number;
  PX: Float64Array;
  PZ: Float64Array;
  TX: Float64Array;
  TZ: Float64Array;
  A: Float64Array;
  K: Float64Array;
  KS: Float64Array;
  BL: Float64Array;
  BR: Float64Array;
  RL: Float64Array;
  VP: Float64Array;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  HALF: number;
}

export function buildTrackData(def: TrackDef): TrackData {
  const HALF = 7.0; // half track width in meters
  const WB = 3.6;
  const GRIP0 = 16;
  const DF = 0.0045;
  const VTOP = 96;
  const brakeDecel = (v: number) => 24 + 0.004 * v * v;

  const curve = new THREE.CatmullRomCurve3(
    def.controlPoints.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'centripetal'
  );

  const L = curve.getLength();
  const N = Math.round(L / 2);
  const DS = L / N;
  const W = (i: number) => ((i % N) + N) % N;
  const sp = curve.getSpacedPoints(N);

  const F = () => new Float64Array(N);
  const PX = F(), PZ = F(), TX = F(), TZ = F(), A = F(), K = F();

  for (let i = 0; i < N; i++) {
    PX[i] = sp[i].x;
    PZ[i] = sp[i].z;
  }

  for (let i = 0; i < N; i++) {
    const dx = PX[W(i + 1)] - PX[W(i - 1)];
    const dz = PZ[W(i + 1)] - PZ[W(i - 1)];
    const l = Math.hypot(dx, dz);
    TX[i] = dx / l;
    TZ[i] = dz / l;
    A[i] = Math.atan2(TX[i], TZ[i]);
  }

  for (let i = 0; i < N; i++) {
    K[i] = wrapA(A[W(i + 1)] - A[W(i - 1)]) / (2 * DS);
  }

  function smooth(src: Float64Array, r: number) {
    const out = F();
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[W(i + k)];
      out[i] = s / (2 * r + 1);
    }
    return out;
  }

  const KS = smooth(K, 8);
  const BLr = F(), BRr = F();

  for (let i = 0; i < N; i++) {
    const r = 1 / Math.max(Math.abs(KS[i]), 1e-6);
    BLr[i] = KS[i] < 0 ? Math.min(22, Math.max(10, 0.75 * r)) : 20;
    BRr[i] = KS[i] > 0 ? Math.min(22, Math.max(10, 0.75 * r)) : 20;
  }

  const BL = smooth(BLr, 10);
  const BR = smooth(BRr, 10);

  const RL0 = F();
  for (let i = 0; i < N; i++) RL0[i] = -4.3 * clamp(KS[i] * 140, -1, 1);
  const RL = smooth(RL0, 22);

  const VP = F();
  for (let i = 0; i < N; i++) {
    const k = Math.abs(KS[i]);
    VP[i] = k <= DF ? VTOP : Math.min(VTOP, Math.sqrt(GRIP0 / (k - DF)));
  }

  for (let pass = 0; pass < 3; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      const nx = VP[W(i + 1)];
      VP[i] = Math.min(VP[i], Math.sqrt(nx * nx + 2 * brakeDecel(nx) * 0.85 * DS));
    }
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    minX = Math.min(minX, PX[i]);
    maxX = Math.max(maxX, PX[i]);
    minZ = Math.min(minZ, PZ[i]);
    maxZ = Math.max(maxZ, PZ[i]);
  }

  return {
    def, curve, L, N, DS, PX, PZ, TX, TZ, A, K, KS, BL, BR, RL, VP,
    minX, maxX, minZ, maxZ, HALF
  };
}

export function getTrackPos(track: TrackData, s: number, lat: number, out: { x: number; z: number; h: number; i: number }) {
  const L = track.L;
  const N = track.N;
  const DS = track.DS;
  s = ((s % L) + L) % L;
  const f = s / DS;
  const i = Math.floor(f) % N;
  const j = (i + 1) % N;
  const t = f - Math.floor(f);

  let tx = track.TX[i] + (track.TX[j] - track.TX[i]) * t;
  let tz = track.TZ[i] + (track.TZ[j] - track.TZ[i]) * t;
  const l = Math.hypot(tx, tz);
  tx /= l;
  tz /= l;

  out.x = track.PX[i] + (track.PX[j] - track.PX[i]) * t - tz * lat;
  out.z = track.PZ[i] + (track.PZ[j] - track.PZ[i]) * t + tx * lat;
  out.h = Math.atan2(tx, tz);
  out.i = i;
  return out;
}
