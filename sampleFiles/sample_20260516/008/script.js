
// = 008 ======================================================================
// このサンプルの実行結果の見た目は、ほとんど 007 と同じです。
// カメラに関連したパラメータについてコメントを追記していますので各種パラメータ
// のそれぞれが、どういったことに影響を及ぼすのか、あるいはどういった意味合いを
// 持つのか、しっかりとここで再確認しておきましょう。
// 講義スライドのなかにある図式も一緒に眺めながら理解を深めるといいでしょう。
// また、それらのパラメータの意味を踏まえながら、スクリーンのサイズが変更となっ
// たとき、どのように処理すればいいのかについても考えてみましょう。
// このサンプルでは、万が一ウィンドウのサイズが変化しても大丈夫なように、リサイ
// ズイベントを設定しています。
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
   * カメラ定義のための定数 @@@
   */
  static CAMERA_PARAM = {
    // fovy は Field of View Y のことで、縦方向の視野角を意味する
    fovy: 60,
    // 描画する空間のアスペクト比（縦横比）
    aspect: window.innerWidth / window.innerHeight,
    // 描画する空間のニアクリップ面（最近面）
    near: 0.1,
    // 描画する空間のファークリップ面（最遠面）
    far: 10.0,
    // カメラの座標
    position: new THREE.Vector3(0.0, 2.0, 5.0),
    // カメラの注視点
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
  sphereGeometry;   // スフィアジオメトリ
  sphere;           // スフィアメッシュ
  torusGeometry;    // トーラスジオメトリ
  torus;            // トーラスメッシュ
  coneGeometry;     // コーンジオメトリ
  cone;             // コーンメッシュ
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

    // 各種ジオメトリからメッシュを生成し、シーンに追加する
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

    // 各種メッシュは少しずつ動かしておく
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

    // リサイズイベント @@@
    // - ウィンドウサイズの変更に対応 -----------------------------------------
    // JavaScript ではブラウザウィンドウの大きさが変わったときに resize イベント
    // が発生します。three.js や WebGL のプログラムを書く際はウィンドウや canvas
    // の大きさが変化したときは、カメラやレンダラーなどの各種オブジェクトに対し
    // てもこの変更内容を反映してやる必要があります。
    // three.js の場合であれば、レンダラーとカメラに対し、以下のように設定してや
    // ればよいでしょう。
    // ------------------------------------------------------------------------
    window.addEventListener('resize', () => {
      // レンダラの大きさを設定
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // カメラが撮影する視錐台のアスペクト比を再設定
      this.camera.aspect = window.innerWidth / window.innerHeight;
      // カメラのパラメータが変更されたときは行列を更新する
      this.camera.updateProjectionMatrix();
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
      // Y 軸回転
      this.box.rotation.y += 0.05;
      this.sphere.rotation.y += 0.05;
      this.torus.rotation.y += 0.05;
      this.cone.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
