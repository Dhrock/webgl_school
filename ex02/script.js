import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 20,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 70.0,
    position: new THREE.Vector3(20.0, 20.0, 20.0),
    lookAt: new THREE.Vector3(0.0, 10.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  boxGeometry;      // ボックスジオメトリ（扇風機の羽根）
  boxArray;         // ボックスメッシュの配列
  capsuleGeometry;  // カプセルジオメトリ（扇風機の軸）
  cylinderGeometry; // シリンダージオメトリ（扇風機の支柱）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ @@@

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // グループ
    this.group_blade = new THREE.Group();
    this.group_fan01 = new THREE.Group();
    this.group_fan02 = new THREE.Group();
    
    this.scene.add(this.group_blade);
    this.scene.add(this.group_fan01);
    this.scene.add(this.group_fan02);

    // 扇風機のブレードをグルーピング
    const boxCount = 8;
    const transformScale = 1.7;
    this.boxGeometry = new THREE.BoxGeometry(0.7, 0.1, 2.2);
    this.boxArray = [];
    for (let i = 0; i < boxCount; ++i) {
      const box = new THREE.Mesh(this.boxGeometry, this.material);
      box.position.y = 1.1;
      box.rotation.y = (i / boxCount) * Math.PI * 2.0;
      box.position.x = Math.sin(box.rotation.y) * transformScale;
      box.position.z = Math.cos(box.rotation.y) * transformScale;

      this.group_blade.add(box);

      this.boxArray.push(box);
    }

    // 扇風機の頭部を作成
    this.capsuleGeometry = new THREE.CapsuleGeometry(1.0, 2.0, 10, 20);
    const shaft = new THREE.Mesh(this.capsuleGeometry, this.material);
    this.group_fan01.add(shaft);
    this.group_fan01.add(this.group_blade);
    
    this.group_fan01.rotation.x = Math.PI / 2.0;
    this.group_fan01.position.y = 2.0;

    // 扇風機の支柱を作成して、グループ１と合体させる
    this.cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4.0, 20);
    const pole = new THREE.Mesh(this.cylinderGeometry, this.material);
    this.group_fan02.add(pole);
    this.group_fan02.add(this.group_fan01);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // ブレードを回転させる
      this.group_blade.rotation.y -= 0.1;

      this.group_fan01.rotation.x -= 0.01;

      console.log(this.group_fan01.rotation.x);

      // 扇風機全体を回転させる
      // this.group_fan02.rotation.y -= 0.01;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
