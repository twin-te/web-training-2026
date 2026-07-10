---
title: "2. サーバを用意しよう"
description: "SSH 鍵を作り、Akamai Cloud (Linode) の Web UI で VM とファイアウォールを作って、SSH でログインするところまで。"
---

このページでは、Twin:te の引っ越し先になるサーバをクラウド上に用意します。SSH 鍵の準備 → VM の作成 → ファイアウォールの設定 → SSH ログイン、の順です。

## Step 1: SSH 鍵を用意しよう

クラウド上のサーバには SSH(Secure Shell)というプロトコルでログインして操作します。
パスワードでもログインできますが、推測や総当たりに弱いので、実際の運用では**公開鍵認証**を使うのが基本です。

公開鍵認証は、手元に秘密鍵・サーバに公開鍵を置いておき、「対応する秘密鍵を持っている人だけログインできる」という仕組みです[^pubkey]。

[^pubkey]: GitHub に SSH で push するときに使ったあの鍵と同じ仕組みです。既に鍵を作ったことがある人は、それを使い回しても構いません(公開鍵は名前の通り公開してよいものなので、複数のサービスに同じ公開鍵を登録して問題ありません)。

まだ鍵を持っていない人は、手元のターミナルで作りましょう。

(`$`はシェルの入力部分ですよという意味で書いているので打たなくて大丈夫ですよ)

```sh
$ ssh-keygen -t ed25519
```

いくつか質問されますが、全部そのまま `Enter` で大丈夫です。
すると `~/.ssh/` 以下に

- `id_ed25519` — **秘密鍵。絶対に人に見せない・送らない**
- `id_ed25519.pub` — 公開鍵。こっちをサーバに登録する

の2つのファイルができます。

公開鍵の中身を表示してみましょう。

```sh
$ cat ~/.ssh/id_ed25519.pub
ssh-ed25519 AAAA...(長い文字列)... yourname@yourpc
```

この1行を後で使うので、コピーできるようにしておいてください。

Windows で `ssh-keygen` が見つからない、などで詰まったら周りのTAに聞いてください(PowerShell に OpenSSH が入っているはずですが、環境によって差があります)。

## Step 2: Web UI で VM を作ろう

