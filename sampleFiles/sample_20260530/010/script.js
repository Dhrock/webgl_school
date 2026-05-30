
// = 010 ======================================================================
// 3DCG は、現実世界の奥行きのある世界を「計算を駆使して」シミュレートします。
// 当然、計算方法が変化すれば描画される結果が変わってくるわけですが……
// たとえばカメラの種類も、この計算方法に大きく影響する要因の１つです。カメラは
// これまで一貫して PerspectiveCamera を使ってきましたが、three.js にはその他に
// も OrthographicCamera という別の種類のカメラがあります。
// このカメラを利用する場合、プログラマが指定するパラメータもまったく違ったもの
// になりますし、描画される際の計算方法が変化することで描画結果も変化します。
// 両者の違いについて把握しておきましょう。
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
   * 切り取る空間の広さ @@@
   */
  static CAMERA_SCALE = 5.0;
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
    color: 0x3399ff,
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  torusGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列
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

    // カメラ @@@
    const cameraParameter = this.calcCameraParameter(ThreeApp.CAMERA_SCALE);
    this.camera = new THREE.OrthographicCamera(
      cameraParameter.left,
      cameraParameter.right,
      cameraParameter.top,
      cameraParameter.bottom,
      cameraParameter.near,
      cameraParameter.far
    );
    this.camera.position.copy(cameraParameter.position);
    this.camera.lookAt(cameraParameter.lookAt);

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

    // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する
    const torusCount = 10;
    const transformScale = 5.0;
    this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    this.torusArray = [];
    for (let i = 0; i < torusCount; ++i) {
      const torus = new THREE.Mesh(this.torusGeometry, this.material);
      torus.position.x = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.y = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.z = (Math.random() * 2.0 - 1.0) * transformScale;
      this.scene.add(torus);
      this.torusArray.push(torus);
    }

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

    // リサイズイベントも平行投影専用に変更する @@@
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // OrthographicCamera 用のパラメータをあらためて取得し設定する
      const cameraParameter = this.calcCameraParameter(ThreeApp.CAMERA_SCALE);
      this.camera.left = cameraParameter.left;
      this.camera.right = cameraParameter.right;
      this.camera.top = cameraParameter.top;
      this.camera.bottom = cameraParameter.bottom;
      // カメラのパラメータを更新したときは、行列も更新
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
      this.torusArray.forEach((torus) => {
        torus.rotation.y += 0.05;
      });
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 平行投影（正射影）変換用のパラメータを計算する @@@
   * @param {number} scale - 切り取る空間の広さ係数
   */
  calcCameraParameter(scale) {
    const aspect = window.innerWidth / window.innerHeight; // アスペクト比
    const horizontal = scale * aspect;                     // 横方向のスケール
    const vertiacal = scale;                               // 縦方向のスケール
    // - 平行投影の場合のパラメータ -------------------------------------------
    // PerspectiveCamera の場合、画角とアスペクト比を指定することで撮影する範囲
    // を決定していましたが、平行投影では「視野の中心から上下左右にどれくらいの
    // 広さを撮影するか」を指定してインスタンスを生成します。
    // PerspectiveCamera が四角錐のような空間の切り取り方となるのに対し、平行投
    // 影では空間は直方体の形になるため、最終的な描画結果も変化します。
    // ------------------------------------------------------------------------
    return {
      left: -horizontal,  // 切り取る空間の左端までの距離
      right: horizontal,  // 切り取る空間の右端までの距離
      top: vertiacal,     // 切り取る空間の上端までの距離
      bottom: -vertiacal, // 切り取る空間の下端までの距離
      near: 0.1,
      far: 50.0,
      position: new THREE.Vector3(0.0, 5.0, 20.0),
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
}
