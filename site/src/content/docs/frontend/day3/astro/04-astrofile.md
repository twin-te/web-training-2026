---
title: "4 - Astroファイルとコンポーネント"
---

この章ではAstroファイルが普通のHTMLファイルと何が違うのかと、同じ要素を使いまわす「コンポーネント」について解説します。

## 4.1 styleタグを使ったCSSの適用

[`style`タグを使ってCSSを適用する](/frontend/day1/phase3/01-hajimeni#13-css-での使用)ことも、通常のHTMLファイルと同様にできます。

試しに`src/pages/index.astro`の`</body>`の直前に`style`タグを追加してみましょう。

```astro
    <style>
      h1 {
        color: royalblue;
      }
    </style>
```

ブラウザで確認すると、`h1`が青色になっていることがわかります。

## 4.2 Scriptタグの記述とJavaScriptの実行

前章でAstroファイルはHTMLファイルと同じものであると解説しました。そのため[`script`タグを使いJavaScriptを実行する](/frontend/day1/phase3/01-hajimeni#12-html-%E3%81%A7%E3%81%AE%E4%BD%BF%E7%94%A8)ことができます。

試しに`src/pages/index.astro`を次のように書き換えてみましょう。

```astro
<html lang="ja">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="viewport" content="width=device-width" />
		<meta name="generator" content={Astro.generator} />
		<title>Astro</title>
	</head>
	<body>
		<h1>Astroからこんにちは</h1>
    <button id="test">こんにちは</button>
		<a href="/about">自己紹介</a>
    <h2>ブログ</h2>
		<a href="/blog/yadosai">やどかり祭に行ってきた</a>
    <script>
      const testButton = document.getElementById("test")
      testButton?.addEventListener("click", () => alert("JavaScriptからこんにちは"))
    </script>
    <style>
      h1 {
        color: royalblue;
      }
    </style>
	</body>
</html>
```

実際にボタンをクリックするとアラートが表示されることがわかります。このように、`script`タグ中に記述したJavaScriptはページを訪れた人のブラウザで実行されます。

しかし、Astroファイル中に記述した`script`タグは通常のHTMLファイルと異なりデフォルトでTypeScriptを使うことができるので、型の恩恵を受けることができます。例えば次のように`number`型に`string`を代入しようとするようなTypeScriptを`script`タグ内に記述するとエディターがエラーを表示します。

```ts
let i: number = "こんにちは";
```

![エディターが型の不整合を表示している](image.png)

## 4.3 フロントマター

Astroファイルの一番上には`---`で囲まれた**フロントマター**と呼ばれる領域を書くことができます。

```astro
---
// ここがフロントマター
---

<html>...
```

フロントマターにもJavaScript（TypeScript）を書くことができます。また、フロントマターで定義した変数は`{}`を使ってHTMLの中で展開することができます。

試しに`src/pages/about.astro`を次のように書き換えてみましょう。

```astro
---
const name = "筑波太郎";
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>{name}の自己紹介</title>
  </head>
  <body>
    <h1>{name}の自己紹介ページ</h1>
    <a href="/">トップに戻る</a>
  </body>
</html>
```

ブラウザで`/about`を確認すると、`h1`に「筑波太郎の自己紹介ページ」と表示されているはずです。`name`の値を変えると`title`と`h1`の両方が一度に変わることを確認してみましょう。

ではなぜ、フロントマターとscriptタグの両方にJavaScriptを書くことができるのでしょうか？それは、実行されるタイミングが異なるからです。フロントマターに書いたJavaScriptはAstroファイルをHTMLファイルに変換するときに実行され、最終的はHTMLファイルには含まれません。一方、scriptタグに書いたJavaScriptは最終的なHTMLファイルに含まれるので実際にページを開いたブラウザ上で実行されます。

実際にフロントマターとscriptタグの実行タイミングの違いを確かめてみましょう。`about.astro`を次のように書き換えてみてください。

```astro
---
const name = "筑波太郎";
const buildTime = new Date().toLocaleString("ja-JP");
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>{name}の自己紹介</title>
  </head>
  <body>
    <h1>{name}の自己紹介ページ</h1>
    <p>最終更新: {buildTime}</p>
    <a href="/">トップに戻る</a>
    <script>
      console.log("表示日時:", new Date().toLocaleString("ja-JP"));
    </script>
  </body>
</html>
```

ページをリロードしてみると、ページに表示されている「最終更新」の日時は変わらないのに、ブラウザの開発者ツールのコンソールに出力される日時はリロードのたびに変わることがわかります。フロントマターの`buildTime`はビルドした時点で確定し、`script`タグの`new Date()`はページを表示するたびにブラウザで実行されるからです。

`{}`にはJavaScriptの式であれば何でも書くことができます。これを活かして、配列のデータからHTMLの要素を自動生成することもできます。

前の章で作った`src/pages/blog/yadosai.astro`に、記事のタグを`<ul>`・`<li>`で追加してみましょう。

```astro
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>やどかり祭に行ってきた</title>
  </head>
  <body>
    <h1>やどかり祭に行ってきた</h1>
    <p>投稿日: 2026/5/29</p>
    <ul>
      <li>筑波大学</li>
      <li>学園祭</li>
      <li>やどかり祭</li>
    </ul>
    <h2>概要</h2>
    <p>やどかり祭の感想などがあれば書いてみましょう</p>
    <h2>感想</h2>
    <p>ここにも感想を書いてみましょう</p>
    <a href="/">トップに戻る</a>
  </body>
</html>
```

タグが増えるたびに`<li>`を追加する必要があります。ここでフロントマターを使ってこれを書き換えてみましょう。

```astro
---
const tags = ["筑波大学", "学園祭", "やどかり祭"];
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>やどかり祭に行ってきた</title>
  </head>
  <body>
    <h1>やどかり祭に行ってきた</h1>
    <p>投稿日: 2026/5/29</p>
    <ul>
      {tags.map((tag) => <li>{tag}</li>)}
    </ul>
    <h2>概要</h2>
    <p>やどかり祭の感想などがあれば書いてみましょう</p>
    <h2>感想</h2>
    <p>ここにも感想を書いてみましょう</p>
    <a href="/">トップに戻る</a>
  </body>
</html>
```

表示は変わりませんが、タグの追加・削除が`tags`配列の変更だけで済むようになりました。

`tags.map((tag) => <li>{tag}</li>)` の`map`は、配列の各要素を別の値に変換するメソッドです。`(tag) => <li>{tag}</li>` は「`tag`を受け取り、`<li>{tag}</li>`に変換する」という処理を表しています。

```
["筑波大学", "学園祭", "やどかり祭"]
    ↓ map
[<li>筑波大学</li>, <li>学園祭</li>, <li>やどかり祭</li>]
```

この変換結果をAstroが`<ul>`の中に並べて出力します。

## 4.4 コンポーネント

Webサイトを作るときにはたびたび、同じ要素をいろいろなページで使いまわしたいことがあります。例えば先ほどの例だとトップページ以外のすべてのページに `<a href="/">トップに戻る</a>`と書いていました。

もし、この「トップに戻る」に色をつけたり、「ホームに戻る」に変えたくなったらたくさんのファイルを書き換える必要が出てきます。そこで、複数のファイルが同じ要素を使うことができるための仕組み「コンポーネント」が登場します。

Astroのコンポーネントはページと同様に`.astro`ファイルとして作成します。慣習として`src/components/`ディレクトリに置きます。

試しに`src/components/BackLink.astro`を作成してみましょう。中身は再利用したい部分だけを記述します。

```astro
<a href="/">トップに戻る</a>
```

次に、このコンポーネントを`src/pages/about.astro`で使ってみます。別のファイルで定義したものを使いたいときは、フロントマターに`import`文を書いて読み込む必要があります。読み込んだコンポーネントはHTMLタグのように`<BackLink />`と書くことで使えます。

```astro
---
import BackLink from "../components/BackLink.astro";
const name = "筑波太郎";
const buildTime = new Date().toLocaleString("ja-JP");
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>{name}の自己紹介</title>
  </head>
  <body>
    <h1>{name}の自己紹介ページ</h1>
    <p>最終更新: {buildTime}</p>
    <BackLink />
    <script>
      console.log("表示日時:", new Date().toLocaleString("ja-JP"));
    </script>
  </body>
</html>
```

同様に、`src/pages/blog/yadosai.astro`にも`BackLink`コンポーネントを追加してみましょう。

```astro
---
import BackLink from "../../components/BackLink.astro";
const tags = ["筑波大学", "学園祭", "やどかり祭"];
---

<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>やどかり祭に行ってきた</title>
  </head>
  <body>
    <h1>やどかり祭に行ってきた</h1>
    <p>投稿日: 2026/5/29</p>
    <ul>
      {tags.map((tag) => <li>{tag}</li>)}
    </ul>
    <h2>概要</h2>
    <p>やどかり祭の感想などがあれば書いてみましょう</p>
    <h2>感想</h2>
    <p>ここにも感想を書いてみましょう</p>
    <BackLink />
  </body>
</html>
```

ブラウザで`/about`と`/blog/yadosai`の両方を確認すると、どちらにも「トップに戻る」リンクが表示されているはずです。

次に`BackLink.astro`に`style`タグを追加して、リンクに色をつけてみましょう。

```astro
<a href="/">トップに戻る</a>

<style>
  a {
    color: royalblue;
    font-weight: bold;
  }
</style>
```

ブラウザで`/about`と`/blog/yadosai`を再確認すると、両方のページで「トップに戻る」リンクが青色・太字になっていることがわかります。コンポーネントのファイルを1つ変更するだけで、使っているすべてのページに反映されます。

## 4.5 スコープドCSS

4.1でAstroの`style`タグを使いましたが、実はAstroの`style`タグには通常のHTMLと大きな違いがあります。それは**スコープ**です。

Astroの`style`タグに書いたCSSは、そのファイル内の要素にしか適用されません。例えば先ほど`src/pages/index.astro`に追加したこのCSSは、

```astro
    <style>
      h1 {
        color: royalblue;
      }
    </style>
```

`/about`ページの`h1`には影響しません。ブラウザで`/about`を確認すると、`h1`が青くなっていないことがわかります。

この仕組みにより、あるページやコンポーネントのCSSが意図せず他のページに影響してしまう問題を防ぐことができます。

逆に、すべてのページに共通して適用したいCSSがある場合は、CSSファイルをフロントマターで`import`することができます。

試しに`src/styles/global.css`を作成してみましょう。

```css
a {
  color: royalblue;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

このファイルを`src/pages/index.astro`のフロントマターで読み込みます。

```astro
---
import "../styles/global.css";
---
```

`/about`や`/blog/yadosai`など他のページも確認してみましょう。`import`したCSSはスコープが限定されず全ページに適用されるため、各ページのリンクがすべて同じスタイルになっていることがわかります。
