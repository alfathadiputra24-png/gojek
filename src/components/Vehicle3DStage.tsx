import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ThreeVehicleViewer, VehicleKind } from '../lib/threeVehicleViewer';

interface Vehicle3DStageProps {
  vehicle: VehicleKind;
  onChangeVehicle?: (v: VehicleKind) => void;
  miniPromo?: boolean;
  className?: string;
}

const SWATCHES = [
  { name: 'Emerald Lintasku', hex: '#0FA958' },
  { name: 'Biru Samudra', hex: '#0284C7' },
  { name: 'Putih Mutiara', hex: '#F1F5F9' },
  { name: 'Grafit Gelap', hex: '#334155' },
  { name: 'Kuning Amber', hex: '#F59E0B' },
];

export const Vehicle3DStage: React.FC<Vehicle3DStageProps> = ({
  vehicle,
  onChangeVehicle,
  miniPromo = false,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ThreeVehicleViewer | null>(null);
  const prevVehicleRef = useRef<VehicleKind>(vehicle);
  const [ready, setReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState(SWATCHES[0].hex);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    setReady(false);
    const viewer = new ThreeVehicleViewer({
      container: el,
      initialVehicle: vehicle,
      initialColor: selectedColor,
      miniPromo,
      onReady: () => setReady(true),
    });
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // Mount once per stage lifecycle; updates flow through imperative methods below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miniPromo]);

  useEffect(() => {
    if (!viewerRef.current || prevVehicleRef.current === vehicle) return;
    const dir = vehicle === 'taksi' ? 1 : -1;
    prevVehicleRef.current = vehicle;
    viewerRef.current.setVehicle(vehicle, dir);
  }, [vehicle]);

  const handleColorSelect = (hex: string) => {
    setSelectedColor(hex);
    viewerRef.current?.setColor(hex);
  };

  if (miniPromo) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {!ready && <div className="absolute inset-0 skeleton-shimmer rounded-2xl" />}
        <div
          ref={mountRef}
          data-testid="three-promo-canvas"
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 overflow-hidden ${className}`}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 skeleton-shimmer flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-500">Memuat pratinjau 3D...</span>
        </div>
      )}

      <div
        ref={mountRef}
        data-testid="three-vehicle-canvas"
        data-vehicle={vehicle}
        className="w-full h-56 cursor-grab active:cursor-grabbing"
      />

      {/* Top left vehicle label */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-xs">
          {vehicle === 'ojek' ? 'Ojek Motor 3D · Geser 360°' : 'Taksi Mobil 3D · Geser 360°'}
        </span>
      </div>

      {/* Reset button */}
      <button
        type="button"
        aria-label="Reset sudut kamera 3D"
        onClick={() => viewerRef.current?.resetView()}
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs hover:scale-105 transition-transform"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Carousel swipe arrows */}
      {onChangeVehicle && (
        <>
          <button
            type="button"
            aria-label="Kendaraan sebelumnya"
            onClick={() => onChangeVehicle(vehicle === 'ojek' ? 'taksi' : 'ojek')}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Kendaraan berikutnya"
            onClick={() => onChangeVehicle(vehicle === 'ojek' ? 'taksi' : 'ojek')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Color swatches */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-white/85 dark:bg-slate-900/85 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Warna Armada
        </span>
        <div className="flex items-center gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              aria-label={`Pilih warna ${s.name}`}
              onClick={() => handleColorSelect(s.hex)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                selectedColor === s.hex
                  ? 'border-[#0FA958] scale-115'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
              style={{ backgroundColor: s.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
