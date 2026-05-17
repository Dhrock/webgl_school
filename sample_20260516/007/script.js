
// = 007 ======================================================================
// three.js にはたくさんの組み込みジオメトリがあります。
// これまでのサンプルでは一貫してボックスばかり使っていましたが、代表的なその他
// のジオメトリについてもここで試してみましょう。
// 引数がそれぞれどういった意味を持っているのか疑問に思ったときは、公式のドキュ
// メント等を参考にしましょう。
// three.js docs - https://threejs.org/docs/
//
// ちなみに、ここでは「マテリアルについては同じものを使いまわしている」という点
// も地味に重要です。個別に色や質感を変えたい場合は、もちろん別々のマテリアルを
// 使っても問題はありませんが、同じ質感であればマテリアルは再利用することで無駄
// なくプログラムを組むことができますし、メモリなども節約できます。
// ※逆に質感を変えたい場合はマテリアルは使い回すのではなく複数用意します
// ============================================================================

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
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 10.0,
    position: new THREE.Vector3(0.0, 2.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666,       // 画面をクリアする色
    width: window.innerWidth,   // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,                            // 光の色
    intensity: 1.0,                             // 光の強度
    position: new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1,  // 光の強度
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff, // マテリアルの基本色
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  boxGeometry;      // ボックスジオメトリ
  box;              // ボックスメッシュ
  sphereGeometry;   // スフィアジオメトリ @@@
  sphere;           // スフィアメッシュ @@@
  torusGeometry;    // トーラスジオメトリ @@@
  torus;            // トーラスメッシュ @@@
  coneGeometry;     // コーンジオメトリ @@@
  cone;             // コーンメッシュ @@@
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ

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

    // 各種ジオメトリからメッシュを生成し、シーンに追加する @@@
    this.boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.box = new THREE.Mesh(this.boxGeometry, this.material);
    this.scene.add(this.box);
    this.sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    this.sphere = new THREE.Mesh(this.sphereGeometry, this.material);
    this.scene.add(this.sphere);
    this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    this.torus = new THREE.Mesh(this.torusGeometry, this.material);
    this.scene.add(this.torus);
    this.coneGeometry = new THREE.ConeGeometry(0.5, 1.0, 16);
    this.cone = new THREE.Mesh(this.coneGeometry, this.material);
    this.scene.add(this.cone);

    // 各種メッシュは少しずつ動かしておく @@@
    this.box.position.set(-1.0, 1.0, 0.0);
    this.sphere.position.set(1.0, 1.0, 0.0);
    this.torus.position.set(-1.0, -1.0, 0.0);
    this.cone.position.set(1.0, -1.0, 0.0);

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
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // Y 軸回転 @@@
      this.box.rotation.y += 0.05;
      this.sphere.rotation.y += 0.05;
      this.torus.rotation.y += 0.05;
      this.cone.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
