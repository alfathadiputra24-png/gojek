import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_PATHS } from '../config/brand';

export type VehicleKind = 'ojek' | 'taksi';

export interface VehicleViewerOptions {
  container: HTMLElement;
  initialVehicle: VehicleKind;
  initialColor?: string;
  miniPromo?: boolean;
  onReady?: () => void;
  onVehicleChange?: (vehicle: VehicleKind) => void;
}

const _targetColor = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(6, 28, 16, 0.55)');
  grad.addColorStop(0.55, 'rgba(6, 28, 16, 0.22)');
  grad.addColorStop(1, 'rgba(6, 28, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface ProceduralRig {
  group: THREE.Group;
  paintMaterials: THREE.MeshPhysicalMaterial[];
  wheels: THREE.Object3D[];
}

function buildProceduralMotorbike(initialHex: string): ProceduralRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialHex),
    metalness: 0.35,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.55,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.16,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.05,
    roughness: 0.85,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.05,
    roughness: 0.78,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd9f99d,
    emissiveIntensity: 1.5,
    roughness: 0.1,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  const makeWheel = (zPos: number) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(0, 0.34, zPos);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 14, 28), tireMat);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 18), chromeMat);
    rim.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), darkMat);
    hub.rotation.z = Math.PI / 2;
    wGroup.add(tire, rim, hub);
    group.add(wGroup);
    wheels.push(wGroup);
  };

  makeWheel(0.74);
  makeWheel(-0.74);

  // Sculpted scooter body (ExtrudeGeometry)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-0.82, 0.36);
  bodyShape.lineTo(-0.55, 0.72);
  bodyShape.quadraticCurveTo(-0.1, 0.76, 0.05, 0.44);
  bodyShape.lineTo(0.45, 0.44);
  bodyShape.quadraticCurveTo(0.75, 0.85, 0.62, 1.05);
  bodyShape.lineTo(0.84, 0.84);
  bodyShape.lineTo(0.88, 0.42);
  bodyShape.lineTo(-0.82, 0.36);

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  bodyGeo.center();
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.rotation.y = Math.PI / 2;
  bodyMesh.position.set(0, 0.66, 0.02);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Floorboard & engine deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.9), darkMat);
  deck.position.set(0, 0.38, 0.05);
  group.add(deck);

  // Saddle seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.68), seatMat);
  seat.position.set(0, 0.85, -0.24);
  seat.rotation.x = 0.06;
  group.add(seat);

  // Front fork + handlebars
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.72, 12), chromeMat);
  fork.position.set(0, 0.68, 0.62);
  fork.rotation.x = -0.3;
  group.add(fork);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.68, 12), darkMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 1.12, 0.48);
  group.add(handle);

  // Mirrors
  [-0.31, 0.31].forEach((xPos) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), darkMat);
    stem.position.set(xPos, 1.2, 0.48);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, 0.03), darkMat);
    mirror.position.set(xPos * 1.12, 1.28, 0.47);
    group.add(stem, mirror);
  });

  // LED Headlight & Taillight
  const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), glowMat);
  headlight.position.set(0, 0.86, 0.76);
  const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), tailMat);
  taillight.position.set(0, 0.76, -0.82);
  group.add(headlight, taillight);

  // Chrome exhaust pipe
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.56, 12), chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.rotation.z = -0.08;
  exhaust.position.set(0.26, 0.34, -0.48);
  group.add(exhaust);

  group.scale.setScalar(1.05);
  return { group, paintMaterials: [paintMat], wheels };
}

function buildProceduralCar(initialHex: string): ProceduralRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialHex),
    metalness: 0.42,
    roughness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.08,
  });
  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.3,
    roughness: 0.65,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.05,
    roughness: 0.85,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.4,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
  });

  // Lower sculpted car silhouette
  const profile = new THREE.Shape();
  profile.moveTo(-1.32, 0.24);
  profile.lineTo(-1.3, 0.64);
  profile.quadraticCurveTo(-1.08, 0.72, -0.78, 0.74);
  profile.lineTo(-0.46, 1.14);
  profile.lineTo(0.42, 1.14);
  profile.lineTo(0.84, 0.76);
  profile.quadraticCurveTo(1.22, 0.72, 1.32, 0.46);
  profile.lineTo(1.32, 0.24);
  profile.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 1.06,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  bodyGeo.center();
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.rotation.y = Math.PI / 2;
  body.position.set(0, 0.68, 0);
  body.castShadow = true;
  group.add(body);

  // Cabin glass shell
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.36, 1.24), glassMat);
  cabin.position.set(0, 0.96, -0.08);
  group.add(cabin);

  // Bumper & grille
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.14, 0.12), darkTrim);
  frontBumper.position.set(0, 0.32, 1.32);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.14, 0.12), darkTrim);
  rearBumper.position.set(0, 0.32, -1.32);
  group.add(frontBumper, rearBumper);

  // Headlights & Taillights
  [-0.38, 0.38].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.08), headlightMat);
    hl.position.set(x, 0.56, 1.33);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.08), tailMat);
    tl.position.set(x, 0.6, -1.33);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.1), paintMat);
    mirror.position.set(x > 0 ? 0.64 : -0.64, 0.78, 0.42);
    group.add(hl, tl, mirror);
  });

  // 4 Wheels
  const wheelCoords: Array<[number, number]> = [
    [-0.58, 0.82],
    [0.58, 0.82],
    [-0.58, -0.82],
    [0.58, -0.82],
  ];
  wheelCoords.forEach(([x, z]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(x, 0.28, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 22), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 16), alloyMat);
    rim.rotation.z = Math.PI / 2;
    wGroup.add(tire, rim);
    group.add(wGroup);
    wheels.push(wGroup);
  });

  group.scale.setScalar(0.82);
  return { group, paintMaterials: [paintMat], wheels };
}

