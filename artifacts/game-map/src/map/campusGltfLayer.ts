import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CAMPUS_GLTF_SCALE_MULTIPLIER } from "../data/campusData";
export type CampusModelTransform = {
  translateX: number;
  translateY: number;
  translateZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
};
export function computeCampusModelTransform(
  lng: number,
  lat: number,
  altitudeMeters: number,
  rotateYRad: number,
  /** Extra factor from polygon size (1 = default). */
  polygonScaleFactor = 1,
): CampusModelTransform {
  const modelRotate = [Math.PI / 2, rotateYRad, 0] as const;
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitudeMeters);
  return {
    translateX: mc.x,
    translateY: mc.y,
    translateZ: mc.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    scale:
      mc.meterInMercatorCoordinateUnits() *
      CAMPUS_GLTF_SCALE_MULTIPLIER *
      polygonScaleFactor,
  };
}
export function createCampusGltfCustomLayer(
  modelUrl: string,
  getModelTransform: () => CampusModelTransform,
): maplibregl.CustomLayerInterface {
  let mapInstance!: maplibregl.Map;
  let renderer!: THREE.WebGLRenderer;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const rotationX = new THREE.Matrix4();
  const rotationY = new THREE.Matrix4();
  const rotationZ = new THREE.Matrix4();
  const l = new THREE.Matrix4();
  const vecX = new THREE.Vector3(1, 0, 0);
  const vecY = new THREE.Vector3(0, 1, 0);
  const vecZ = new THREE.Vector3(0, 0, 1);
  const scaleVec = new THREE.Vector3();

  const modelContainer = new THREE.Group();
  modelContainer.matrixAutoUpdate = false;
  scene.add(modelContainer);

  const debugCube = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, depthTest: false })
  );
  debugCube.renderOrder = 9999;
  modelContainer.add(debugCube);

  return {
    id: "campus-solar-island-gltf",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      mapInstance = map;
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight.position.set(50, 70, 100).normalize();
      scene.add(directionalLight);
      
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      scene.add(hemiLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          
          console.log("[Campus3D] Model Bounding Box Center:", center);
          
          model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.frustumCulled = false;
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach(m => {
                  m.side = THREE.DoubleSide;
                });
              }
            }
          });
          
          // Center the model so it rotates around its centroid
          model.position.sub(center);
          modelContainer.add(model);
          mapInstance.triggerRepaint();
        },
        (xhr) => {
          if (xhr.total > 0) {
            const p = (xhr.loaded / xhr.total) * 100;
            if (Math.floor(p) % 10 === 0) {
              console.log(`[Campus3D] GLB Progress: ${p.toFixed(0)}% (${xhr.loaded}/${xhr.total})`);
            }
          } else {
            if (xhr.loaded > 0 && xhr.loaded % (1024 * 1024 * 5) === 0) {
              console.log(`[Campus3D] GLB Loaded: ${(xhr.loaded / (1024 * 1024)).toFixed(1)}MB`);
            }
          }
        },
        (err) => {
          console.error("[Campus3D] Critical failure loading GLB:", modelUrl, err);
        },
      );
      
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
      renderer.toneMapping = THREE.NoToneMapping;
    },
    render(_gl, args) {
      const projectionData = args.defaultProjectionData;
      if (!projectionData || !projectionData.mainMatrix) return;

      const modelTransform = getModelTransform();
      // Guard against null/NaN/Infinite values which disrupt the rendering pipeline
      if (!modelTransform || 
          isNaN(modelTransform.translateX) || 
          isNaN(modelTransform.translateY) || 
          isNaN(modelTransform.scale) ||
          modelTransform.scale <= 0) return;

      rotationX.makeRotationAxis(vecX, modelTransform.rotateX);
      rotationY.makeRotationAxis(vecY, modelTransform.rotateY);
      rotationZ.makeRotationAxis(vecZ, modelTransform.rotateZ);

      camera.projectionMatrix.fromArray(projectionData.mainMatrix);
      scaleVec.set(modelTransform.scale, -modelTransform.scale, modelTransform.scale);
      
      l.makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ,
      )
      .scale(scaleVec)
      .multiply(rotationX)
      .multiply(rotationY)
      .multiply(rotationZ);

      // Single update for the whole container
      modelContainer.matrix.copy(l);
      
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
