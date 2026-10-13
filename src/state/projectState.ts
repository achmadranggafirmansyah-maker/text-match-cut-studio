import { create } from 'zustand';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | 'custom';
export type BackgroundType = 'static' | 'dynamic';
export type BackgroundStyle = 'simple' | 'newspaper';
export type BackgroundThemeMode = 'global' | 'perSegment';   // ⬅️ BARU
export type BlurDirection = 'vertical' | 'radial';
export type BlurIntensity = 'low' | 'medium' | 'high';
export type SegmentationMode = 'sentence' | 'line' | 'phrase' | 'word';
export type TransitionStyle =
  | 'sharp-cut'
  | 'fast-zoom'
  | 'directional-slide'
  | 'punch-in-out'
  | 'alternating';
export type SoundStyle = 'minimal' | 'punchy' | 'cinematic' | 'editorial';
export type SoundDensity = 'sparse' | 'balanced' | 'energetic';

export interface ProjectState {
  // Text
  text: string;
  segmentation: SegmentationMode;

  // Canvas
  aspectRatio: AspectRatio;
  customWidth: number;
  customHeight: number;

  // Background
  backgroundType: BackgroundType;
  backgroundStyle: BackgroundStyle;
  backgroundThemeMode: BackgroundThemeMode;   // ⬅️ BARU
  backgroundCrossfadeMs: number;              // ⬅️ BARU
  blurDirection: BlurDirection;
  blurIntensity: BlurIntensity;

  // Typography
  highlightOn: boolean;
  highlightColor: string;
  chromaticAberration: boolean;
  textX: number;
  textY: number;
  textScale: number;

  // Animation
  durationSec: number;
  animationSpeed: number;
  transitionDurationMs: number;
  zoomIntensity: number;
  movementIntensity: number;
  holdDurationMs: number;
  transitionStyle: TransitionStyle;
  motionBlur: boolean;

  // Audio
  soundEnabled: boolean;
  soundStyle: SoundStyle;
  soundVolume: number;
  soundDensity: SoundDensity;
  bgMusicEnabled: boolean;
  bgMusicVolume: number;
  muted: boolean;

  // Export
  exportFormat: 'mp4';
  quality: 'standard' | 'high';

  // Runtime
  isRendering: boolean;
  renderProgress: number;
  renderStage: string;
  renderedBlobUrl: string | null;

  // Actions
  update: <K extends keyof ProjectState>(key: K, value: ProjectState[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  text: 'RUMUS 3 LANGKAH KAYA\nCara Cerdas Mengatur Keuangan\nBebas Finansial di Usia Muda',
  segmentation: 'line' as SegmentationMode,
  aspectRatio: '9:16' as AspectRatio,
  customWidth: 1080,
  customHeight: 1920,
  backgroundType: 'static' as BackgroundType,
  backgroundStyle: 'newspaper' as BackgroundStyle,
  backgroundThemeMode: 'global' as BackgroundThemeMode,   // ⬅️ default: global
  backgroundCrossfadeMs: 250,                              // ⬅️ default: 250ms
  blurDirection: 'vertical' as BlurDirection,
  blurIntensity: 'medium' as BlurIntensity,
  highlightOn: true,
  highlightColor: '#F5E663',
  chromaticAberration: true,
  textX: 0,
  textY: 0,
  textScale: 1,
  durationSec: 12,
  animationSpeed: 1,
  transitionDurationMs: 120,
  zoomIntensity: 0.7,
  movementIntensity: 0.6,
  holdDurationMs: 600,
  transitionStyle: 'alternating' as TransitionStyle,
  motionBlur: false,
  soundEnabled: true,
  soundStyle: 'editorial' as SoundStyle,
  soundVolume: 0.7,
  soundDensity: 'balanced' as SoundDensity,
  bgMusicEnabled: false,
  bgMusicVolume: 0.3,
  muted: false,
  exportFormat: 'mp4' as const,
  quality: 'high' as const,
  isRendering: false,
  renderProgress: 0,
  renderStage: '',
  renderedBlobUrl: null,
};

export const useProject = create<ProjectState>((set) => ({
  ...DEFAULTS,
  update: (key, value) => set({ [key]: value } as any),
  reset: () => set({ ...DEFAULTS }),
}));
