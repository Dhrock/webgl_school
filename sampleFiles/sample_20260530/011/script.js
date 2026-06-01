
// = 011 ======================================================================
// three.js を使っているかどうかにかかわらず、3D プログラミング自体がそれなりに
// 難易度の高いジャンルです。
// その中でも、特に最初のころに引っかかりやすいのが「回転や位置」の扱いです。
// ここではそれを体験する意味も含め、グループの使い方を知っておきましょう。この
// グループという概念を用いることで、three.js ではオブジェクトの制御をかなり簡単
// に行うことができるようになっています。
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
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
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

    // グループ @@@
    // - グループを使う -------------------------------------------------------
    // three.js のオブジェクトは、グループにひとまとめにすることができます。
    // グループを使わないと実現できない挙動、というのも一部にはありますのでここ
    // で使い方だけでもしっかり覚えておきましょう。
    // 特に、グループに追加したことによって「回転や平行移動の概念が変わる」とい
    // うことが非常に重要です。
    // three.js ではこのグループ（より正確には Object3D）を親子関係のある階層構
    // 造（入れ子構造）することによって位置や回転を制御する仕組みになっています。
    // ------------------------------------------------------------------------
    this.group = new THREE.Group();
    // グループはメッシュなどと同様に Object3D を継承しているのでシーンに追加できる
    this.scene.add(this.group);

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
      // シーンに追加するのではなく、グループに追加する @@@
      // 2つに1つだけグループに追加して、groupだけを回転させる
      if (i % 2 === 0) {
        this.group.add(torus);
      } else {
        this.scene.add(torus);
      }

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
      // 個々のトーラスではなくグループを回転させると…… @@@
      this.group.rotation.y += 0.05;
      this.group.position.x = 5;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
