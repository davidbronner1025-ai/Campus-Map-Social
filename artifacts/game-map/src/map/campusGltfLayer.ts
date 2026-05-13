import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import maplibregl from "maplibre-gl";

export const CAMPUS_GLTF_REFERENCE_SPAN_M = 450;

export function computeCampusModelTransform(lng: number, lat: number, altitude: number, rotateZ: number, scale: number) {
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitude);
  const modelRotate = [Math.PI / 2, rotateZ, 0];
  const modelScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * scale;

  const translation = new THREE.Vector3(
    modelAsMercatorCoordinate.x,
    modelAsMercatorCoordinate.y,
    modelAsMercatorCoordinate.z
  );
  
  const rotation = new THREE.Euler(modelRotate[0], modelRotate[1], modelRotate[2], "XYZ");
  const scaleVec = new THREE.Vector3(modelScale, -modelScale, modelScale);

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
      const mapInstance = map;
      
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      scene.add(hemiLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      
      console.log("[Campus3D] Starting GLB load:", modelUrl);
      const loader = new GLTFLoader();
      
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
          console.error("[Campus3D] GLB Load Failed:", modelUrl, err);
        }
      );
      
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: false,
        powerPreference: "high-performance",
        precision: "mediump",
      });
      renderer.autoClear = false;
      renderer.toneMapping = THREE.NoToneMapping;
    },
    onRemove() {
      console.log("[Campus3D] Layer onRemove called. Cleaning up renderer.");
      if (renderer) {
        renderer.dispose();
      }
    },
    render(_gl, args) {
      if (!renderer || !renderer.getContext()) return;
      if (renderer.getContext().isContextLost()) return;

      // MapLibre passes the matrix either as the second argument or inside an object
      const matrix = (args && (args as any).defaultProjectionMatrix) ? (args as any).defaultProjectionMatrix : args;
      
      if (!matrix || !Array.isArray(matrix) && !(matrix instanceof Float64Array) && !(matrix instanceof Float32Array)) {
        return; 
      }

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
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
