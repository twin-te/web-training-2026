---
title: "7. 副作用"
---

Vue における副作用（Side Effect / Effect）とは、**Vue の管理外で DOM を更新する処理や API との非同期通信等のデータ取得など、UI の構築以外の処理**を指します。

## 7.1 watchEffect と onMounted
Vue で副作用を用いた処理を行うには、`watchEffect` 関数を利用します。`watchEffect` の書式は次の通りです。

```ts
watchEffect(コールバック関数);
```

**コールバック関数は、まずコンポーネントの作成時に一度実行され、その後はコールバック関数の中で使われている状態が変更されるたびに再実行されます**[^pre-mount]。

[^pre-mount]: 正確には、初回の実行はコンポーネントが画面に挿入される（マウントされる）**前**です。React の `useEffect`（マウント後に実行）とはタイミングが異なり、この時点では自分の DOM 要素にはまだアクセスできません。DOM が必要な処理は、後述の `onMounted` に書きましょう。

次の例は、カウンタのボタンがクリックされるごとにページのタイトルを更新するようなコンポーネントの例です。

**Counter2.vue**

```vue
<script setup lang="ts">
import { ref, watchEffect } from "vue";

const count = ref<number>(0);

// count が変更された際に実行されるコールバック関数
const callback = () => {
  document.title = `クリック数：${count.value}回`;
};

// count に変更があった場合に callback を実行する
watchEffect(callback);

// ボタンクリック時のイベントハンドラ
const incrementCount = () => {
  count.value++;
};
</script>

<template>
  <div>
    <button @click="incrementCount">{{ count }}</button>
  </div>
</template>
```

`watchEffect` が `callback` の中で使われている `count` の変更を**自動的に**監視し、変更とともに `callback` 関数を呼び出しています[^use-effect]。

[^use-effect]: React の `useEffect` では、監視したい変数を「依存配列」として自分で列挙する必要がありました（React 編 7 章参照）。Vue の `watchEffect` はコールバックの中で使われた状態を自動で追跡してくれるので、列挙は不要です。特定の状態だけを明示的に監視したい場合は、`watch(監視対象, コールバック)` という関数もあります。

一方、「状態の変更とは関係なく、マウント時に一度だけ」処理を実行したい場合には、`onMounted` 関数を使います。**マウントとは、コンポーネントに対応する DOM ノードを作成し、既存の DOM ツリーに挿入して最終的な UI に出力する処理**です。即ち、コールバック関数は UI が構築された後に呼び出されます。次のコンポーネントは、マウント時にのみアラートを表示するようなコンポーネントです。

**Alert.vue**

```vue
<script setup lang="ts">
import { onMounted } from "vue";

// マウント時に実行されるコールバック関数
const callback = () => {
  alert("マウントされました！");
};

// マウント時に callback を実行する
onMounted(callback);
</script>

<template>
  <p>ダミーテキスト</p>
</template>
```

`onMounted` のような、コンポーネントの一生（作成〜破棄）の特定のタイミングに処理を差し込む関数を**ライフサイクルフック**と呼びます。仲間には、コンポーネントが破棄される直前に呼ばれる `onUnmounted` などもあります。

なお、**`watchEffect` や `onMounted` は一つのコンポーネントの中で何度も使用することができます**。そのため監視する状態によって処理を変えることができます。

## 7.2 クリーンアップ関数
`watchEffect` のコールバック関数は、引数として `onCleanup` という関数を受け取ることができます。`onCleanup` に渡した関数は**クリーンアップ関数**と呼ばれ、**コンポーネントがアンマウントされる時にする処理を記述**することができます。特に `addEventListener` などの関数を呼び出してイベントリスナを設置しているような場合、再実行のたびにイベントリスナが登録されてしまうことがあります。このような状況を避けるためにも、**アンマウント時にイベントリスナを削除する**など、適切な処理を行う必要があります。

なお、クリーンアップ関数は、コンポーネントがアンマウントしたときだけでなく、変更の発生によってコールバック関数が再度実行される直前にも実行されます。次の例で挙動を確認してみましょう。

**Counter3.vue**

```vue
<script setup lang="ts">
import { ref, watchEffect } from "vue";

const count = ref<number>(0);

const cleanup = () => {
  console.log("クリーンアップされました！");
};

// count が変更された際に実行されるコールバック関数
watchEffect((onCleanup) => {
  document.title = `クリック数：${count.value}回`;

  onCleanup(cleanup);
});

// ボタンクリック時のイベントハンドラ
const incrementCount = () => {
  count.value++;
};
</script>

<template>
  <div>
    <button @click="incrementCount">{{ count }}</button>
  </div>
</template>
```

開発者ツールのコンソールタブを開くと、ボタンをクリックするたびに `クリーンアップされました！` と表示されているはずです。

## 7.3 コンポーネントのレンダリングと描画
Vue のコンポーネントのレンダリングは次のタイミングで行われます。

- コンポーネントの初回レンダリング時
- `template` が参照している状態（`ref`・`computed`・props）に変化があったとき

Vue がレンダリングを行うのは、変更前と変更後の仮想 DOM を構築して変更差分を検出するためであり、リアル DOM を構築する必要があるかどうかを知るためのプロセスです。変更差分がなければ DOM の更新は行われません。リアル DOM の構築は以下の通りです。

1. 変更前の仮想 DOM と変更後の仮想 DOM を用意する
2. コンポーネントの状態が書き換えられる
3. 書き換えられた状態を用いて仮想 DOM を再構築する
4. 変更前と変更後の 仮想 DOM を比較し、差分を検出する
5. 検出された差分のみリアル DOM に反映する

描画とは、レンダリングによって変更差分が見つかった場合に構築されたリアル DOM をブラウザに反映させることです。

:::tip[難しい話：React との違い]
React では「親コンポーネントがレンダリングされると、全ての子コンポーネントも無条件にレンダリングされる」という性質がありました（React 編 7 章参照）。一方 Vue は、どのコンポーネントがどの状態を参照しているかを自動で追跡しているため、**変化した状態を参照しているコンポーネントだけ**がレンダリングされます。
:::
