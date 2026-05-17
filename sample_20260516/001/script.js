
// = 001 ======================================================================
// three.js を用いたサンプルの雛形です。
// これは基本となる雛形サンプルなので他のサンプルよりもコメント多めになってます。
// ============================================================================

// - JavaScript にあまり詳しくない方向けの解説 --------------------------------
// JavaScript がブラウザ上で動作するとき、変数などのスコープのうち、最も広い範囲
// で有効となるグローバルスコープは「ウィンドウの名前空間」です。ちょっと別の言
// い方をすると、関数内部などではない場所（たとえばファイルの冒頭など）で唐突に
// var variable = null; のように書くと window.variable = null; と同義になります。
// ただし、ちょっとややこしいのですが JavaScript のファイルが module として読み
// 込まれている場合は振る舞いが変化し、ファイルの冒頭などで変数を宣言・定義して
// いても、そのスコープはモジュールレベルに閉じるようになります。
//
// また、変数のスコープの話で言うと JavaScript では関数のような {} を使って記述
// する構文でブロック構造を作ると、そのブロック内で変数のスコープが閉じられます。
// if 文や、for 文などでも同様です。これらのことを踏まえてスクールのサンプルは原
// 則として以下のようなルールで記述しています。
//
// 1. モジュール形式で記述する
// 2. 可能な限り変数の宣言には const を使う（再代入できない変数の宣言）
// 3. 大文字のみで構成される変数・プロパティは定数的に利用する
// ----------------------------------------------------------------------------

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';

// DOM がパースされたことを検出するイベントを設定
window.addEventListener('DOMContentLoaded', () => {
  // HTML 上に定義されている親要素用への参照を取得
  const wrapper = document.querySelector('#webgl');
  // 制御クラスのインスタンスを生成
  const app = new ThreeApp(wrapper);
  // 描画
  app.render();
}, false);

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
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
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff, // マテリアルの基本色
  };

  renderer; // レンダラ
  scene;    // シーン
  camera;   // カメラ
  geometry; // ジオメトリ
  material; // マテリアル
  box;      // ボックスメッシュ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // - レンダラの初期化 -----------------------------------------------------
    // レンダラ、という言葉はフロントエンドではあまり見聞きしない言葉です。わか
    // りやすく言うなら、レンダラとは「現像する人」です。カメラが撮影したフィル
    // ムを、現像してスクリーンに映してくれる役割を担います。
    // ------------------------------------------------------------------------
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // - シーンの初期化 -------------------------------------------------------
    // Scene とは、その名のとおり 3D シーンを管理するためのものです。
    // たとえばこのシーンにはどんなオブジェクトを使うのか、あるいはどんなカメラ
    // を使って撮影を行うのかなど、描画する 3D 空間全体の情報をまとめて持ってい
    // るのが Scene オブジェクトです。
    // 3D の専門用語では、いわゆるシーングラフ（Scene Graph）と呼ばれているもの
    // で、three.js ではこれを Scene オブジェクトによって実現します。
    // ------------------------------------------------------------------------
    this.scene = new THREE.Scene();

    // - カメラの初期化 -------------------------------------------------------
    // three.js におけるカメラは、現実世界のカメラと同じように空間を撮影するため
    // に使います。
    // 現実のカメラがそうであるように、カメラの性能や、あるいは性質によって最終
    // 的に描かれる世界はまったく違ったものになります。
    // ------------------------------------------------------------------------
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // - ジオメトリとマテリアルの初期化 ---------------------------------------
    // ジオメトリとは、3D シーン上にオブジェクトを描くために使う「頂点」の集合体
    // です。もっと言うと、ジオメトリとは「単なる形状を定義したもの」であり、言
    // うなれば設計図、あるいは骨組みのようなものです。
    // ジオメトリはあくまでも設計図にすぎないので、これをどのように 3D 空間に配
    // 置するのかや、どのような色を塗るのかは、別の概念によって決まります。
    // three.js では、どのような色を塗るのかなど質感に関する設定はマテリアルとい
    // うオブジェクトがそれを保持するようになっています。
    // ------------------------------------------------------------------------
    this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.material = new THREE.MeshBasicMaterial(ThreeApp.MATERIAL_PARAM);

    // - メッシュの初期化 -----------------------------------------------------
    // three.js では、ジオメトリとマテリアルを別々に生成し組み合わせることで 3D
    // 空間に配置することができるメッシュを定義できます。
    // 定義したメッシュは、シーンに追加することではじめて描画の対象になります。
    // ------------------------------------------------------------------------
    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);
  }

  /**
   * 描画処理
   */
  render() {
    // - 描画フェーズ ---------------------------------------------------------
    // シーンに必要なオブジェクトを追加できたら、いよいよ描画です。
    // 描画を行うためには対象のシーンをレンダラでスクリーンに描画します。このと
    // き、どのカメラで描画するかを同時に指定します。
    // ------------------------------------------------------------------------
    this.renderer.render(this.scene, this.camera);
  }
}
