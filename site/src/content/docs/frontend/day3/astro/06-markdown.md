---
title: "6. Markdownの利用"
---

この章ではMarkdownというファイル形式を紹介し、AstroでMarkdownを使ってページを作成する方法を解説します。

## 6.1 Markdownとは

MarkdownはHTMLよりも簡単な記法で書くことができる代わりに、色や動きをつけることができない「[マークアップ言語](/frontend/day1/phase1/01-html-toha#11-概要)」で`.md`という拡張子で保存されます。HTMLほどの自由度が必要ないブログやニュースなどの内容や、メモや議事録を取るのに使われることもあります。今みなさんが読んでいるこの教科書も[Markdownファイル](https://github.com/sohosai/web-training-2026/blob/main/site/src/content/docs/frontend/day1.md)で作られています。
<!-- TODO: このページへのリンクに変更してもいいかも -->

Markdownでは、HTMLタグの代わりに次のような記法を使います。

| Markdown | HTML |
| --- | --- |
| `# 見出し1` | `<h1>見出し1</h1>` |
| `## 見出し2` | `<h2>見出し2</h2>` |
| `**太字**` | `<strong>太字</strong>` |
| `[リンク](URL)` | `<a href="URL">リンク</a>` |

## 6.2 AstroファイルをMarkdownに変換する

これまで作成してきた`yadosai.astro`をMarkdown形式にしてみると下記のようになります。

```md
---
title: やどかり祭に行ってきた
date: 2026/5/29
tags: ["筑波大学", "学園祭", "やどかり祭"]
---

## 概要

やどかり祭の感想などがあれば書いてみましょう

## 感想

ここにも感想を書いてみましょう

[ホームに戻る](/)
```

`---` で囲まれた部分は[Astroファイルのフロントマター](/frontend/day3/astro/04-astrofile#43-フロントマター)と同じく**フロントマター**と呼ばれますが、役割はまったく異なります。Astroファイルのフロントマターにはビルド時に実行されるJavaScript（TypeScript）を書きましたが、Markdownのフロントマターにはコードではなく`title`・`date`・`tags`のようなページに関する情報（メタデータ）をキーと値のペアで記述します。ここに書いた情報は、後の章で紹介するレイアウト機能を使うことでページに反映できます。

実際に `src/pages/blog/yadosai.astro` を削除して、代わりに `src/pages/blog/yadosai.md` として保存してみましょう。ブラウザから http://localhost:4321/blog/yadosai にアクセスすると、同じURLで引き続きページが表示されることが確認できます。

:::tip[演習]
`src/pages/blog/sportsday.astro` も同様に `src/pages/blog/sportsday.md` へ変換してみましょう。フロントマターには `title`・`date`・`tags` を含めてください。
:::
