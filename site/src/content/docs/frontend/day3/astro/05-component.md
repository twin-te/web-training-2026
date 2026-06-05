---
title: "5 - Props（プロパティ）"
---

この章ではコンポーネントに外からデータを渡す「Props（プロパティ）」について学びます。

## 5.1 複数の記事を用意する

Propsの動作を確認するために、まず記事ページをもう1つ作っておきましょう。`src/pages/blog/sportsday.astro` を作成してください。

```astro
---
const tags = ["筑波大学", "スポーツ", "スポーツデー"];
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>スポーツデーに行ってきた</title>
  </head>
  <body>
    <h1>スポーツデーに行ってきた</h1>
    <p>投稿日: 2026/6/10</p>
    <ul>
      {tags.map((tag) => <li>{tag}</li>)}
    </ul>
    <h2>概要</h2>
    <p>スポーツデーの感想などがあれば書いてみましょう</p>
    <h2>感想</h2>
    <p>ここにも感想を書いてみましょう</p>
    <a href="/">トップに戻る</a>
  </body>
</html>
```

`src/pages/index.astro` にもリンクを追加しておきましょう。

```astro
<a href="/blog/sportsday">スポーツデーに行ってきた</a>
```

## 5.2 コンポーネントにPropsを渡す

それぞれの記事にシェアボタンを追加したいとします。前の章で作った`BackLink`は全ページで同じ内容でしたが、シェアボタンはページごとに**コピーするタイトルが違う**ため、コンポーネントを使う側からタイトルを渡す必要があります。

このようなコンポーネントへの「外から渡すデータ」のことを **Props** と呼びます。

まず、使う側から見てみましょう。`yadosai.astro`と`sportsday.astro`にそれぞれ`ShareButton`コンポーネントを追加します（まだ`ShareButton`は存在しませんが、先に使う側を書いてみます）。

```astro
---
import ShareButton from "../../components/ShareButton.astro";
const tags = ["筑波大学", "学園祭", "やどかり祭"];
---
...
    <ShareButton title="やどかり祭に行ってきた" />
...
```

```astro
---
import ShareButton from "../../components/ShareButton.astro";
const tags = ["筑波大学", "スポーツ", "スポーツデー"];
---
...
    <ShareButton title="スポーツデーに行ってきた" />
...
```

`<ShareButton title="..." />` のように、HTMLの属性と同じ形式でPropsを渡します。2つのページから同じコンポーネントを使いながら、`title`の値だけが異なることがわかります。

## 5.3 Propsを受け取るコンポーネントを作る

では、渡された`title`を受け取る`src/components/ShareButton.astro`を作成しましょう。

```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`「${title}」を読みました`)}`;
---

<a href={shareUrl} target="_blank">Xでシェア</a>
```

**`interface Props`** でこのコンポーネントが受け取るPropsの型を定義しています。ここでは`title`という`string`型のPropsを受け取ることを宣言しています。

**`Astro.props`** からPropsの値を取り出します。`const { title } = Astro.props` と書くことで、渡された`title`の値が変数`title`に入ります。

`encodeURIComponent` はURLに含められない文字（日本語など）を変換する関数です。

ブラウザで`/blog/yadosai`と`/blog/sportsday`それぞれのリンクをクリックすると、ページごとに異なるタイトルでXの投稿画面が開くことを確認してみましょう。
