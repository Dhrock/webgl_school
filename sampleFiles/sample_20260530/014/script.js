
// = 014 ======================================================================
// three.js ではオブジェクトの骨格をジオメトリで、質感をマテリアルで管理していま
// す。テクスチャのようなオブジェクトの表面の質感に寄与する概念は、マテリアルに
// ひとまとめになるよう、three.js では設計されています。
// ではマテリアルに関連する設定項目には、その他にどういったものがあるのでしょう
// か。マテリアルはとても奥が深く覚えなくてはならないことが多岐に渡るため、ここ
// ではまず透明度を扱いたい場合の注意点と、バックフェイスカリングについて把握し
// ておきましょう。
// ============================================================================

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
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
    far: 20.0,
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
    intensity: 0.1,
  };
  /**
   * マテリアル定義のための定数 @@@
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
    transparent: true,     // 透明を扱うかどうか
    opacity: 0.7,          // 透明度
    side: THREE.FrontSide, // 描画する面（バックフェイスカリングの設定）
  };
  // - マテリアルに関するパラメータ -------------------------------------------
  // 透明度を扱う場合、3D 特有の問題が起こるので注意が必要です。
  // 簡潔に言うと、3DCG では透明なオブジェクトがシーン上にある場合は原則として、
  // 不透明なオブジェクトを先にすべて描画したあと、アルファ値の低いオブジェクト
  // に関してはカメラから見て奥から順番に描画する必要があります。
  // three.js では WebGLRenderer が自動的に順序を並び替えてくれるため、ある程度
  // までは自動的に正しい描画が維持される場合が多いですが、けして万能ではありま
  // せんので過信は禁物です。
  // 透明度や描画順の話はやや難しく、3DCG のハマりどころとして有名です。
  // マテリアルの参考: https://threejs.org/docs/#Material
  // --------------------------------------------------------------------------
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 5.0,
    far: 15.0,
  };

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  torusGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列
  planeGeometry;    // プレーンジオメトリ @@@
  planeArray;       // プレーンメッシュの配列 @@@
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ

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

    // フォグ
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

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // トーラスメッシュ
    const torusCount = 10;
    const transformScale = 5.0;
    this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    this.torusArray = [];
    for (let i = 0; i < torusCount; ++i) {
      const torus = new THREE.Mesh(this.torusGeometry, this.material);
      torus.position.x = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.y = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.z = (Math.random() * 2.0 - 1.0) * transformScale;
      this.group.add(torus);
      this.torusArray.push(torus);
    }

    // プレーンメッシュ @@@
    const planeCount = 10;
    this.planeGeometry = new THREE.PlaneGeometry(1.0, 1.0);
    this.planeArray = [];
    for (let i = 0; i < planeCount; ++i) {
      // プレーンメッシュのインスタンスを生成
      // ※マテリアルはトーラスと共通のものを使う
      const plane = new THREE.Mesh(this.planeGeometry, this.material);
      // 座標をランダムに散らす
      plane.position.x = (Math.random() * 2.0 - 1.0) * transformScale;
      plane.position.y = (Math.random() * 2.0 - 1.0) * transformScale;
      plane.position.z = (Math.random() * 2.0 - 1.0) * transformScale;
      this.group.add(plane);
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

    // ウィンドウのリサイズを検出できるようにする
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
    const imagePath = './sample.jpg';
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(imagePath);
    this.material.map = texture;
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
      this.group.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
