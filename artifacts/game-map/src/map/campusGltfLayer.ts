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
  const m = new THREE.Matrix4();
  const l = new THREE.Matrix4();
  const vecX = new THREE.Vector3(1, 0, 0);
  const vecY = new THREE.Vector3(0, 1, 0);
  const vecZ = new THREE.Vector3(0, 0, 1);
  const scaleVec = new THREE.Vector3();

  return {
    id: "campus-solar-island-gltf",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      mapInstance = map;
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
      directionalLight.position.set(0, -70, 100).normalize();
      scene.add(directionalLight);
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight2.position.set(0, 70, 100).normalize();
      scene.add(directionalLight2);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const loader = new GLTFLoader();
      
      loader.load(
        modelUrl,
        (gltf) => {
          scene.add(gltf.scene);
          mapInstance.triggerRepaint();
        },
        undefined,
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
      if (!projectionData || !projectionData.mainMatrix) return;

      const modelTransform = getModelTransform();
      if (!modelTransform || isNaN(modelTransform.translateX)) return;

      rotationX.makeRotationAxis(vecX, modelTransform.rotateX);
      rotationY.makeRotationAxis(vecY, modelTransform.rotateY);
      rotationZ.makeRotationAxis(vecZ, modelTransform.rotateZ);

      m.fromArray(projectionData.mainMatrix);
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

      camera.projectionMatrix.copy(m).multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };
}
