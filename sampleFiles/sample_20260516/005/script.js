
// = 005 ======================================================================
// オブジェクトに光を当て、より立体感を出すためにライトを導入しましょう。
// three.js を用いる場合はライトはオブジェクトとしてシーンに追加します。つまり、
// three.js ではオブジェクトを照らすライトについても、これまでに登場したオブジェ
// クトと同じように「シーンに追加する」という手順で扱えばいいのです。（ただしラ
// イトそのものはカメラには映らない、描画されないオブジェクトです）
// 3DCG の世界では、ライトには様々な種類（分類）があります。
// まずは最もポピュラーなライトである平行光源のライトをシーンに追加し、オブジェ
// クトがより立体的に見えるようにしてみましょう。
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
   * 平行光源定義のための定数 @@@
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,                            // 光の色
    intensity: 3.0,                             // 光の強度
    position: new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き
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
  directionalLight; // 平行光源（ディレクショナルライト） @@@
  geometry;         // ジオメトリ
  material;         // マテリアル
  box;              // ボックスメッシュ
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

    // ディレクショナルライト（平行光源） @@@
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // ジオメトリ
    this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

    // マテリアル @@@
    // - ライトを有効にするためにマテリアルを変更する -------------------------
    // ライトというと照らす側の光源のことばかり考えてしまいがちですが、その光を
    // 受け取る側の準備も必要です。
    // 具体的には、メッシュに適用するマテリアルをライトを受けることができるタイ
    // プに変更します。いくつかある対応するマテリアルのうち、今回はまずランバー
    // トマテリアルを選択します。
    // three.js には、ライトの影響を受けるマテリアルと、そうでないマテリアルがあ
    // ります。以前までのサンプルで利用していた MeshBasicMaterial は、ライトの影
    // 響を受けないマテリアルです。（基本的にベタ塗りになる）
    // ------------------------------------------------------------------------
    this.material = new THREE.MeshLambertMaterial(ThreeApp.MATERIAL_PARAM);

    // メッシュ
    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);

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
      this.box.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
