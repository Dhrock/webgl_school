
// = 015 ======================================================================
// WebGL や three.js に限らず、CG 用語のひとつに「ポストプロセス」というキーワー
// ドがあります。
// このポストプロセスは、ポストエフェクトなどとも呼ばれることがありますが、いず
// れも意味していることはほとんど同じで「一度撮影した写真を後から加工する」とい
// うような、いわゆる後処理・後工程のことを指しています。
// three.js では、コンポーザーという概念を導入することにより、この一度撮影した、
// つまり一度レンダリングしたシーンに対して、事後処理的にエフェクトを加えること
// ができるようになります。
// ※必要となるモジュールが増えている点にも注意
// ※各種 Pass 系のモジュールが置かれている three.js のリポジトリ内の場所は……
//   ./examples/jsm/postprocessing/ 以下になります
// ============================================================================

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';
// ポストプロセス用のファイル群を追加 @@@
import { EffectComposer } from '../lib/EffectComposer.js';
import { RenderPass } from '../lib/RenderPass.js';
import { GlitchPass } from '../lib/GlitchPass.js';

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
  planeGeometry;    // プレーンジオメトリ
  planeArray;       // プレーンメッシュの配列
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  group;            // グループ
  composer;         // エフェクトコンポーザー @@@
  renderPass;       // レンダーパス @@@
  glitchPass;       // グリッチパス @@@

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

    // プレーンメッシュ
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

    // コンポーザーの設定 @@@
    // - コンポーザーやパスを初期化する ---------------------------------------
    // コンポーザーとは、直訳すると作曲家などの意味になりますが、ここではシーン
    // の切り替えを行ってくれる構成作家のようなイメージです。
    // コンポーザーは、自身に追加された順番通りにレンダリングを行ってくれるよう
    // になっていて、それぞれの「レンダリング１回分」のことをパスと呼びます。
    // １つ目のパスをレンダリングしたら、その結果をそのまま２つ目のパスに渡して
    // レンダリングする、というように次々と連鎖的にレンダリングが行われます。
    // three.js には様々な種類のパスが用意されており、ここではその中からグリッチ
    // パスをコンポーザーに渡して実行してもらいましょう。
    // renderPass: これが従来どおり普通にシーンを描くパス
    // glitchPass: これが renderPass が描画したシーンにグリッチを掛けるパス
    // ------------------------------------------------------------------------
    // 1. コンポーザーにレンダラを渡して初期化する
    this.composer = new EffectComposer(this.renderer);
    // 2. コンポーザーに、まず最初に「レンダーパス」を設定する
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    // 3. コンポーザーに第２のパスとして「グリッチパス」を設定する
    this.glitchPass = new GlitchPass();
    this.composer.addPass(this.glitchPass);
    // 4. グリッチパスまで終わったら画面に描画結果を出すよう指示する
    this.glitchPass.renderToScreen = true;
    // ※省略した場合、最後のパスが画面に自動的に出力されるようになる

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

    // レンダラーではなく、コンポーザーに対して描画を指示する @@@
    this.composer.render();
  }
}
