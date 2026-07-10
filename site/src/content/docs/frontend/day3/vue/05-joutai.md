---
title: "5. 状態"
---

Vue における一大トピックスの一つに**状態（state、ステート）管理**があります。状態はコンポーネント内部で保持されるもので、画面上に表示されるデータなどアプリケーションが保持している状態を指しています。**状態は props とは異なり、後から変更することができます**（props は子コンポーネントでの変更が許可されていません）。

## 5.1 ref
コンポーネントにおける状態の保持を実現するのが、`ref` 関数です。`ref` は Vue の Composition API と呼ばれる関数群の一つで、他にも状態から計算される値を作る `computed`、副作用をもたらす `watchEffect`（7 章）などがあります。本章ではこのうち、`ref` と `computed` について述べていきます。

次の例は、ボタンをクリックすると状態である `count` の値を 1 増やすコンポーネントの例です。

**Counter.vue**

```vue
<script setup lang="ts">
import { ref } from "vue";

const count = ref<number>(0);

// ボタンクリック時のイベントハンドラ
const onClickButton = () => {
  count.value++;
};
</script>

<template>
  <div>
    <button @click="onClickButton">{{ count }}</button>
  </div>
</template>
```

`ref` を用いる場合、次のように記述します。

```ts
const 状態変数 = ref<状態の型>(初期値);
```

上記の例では、状態変数が `count`、状態の型が `number`、そして初期値が `0` に該当しています。初期値はこのコンポーネントが初めてレンダリングされる場合に使用される値です。

`@click="onClickButton"` は「クリックされたら `onClickButton` 関数を呼ぶ」というディレクティブで、day1 の JavaScript で学んだ `addEventListener("click", ...)` に相当するものです[^v-on]。ボタンをクリックすることで、イベントハンドラである `onClickButton` が呼び出され、その内部の `count.value++` によって状態が更新されています。このように、**状態を書き換えるだけで画面が自動的に更新される**のが Vue の強力な特徴の一つ、リアクティビティです。

[^v-on]: `@` は `v-bind:` に対する `:` と同じく、`v-on:` の省略形です。`@input`、`@submit`、`@keydown` など、HTML のイベントは一通り使えます。

### 5.1.1 `.value` の話（重要）
ここで、先ほどのプログラムをよく見てください。`script` ブロックでは `count.value++` と書いているのに、`template` では `{{ count }}` と書いています。この違いはとても重要なので、丁寧に説明します。

`ref(0)` が返すのは、数値の `0` そのものではなく、**`0` が入った「箱」（`Ref` オブジェクト）** です。箱の中身は `count.value` で読み書きします。Vue はこの箱の `.value` への読み書きを監視していて、値が変わったら画面を更新してくれる、という仕組みです。

まとめると、次の 2 つのルールを覚えてください。

- **`script` ブロックの中では `.value` を付けて読み書きする**
- **`template` の中では `.value` を付けずにそのまま書く**（Vue が自動的に中身を取り出してくれます）

`.value` の付け忘れ（と、逆に `template` に `.value` を書いてしまうこと）は Vue 初心者が最初に踏む罠です。「画面が更新されない！」「エラーが出た！」となったら、まず `.value` を疑ってください。

## 5.2 演習 1
5.1 で示したプログラムに次のような行があります。

```ts
count.value++;
```

ここの記述を次のようなプログラムに変更してその挙動を確かめてみましょう。

```ts
count++;
```

すると、エディタ上で次のようなエラーが表示されるはずです（2 章で入れた拡張機能「Vue - Official」の働きです）。

```
Cannot assign to 'count' because it is a constant.
```

`count` は `const` で宣言された「箱そのもの」なので、箱ごと置き換えることはできません、と怒られています。私たちが変えたいのは箱の中身なので、`count.value++` が正解です。

注意したいのは、このミスをしても **`bun run dev` のターミナルやブラウザの画面にはエラーが出ない**ことです（開発サーバは型チェックをしないためです）。「ボタンをクリックしても画面が変わらない」という一見不思議な状態になるだけなので、「画面が更新されない！」と思ったら、まずエディタのエラー表示を確認する癖をつけましょう。確認したら元に戻しておきます。

## 5.3 状態に配列やオブジェクトを用いる
次のプログラムは、ボタンをクリックすると入力された名前が順に表示されるコンポーネントの例です。

**Names.vue**

```vue
<script setup lang="ts">
import { ref } from "vue";

const name = ref<string>("");
const names = ref<string[]>([]);

// ボタンがクリックされた時のイベントハンドラ
const onClickButton = () => {
  names.value.push(name.value);
};
</script>

<template>
  <div>
    <input type="text" v-model="name" />
    <button @click="onClickButton">名前を追加</button>
    <p>{{ names.join(", ") }}</p>
  </div>
</template>
```

新しい記法として `v-model` が登場しました。`v-model` は、**入力欄の値と状態を双方向に結びつける**ディレクティブです。ユーザが入力すると状態 `name` が自動的に更新され、逆にプログラム側で `name.value` を書き換えると入力欄の表示も変わります。これが 1 章の「難しい話」でいう**双方向データバインディング**です。`input` のほか、`textarea` や `select` にも使えます[^onchange]。

