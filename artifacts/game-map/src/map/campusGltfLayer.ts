import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
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
      const mapInstance = map; // Local reference for callbacks
      (this as any).mapInstance = map;
      
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
      scene.add(hemiLight);
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));

      // Test marker: A HUGE red cube that ignores depth to ensure it's seen
      const testGeo = new THREE.BoxGeometry(50, 50, 50);
      const testMat = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.8,
        depthTest: false // Force it to draw over the map
      });
      const testMesh = new THREE.Mesh(testGeo, testMat);
      testMesh.position.set(0, 25, 0); 
      modelContainer.add(testMesh);
      
      console.log("[Campus3D] Starting GLB load:", modelUrl);
      
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
      
      // Wake up MapLibre for the first few frames
      if (!(this as any)._wakeUp) (this as any)._wakeUp = 0;
      if ((this as any)._wakeUp < 100) {
        (this as any)._wakeUp++;
        (this as any).mapInstance?.triggerRepaint();
      }

      const matrix = (args && (args as any).defaultProjectionMatrix) ? (args as any).defaultProjectionMatrix : args;
      
      if (!matrix) {
        if (!(this as any)._loggedMatrixError) {
          console.error("[Campus3D] Render missing matrix!", { args });
          (this as any)._loggedMatrixError = true;
        }
        return;
      }

      const transform = getTransform();
      if (transform instanceof THREE.Matrix4) {
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        transform.decompose(position, quaternion, scale);
        
        // Forced diagnostic log for the first 10 frames
        if (!(this as any)._renderCount) (this as any)._renderCount = 0;
        if ((this as any)._renderCount < 10) {
          console.log(`[Campus3D] Frame ${(this as any)._renderCount}:`, { 
            pos: [position.x.toFixed(6), position.y.toFixed(6), position.z.toFixed(6)], 
            scale: [scale.x.toFixed(6), scale.y.toFixed(6), scale.z.toFixed(6)],
            matrixType: Array.isArray(matrix) ? "Array" : (matrix instanceof Float64Array ? "Float64" : typeof matrix)
          });
          (this as any)._renderCount++;
        }

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
