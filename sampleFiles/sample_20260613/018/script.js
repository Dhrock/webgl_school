
// = 018 ======================================================================
// ここではまず、三角関数の最も基本的な要素であるサインとコサインについてのおさ
// らいをしましょう。
// プログラミングにおいて、一般に角度は度数ではなくラジアンで表されます。
// JavaScript の場合も、サインやコサインを求める際の角度の指定にはラジアンを用い
// る必要があります。
// 簡潔に言えば、ラジアンとは「円の一周を２パイ」とし、それを基準に角度を表現す
// る方法です。（たとえば 1/2 パイは直角とみなすことができます）
// ここでは時間の経過（秒数）をラジアンとみなして、その値からサインとコサインを
// 求めてやり、月の座標にそれらの結果を設定しています。サインやコサインは、角度
// が変化したときどのように振る舞うのか、ここでしっかり確かめておきましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  /**
   * 月に掛けるスケール
   */
  static MOON_SCALE = 0.27;
  /**
   * 月と地球の間の距離
   */
  static MOON_DISTANCE = 3.0;
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff,
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
    intensity: 0.3,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  timer;            // 時間管理用 @@@
  sphereGeometry;   // ジオメトリ
  earth;            // 地球
  earthMaterial;    // 地球用マテリアル
  earthTexture;     // 地球用テクスチャ
  moon;             // 月
  moonMaterial;     // 月用マテリアル
  moonTexture;      // 月用テクスチャ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

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

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * アセット（素材）のロードを行う
   */
  async load() {
    const loader = new THREE.TextureLoader();
    const earthPath = './earth.jpg';
    const moonPath = './moon.jpg';
    this.earthTexture = await loader.loadAsync(earthPath);
    this.moonTexture = await loader.loadAsync(moonPath);
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

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

    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    // 月のマテリアルとメッシュ
    this.moonMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.moonMaterial.map = this.moonTexture;
    this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
    this.scene.add(this.moon);
    // 月はやや小さくして、さらに位置も動かす
    this.moon.scale.setScalar(ThreeApp.MOON_SCALE);
    this.moon.position.set(ThreeApp.MOON_DISTANCE, 0.0, 0.0);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // - Timer オブジェクト ---------------------------------------------------
    // three.js の Timer オブジェクトを使うと、時間の経過を効率よく取得・調査す
    // ることができます。
    // かつては Clock オブジェクトが用いられていましたが、現在は Timer を用いる
    // ことが推奨されています。Clock オブジェクトは時間を取得するメソッドを呼び
    // 出すと自動的に内部状態が更新されましたが、Timer オブジェクトは振る舞いが
    // 異なり、明示的に update メソッドを呼び出す必要がある点に注意しましょう。
    // ------------------------------------------------------------------------
    // Timer オブジェクトの生成 @@@
    this.timer = new THREE.Timer();
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
      this.earth.rotation.y += 0.05;
      this.moon.rotation.y += 0.05;
    }

    // 前回のフレームからの経過時間の取得 @@@
    this.timer.update();
    const time = this.timer.getElapsed();
    // 経過時間をそのままラジアンとしてサインとコサインを求める
    const sin = Math.sin(time);
    const cos = Math.cos(time);
    // 月の座標を（XZ 平面に水平に）動かす
    this.moon.position.set(
      cos * ThreeApp.MOON_DISTANCE,
      0.0,
      sin * ThreeApp.MOON_DISTANCE,
    );

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