[^onchange]: React では `value={name}` と `onChange={...}` を両方書いて自分で状態を更新する必要がありましたが、Vue では `v-model` 1 つで済みます。

さて、このプログラムは正しく動作するでしょうか。

答えは **yes** です。`push` で配列に要素を追加しているだけですが、Vue ではこれでちゃんと画面が更新されます。Vue のリアクティビティは、`.value` への代入だけでなく、**配列やオブジェクトの中身の変化まで検知してくれる**からです[^react-array]。

[^react-array]: React 編を読んだ人向けの補足：React では `names.push(name)` では再レンダリングされず、`setNames([...names, name])` のように新しい配列を作る必要がありました（React 編 5 章参照）。Vue は Proxy という JavaScript の仕組みで中身の変更を検知しているため、`push` のような破壊的な操作もそのまま反映されます。このあたりの思想の違いは面白いので、余裕があれば「React イミュータブル Vue リアクティビティ」などで調べてみてください。

## 5.4 computed
状態から**自動的に計算される値**を作りたいときは、`computed` 関数を使います。次の例は、カウンタの値の 2 倍を表示するコンポーネントです。

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const count = ref<number>(0);

// count から自動的に計算される値
const doubled = computed(() => count.value * 2);

// ボタンクリック時のイベントハンドラ
const onClickButton = () => {
  count.value++;
};
</script>

<template>
  <div>
    <button @click="onClickButton">{{ count }}</button>
    <p>2 倍すると {{ doubled }} です</p>
  </div>
</template>
```

`computed` には「値を計算して返す関数」を渡します。元になった状態（ここでは `count`）が変わると、`doubled` も**自動的に**計算し直され、画面も更新されます。

`computed` が返すのも `ref` と同じ「箱」なので、`script` 内で使うときは `doubled.value` です（ただし読み取り専用で、`doubled.value = 10` のような代入はできません）。「状態 A から計算できる値 B」をわざわざ別の状態にせず `computed` で書くのが、Vue らしいきれいなコードのコツです。

## 5.5 子から親へ - defineEmits
props が「親 → 子」の通り道だとすると、「子 → 親」はどうすればいいのでしょうか。たとえば「子コンポーネントのボタンが押されたことを、親コンポーネントに知らせたい」という場面です[^function-props]。

[^function-props]: React では、親が定義した関数を props として子に渡し、子がそれを呼び出すことでこれを実現していました（React 編 5 章の演習参照）。

Vue では、子が**イベントを発行（emit）**し、親がそれを `@イベント名` で受け取ります。`button` の `@click` を受け取るのと同じ要領で、**自作のイベント**を受け取れるようにするイメージです。

子コンポーネント側では `defineEmits` でイベントを宣言します（`defineProps` と同じく、`import` 不要のコンパイラマクロです）。

```vue
<script setup lang="ts">
// 「submitTweet という名前で、name と text の 2 つの文字列を渡すイベント」の宣言
const emit = defineEmits<{
  submitTweet: [name: string, text: string];
}>();

const onClickButton = () => {
  // イベントを発行する
  emit("submitTweet", "名前", "ツイート内容");
};
</script>
```

親コンポーネント側では、ケバブケースにした `@submit-tweet` でイベントを受け取ります。

```vue
<template>
  <CreateTweet @submit-tweet="onSubmitTweet" />
</template>
```

`onSubmitTweet` は親側で定義する関数で、`emit` に渡した引数（`name` と `text`）を受け取ることができます。

## 5.6 演習 2
1. `src/components/CreateTweet.vue` を作成し、一つの `textarea`（ツイート内容用）と一つの `input`（名前用）、一つの `button` を 一つの `div` で囲んだコンポーネントを作成して下さい。
2. `button` 要素の値の記述を変更し、`textarea` に入力された文字数が 0 字以上 140 字以下であれば「ツイート」と、そうでなければ「送信できません」と表示されるようにプログラムを変更して下さい。
3. `defineEmits` で `submitTweet` イベント（名前とツイート内容の 2 つの文字列を渡す）を宣言し、ツイートボタンがクリックされたときに発行されるようにして下さい。
4. `App.vue` で作成した `CreateTweet` コンポーネントを呼び出し、表示を確認して下さい。

<details>
    <summary>ヒント</summary>
    <ul>
        <li>要素の値には式を記述することができます（マスタッシュ構文の中に三項演算子が書けます）。</li>
        <li>入力されている名前と入力されているツイート内容用の 2 つの状態が必要です。それぞれ <code>v-model</code> で結びつけましょう。</li>
        <li>「送信できるかどうか」は入力内容から計算できる値なので、<code>computed</code> にするのがきれいです。<code>text.value.length</code> で文字数が取れます。</li>
        <li>イベントの宣言は次のようになるはずです。</li>
        <pre>
const emit = defineEmits<{
  submitTweet: [name: string, text: string];
}>();
        </pre>
    </ul>
</details>
