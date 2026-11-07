import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import {
  TrackDef,
  TRACKS,
  TeamDef,
  TEAMS,
  DRIVER_ROSTER,
  TyreCompound,
  TYRE_SPECS,
  WeatherType,
  PlayerCarDamage
} from './types.ts';
import { soundManager } from './audio.ts';
import { CAR_GEOMETRIES, createWheelGeometry, createCockpitSteeringWheel, FW, RW } from './carModel.ts';
import { buildTrackData, getTrackPos, TrackData } from './trackEngine.ts';
import { RacingHUD } from './components/RacingHUD.tsx';
import { MobileControlsHUD } from './components/MobileControlsHUD.tsx';
import { GarageMenu } from './components/GarageMenu.tsx';
import { RaceResultsModal } from './components/RaceResultsModal.tsx';
import { PitStopModal } from './components/PitStopModal.tsx';

// Physics constants
const WB = 3.6;
const GRIP0 = 16.5;
const DF = 0.0048;
const POWER = 1320;
const CD = 0.00175;
const VTOP = 97;
const WHEEL_R = 0.36;
const GRID_GAP = 8;
const GRID0 = 10;
const SECT = 25;
const STEP = 1 / 120;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const latMax = (v: number) => GRIP0 + DF * v * v;
const brakeDecel = (v: number) => 24.5 + 0.004 * v * v;
const engineAcc = (v: number, thr: number, drs: boolean) =>
  thr * Math.min(12.8, POWER / Math.max(v, 1)) - (drs ? 0.85 : 1) * CD * v * v - 0.25;

interface CarState {
  grid: number;
  code: string;
  name: string;
  team: number;
  isPlayer: boolean;
  ai: boolean;
  skill: number;
  aggression: number;
  react: number;
  mesh: {
    group: THREE.Group;
    wheels: THREE.Mesh[];
    steer: THREE.Group[];
    flap: THREE.Mesh;
    cockpitWheel?: THREE.Group;
  };
  s: number;
  sPrev: number;
  D: number;
  lat: number;
  latV: number;
  x: number;
  z: number;
  h: number;
  idx: number;
  v: number;
  thr: number;
  brk: number;
  steer: number;
  yaw: number;
  lapsMax: number;
  lapStart: number;
  last: number;
  best: number;
  finished: boolean;
  finishT: number;
  sect: Float64Array;
  sectIdx: number;
  drsAvail: boolean;
  drsOpen: boolean;
  drsChecked?: boolean;
  ers: number;
  off: boolean;
  wallCd: number;
  passT: number;
  passLat: number;
  bias: number;
  wheelA: number;
  flapA: number;
  sVis: number;
  tyreCompound: TyreCompound;
  tyreWear: number;
  tyreTemps: [number, number, number, number];
  damage: PlayerCarDamage;
  inPit: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Game UI States
  const [phase, setPhase] = useState<'menu' | 'lights' | 'race' | 'finished' | 'results'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [camMode, setCamMode] = useState<'cockpit' | 'nose' | 'chase' | 'far'>('cockpit');
  const [steerMode, setSteerMode] = useState<'buttons' | 'wheel' | 'tilt'>('buttons');
  const [isPortrait, setIsPortrait] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [pitModalOpen, setPitModalOpen] = useState(false);
  const [pitRequested, setPitRequested] = useState(false);

  // HUD telemetry react state (synced with 60fps loop at interval)
  const [hudData, setHudData] = useState({
    pos: 10,
    totalCars: 20,
    lap: 1,
    totalLaps: 3,
    lapTime: 0,
    lastLap: 0,
    bestLap: 0,
    sectorTimes: [0, 0, 0] as [number, number, number],
    currentSector: 0,
    speedKmh: 0,
    rpm: 4000,
    gear: 'N' as string | number,
    ers: 1,
    drsOpen: false,
    drsAvail: false,
    tyreCompound: 'MEDIUM' as TyreCompound,
    tyreWear: 0,
    tyreTemps: [90, 90, 90, 90] as [number, number, number, number],
    damage: { frontWing: 0, rearWing: 0, engine: 0, sidepod: 0 },
    flag: 'GREEN' as 'GREEN' | 'YELLOW' | 'RED' | 'SAFETY_CAR' | 'CHEQUERED',
    inPitLane: false,
    pitLimiter: false,
    delta: 0,
    leaderboard: [] as any[]
  });

  // Track & Race configs
  const [currentTrackDef, setCurrentTrackDef] = useState<TrackDef>(TRACKS[0]);
  const [currentLaps, setCurrentLaps] = useState(3);
  const [resultsData, setResultsData] = useState<any[]>([]);