export class ThreeVehicleViewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private miniPromo: boolean;
  private rootGroup: THREE.Group;
  private rigs: Record<VehicleKind, ProceduralRig>;
  private activeVehicle: VehicleKind;
  private activeColorHex: string;
  private frameId = 0;
  private disposed = false;
  private paused = false;

  // Interaction & kinematics state
  private yaw = 0.65;
  private targetYaw = 0.65;
  private yawVelocity = 0;
  private pitch = 0.24;
  private targetPitch = 0.24;
  private zoomDist = 3.7;
  private targetZoomDist = 3.7;
  private slideOffset = 0;
  private targetSlideOffset = 0;
  private wheelSpinSpeed = 0;
  private lastTouchAt = 0;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastTapTime = 0;
  private pinchStartDist = 0;
  private pinchStartZoom = 3.7;
  private startMs = performance.now();
  private lastFrameMs = performance.now();
  private onVehicleChange?: (vehicle: VehicleKind) => void;

  // Software GL pacing
  private renderBusy = false;
  private renderDirty = false;
  private shadowTex: THREE.CanvasTexture;
  private ringMat: THREE.MeshBasicMaterial;
  private envRT: THREE.WebGLRenderTarget;

  constructor(options: VehicleViewerOptions) {
    this.container = options.container;
    this.activeVehicle = options.initialVehicle;
    this.activeColorHex = options.initialColor || '#0FA958';
    this.miniPromo = Boolean(options.miniPromo);
    this.onVehicleChange = options.onVehicleChange;
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(120, this.container.clientWidth || 320);
    const height = Math.max(120, this.container.clientHeight || 220);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !this.miniPromo;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(this.miniPromo ? 36 : 40, width / height, 0.1, 50);
    this.zoomDist = this.miniPromo ? 3.5 : 3.7;
    this.targetZoomDist = this.zoomDist;
    this.updateCameraTransform();

    // 3-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0xdcfce7, 0.8);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.5);
    keyLight.position.set(3.5, 5.5, 4);
    if (!this.isSoftwareGl && !this.miniPromo) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(512, 512);
      keyLight.shadow.camera.left = -2.5;
      keyLight.shadow.camera.right = 2.5;
      keyLight.shadow.camera.top = 2.5;
      keyLight.shadow.camera.bottom = -2.5;
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4ade80, 0.9);
    rimLight.position.set(-4, 2.5, -3.5);
    this.scene.add(rimLight);

    // Ground platform: contact shadow + glowing green ring
    this.shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 3.1),
      new THREE.MeshBasicMaterial({
        map: this.shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.01;
    this.scene.add(shadowPlane);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x0fa958,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.24, 48), this.ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    this.scene.add(ring);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    const bikeRig = buildProceduralMotorbike(this.activeColorHex);
    const carRig = buildProceduralCar(this.activeColorHex);
    this.rigs = {
      ojek: bikeRig,
      taksi: carRig,
    };

    bikeRig.group.visible = this.activeVehicle === 'ojek';
    carRig.group.visible = this.activeVehicle === 'taksi';
    this.rootGroup.add(bikeRig.group, carRig.group);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Try optional GLB load asynchronously if user drops /public/models/*.glb
    void this.tryLoadOptionalGlb('ojek', MODEL_PATHS.motorbike);
    void this.tryLoadOptionalGlb('taksi', MODEL_PATHS.car);

    this.bindEvents();
    options.onReady?.();

    if (this.isSoftwareGl) {
      this.requestSoftwareFrame();
    } else {
      this.animate();
    }
  }

  private async tryLoadOptionalGlb(kind: VehicleKind, url: string) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) return;
      const contentType = head.headers.get('content-type') || '';
      if (contentType.includes('text/html')) return;
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      if (this.disposed) return;

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.1 / maxDim;
      gltf.scene.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
      const center = scaledBox.getCenter(new THREE.Vector3());
      gltf.scene.position.set(-center.x, -scaledBox.min.y, -center.z);

      const paintMaterials: THREE.MeshPhysicalMaterial[] = [];
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          if (mesh.name.toLowerCase().includes('body') || mesh.name.toLowerCase().includes('paint')) {
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
              paintMaterials.push(mesh.material as unknown as THREE.MeshPhysicalMaterial);
            }
          }
        }
      });

      const old = this.rigs[kind].group;
      gltf.scene.visible = old.visible;
      this.rootGroup.remove(old);
      this.rootGroup.add(gltf.scene);
      this.rigs[kind] = { group: gltf.scene, paintMaterials, wheels: [] };
      this.requestSoftwareFrame();
    } catch {
      // Missing .glb cleanly stays on procedural model
    }
  }

  public setVehicle(kind: VehicleKind, direction: -1 | 1 = 1) {
    if (this.activeVehicle === kind) return;
    this.activeVehicle = kind;
    this.rigs.ojek.group.visible = kind === 'ojek';
    this.rigs.taksi.group.visible = kind === 'taksi';
    this.slideOffset = direction * 2.2;
    this.targetSlideOffset = 0;
    this.setColor(this.activeColorHex);
    this.requestSoftwareFrame();
  }

  public setColor(hex: string) {
    this.activeColorHex = hex;
    this.requestSoftwareFrame();
  }

  public resetView() {
    this.targetYaw = 0.65;
    this.targetPitch = 0.24;
    this.targetZoomDist = this.miniPromo ? 3.5 : 3.7;
    this.yawVelocity = 0;
    this.requestSoftwareFrame();
  }

  private updateCameraTransform() {
    const r = this.zoomDist;
    const x = r * Math.cos(this.pitch) * Math.sin(this.yaw);
    const y = r * Math.sin(this.pitch) + 0.65;
    const z = r * Math.cos(this.pitch) * Math.cos(this.yaw);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0.56, 0);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(120, this.container.clientWidth || 320);
    const height = Math.max(120, this.container.clientHeight || 220);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestSoftwareFrame();
  };

  private handleVisibility = () => {
    this.paused = document.hidden;
    if (!this.paused && !this.isSoftwareGl && !this.disposed) {
      this.lastFrameMs = performance.now();
      this.animate();
    }
  };

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);

    if (this.miniPromo) return;
    const el = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        this.resetView();
      }
      this.lastTapTime = now;
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.lastTouchAt = now;
      el.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.lastTouchAt = performance.now();

      this.targetYaw -= dx * 0.011;
      this.yawVelocity = -dx * 0.09;
      this.wheelSpinSpeed = dx * 0.14;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, 0.08, 0.72);
      this.requestSoftwareFrame();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.lastTouchAt = performance.now();
      el.releasePointerCapture?.(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.lastTouchAt = performance.now();
      this.targetZoomDist = THREE.MathUtils.clamp(this.targetZoomDist + e.deltaY * 0.0025, 2.5, 5.2);
      this.requestSoftwareFrame();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.pinchStartDist = Math.hypot(dx, dy);
        this.pinchStartZoom = this.targetZoomDist;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && this.pinchStartDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = this.pinchStartDist / Math.max(10, dist);
        this.targetZoomDist = THREE.MathUtils.clamp(this.pinchStartZoom * ratio, 2.5, 5.2);
        this.requestSoftwareFrame();
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
  }

  private stepScene(dt: number, elapsed: number) {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!this.isDragging) {
      this.targetYaw += this.yawVelocity * dt;
      this.yawVelocity *= Math.exp(-5.5 * dt);

      const idleMs = performance.now() - this.lastTouchAt;
      if (!prefersReduced && (this.miniPromo || idleMs > 3000) && !this.isSoftwareGl) {
        this.targetYaw += dt * (this.miniPromo ? 0.52 : 0.32);
      }
    }

    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 10, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 10, dt);
    this.zoomDist = THREE.MathUtils.damp(this.zoomDist, this.targetZoomDist, 10, dt);
    this.slideOffset = THREE.MathUtils.damp(this.slideOffset, this.targetSlideOffset, 12, dt);

    const activeRig = this.rigs[this.activeVehicle];
    activeRig.group.position.x = this.slideOffset;
    if (!prefersReduced && !this.isSoftwareGl) {
      activeRig.group.position.y = Math.sin(elapsed * 2.1) * 0.025;
    }

    // Spin wheels with drag velocity
    this.wheelSpinSpeed *= Math.exp(-4.5 * dt);
    for (const wheel of activeRig.wheels) {
      wheel.rotation.x += this.wheelSpinSpeed * dt * 2.2;
    }

    // Smooth color swatch tween
    _targetColor.set(this.activeColorHex);
    for (const mat of activeRig.paintMaterials) {
      mat.color.lerp(_targetColor, Math.min(1, dt * 8));
    }

    this.updateCameraTransform();
  }

  private requestSoftwareFrame() {
    if (!this.isSoftwareGl || this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      const elapsed = (performance.now() - this.startMs) / 1000;
      this.stepScene(0.05, elapsed);
      this.renderer.render(this.scene, this.camera);
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(() => {
            this.renderBusy = false;
            if (this.renderDirty) this.requestSoftwareFrame();
          }, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    });
  }

  private animate = () => {
    if (this.disposed || this.paused || this.isSoftwareGl) return;
    this.frameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    const elapsed = (now - this.startMs) / 1000;
    this.stepScene(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.shadowTex.dispose();
    this.ringMat.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
  }
}
