
// = 023 ======================================================================
// 注意：これはオマケのサンプルです！
// クォータニオンや、ベクトルの内積・外積などが登場しますので、かなり数学的に難
// しい内容となっています。このサンプルはあくまでもオマケです。理解できなくても
// くれぐれも落ち込まないようにしてください。
// このサンプルでは、人工衛星を三角錐で作られたロケットに置き換え、進行方向にき
// ちんと頭（三角錐の先端）を向けるようにしています。
// 内積や外積といったベクトル演算は、実際にどのような使いみちがあるのかわかりに
// くかったりもするので、このサンプルを通じて雰囲気だけでも掴んでおくと、いつか
// 自分でなにか特殊な挙動を実現したい、となったときにヒントになるかもしれません。
// 内積・外積だけでもかなりいろんなことが実現できますので、絶対に損はしません。
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
   * 人工衛星の移動速度
   */
  static SATELLITE_SPEED = 0.05;
  /**
   * 人工衛星の曲がる力
   */
  static SATELLITE_TURN_SCALE = 0.1;
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

  wrapper;            // canvas の親要素
  renderer;           // レンダラ
  scene;              // シーン
  camera;             // カメラ
  directionalLight;   // 平行光源（ディレクショナルライト）
  ambientLight;       // 環境光（アンビエントライト）
  controls;           // オービットコントロール
  axesHelper;         // 軸ヘルパー
  isDown;             // キーの押下状態用フラグ
  sphereGeometry;     // ジオメトリ
  coneGeometry;       // コーンジオメトリ @@@
  earth;              // 地球
  earthMaterial;      // 地球用マテリアル
  earthTexture;       // 地球用テクスチャ
  moon;               // 月
  moonMaterial;       // 月用マテリアル
  moonTexture;        // 月用テクスチャ
  satellite;          // 人工衛星
  satelliteMaterial;  // 人工衛星用マテリアル
  satelliteDirection; // 人工衛星の進行方向

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

    // マウスカーソルの動きを検出できるようにする
    window.addEventListener('pointermove', (pointerEvent) => {
      // ポインター（マウスカーソル）のクライアント領域上の座標
      const pointerX = pointerEvent.clientX;
      const pointerY = pointerEvent.clientY;
      // 3D のワールド空間に合わせてスケールを揃える
      const scaleX = pointerX / window.innerWidth * 2.0 - 1.0;
      const scaleY = pointerY / window.innerHeight * 2.0 - 1.0;
      // ベクトルを静止し、normalize で単位化する
      const vector = new THREE.Vector2(
        scaleX,
        scaleY,
      );
      vector.normalize();
      // スケールを揃えた値を月の座標に割り当てる
      this.moon.position.set(
        vector.x * ThreeApp.MOON_DISTANCE,
        0.0,
        vector.y * ThreeApp.MOON_DISTANCE,
      );
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

    // コーンのジオメトリを生成 @@@
    this.coneGeometry = new THREE.ConeGeometry(0.2, 0.5, 32);
    // 人工衛星のマテリアルとメッシュ
    this.satelliteMaterial = new THREE.MeshPhongMaterial({color: 0xff00dd});
    this.satellite = new THREE.Mesh(this.coneGeometry, this.satelliteMaterial);
    this.scene.add(this.satellite);
    this.satellite.scale.setScalar(0.5);
    // 人工衛星は北極の上あたりに配置し、初期状態は真上に向かって移動するようにしておく @@@
    this.satellite.position.set(0.0, ThreeApp.MOON_DISTANCE, 0.0);
    this.satelliteDirection = new THREE.Vector3(0.0, 1.0, 0.0).normalize();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;
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

    // (A) 現在（前のフレームまで）の進行方向を変数に保持しておく @@@
    const previousDirection = this.satelliteDirection.clone();

    // (終点 - 始点) という計算を行うことで、２点間を結ぶベクトルを定義
    const subVector = new THREE.Vector3().subVectors(this.moon.position, this.satellite.position);
    // 長さに依存せず、向きだけを考えたい場合はベクトルを単位化する
    subVector.normalize();
    // 人工衛星の進行方向ベクトルに、向きベクトルを小さくスケールして加算する
    this.satelliteDirection.add(subVector.multiplyScalar(ThreeApp.SATELLITE_TURN_SCALE));
    // (B) 加算したことでベクトルの長さが変化するので、単位化してから人工衛星の座標に加算する
    this.satelliteDirection.normalize();
    const direction = this.satelliteDirection.clone();
    this.satellite.position.add(direction.multiplyScalar(ThreeApp.SATELLITE_SPEED));

    // (C) 変換前と変換後の２つのベクトルから外積で法線ベクトルを求める @@@
    const normalAxis = new THREE.Vector3().crossVectors(previousDirection, this.satelliteDirection);
    normalAxis.normalize();
    // (D) 変換前と変換後のふたつのベクトルから内積でコサインを取り出す
    const cos = previousDirection.dot(this.satelliteDirection);
    // (D) コサインをラジアンに戻す
    const radians = Math.acos(cos);
    // 求めた法線ベクトルとラジアンからクォータニオンを定義
    const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
    // 人工衛星の現在のクォータニオンに乗算する
    this.satellite.quaternion.premultiply(qtn);

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