  // Simulation engine mutable refs
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    sun: THREE.DirectionalLight | null;
    sunDir: THREE.Vector3;
    trackData: TrackData;
    cars: CarState[];
    player: CarState | null;
    order: CarState[];
    finishOrder: CarState[];
    phase: 'menu' | 'lights' | 'race' | 'finished';
    phaseT: number;
    raceTime: number;
    lightsOutAt: number;
    camH: number;
    camPos: THREE.Vector3;
    look: THREE.Vector3;
    shake: number;
    tvS: number | null;
    tvLat: number;
    acc: number;
    lastT: number;
    keys: { up: number; down: number; left: number; right: number; drs: number; boost: number };
    tiltSteer: number;
    gantryLights: THREE.Mesh[][];
    gantryGroup: THREE.Group | null;
    trackMeshes: THREE.Object3D[];
  }>({
    renderer: null,
    scene: null,
    camera: null,
    sun: null,
    sunDir: new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(205)),
    trackData: buildTrackData(TRACKS[0]),
    cars: [],
    player: null,
    order: [],
    finishOrder: [],
    phase: 'menu',
    phaseT: 0,
    raceTime: 0,
    lightsOutAt: 5.5,
    camH: 0,
    camPos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    shake: 0,
    tvS: null,
    tvLat: 0,
    acc: 0,
    lastT: performance.now(),
    keys: { up: 0, down: 0, left: 0, right: 0, drs: 0, boost: 0 },
    tiltSteer: 0,
    gantryLights: [],
    gantryGroup: null,
    trackMeshes: []
  });

  // Screen orientation detector
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Flash announcement helper
  const flashAnnouncement = (msg: string, durationMs: number = 2000) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), durationMs);
  };

  // Keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      soundManager.init();
      soundManager.resume();

      if (e.code === 'ArrowUp' || e.code === 'KeyW') eng.keys.up = 1;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') eng.keys.down = 1;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') eng.keys.left = 1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') eng.keys.right = 1;
      if (e.code === 'Space') eng.keys.drs = 1;

      if (e.code === 'KeyC') {
        setCamMode((prev) => {
          if (prev === 'cockpit') return 'nose';
          if (prev === 'nose') return 'chase';
          if (prev === 'chase') return 'far';
          return 'cockpit';
        });
      }
      if (e.code === 'KeyP') setIsPaused((prev) => !prev);
      if (e.code === 'KeyM') {
        setIsMuted((prev) => {
          const next = !prev;
          soundManager.setMute(next);
          return next;
        });
      }
      if (e.code === 'KeyR') resetPlayerToTrack();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') eng.keys.up = 0;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') eng.keys.down = 0;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') eng.keys.left = 0;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') eng.keys.right = 0;
      if (e.code === 'Space') eng.keys.drs = 0;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Gyroscope / Tilt steering listener
  useEffect(() => {
    if (steerMode !== 'tilt') return;
    const handleDeviceMotion = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        // gamma in landscape is typically tilt
        const tilt = clamp(e.gamma / 30, -1, 1);
        engineRef.current.tiltSteer = tilt;
      }
    };
    window.addEventListener('deviceorientation', handleDeviceMotion);
    return () => window.removeEventListener('deviceorientation', handleDeviceMotion);
  }, [steerMode]);

  // Reset player to center of current track segment
  const resetPlayerToTrack = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.player) return;
    const p = eng.player;
    const tmp = { x: 0, z: 0, h: 0, i: 0 };
    getTrackPos(eng.trackData, p.s, clamp(p.lat, -3.5, 3.5), tmp);
    p.x = tmp.x;
    p.z = tmp.z;
    p.h = tmp.h;
    p.v = 0;
    p.steer = 0;
    flashAnnouncement('CAR REPOSITIONED TO TRACK', 1500);
  }, []);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.35, 12000);

    // Sky
    const sky = new Sky();
    sky.scale.setScalar(5000);
    const u = sky.material.uniforms;
    u.turbidity.value = 3.0;
    u.rayleigh.value = 1.2;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.8;
    u.sunPosition.value.copy(engineRef.current.sunDir);
    scene.add(sky);

    scene.fog = new THREE.Fog(0xbfd0e0, 650, 4000);
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x4f6d3c, 0.5));

    const sun = new THREE.DirectionalLight(0xfff0dc, 2.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 700 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);

    engineRef.current.renderer = renderer;
    engineRef.current.scene = scene;
    engineRef.current.camera = camera;
    engineRef.current.sun = sun;

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // Build Track 3D Geometry
  const buildTrack3D = useCallback((track: TrackData) => {
    const scene = engineRef.current.scene;
    if (!scene) return;

    // Clean up old track objects
    for (const m of engineRef.current.trackMeshes) {
      scene.remove(m);
    }
    engineRef.current.trackMeshes = [];

    const DS2 = THREE.DoubleSide;
    const std = (o: any) => new THREE.MeshStandardMaterial({ side: DS2, ...o });

    // Textures (Procedural Canvas)
    const ANISO = engineRef.current.renderer?.capabilities.getMaxAnisotropy() || 4;
    const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d')!, w, h);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = ANISO;
      return t;
    };

    const asphaltTex = tex(512, 512, (g, w, h) => {
      g.fillStyle = '#4f5156';
      g.fillRect(0, 0, w, h);
      // Speckles
      for (let i = 0; i < 40000; i++) {
        g.fillStyle = Math.random() > 0.5 ? '#3a3c40' : '#686b72';
        g.fillRect(Math.random() * w, Math.random() * h, 1.8, 1.8);
      }
      // Racing groove line
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.3, 'rgba(20,20,24,.22)');
      gr.addColorStop(0.7, 'rgba(20,20,24,.22)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });

    const grassTex = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#458536';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 15000; i++) {
        g.fillStyle = Math.random() > 0.5 ? '#366d2a' : '#5ba046';
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
    grassTex.repeat.set(300, 300);

    const kerbTex = tex(64, 64, (g) => {
      g.fillStyle = '#d4202c';
      g.fillRect(0, 0, 64, 32);
      g.fillStyle = '#f8f8f8';
      g.fillRect(0, 32, 64, 32);
    });

    const checkerTex = tex(64, 16, (g) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 4; y++) {
          g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
          g.fillRect(x * 4, y * 4, 4, 4);
        }
      }
    });

    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = false, recv = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = recv;
      scene.add(m);
      engineRef.current.trackMeshes.push(m);
      return m;
    };

    // Strip helper
    const W = (i: number) => ((i % track.N) + track.N) % track.N;
    const at = (i: number, lat: number, y: number) => [
      track.PX[i] - track.TZ[i] * lat,
      y,
      track.PZ[i] + track.TX[i] * lat
    ] as [number, number, number];

    function strip(
      i0: number,
      count: number,
      fn: (i: number) => [[number, number, number], [number, number, number]],
      vLen: number,
      uA = 0,
      uB = 1
    ) {
      const pos: number[] = [];
      const uv: number[] = [];
      const ind: number[] = [];
      for (let k = 0; k <= count; k++) {
        const i = W(i0 + k);
        const s = (i0 + k) * track.DS;
        const [a, b] = fn(i);
        const v = s / vLen;
        pos.push(...a, ...b);
        uv.push(uA, v, uB, v);
      }
      for (let k = 0; k < count; k++) {
        const a = 2 * k;
        ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(ind);
      g.computeVertexNormals();
      return g;
    }

    // Ground plane
    addMesh(
      new THREE.PlaneGeometry(8000, 8000)
        .rotateX(-Math.PI / 2)
        .translate((track.minX + track.maxX) / 2, -0.02, (track.minZ + track.maxZ) / 2),
      std({ map: grassTex, roughness: 1 })
    );

    // Track asphalt strip
    addMesh(
      strip(0, track.N, (i) => [at(i, track.HALF, 0.02), at(i, -track.HALF, 0.02)], 14),
      std({ map: asphaltTex, roughness: 0.88 })
    );

    // White track boundaries
    const lineMat = std({ color: 0xf5f5f5, roughness: 0.6 });
    addMesh(strip(0, track.N, (i) => [at(i, track.HALF - 0.1, 0.03), at(i, track.HALF - 0.45, 0.03)], 10), lineMat);
    addMesh(strip(0, track.N, (i) => [at(i, -track.HALF + 0.45, 0.03), at(i, -track.HALF + 0.1, 0.03)], 10), lineMat);

    // Red & white corner kerbs
    const kerbMat = std({ map: kerbTex, roughness: 0.6 });
    const onCurv = (i: number) => Math.abs(track.KS[i]) > 1 / 230;
    let start = 0;
    while (onCurv(start)) start++;
    for (let k = 0; k < track.N; ) {
      const i = W(start + k);
      if (!onCurv(i)) {
        k++;
        continue;
      }
      let len = 0;
      while (len < track.N && onCurv(W(i + len))) len++;
      const i0 = i - 6;
      const cnt = len + 12;
      addMesh(strip(i0, cnt, (j) => [at(j, track.HALF + 1.6, 0.04), at(j, track.HALF, 0.04)], 3), kerbMat);
      addMesh(strip(i0, cnt, (j) => [at(j, -track.HALF, 0.04), at(j, -track.HALF - 1.6, 0.04)], 3), kerbMat);
      k += len + 1;
    }

    // Start / Finish Line checkerboard
    const ck = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * track.HALF, 1.3).rotateX(-Math.PI / 2),
      std({ map: checkerTex, roughness: 0.7 })
    );
    const p0 = { x: 0, z: 0, h: 0, i: 0 };
    getTrackPos(track, 0, 0, p0);
    ck.position.set(p0.x, 0.045, p0.z);
    ck.rotation.y = p0.h;
    ck.receiveShadow = true;
    scene.add(ck);
    engineRef.current.trackMeshes.push(ck);

    // Start gantry with 5 red starting lights
    const gantry = new THREE.Group();
    const gp = { x: 0, z: 0, h: 0, i: 0 };
    getTrackPos(track, 14, 0, gp);
    gantry.position.set(gp.x, 0, gp.z);
    gantry.rotation.y = gp.h;

    const steel = std({ color: 0x2a2d33, metalness: 0.6, roughness: 0.4 });
    const w = 2 * track.HALF + 5;
    for (const x of [-w / 2, w / 2]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), steel);
      pillar.position.set(x, 4.5, 0);
      pillar.castShadow = true;
      gantry.add(pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 2, 0.7), steel);
    beam.position.y = 8.2;
    beam.castShadow = true;
    gantry.add(beam);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.7, 0.5), std({ color: 0x080808, roughness: 0.6 }));
    panel.position.set(0, 6.3, -0.1);
    gantry.add(panel);

    const discG = new THREE.CircleGeometry(0.28, 20).rotateY(Math.PI);
    const gLights: THREE.Mesh[][] = [];
    for (let c = 0; c < 5; c++) {
      const col: THREE.Mesh[] = [];
      for (let r = 0; r < 2; r++) {
        const lightMesh = new THREE.Mesh(discG, new THREE.MeshBasicMaterial({ color: 0x300505 }));
        lightMesh.position.set(-2 + c, 6.7 - r * 0.75, -0.36);
        gantry.add(lightMesh);
        col.push(lightMesh);
      }
      gLights.push(col);
    }
    scene.add(gantry);
    engineRef.current.trackMeshes.push(gantry);
    engineRef.current.gantryLights = gLights;
    engineRef.current.gantryGroup = gantry;

    // Safety Barriers
    const barrierMat = std({ color: 0x1e2430, metalness: 0.3, roughness: 0.7 });
    addMesh(strip(0, track.N, (i) => [at(i, track.BL[i], 1.15), at(i, track.BL[i], 0)], -48), barrierMat);
    addMesh(strip(0, track.N, (i) => [at(i, -track.BR[i], 1.15), at(i, -track.BR[i], 0)], 48), barrierMat);
  }, []);

  // Initialize Cars and AI
  const initCars = useCallback((track: TrackData, playerTeamId: number, playerTyre: TyreCompound) => {
    const scene = engineRef.current.scene;
    if (!scene) return;

    // Remove old car meshes
    for (const c of engineRef.current.cars) {
      scene.remove(c.mesh.group);
    }
    engineRef.current.cars = [];

    const DS2 = THREE.DoubleSide;
    const paintMat = (colorHex: number) =>
      new THREE.MeshPhysicalMaterial({
        color: colorHex,
        metalness: 0.1,
        roughness: 0.4,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
        side: DS2
      });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.45, metalness: 0.35, side: DS2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1010, emissiveIntensity: 1.6 });

    const wheelGeos = { f: createWheelGeometry(0.36), r: createWheelGeometry(0.42) };
    const wMats = [
      new THREE.MeshStandardMaterial({ color: 0x161618, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.85, roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.6 })
    ];

    const carsList: CarState[] = [];
    const SECTN = Math.ceil(4 * track.L / SECT) + 4;

    for (let g = 0; g < 20; g++) {
      const isPlayer = g === 9; // Grid P10 default
      const roster = DRIVER_ROSTER[g];
      const teamId = isPlayer ? playerTeamId : roster.teamId;
      const team = TEAMS[teamId];

      const pMat = paintMat(team.primaryColor);
      const aMat = paintMat(team.secondaryColor);

      const group = new THREE.Group();
      const wheels: THREE.Mesh[] = [];
      const steer: THREE.Group[] = [];

      // Body parts
      const body = new THREE.Mesh(CAR_GEOMETRIES.paint, pMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const accent = new THREE.Mesh(CAR_GEOMETRIES.accent, aMat);
      accent.castShadow = true;
      const carbon = new THREE.Mesh(CAR_GEOMETRIES.carbon, carbonMat);
      carbon.castShadow = true;
      const light = new THREE.Mesh(CAR_GEOMETRIES.light, tailMat);
      const flap = new THREE.Mesh(CAR_GEOMETRIES.flap, aMat);
      flap.position.set(0, 1.02, -2.1);

      group.add(body, accent, carbon, light, flap);

      // Cockpit steering wheel (for player only or visible cockpit)
      let cockpitWheel: THREE.Group | undefined;
      if (isPlayer) {
        cockpitWheel = createCockpitSteeringWheel();
        group.add(cockpitWheel);
      }

      // 4 Wheels
      for (const [[z, x], geo, front] of [
        [[FW[0], FW[1]], wheelGeos.f, true],
        [[RW[0], RW[1]], wheelGeos.r, false]
      ] as [number[], THREE.BufferGeometry, boolean][]) {
        for (const sg of [1, -1]) {
          const piv = new THREE.Group();
          piv.position.set(sg * x, WHEEL_R, z);
          group.add(piv);
          const w = new THREE.Mesh(geo, wMats);
          w.castShadow = true;
          piv.add(w);
          wheels.push(w);
          if (front) steer.push(piv);
        }
      }

      scene.add(group);

      const D = -(GRID0 + g * GRID_GAP);
      const lat = g % 2 ? 2.8 : -2.8;
      const p0 = { x: 0, z: 0, h: 0, i: 0 };
      getTrackPos(track, track.L + D, lat, p0);

      const carState: CarState = {
        grid: g,
        code: isPlayer ? 'YOU' : roster.code,
        name: isPlayer ? 'Player' : roster.name,
        team: teamId,
        isPlayer,
        ai: !isPlayer,
        skill: isPlayer ? 1.0 : roster.skill,
        aggression: roster.aggression,
        react: 0.15 + Math.random() * 0.3,
        mesh: { group, wheels, steer, flap, cockpitWheel },
        s: ((track.L + D) % track.L + track.L) % track.L,
        sPrev: ((track.L + D) % track.L + track.L) % track.L,
        D,
        lat,
        latV: 0,
        x: p0.x,
        z: p0.z,
        h: p0.h,
        idx: p0.i,
        v: 0,
        thr: 0,
        brk: 0,
        steer: 0,
        yaw: 0,
        lapsMax: -1,
        lapStart: 0,
        last: 0,
        best: 0,
        finished: false,
        finishT: 0,
        sect: new Float64Array(SECTN).fill(-1),
        sectIdx: -1,
        drsAvail: false,
        drsOpen: false,
        ers: 1,
        off: false,
        wallCd: 0,
        passT: 0,
        passLat: 0,
        bias: (Math.random() - 0.5) * 1.2,
        wheelA: 0,
        flapA: 0,
        sVis: 0,
        tyreCompound: isPlayer ? playerTyre : g % 2 === 0 ? 'SOFT' : 'MEDIUM',
        tyreWear: 0,
        tyreTemps: [90, 90, 90, 90],
        damage: { frontWing: 0, rearWing: 0, engine: 0, sidepod: 0 },
        inPit: false
      };

      carsList.push(carState);
    }

    engineRef.current.cars = carsList;
    engineRef.current.player = carsList[9];
    engineRef.current.order = carsList.slice();
    engineRef.current.finishOrder = [];
  }, []);

  // Main Race Start from Garage
  const handleStartRace = (cfg: {
    track: TrackDef;
    team: TeamDef;
    tyre: TyreCompound;
    weather: WeatherType;
    laps: number;
    transmission: 'auto' | 'manual';
    steerMode: 'buttons' | 'wheel' | 'tilt';
    aiDifficulty: 'normal' | 'pro' | 'legend';
    cameraMode: 'cockpit' | 'nose' | 'chase' | 'far';
  }) => {
    soundManager.init();
    soundManager.resume();

    const trackData = buildTrackData(cfg.track);
    engineRef.current.trackData = trackData;
    setCurrentTrackDef(cfg.track);
    setCurrentLaps(cfg.laps);
    setSteerMode(cfg.steerMode);
    setCamMode(cfg.cameraMode);

    buildTrack3D(trackData);
    initCars(trackData, cfg.team.id, cfg.tyre);

    engineRef.current.phase = 'lights';
    engineRef.current.phaseT = 0;
    engineRef.current.raceTime = 0;
    engineRef.current.lightsOutAt = 5.2 + Math.random() * 1.5;
    setPhase('lights');
    flashAnnouncement('FORMATION GRID — WAIT FOR 5 RED LIGHTS', 3000);
  };

  // Main Simulation Loop
  useEffect(() => {
    let animId: number;

    const runSimulationStep = (dt: number) => {
      const eng = engineRef.current;
      const track = eng.trackData;
      if (!eng.player) return;

      eng.phaseT += dt;

      // STARTING LIGHTS COUNTDOWN
      if (eng.phase === 'lights') {
        const on = Math.min(5, Math.floor(eng.phaseT));
        eng.gantryLights.forEach((col, k) => {
          col.forEach((l) => (l.material as THREE.MeshBasicMaterial).color.setHex(k < on ? 0xff2020 : 0x300505));
        });

        if (eng.phaseT >= eng.lightsOutAt) {
          eng.phase = 'race';
          eng.raceTime = 0;
          setPhase('race');
          flashAnnouncement('LIGHTS OUT AND AWAY WE GO!', 1800);
          soundManager.playBeep(1200, 0.4);
          // Turn off all lights immediately
          eng.gantryLights.forEach((col) => {
            col.forEach((l) => (l.material as THREE.MeshBasicMaterial).color.setHex(0x300505));
          });
          for (const c of eng.cars) c.lapStart = 0;
        } else {
          return;
        }
      }

      if (eng.phase !== 'race' && eng.phase !== 'finished') return;

      eng.raceTime += dt;
      const p = eng.player;

      // ────────────────── PLAYER INPUT & PHYSICS ──────────────────
      const keys = eng.keys;
      p.thr += clamp(keys.up - p.thr, -dt * 8, dt * 6);
      p.brk += clamp(keys.down - p.brk, -dt * 10, dt * 10);

      let steerInput = keys.left - keys.right;
      if (steerMode === 'tilt') {
        steerInput = eng.tiltSteer;
      }
      const stRate = steerInput === 0 ? 5 : p.steer * steerInput < 0 ? 7.5 : 2.8;
      p.steer += clamp(steerInput - p.steer, -stRate * dt, stRate * dt);

      // Tyre grip & Aero downforce
      const tyreSpec = TYRE_SPECS[p.tyreCompound];
      const tyreWearPenalty = 1 - (p.tyreWear / 100) * 0.28;
      const aeroHealth = 1 - (p.damage.frontWing / 100) * 0.35;
      const offTrack = Math.abs(p.lat) > track.HALF + 1.5;
      p.off = offTrack;

      const grip = (offTrack ? 0.55 : 1) * tyreSpec.initialGrip * tyreWearPenalty;
      const av = Math.abs(p.v);
      const sa = (p.steer * 0.35) / (1 + av / 22);
      const yawDesired = (p.v * Math.tan(sa)) / WB;
      const yawMax = (latMax(av) * grip * aeroHealth) / Math.max(av, 1);
      p.yaw = clamp(yawDesired, -yawMax, yawMax);

      // Lateral slip & squeal
      const slipAmount = Math.abs(yawDesired) > yawMax ? (Math.abs(yawDesired) - yawMax) / yawMax : 0;
      soundManager.updateTyreSlip(slipAmount);

      if (slipAmount > 0 && av > 6) {
        p.v -= Math.sign(p.v) * Math.min(1, slipAmount) * 7.5 * dt;
        p.tyreWear = Math.min(100, p.tyreWear + dt * 0.4);
      }

      p.h += p.yaw * dt;
      p.sVis = sa;

      // DRS & ERS Deploy
      if (!p.drsAvail || p.brk > 0.1) p.drsOpen = false;
      else if (keys.drs) p.drsOpen = true;

      // Pit Limiter constraint
      const maxSpd = p.inPit ? 80 / 3.6 : VTOP;

      if (p.v <= 0.5 && p.brk > 0.5 && p.thr < 0.1) {
        p.v = Math.max(-7, p.v - 5 * dt); // Reverse gear
      } else if (p.v < 0) {
        p.v = Math.min(0, p.v + (p.thr * 10 + 4) * dt);
      } else {
        let acc = engineAcc(p.v, p.thr, p.drsOpen) - p.brk * brakeDecel(p.v);
        // ERS Boost
        if ((keys.boost || p.thr > 0.95) && p.v > 20 && p.ers > 0) {
          acc += 1.4;
          p.ers = Math.max(0, p.ers - 0.04 * dt);
        }
        // Energy recovery on braking
        p.ers = Math.min(1, p.ers + p.brk * 0.065 * dt);

        if (offTrack) acc -= 3.5 + 0.004 * p.v * p.v;
        p.v = Math.max(0, Math.min(maxSpd, p.v + acc * dt));
      }

      p.x += Math.sin(p.h) * p.v * dt;
      p.z += Math.cos(p.h) * p.v * dt;

      // Project onto track spline
      let bestDist = Infinity;
      let bestIdx = p.idx;
      for (let k = -45; k <= 45; k++) {
        const i = ((p.idx + k) % track.N + track.N) % track.N;
        const dx = p.x - track.PX[i];
        const dz = p.z - track.PZ[i];
        const d = dx * dx + dz * dz;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      p.idx = bestIdx;
      const dx = p.x - track.PX[bestIdx];
      const dz = p.z - track.PZ[bestIdx];
      p.lat = -dx * track.TZ[bestIdx] + dz * track.TX[bestIdx];
      p.s = ((bestIdx * track.DS + dx * track.TX[bestIdx] + dz * track.TZ[bestIdx]) % track.L + track.L) % track.L;

      // Barrier collision
      const limit = (p.lat > 0 ? track.BL[p.idx] : track.BR[p.idx]) - 1.15;
      if (Math.abs(p.lat) > limit) {
        const sg = Math.sign(p.lat);
        const push = Math.abs(p.lat) - limit;
        p.x += track.TZ[p.idx] * sg * push;
        p.z -= track.TX[p.idx] * sg * push;
        p.lat = sg * limit;
        const th = track.A[p.idx];
        const tgt = Math.cos(wrapA(p.h - th)) >= 0 ? th : th + Math.PI;
        p.h += wrapA(tgt - p.h) * 0.25;

        if (p.wallCd <= 0) {
          p.v *= 0.68;
          p.wallCd = 0.35;
          eng.shake = 0.7;
          p.damage.frontWing = Math.min(100, p.damage.frontWing + 18);
          soundManager.playCollision(0.8);
          flashAnnouncement('WALL IMPACT — FRONT WING DAMAGE!', 1500);
        }
      }
      p.wallCd -= dt;

      // Kerb vibration
      const onKerb = Math.abs(p.lat) > track.HALF && Math.abs(p.lat) < track.HALF + 1.6;
      soundManager.updateKerb(onKerb, p.v * 3.6);
      if (onKerb && p.v > 12) eng.shake = Math.max(eng.shake, 0.15);

      // Tyre wear & temp simulation
      p.tyreWear = Math.min(100, p.tyreWear + (p.v / 1000) * tyreSpec.wearRate * dt * 0.12);
      const baseTemp = 85 + (p.v * 3.6) * 0.05 + p.brk * 12;
      p.tyreTemps = [
        Math.round(baseTemp + (p.steer < 0 ? 5 : 0)),
        Math.round(baseTemp + (p.steer > 0 ? 5 : 0)),
        Math.round(baseTemp - 2),
        Math.round(baseTemp - 2)
      ];

      // ────────────────── AI OPPONENTS UPDATE ──────────────────
      for (const c of eng.cars) {
        if (!c.ai) continue;
        const i = Math.floor(c.s / track.DS) % track.N;
        let target = track.VP[((i + 3) % track.N + track.N) % track.N] * c.skill;
        let desired = track.RL[i] * 0.85 + c.bias;

        if (c.passT > 0) {
          c.passT -= dt;
          desired = c.passLat;
        }

        // AI Overtaking & Collision avoidance
        for (const o of eng.cars) {
          if (o === c) continue;
          const dD = o.D - c.D;
          if (dD <= 0 || dD > 32 || Math.abs(o.lat - c.lat) > 2.3) continue;
          if (c.passT <= 0 && c.v > o.v - 1.5) {
            const opts = [o.lat + 3.1, o.lat - 3.1].filter((x) => Math.abs(x) < track.HALF - 1.2);
            for (const t of opts) {
              c.passLat = t;
              c.passT = 2.2;
              desired = t;
              break;
            }
          }
          if (dD < 12) target = Math.min(target, o.v - (12 - dD) * 0.7);
        }

        target = Math.max(0, target);
        if (c.v < target) {
          c.v = Math.min(target, c.v + Math.max(0, engineAcc(c.v, 1, c.drsOpen)) * dt);
        } else {
          c.v = Math.max(target, c.v - brakeDecel(c.v) * dt);
        }

        const maxLatV = Math.min(3.2, 0.5 + c.v * 0.06);
        const dl = clamp(desired - c.lat, -maxLatV * dt, maxLatV * dt);
        c.lat = clamp(c.lat + dl, -track.HALF + 1.1, track.HALF - 1.1);
        c.latV = dl / dt;
        c.s = (c.s + c.v * dt) % track.L;

        const tmpAI = { x: 0, z: 0, h: 0, i: 0 };
        getTrackPos(track, c.s, c.lat, tmpAI);
        c.x = tmpAI.x;
        c.z = tmpAI.z;
        c.idx = tmpAI.i;
        c.h = tmpAI.h - Math.atan2(c.latV, Math.max(c.v, 2));
      }

      // ────────────────── CAR PROGRESS & LAP TRACKING ──────────────────
      for (const c of eng.cars) {
        let ds = c.s - c.sPrev;
        if (ds < -track.L / 2) ds += track.L;
        if (ds > track.L / 2) ds -= track.L;
        c.sPrev = c.s;
        c.D += ds;

        const lapsNow = Math.floor(c.D / track.L);
        if (lapsNow > c.lapsMax) {
          c.lapsMax = lapsNow;
          if (lapsNow >= 1) {
            const lt = eng.raceTime - c.lapStart;
            c.last = lt;
            if (!c.best || lt < c.best) c.best = lt;
            c.lapStart = eng.raceTime;

            if (c.isPlayer && !c.finished) {
              if (lapsNow === currentLaps - 1) flashAnnouncement('FINAL LAP!', 2000);
              else if (lapsNow < currentLaps) flashAnnouncement(`LAP ${lapsNow + 1} / ${currentLaps}`, 1500);
            }

            if (lapsNow >= currentLaps && !c.finished) {
              c.finished = true;
              c.finishT = eng.raceTime;
              eng.finishOrder.push(c);

              if (c.isPlayer) {
                eng.phase = 'finished';
                setPhase('finished');
                flashAnnouncement('CHEQUERED FLAG! RACE FINISHED', 3000);
                setTimeout(() => setPhase('results'), 2800);
              }
            }
          }
        }
      }

      // Sort live standings
      eng.order = eng.cars.slice().sort((a, b) =>
        a.finished && b.finished ? a.finishT - b.finishT : a.finished ? -1 : b.finished ? 1 : b.D - a.D
      );

      // DRS Zones
      const inZone = p.s > 80 && p.s < 480;
      if (!inZone) {
        p.drsAvail = false;
        p.drsOpen = false;
        p.drsChecked = false;
      } else if (!p.drsChecked) {
        p.drsChecked = true;
        const playerRank = eng.order.indexOf(p);
        p.drsAvail = p.lapsMax >= 1 && playerRank > 0;
        if (p.drsAvail) flashAnnouncement('DRS DETECTED — SYSTEM ARMED', 1200);
      }
    };

    // Main Animation Loop
    const frame = (now: number) => {
      animId = requestAnimationFrame(frame);
      const eng = engineRef.current;
      const dt = Math.min(0.08, (now - eng.lastT) / 1000);
      eng.lastT = now;

      if (!isPaused) {
        eng.acc += dt;
        let n = 0;
        while (eng.acc >= STEP && n < 60) {
          runSimulationStep(STEP);
          eng.acc -= STEP;
          n++;
        }
        if (n >= 60) eng.acc = 0;
      }

      // Update 3D meshes position & rotation
      for (const c of eng.cars) {
        c.mesh.group.position.set(c.x, 0, c.z);
        c.mesh.group.rotation.y = c.h;
        c.wheelA += (c.v * dt) / WHEEL_R;
        for (const w of c.mesh.wheels) w.rotation.x = c.wheelA;
        const st = c.ai ? clamp(Math.atan(WB * eng.trackData.KS[c.idx]) * 1.4, -0.35, 0.35) : c.sVis * 1.6;
        for (const s of c.mesh.steer) s.rotation.y = st;
        c.flapA += ((c.drsOpen ? -0.75 : 0) - c.flapA) * Math.min(1, dt * 10);
        c.mesh.flap.rotation.x = c.flapA;

        // Cockpit steering wheel rotation
        if (c.mesh.cockpitWheel) {
          c.mesh.cockpitWheel.rotation.z = -st * 2.2;
        }
      }

      // ────────────────── CAMERA CONTROLS ──────────────────
      const p = eng.player;
      if (p && eng.camera) {
        eng.camH += wrapA(p.h - eng.camH) * Math.min(1, dt * (camMode === 'cockpit' ? 24 : 7));
        const fx = Math.sin(eng.camH);
        const fz = Math.cos(eng.camH);

        if (camMode === 'cockpit') {
          // Driver helmet POV: looking forward over halo & nose
          eng.camPos.set(p.x + Math.sin(p.h) * 0.22, 0.82, p.z + Math.cos(p.h) * 0.22);
          eng.look.set(p.x + fx * 32, 0.72, p.z + fz * 32);
          eng.camera.fov = 74;
        } else if (camMode === 'nose') {
          // Front wing camera
          eng.camPos.set(p.x + Math.sin(p.h) * 2.4, 0.45, p.z + Math.cos(p.h) * 2.4);
          eng.look.set(p.x + fx * 28, 0.42, p.z + fz * 28);
          eng.camera.fov = 78;
        } else if (camMode === 'far') {
          // TV broadcast T-Cam
          eng.camPos.set(p.x - fx * 9.5, 3.2, p.z - fz * 9.5);
          eng.look.set(p.x + fx * 8, 0.9, p.z + fz * 8);
          eng.camera.fov = 54;
        } else {
          // Chase Cam
          eng.camPos.set(p.x - fx * 6.5, 2.1, p.z - fz * 6.5);
          eng.look.set(p.x + fx * 7, 0.9, p.z + fz * 7);
          eng.camera.fov = 60 + clamp(Math.abs(p.v) * 0.12, 0, 10);
        }

        // Camera Shake on Kerb & Collision
        eng.shake = Math.max(0, eng.shake - dt * 2.2);
        if (eng.shake > 0) {
          eng.camPos.add(
            new THREE.Vector3(
              (Math.random() - 0.5) * eng.shake * 0.35,
              (Math.random() - 0.5) * eng.shake * 0.3,
              0
            )
          );
        }

        eng.camera.position.copy(eng.camPos);
        eng.camera.lookAt(eng.look);
        eng.camera.updateProjectionMatrix();

        // Directional Sun following car
        if (eng.sun) {
          eng.sun.position.set(p.x + eng.sunDir.x * 250, eng.sunDir.y * 250, p.z + eng.sunDir.z * 250);
          eng.sun.target.position.set(p.x, 0, p.z);
        }

        // Engine sound update
        const kmh = p.v * 3.6;
        const gearNum = Math.min(8, Math.max(1, Math.floor(kmh / 40) + 1));
        const gearLo = (gearNum - 1) * 40;
        const gearHi = gearNum * 40;
        const rpm = Math.round(5500 + 6500 * clamp((kmh - gearLo) / Math.max(1, gearHi - gearLo), 0, 1));
        soundManager.updateEngine(rpm, p.thr, kmh, isPaused);

        // Update React HUD state periodically
        const rank = eng.order.indexOf(p) + 1;
        setHudData({
          pos: rank,
          totalCars: eng.cars.length,
          lap: Math.max(1, Math.floor(p.D / eng.trackData.L) + 1),
          totalLaps: currentLaps,
          lapTime: eng.raceTime - p.lapStart,
          lastLap: p.last,
          bestLap: p.best,
          sectorTimes: [p.sect[0] || 0, p.sect[1] || 0, p.sect[2] || 0],
          currentSector: Math.min(2, Math.floor(((p.s % eng.trackData.L) / eng.trackData.L) * 3)),
          speedKmh: kmh,
          rpm,
          gear: p.v < -0.3 ? 'R' : kmh < 1 && eng.phase !== 'race' ? 'N' : gearNum,
          ers: p.ers,
          drsOpen: p.drsOpen,
          drsAvail: p.drsAvail,
          tyreCompound: p.tyreCompound,
          tyreWear: p.tyreWear,
          tyreTemps: p.tyreTemps,
          damage: p.damage,
          flag: eng.phase === 'finished' ? 'CHEQUERED' : 'GREEN',
          inPitLane: p.inPit,
          pitLimiter: p.inPit,
          delta: 0,
          leaderboard: eng.order.map((c, i) => {
            const ahead = i > 0 ? eng.order[i - 1] : null;
            let gapStr = 'LEADER';
            if (i > 0 && ahead) {
              const diffD = Math.max(0, ahead.D - c.D);
              gapStr = diffD > eng.trackData.L ? `+${Math.floor(diffD / eng.trackData.L)}L` : `+${(diffD / 60).toFixed(3)}s`;
            }
            return {
              pos: i + 1,
              code: c.code,
              gap: gapStr,
              color: TEAMS[c.team]?.primaryHex || '#fff',
              isPlayer: c.isPlayer,
              tyre: c.tyreCompound
            };
          })
        });

        // 2D Track Minimap render
        if (minimapCanvasRef.current) {
          const mcv = minimapCanvasRef.current;
          const ctx = mcv.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, mcv.width, mcv.height);
            const trk = eng.trackData;
            const pad = 12;
            const scX = (mcv.width - pad * 2) / (trk.maxX - trk.minX);
            const scZ = (mcv.height - pad * 2) / (trk.maxZ - trk.minZ);
            const sc = Math.min(scX, scZ);
            const mX = (x: number) => pad + (x - trk.minX) * sc + (mcv.width - pad * 2 - (trk.maxX - trk.minX) * sc) / 2;
            const mZ = (z: number) => pad + (z - trk.minZ) * sc + (mcv.height - pad * 2 - (trk.maxZ - trk.minZ) * sc) / 2;

            // Draw track outline
            ctx.beginPath();
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#0e121a';
            for (let i = 0; i <= trk.N; i += 3) {
              const j = i % trk.N;
              if (i === 0) ctx.moveTo(mX(trk.PX[j]), mZ(trk.PZ[j]));
              else ctx.lineTo(mX(trk.PX[j]), mZ(trk.PZ[j]));
            }
            ctx.closePath();
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#e2e8f0';
            ctx.stroke();

            // Draw cars dots
            for (const c of eng.cars) {
              ctx.beginPath();
              ctx.arc(mX(c.x), mZ(c.z), c.isPlayer ? 5 : 3, 0, Math.PI * 2);
              ctx.fillStyle = c.isPlayer ? '#e10600' : TEAMS[c.team]?.primaryHex || '#fff';
              ctx.fill();
              if (c.isPlayer) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              }
            }
          }
        }
      }

      if (eng.renderer && eng.scene && eng.camera) {
        eng.renderer.render(eng.scene, eng.camera);
      }
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [camMode, steerMode, isPaused, currentLaps]);

  // Touch control inputs handler
  const handleTouchInput = (action: string, isDown: boolean) => {
    const eng = engineRef.current;
    soundManager.init();
    soundManager.resume();

    if (action === 'throttle') eng.keys.up = isDown ? 1 : 0;
    if (action === 'brake') eng.keys.down = isDown ? 1 : 0;
    if (action === 'steerLeft') eng.keys.left = isDown ? 1 : 0;
    if (action === 'steerRight') eng.keys.right = isDown ? 1 : 0;
    if (action === 'drs') eng.keys.drs = isDown ? 1 : 0;
    if (action === 'boost') eng.keys.boost = isDown ? 1 : 0;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none font-racing">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full block" />

      {/* Minimap in cockpit */}
      {phase !== 'menu' && (
        <div className="fixed left-3 bottom-28 z-20 pointer-events-none rounded-xl hud-glass-dark p-1 border border-white/10 shadow-xl hidden sm:block">
          <canvas ref={minimapCanvasRef} width={160} height={110} className="block" />
        </div>
      )}

      {/* Orientation Warning Modal for Android users in Portrait */}
      {isPortrait && phase !== 'menu' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 text-center text-white backdrop-blur-lg">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center mb-4 animate-bounce">
            <span className="text-3xl">🔄</span>
          </div>
          <h2 className="text-2xl font-black font-racing italic tracking-wider mb-2">
            ROTATE TO LANDSCAPE
          </h2>
          <p className="text-sm text-white/70 max-w-xs mb-6">
            Aurora Grand Prix is designed for the ultimate mobile F1 simulator cockpit experience in landscape orientation.
          </p>
          <button
            onClick={() => setIsPortrait(false)}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold font-racing"
          >
            CONTINUE ANYWAY
          </button>
        </div>
      )}

      {/* Announcement Flash Text Banner */}
      {announcement && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-6 py-2 rounded-xl hud-glass-dark border border-red-500 shadow-2xl text-center animate-pulse">
          <span className="text-xl sm:text-2xl font-black font-racing italic tracking-wider text-white drop-shadow-md">
            {announcement}
          </span>
        </div>
      )}

      {/* Main In-Game Telemetry HUD */}
      {phase !== 'menu' && phase !== 'results' && (
        <>
          <RacingHUD
            currentPos={hudData.pos}
            totalCars={hudData.totalCars}
            currentLap={hudData.lap}
            totalLaps={hudData.totalLaps}
            lapTime={hudData.lapTime}
            lastLapTime={hudData.lastLap}
            bestLapTime={hudData.bestLap}
            sectorTimes={hudData.sectorTimes}
            currentSector={hudData.currentSector}
            speedKmh={hudData.speedKmh}
            rpm={hudData.rpm}
            gear={hudData.gear}
            ersLevel={hudData.ers}
            drsOpen={hudData.drsOpen}
            drsAvail={hudData.drsAvail}
            tyreCompound={hudData.tyreCompound}
            tyreWear={hudData.tyreWear}
            tyreTemps={hudData.tyreTemps}
            damage={hudData.damage}
            leaderboard={hudData.leaderboard}
            flagStatus={hudData.flag}
            inPitLane={hudData.inPitLane}
            pitLimiter={hudData.pitLimiter}
            deltaToBest={hudData.delta}
          />

          <MobileControlsHUD
            onInput={handleTouchInput}
            onCameraToggle={() => {
              setCamMode((prev) => {
                if (prev === 'cockpit') return 'nose';
                if (prev === 'nose') return 'chase';
                if (prev === 'chase') return 'far';
                return 'cockpit';
              });
            }}
            onReset={resetPlayerToTrack}
            onPauseToggle={() => setIsPaused((prev) => !prev)}
            onMuteToggle={() => {
              setIsMuted((prev) => {
                const next = !prev;
                soundManager.setMute(next);
                return next;
              });
            }}
            onPitRequest={() => setPitModalOpen(true)}
            isMuted={isMuted}
            isPaused={isPaused}
            steerMode={steerMode}
            camName={camMode}
            drsAvail={hudData.drsAvail}
            drsOpen={hudData.drsOpen}
            ersLevel={hudData.ers}
            gear={hudData.gear}
            speedKmh={hudData.speedKmh}
            inPitLane={hudData.inPitLane}
            pitRequested={pitRequested}
          />
        </>
      )}

      {/* Garage / Main Menu */}
      {phase === 'menu' && <GarageMenu onStartRace={handleStartRace} />}

      {/* Pit Stop Strategy Modal */}
      {pitModalOpen && (
        <PitStopModal
          currentTyre={hudData.tyreCompound}
          currentWear={hudData.tyreWear}
          hasDamage={hudData.damage.frontWing > 10}
          onExecutePitStop={(newTyre, repairAero) => {
            setPitModalOpen(false);
            setPitRequested(true);
            if (engineRef.current.player) {
              engineRef.current.player.tyreCompound = newTyre;
              engineRef.current.player.tyreWear = 0;
              if (repairAero) engineRef.current.player.damage.frontWing = 0;
            }
            flashAnnouncement(`PIT STRATEGY CONFIRMED: ${newTyre} TYRES`, 2000);
          }}
          onCancel={() => setPitModalOpen(false)}
        />
      )}

      {/* Final Race Results Classification Modal */}
      {phase === 'results' && (
        <RaceResultsModal
          order={hudData.leaderboard.map((r, i) => ({
            pos: r.pos,
            code: r.code,
            teamName: TEAMS[engineRef.current.cars[i]?.team]?.name || 'F1 Team',
            bestLap: engineRef.current.cars[i]?.best || 0,
            finishTime: engineRef.current.cars[i]?.finishT || 0,
            gap: r.gap,
            isPlayer: r.isPlayer,
            color: r.color,
            tyre: r.tyre
          }))}
          playerPos={hudData.pos}
          totalLaps={currentLaps}
          trackName={currentTrackDef.name}
          onRaceAgain={() => {
            setPhase('lights');
            engineRef.current.phase = 'lights';
            engineRef.current.phaseT = 0;
            engineRef.current.raceTime = 0;
            initCars(engineRef.current.trackData, engineRef.current.player?.team || 0, hudData.tyreCompound);
          }}
          onBackToMenu={() => setPhase('menu')}
        />
      )}
    </div>
  );
}
