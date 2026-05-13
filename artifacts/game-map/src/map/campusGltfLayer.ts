import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import maplibregl from "maplibre-gl";

export const CAMPUS_GLTF_REFERENCE_SPAN_M = 450;

export function computeCampusModelTransform(lng: number, lat: number, altitude: number, rotateZ: number, scale: number) {
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitude);
  const modelRotate = [Math.PI / 2, rotateZ, 0];
  
  // Use a fallback-safe scale: if polyScale is weirdly small, ensure it's at least visible
  const baseScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits();
  const finalScale = baseScale * (scale > 0.01 ? scale : 1.0);

  const translation = new THREE.Vector3(modelAsMercatorCoordinate.x, modelAsMercatorCoordinate.y, modelAsMercatorCoordinate.z);
  const rotation = new THREE.Euler(modelRotate[0], modelRotate[1], modelRotate[2], "XYZ");
  const scaleVec = new THREE.Vector3(finalScale, -finalScale, finalScale);

  return new THREE.Matrix4().compose(translation, new THREE.Quaternion().setFromEuler(rotation), scaleVec);
}

export function createCampusGltfCustomLayer(
  modelUrl: string,
  getTransform: () => { translateX: number; translateY: number; translateZ: number; rotateX: number; rotateY: number; rotateZ: number; scale: number } | THREE.Matrix4,
  onLoad?: () => void
): maplibregl.CustomLayerInterface {
  let renderer: THREE.WebGLRenderer | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const modelContainer = new THREE.Group();
  scene.add(modelContainer);

  return {
    id: "campus-gltf-layer",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      const mapInstance = map; // Local reference for callbacks
      (this as any).mapInstance = map;
      
      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(50, 100, 50);
      scene.add(dirLight);
      
      console.log("[Campus3D] Loading model...");
      
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
      
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      
      loader.load(
        modelUrl,
        (gltf) => {
          console.log("[Campus3D] GLB Load Success");
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.frustumCulled = false;
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach(m => { m.side = THREE.DoubleSide; });
              }
            }
          });
          
          // Center the model so it rotates around its centroid
          model.position.sub(center);
          modelContainer.add(model);
          console.log("[Campus3D] Model added to scene and centered.");
          mapInstance.triggerRepaint();
          onLoad?.();
        },
        (xhr) => {
          const total = xhr.total > 0 ? xhr.total : 87000000;
          const progress = ((xhr.loaded / total) * 100).toFixed(1);
          if (xhr.loaded % (1024 * 1024 * 5) < (1024 * 1024)) {
            console.log(`[Campus3D] GLB Download: ${progress}% (${(xhr.loaded / (1024 * 1024)).toFixed(1)}MB)`);
          }
        },
        (err) => {
          console.error("[Campus3D] GLB Load Failed (Catch):", modelUrl, err);
        }
      );
      
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    },
    onRemove() {
      console.log("[Campus3D] Layer onRemove called. Cleaning up renderer.");
      if (renderer) {
        renderer.dispose();
      }
    },
    render(glOrArgs: any, maybeArgs?: any) {
      if (!renderer || !renderer.getContext()) return;
      
      const args = maybeArgs ? maybeArgs : glOrArgs;
      const matrix = args.modelViewProjectionMatrix || args.defaultProjectionMatrix || (Array.isArray(args) ? args : null);

      if (!matrix) return;

      const transform = getTransform();
      if (transform instanceof THREE.Matrix4) {
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        transform.decompose(position, quaternion, scale);

        modelContainer.position.copy(position);
        modelContainer.scale.copy(scale);
        modelContainer.quaternion.copy(quaternion);
      }

      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
      
      modelContainer.traverse(obj => {
        obj.frustumCulled = false;
      });

      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
