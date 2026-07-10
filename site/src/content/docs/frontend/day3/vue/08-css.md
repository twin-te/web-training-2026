---
title: "8. CSS"
---

Vue で CSS を利用するには幾つかの手法があり、考えられる手法を列挙します。

- scoped CSS
  - SFC の `<style>` ブロックにコンポーネント単位の CSS を書く（Vue の言語機能）
- CSS Modules
  - CSS をモジュール化する
- インラインスタイル
  - `style` 属性に直接値を入れる
- CSS フレームワーク
  - Tailwind CSS などの利用

このうち、本書では Vue に最初から組み込まれている scoped CSS と、動的なスタイルの変更（`:class`）を扱います[^styled-components]。

[^styled-components]: React 編ではクラス名の衝突問題を CSS Modules や styled-components といった追加の仕組みで解決していました。Vue では言語機能として最初から組み込まれている、というわけです。

## 8.1 scoped CSS
通常の CSS では、**全てのクラス名などがグローバルの名前空間に作成される**ため、プロジェクトの規模が大きくなるとクラス名が衝突しやすくなります。一方で SFC の `<style>` ブロックに `scoped` 属性を付けると、**コンポーネント単位で CSS がカプセル化され、この CSS はこのコンポーネントの中にしか効かなくなります**。他のコンポーネントに同じクラス名があっても衝突しません。

1 章の Thumbnail コンポーネントの `style` ブロックを見てみましょう。

**Thumbnail.vue**

```vue
<style scoped>
.thumbnail {
  width: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 32px;
  border-radius: 12px;
  gap: 32px;
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.1);
}

.thumbnail > img {
  width: 130px;
}
</style>
```

書き方は Day 1 で学んだ普通の CSS そのままで、`template` に書いた要素のクラス名などに対してスタイルを当てられます。特別な理由がない限り、`<style>` には `scoped` を付けましょう。

## 8.2 動的なスタイルの変更 - :class
状態や props の値に応じてスタイルを切り替えたい場面はよくあります。例えば「入力値が 100 以下だったら文字を赤にする」などの処理です。Vue では、`:class` ディレクティブにオブジェクトを渡すことでこれを簡単に行うことができます。以下で例を見てみましょう。

**InputNumber.vue**

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const value = ref<number>(0);

// エラーかどうかは value から計算できる値
const isError = computed(() => value.value <= 100);
</script>

<template>
  <div>
    <label :class="{ error: isError }">
      {{ isError ? "100以上の数字を入力してください" : "数字を入力してください" }}
    </label>
    <input type="number" v-model.number="value" />
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
```

重要なのは `:class="{ error: isError }"` の部分です。`:class` には `{ クラス名: 条件式 }` という形のオブジェクトを渡すことができ、**条件式が真のときだけそのクラスが要素に付きます**。クラスの付け外しに合わせて、`style` ブロックに書いたスタイルが適用されたり外れたりする、という仕組みです[^v-model-number]。

[^v-model-number]: `v-model.number` の `.number` は「入力値を数値に変換して状態に入れる」という `v-model` のオプション（修飾子）です。`input` の入力値は本来すべて文字列なので、数値として扱いたいときに付けます。

なお、`:class` は通常の `class` 属性と併用できます。常に付けたいクラスは `class="button"`、条件によって付け外したいクラスは `:class="{ active: isActive }"` のように書き分けられます。

## 8.3 演習
1. `CreateTweet` コンポーネントの「ツイート」ボタンにスタイルを当て、ツイート内容が 0 字以上 140 字以下であれば背景色を水色に、そうでなければ灰色にするように修正してください。
2. 余力があれば他の Twitter もどき周りのスタイルにも手を加え、自分好みのデザインにしてください。

<details>
    <summary>ヒント</summary>
    <p>5 章の演習で「送信できるかどうか」を <code>computed</code> にした人は、それがそのまま <code>:class</code> の条件式に使えます。</p>
</details>

---
