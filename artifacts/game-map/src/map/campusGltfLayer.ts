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
  return {
    id: "campus-solar-island-gltf",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      mapInstance = map;
      camera.projectionMatrixAutoUpdate = false;
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
      directionalLight.position.set(0, -70, 100).normalize();
      scene.add(directionalLight);
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight2.position.set(0, 70, 100).normalize();
      scene.add(directionalLight2);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const loader = new GLTFLoader();
      console.log("[Campus3D] Starting GLB load:", modelUrl);
      loader.load(
        modelUrl,
        (gltf) => {
          console.log("[Campus3D] Model loaded successfully");
          scene.add(gltf.scene);
          mapInstance.triggerRepaint();
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = (xhr.loaded / xhr.total) * 100;
            if (percent % 10 === 0) console.log(`[Campus3D] Loading: ${percent.toFixed(0)}%`);
          }
        },
        (err) => {
          console.error("[Campus3D] Failed to load GLB:", modelUrl, err);
        },
      );
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      const projectionData = args.defaultProjectionData;
      if (!projectionData || !projectionData.mainMatrix) {
        return;
      }

      const modelTransform = getModelTransform();
      if (!modelTransform || isNaN(modelTransform.translateX)) {
        return;
      }

      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX,
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY,
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ,
      );

      const m = new THREE.Matrix4().fromArray(projectionData.mainMatrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ,
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale,
          ),
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      mapInstance.triggerRepaint();
    },
  };
}
