export interface TrackDef {
  id: string;
  name: string;
  country: string;
  flag: string;
  lengthKm: number;
  lapsDefault: number;
  turns: number;
  drsZones: Array<{ startS: number; endS: number }>;
  controlPoints: Array<[number, number]>;
  asphaltColor?: string;
  curbColorA?: string;
  curbColorB?: string;
  skyPreset?: 'day' | 'sunset' | 'night' | 'overcast';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const TRACKS: TrackDef[] = [
  {
    id: 'aurora',
    name: 'Aurora International Circuit',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
    lengthKm: 4.85,
    lapsDefault: 3,
    turns: 18,
    drsZones: [{ startS: 80, endS: 480 }],
    controlPoints: [
      [0, 0], [300, 0], [520, 0], [600, -40], [620, -140], [560, -220], [440, -240], [380, -320],
      [420, -420], [560, -460], [700, -420], [780, -320], [860, -300], [920, -380], [880, -520],
      [700, -620], [400, -640], [150, -600], [-60, -520], [-160, -400], [-140, -260], [-260, -180],
      [-320, -90], [-260, -12], [-150, 0]
    ],
    difficulty: 'Medium',
    skyPreset: 'day'
  },
  {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy',
    flag: '🇮🇹',
    lengthKm: 5.79,
    lapsDefault: 3,
    turns: 11,
    drsZones: [{ startS: 60, endS: 650 }, { startS: 1800, endS: 2400 }],
    controlPoints: [
      [0, 0], [450, 0], [850, 0], [1050, -30], [1070, -120], [980, -150], [950, -240], [1050, -420],
      [1180, -620], [1160, -780], [950, -820], [700, -780], [450, -650], [200, -450], [50, -250],
      [-80, -120], [-180, -40], [-100, 0]
    ],
    difficulty: 'Easy',
    skyPreset: 'sunset'
  },
  {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    flag: '🇧🇪',
    lengthKm: 7.00,
    lapsDefault: 2,
    turns: 19,
    drsZones: [{ startS: 90, endS: 520 }, { startS: 1400, endS: 2000 }],
    controlPoints: [
      [0, 0], [280, 0], [380, -50], [360, -180], [220, -260], [300, -420], [450, -540], [680, -520],
      [840, -400], [960, -240], [920, -80], [780, 40], [600, 20], [420, -80], [260, -120], [120, -90],
      [-50, -80], [-120, -30]
    ],
    difficulty: 'Hard',
    skyPreset: 'overcast'
  },
  {
    id: 'marinabay',
    name: 'Marina Bay Street Circuit',
    country: 'Singapore',
    flag: '🇸🇬',
    lengthKm: 4.94,
    lapsDefault: 3,
    turns: 23,
    drsZones: [{ startS: 50, endS: 400 }],
    controlPoints: [
      [0, 0], [250, 0], [360, -30], [380, -120], [310, -180], [340, -290], [250, -360], [150, -420],
      [80, -520], [-40, -480], [-120, -390], [-200, -320], [-280, -220], [-240, -120], [-180, -60],
      [-90, -10]
    ],
    difficulty: 'Hard',
    skyPreset: 'night'
  }
];

export interface TeamDef {
  id: number;
  name: string;
  code: string;
  primaryColor: number;
  secondaryColor: number;
  primaryHex: string;
  secondaryHex: string;
  powerFactor: number;
  aeroFactor: number;
}

export const TEAMS: TeamDef[] = [
  { id: 0, name: 'Volt Racing GP', code: 'VLT', primaryColor: 0xff7a1a, secondaryColor: 0x1e8fff, primaryHex: '#ff7a1a', secondaryHex: '#1e8fff', powerFactor: 1.02, aeroFactor: 1.01 },
  { id: 1, name: 'Scarlet Corsa F1', code: 'SCR', primaryColor: 0xd8102a, secondaryColor: 0xffd400, primaryHex: '#d8102a', secondaryHex: '#ffd400', powerFactor: 1.03, aeroFactor: 1.02 },
  { id: 2, name: 'Azure Alpine Sport', code: 'AZR', primaryColor: 0x2d6bff, secondaryColor: 0xff5fb0, primaryHex: '#2d6bff', secondaryHex: '#ff5fb0', powerFactor: 0.99, aeroFactor: 0.99 },
  { id: 3, name: 'Verde British GP', code: 'VRD', primaryColor: 0x0c7a5a, secondaryColor: 0xcff000, primaryHex: '#0c7a5a', secondaryHex: '#cff000', powerFactor: 1.00, aeroFactor: 1.01 },
  { id: 4, name: 'Silver Star Grand Prix', code: 'SLV', primaryColor: 0xc4cbd4, secondaryColor: 0x00d2be, primaryHex: '#c4cbd4', secondaryHex: '#00d2be', powerFactor: 1.01, aeroFactor: 1.02 },
  { id: 5, name: 'Nocturne Red Bulls', code: 'NOC', primaryColor: 0x13204a, secondaryColor: 0xe8003d, primaryHex: '#13204a', secondaryHex: '#e8003d', powerFactor: 1.04, aeroFactor: 1.03 },
  { id: 6, name: 'Polaris Alpha', code: 'POL', primaryColor: 0xf5f5f5, secondaryColor: 0xd8102a, primaryHex: '#f5f5f5', secondaryHex: '#d8102a', powerFactor: 0.98, aeroFactor: 0.98 },
  { id: 7, name: 'Solaris Haas Team', code: 'SOL', primaryColor: 0xffcc00, secondaryColor: 0x1c1c1c, primaryHex: '#ffcc00', secondaryHex: '#1c1c1c', powerFactor: 0.98, aeroFactor: 0.97 },
  { id: 8, name: 'Violetta Sauber F1', code: 'VIO', primaryColor: 0x7b2cbf, secondaryColor: 0x00ff88, primaryHex: '#7b2cbf', secondaryHex: '#00ff88', powerFactor: 0.97, aeroFactor: 0.97 },
  { id: 9, name: 'Onyx Black Arrows', code: 'ONX', primaryColor: 0x222226, secondaryColor: 0xe5b839, primaryHex: '#222226', secondaryHex: '#e5b839', powerFactor: 1.00, aeroFactor: 0.99 },
];

export interface DriverDef {
  grid: number;
  code: string;
  name: string;
  teamId: number;
  skill: number;
  aggression: number;
}

export const DRIVER_ROSTER: DriverDef[] = [
  { grid: 0, code: 'VER', name: 'Max V.', teamId: 5, skill: 1.03, aggression: 0.9 },
  { grid: 1, code: 'LEC', name: 'Charles L.', teamId: 1, skill: 1.02, aggression: 0.8 },
  { grid: 2, code: 'NOR', name: 'Lando N.', teamId: 0, skill: 1.02, aggression: 0.75 },
  { grid: 3, code: 'HAM', name: 'Lewis H.', teamId: 1, skill: 1.01, aggression: 0.7 },
  { grid: 4, code: 'RUS', name: 'George R.', teamId: 4, skill: 1.01, aggression: 0.8 },
  { grid: 5, code: 'PIA', name: 'Oscar P.', teamId: 0, skill: 1.00, aggression: 0.7 },
  { grid: 6, code: 'SAI', name: 'Carlos S.', teamId: 3, skill: 0.99, aggression: 0.7 },
  { grid: 7, code: 'ALO', name: 'Fernando A.', teamId: 3, skill: 1.01, aggression: 0.85 },
  { grid: 8, code: 'GAS', name: 'Pierre G.', teamId: 2, skill: 0.97, aggression: 0.65 },
  { grid: 9, code: 'YOU', name: 'Player One', teamId: 0, skill: 1.00, aggression: 0.8 }, // Default player
  { grid: 10, code: 'ALB', name: 'Alexander A.', teamId: 4, skill: 0.98, aggression: 0.6 },
  { grid: 11, code: 'TSU', name: 'Yuki T.', teamId: 5, skill: 0.97, aggression: 0.8 },
  { grid: 12, code: 'OCO', name: 'Esteban O.', teamId: 2, skill: 0.96, aggression: 0.75 },
  { grid: 13, code: 'HUL', name: 'Nico H.', teamId: 7, skill: 0.96, aggression: 0.6 },
  { grid: 14, code: 'BOT', name: 'Valtteri B.', teamId: 8, skill: 0.95, aggression: 0.55 },
  { grid: 15, code: 'MAG', name: 'Kevin M.', teamId: 7, skill: 0.95, aggression: 0.85 },
  { grid: 16, code: 'STR', name: 'Lance S.', teamId: 3, skill: 0.94, aggression: 0.65 },
  { grid: 17, code: 'ZHO', name: 'Guanyu Z.', teamId: 8, skill: 0.94, aggression: 0.5 },
  { grid: 18, code: 'SAR', name: 'Logan S.', teamId: 6, skill: 0.93, aggression: 0.5 },
  { grid: 19, code: 'DEV', name: 'Nyck D.', teamId: 6, skill: 0.93, aggression: 0.55 },
];

export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'WET';

export interface TyreSpec {
  name: TyreCompound;
  color: string;
  initialGrip: number;
  wearRate: number; // % wear per km
  idealTemp: number; // °C
}

export const TYRE_SPECS: Record<TyreCompound, TyreSpec> = {
  SOFT: { name: 'SOFT', color: '#ff2323', initialGrip: 1.08, wearRate: 4.5, idealTemp: 105 },
  MEDIUM: { name: 'MEDIUM', color: '#ffd400', initialGrip: 1.00, wearRate: 2.2, idealTemp: 95 },
  HARD: { name: 'HARD', color: '#f0f2f5', initialGrip: 0.94, wearRate: 1.1, idealTemp: 90 },
  WET: { name: 'WET', color: '#1a8cff', initialGrip: 0.88, wearRate: 1.8, idealTemp: 75 },
};

export type WeatherType = 'SUNNY' | 'OVERCAST' | 'RAIN';

export interface WeatherCondition {
  type: WeatherType;
  trackWetness: number; // 0 to 1
  visibility: number; // 0 to 1
  rainIntensity: number; // 0 to 1
}

export interface PlayerCarDamage {
  frontWing: number; // 0 (perfect) to 100 (destroyed)
  rearWing: number;
  engine: number;
  sidepod: number;
}