いよいよ VM を作ります。
[Cloud Manager](https://cloud.linode.com/) の右上の **Create** ボタンから **Linode** を選んでください。
Linode ではひとつひとつの VM のことを「Linode」と呼びます。

<!-- TODO: screenshot (Create → Linode のメニュー) -->

作成フォームでは以下のように設定します。

| 項目 | 設定値 | 理由 |
|---|---|---|
| Images | **Ubuntu 24.04 LTS** | 本番と同じ OS |
| Region | **Osaka, JP (jp-osa)** | 本番と同じリージョン。日本から一番近い |
| Linode Plan | **Shared CPU → Linode 4GB** (`g6-standard-2`) | 後述 |
| Linode Label | **`training-<あなたのGitHubユーザー名>`** | 後述 |
| Root Password | 強いパスワードを設定 | 忘れてもいいくらい強いのを |
| SSH Keys | Step 1 で作った**公開鍵**(`.pub` の方)を登録 | これでログインする |

<!-- TODO: screenshot (Linode 作成フォーム: Region と Plan の選択) -->
<!-- TODO: screenshot (Linode 作成フォーム: SSH Keys の追加ダイアログ) -->

いくつか補足します。

**プランについて**: 実は本番の Twin:te は、これよりずっと非力な一番安いプラン **Nanode 1GB**(メモリ 1GB、月$5)で動いています。「あのユーザー数のサービスがメモリ 1GB で足りるの?」と思うかもしれませんが、足りるのです。なぜ本番は 1GB で足りて、今日はその4倍のメモリを使うのか——その種明かしは、[次のページ](/infra/deploy/)で Twin:te の動かし方と一緒に説明します。

**Label について**: インスタンス名は必ず **`training-<あなたのGitHubユーザー名>`** にしてください(例: `training-arata-nvm`)。チームアカウントを共有しているので、誰のインスタンスか分かるようにするためと、演習後に**運営が消し忘れを検出する**ためのルールです。

設定できたら **Create Linode** を押しましょう。
ステータスが `PROVISIONING` からしばらくして `RUNNING` になれば、あなたのサーバがインターネット上に誕生しています。
インスタンスの詳細画面に表示される **Public IP アドレス**(例: `172.233.xx.xx`)をメモしておいてください。

<!-- TODO: screenshot (RUNNING 状態のインスタンス詳細画面。IP アドレスの場所を指す) -->

## Step 3: Cloud Firewall を作ろう

作った VM に SSH したいところですが、その前にファイアウォールを設定します。

インターネットに公開されたサーバには、世界中から**常時**怪しいアクセスが飛んできます[^scan]。
なので「許可した通信以外は全部落とす」のがサーバ公開の基本姿勢です。
Linode にはこれを VM の外側でやってくれる **Cloud Firewall** という機能があります。

[^scan]: 大袈裟に聞こえるかもしれませんが本当です。演習が終わる頃に VM の `/var/log/auth.log` を見てみると、知らない IP からの SSH ログイン試行が既に大量に記録されていて背筋が寒くなりますよ。

左メニューの **Firewalls** から **Create Firewall** を選び、次のように作ってください。

- Label: `training-<あなたのGitHubユーザー名>-fw`
- Linodes: さっき作った自分のインスタンスを選択(後からアタッチも可能)

作成した Firewall の **Rules** タブを見てみましょう。
**Default Inbound Policy が `Drop`** になっていることを確認してください。
これは「明示的に許可した inbound(外→サーバ)通信以外は全部捨てる」という意味です。
Outbound(サーバ→外)は `Accept` のままで構いません。

<!-- TODO: screenshot (Firewall の Rules タブ。Default Inbound Policy: Drop の状態) -->

さて、ここでルールを何も足さずに、試しに SSH してみましょう。
手元のターミナルから、Step 2 でメモした IP アドレスに向けて:

```sh
$ ssh root@<あなたのVMのIPアドレス>
```

……。

…………。

うんともすんとも言いませんね。しばらく待つとこうなるはずです。

```sh
ssh: connect to host 172.233.xx.xx port 22: Operation timed out
```

そうです、**SSH(ポート22)も inbound 通信**なので、Default Inbound Policy `Drop` に飲み込まれて捨てられているのです。
自分すら入れない、世界一安全で世界一役に立たないサーバの完成です。

Backend 編の [Phase 2](/backend/2-practice/phase2/) で「ポートを開けないとアクセスできない」というのをやった人は、あのときの `docker-compose.yml` の `ports:` と似た話だと気づいたかもしれません。
場所も仕組みも違いますが、「通信はデフォルトで通らない。通したいものを明示的に開ける」という発想は同じです。

では SSH を通しましょう。Rules タブの **Add an Inbound Rule** で、

- Preset: **SSH**(TCP / Port 22 / Sources: All IPv4, All IPv6 が自動で入ります)

を追加して、**Save Changes** を忘れずに押してください。

<!-- TODO: screenshot (Add an Inbound Rule で SSH プリセットを選んだ状態) -->

もう一度 SSH してみると:

```sh
$ ssh root@<あなたのVMのIPアドレス>
...
Welcome to Ubuntu 24.04 LTS (GNU/Linux ...)
root@localhost:~#
```

入れました!成功です!
初回接続時に `Are you sure you want to continue connecting?` と聞かれたら `yes` と答えてください[^hostkey]。

[^hostkey]: 「このサーバ、初めて会う相手だけど本当に信用していい?」という確認です。接続先ホストの鍵(ホストキー)を記憶して、次回以降なりすましを検出できるようにしています。

ちなみに、この演習でインターネットに向けて開けるポートは、最後までこの **22 だけ**です。「え、Web アプリを公開するのにポートを開けなくていいの?」と思った人、良い勘です。その答えは次のページで。

サーバの準備ができました。いよいよ [Twin:te を動かしに行きましょう](/infra/deploy/)!
