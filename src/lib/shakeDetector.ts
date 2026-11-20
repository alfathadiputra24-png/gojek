import { useCallback, useEffect, useRef, useState } from 'react';

export interface AccelSample {
  x?: number | null;
  y?: number | null;
  z?: number | null;
}

export interface MotionInput {
  acceleration?: AccelSample | null;
  accelerationIncludingGravity?: AccelSample | null;
  timestampMs: number;
}

export interface ShakeDetectorOptions {
  threshold?: number;
  minShakes?: number;
  windowMs?: number;
  minPeakIntervalMs?: number;
  cooldownMs?: number;
}

export type MotionPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

export function computeVectorMagnitude(sample: AccelSample | null | undefined): number {
  if (!sample) return 0;
  const x = typeof sample.x === 'number' && Number.isFinite(sample.x) ? sample.x : 0;
  const y = typeof sample.y === 'number' && Number.isFinite(sample.y) ? sample.y : 0;
  const z = typeof sample.z === 'number' && Number.isFinite(sample.z) ? sample.z : 0;
  return Math.sqrt(x * x + y * y + z * z);
}

export function computeDeltaMagnitude(
  prev: AccelSample | null | undefined,
  curr: AccelSample | null | undefined
): number {
  if (!prev || !curr) return 0;
  const dx = (curr.x ?? 0) - (prev.x ?? 0);
  const dy = (curr.y ?? 0) - (prev.y ?? 0);
  const dz = (curr.z ?? 0) - (prev.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function createShakeDetector(options: ShakeDetectorOptions = {}) {
  const threshold = options.threshold ?? 16;
  const minShakes = options.minShakes ?? 2;
  const windowMs = options.windowMs ?? 900;
  const minPeakIntervalMs = options.minPeakIntervalMs ?? 140;
  const cooldownMs = options.cooldownMs ?? 3500;

  let prevGravitySample: AccelSample | null = null;
  let peakTimestamps: number[] = [];
  let lastTriggerAt = -Infinity;

  return {
    push(input: MotionInput): boolean {
      const { acceleration, accelerationIncludingGravity, timestampMs } = input;

      if (timestampMs - lastTriggerAt < cooldownMs) {
        if (accelerationIncludingGravity) {
          prevGravitySample = {
            x: accelerationIncludingGravity.x ?? 0,
            y: accelerationIncludingGravity.y ?? 0,
            z: accelerationIncludingGravity.z ?? 0,
          };
        }
        return false;
      }

      const linearMag = computeVectorMagnitude(acceleration);
      let deltaMag = 0;

      if (accelerationIncludingGravity) {
        const currGravity: AccelSample = {
          x: accelerationIncludingGravity.x ?? 0,
          y: accelerationIncludingGravity.y ?? 0,
          z: accelerationIncludingGravity.z ?? 0,
        };
        if (prevGravitySample) {
          deltaMag = computeDeltaMagnitude(prevGravitySample, currGravity);
        }
        prevGravitySample = currGravity;
      }

      const effectiveImpulse = Math.max(linearMag, deltaMag);
      if (effectiveImpulse < threshold) {
        return false;
      }

      const lastPeak = peakTimestamps[peakTimestamps.length - 1];
      if (lastPeak !== undefined && timestampMs - lastPeak < minPeakIntervalMs) {
        return false;
      }

      peakTimestamps = peakTimestamps.filter((ts) => timestampMs - ts <= windowMs);
      peakTimestamps.push(timestampMs);

      if (peakTimestamps.length >= minShakes) {
        peakTimestamps = [];
        lastTriggerAt = timestampMs;
        return true;
      }

      return false;
    },

    reset() {
      prevGravitySample = null;
      peakTimestamps = [];
      lastTriggerAt = -Infinity;
    },
  };
}

interface DeviceMotionConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

function getInitialPermissionState(): MotionPermissionState {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    return 'unsupported';
  }
  const ctor = window.DeviceMotionEvent as unknown as DeviceMotionConstructorWithPermission;
  if (typeof ctor?.requestPermission === 'function') {
    return 'prompt';
  }
  return 'granted';
}

export function shouldAttachMotionListener(
  enabled: boolean,
  paused: boolean,
  permissionState: MotionPermissionState
): boolean {
  return enabled && !paused && permissionState !== 'unsupported' && permissionState !== 'denied';
}

function hasNumericAccelSample(sample: AccelSample | null | undefined): boolean {
  if (!sample) return false;
  return (
    typeof sample.x === 'number' ||
    typeof sample.y === 'number' ||
    typeof sample.z === 'number'
  );
}

export function useShakeToReport(params: {
  enabled: boolean;
  paused: boolean;
  onShake: () => void;
}) {
  const { enabled, paused, onShake } = params;
  const [permissionState, setPermissionState] = useState<MotionPermissionState>(
    getInitialPermissionState
  );
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const permissionStateRef = useRef(permissionState);
  permissionStateRef.current = permissionState;

  const detectorRef = useRef(createShakeDetector());
  const canListen = shouldAttachMotionListener(enabled, paused, permissionState);

  useEffect(() => {
    if (!canListen) {
      detectorRef.current.reset();
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      if (
        permissionStateRef.current === 'prompt' &&
        (hasNumericAccelSample(event.acceleration) ||
          hasNumericAccelSample(event.accelerationIncludingGravity))
      ) {
        setPermissionState('granted');
      }

      const triggered = detectorRef.current.push({
        acceleration: event.acceleration,
        accelerationIncludingGravity: event.accelerationIncludingGravity,
        timestampMs: performance.now(),
      });
      if (triggered) {
        onShakeRef.current();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [canListen]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setPermissionState('unsupported');
      return false;
    }
    const ctor = window.DeviceMotionEvent as unknown as DeviceMotionConstructorWithPermission;
    if (typeof ctor?.requestPermission !== 'function') {
      setPermissionState('granted');
      return true;
    }
    try {
      const result = await ctor.requestPermission();
      const next: MotionPermissionState =
        result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'prompt';
      setPermissionState(next);
      return next === 'granted';
    } catch {
      setPermissionState('denied');
      return false;
    }
  }, []);

  return {
    permissionState,
    requestPermission,
    isSupported: permissionState !== 'unsupported',
  };
}
