
// = 023 ======================================================================
// 注意：これはオマケのサンプルです！
// クォータニオンや、ベクトルの内積・外積などが登場しますので、かなり数学的に難
// しい内容となっています。このサンプルはあくまでもオマケです。理解できなくても
// くれぐれも落ち込まないようにしてください。
// このサンプルでは、飛行機を三角錐で作られたロケットに置き換え、進行方向にき
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
   * 地球の半径
   */
  static EARTH_RADIUS = 5.0;
  /**
   * 飛行機の移動速度
   */
  static SATELLITE_SPEED = 0.05;
  /**
   * 飛行機の曲がる力
   */
  static SATELLITE_TURN_SCALE = 0.1;
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x000947,
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
    far: 50.0,
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
  satellite;          // 飛行機
  satelliteMaterial;  // 飛行機用マテリアル
  satelliteDirection; // 飛行機の進行方向
  point;              // 飛行機の出発地点・到着地点の目印
  pointMaterial01;      // 飛行機の出発地点の目印用マテリアル
  pointMaterial02;      // 飛行機の到着地点の目印用マテリアル
  pointMaterial03;      // 飛行機の中間地点の目印用マテリアル
  pointPosition;      // 飛行機の出発地点・到着地点の目印の位置
  pointArray;         // 飛行機の出発地点・到着地点の目印の配列


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

    // // マウスカーソルの動きを検出できるようにする
    // window.addEventListener('pointermove', (pointerEvent) => {
    //   // ポインター（マウスカーソル）のクライアント領域上の座標
    //   const pointerX = pointerEvent.clientX;
    //   const pointerY = pointerEvent.clientY;
    //   // 3D のワールド空間に合わせてスケールを揃える
    //   const scaleX = pointerX / window.innerWidth * 2.0 - 1.0;
    //   const scaleY = pointerY / window.innerHeight * 2.0 - 1.0;
    //   // ベクトルを静止し、normalize で単位化する
    //   const vector = new THREE.Vector2(
    //     scaleX,
    //     scaleY,
    //   );
    //   vector.normalize();
    //   // スケールを揃えた値を月の座標に割り当てる
    //   this.moon.position.set(
    //     vector.x * ThreeApp.MOON_DISTANCE,
    //     0.0,
    //     vector.y * ThreeApp.MOON_DISTANCE,
    //   );
    // }, false);

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
    this.earthTexture = await loader.loadAsync(earthPath);    
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
    this.sphereGeometry = new THREE.SphereGeometry(ThreeApp.EARTH_RADIUS, 32, 32);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    // ポイントのジオメトリを生成 @@@
    this.pointGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    // ポイントのマテリアルとメッシュ
    this.pointMaterial01 = new THREE.MeshPhongMaterial({color: 0xff0000});
    this.pointMaterial02 = new THREE.MeshPhongMaterial({color: 0xaff9ff});
    this.pointMaterial03 = new THREE.MeshPhongMaterial({color: 0xffff00});

    const pointCount = 2;
    this.pointPosition = new THREE.Vector3();
    this.pointArray = [];
    
    for (let i = 0; i < pointCount; ++i) {
      let pointMaterial;
      if (i === 0) {
        pointMaterial = this.pointMaterial01;
      } else {
        pointMaterial = this.pointMaterial02;
      }
      const point = new THREE.Mesh(this.pointGeometry, pointMaterial);

      // ポイントの位置をランダムに決定する @@@
      const randomAngle_vertical = Math.random() * 360;
      const randomAngle_horizontal = Math.random() * 360;

      this.pointPosition = new THREE.Vector3(
        ThreeApp.EARTH_RADIUS * Math.cos(Math.PI / 180 * randomAngle_horizontal) * Math.cos(Math.PI / 180 * randomAngle_vertical),
        ThreeApp.EARTH_RADIUS * Math.sin(Math.PI / 180 * randomAngle_vertical),
        ThreeApp.EARTH_RADIUS * Math.sin(Math.PI / 180 * randomAngle_horizontal) * Math.cos(Math.PI / 180 * randomAngle_vertical),
      );
      point.position.copy(this.pointPosition);

      this.scene.add(point);
      
      this.pointArray.push(point);
    }

    const pointVec01 = this.pointArray[0].position.clone().normalize();
    const pointVec02 = this.pointArray[1].position.clone().normalize();
    const cos = pointVec01.dot(pointVec02);
    // (D) コサインをラジアンに戻す
    const radians = Math.acos(cos);

    if(radians > Math.PI / 2) {
      this.pointPosition = this.pointArray[0].position.clone().normalize().add(this.pointArray[1].position.clone().normalize()).normalize().multiplyScalar(ThreeApp.EARTH_RADIUS);
      const point03 = new THREE.Mesh(this.pointGeometry, this.pointMaterial03);
      point03.position.copy(this.pointPosition);
      this.scene.add(point03);
      this.pointArray.push(point03);
    }

    // コーンのジオメトリを生成 @@@
    this.coneGeometry = new THREE.ConeGeometry(0.4, 0.5, 32);
    // 飛行機のマテリアルとメッシュ
    this.satelliteMaterial = new THREE.MeshPhongMaterial({color: 0xff00dd});
    this.satellite = new THREE.Mesh(this.coneGeometry, this.satelliteMaterial);
    this.scene.add(this.satellite);
    this.satellite.scale.setScalar(0.5);
    
    this.satellite.position.copy(this.pointArray[0].position);
    this.satelliteDirection = new THREE.Vector3(0.0, 1.0, 0.0).normalize();

    console.log(this.satellite.position);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 10.0;
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
      this.earth.rotation.y += 0.01;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
