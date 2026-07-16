---
title: "4. サーバで Twin:te を動かそう"
---

サーバに VSCode で入れるようになったので、ここから Twin:te の引っ越し作業になります。このページのコマンドはすべて、[前のページ](/infra/3-server/)で接続した VSCode の**統合ターミナル**(= サーバの中のシェル)で実行してください。

## Docker と Git のインストール

Ubuntu には Docker が入っていないので、まずインストールします。手順は [Docker 公式ドキュメント](https://docs.docker.com/engine/install/ubuntu/)にありますが、公式が用意している便利スクリプトを使うのが早いです。

```sh
root@localhost:~# curl -fsSL https://get.docker.com | sh
```

Git も入れておきます。

```sh
root@localhost:~# apt-get update && apt-get install -y git
```

終わったら確認してみましょう。

```sh
root@localhost:~# docker version
root@localhost:~# docker compose version
root@localhost:~# git --version
```

## クローンと環境変数

作業用のディレクトリを作って、 Twin:te のソースコードをクローンします。

```sh
root@localhost:~# git clone https://github.com/twin-te/twin-te.git
```

クローンできたら、メニューの **File → Open Folder...** で `/root` を開いておきましょう。新しいウィンドウが開くので、ターミナルも **Terminal → New Terminal** で開き直してください。左のエクスプローラーに、いまクローンした twin-te フォルダが見えているはずです。ここから先のファイル編集は、全部この画面でできます。

次に環境変数を設定します。PC 編と同じく、`back/.env` をコピーして `back/.env.local` を作り、Google OAuth の共有 env の値を書き込みます。

```sh
root@localhost:~# cp twin-te/back/.env twin-te/back/.env.local
```

OAuth のクライアント ID などの値は **PC 編で使ったものと同じ**です。エクスプローラーから `twin-te/back/.env.local` を開いて、手元の PC の `.env.local` の中身を丸ごと貼り付けてしまいましょう[^scp]。サーバの上のファイルなのに、いつものエディタでそのまま編集できる点が VSCode の便利なところです。

[^scp]: エディタを使わず、コマンドでファイルごと送る方法もあります。**手元の PC のターミナルで**(モノレポのディレクトリから)`scp ./back/.env.local root@<あなたのVMのIPアドレス>:/twin-te/back/.env.local`。`scp` は「SSH の通信路を使ってファイルをコピーする」コマンドで、VSCode が使えないサーバ相手でも使えます。

ただし、**URL の入った行だけは書き換えが必要**です。PC 編の値は`http://localhost:4000` でアクセスされる前提でしたが、今回は **`https://training-*.twinte.net`** でアクセスするためです。開いている `.env.local` の以下の行を、自分のドメインに合わせて変更してください。

```sh title="/root/twin-te/back/.env.local (書き換える行)"
APP_URL=https://<あなたのドメイン>/
CORS_ALLOWED_ORIGINS=https://<あなたのドメイン>
AUTH_DEFAULT_REDIRECT_URL=https://<あなたのドメイン>
AUTH_ALLOWED_REDIRECT_URLS=https://<あなたのドメイン>
AUTH_GOOGLE_CALLBACK_URL=https://<あなたのドメイン>/auth/v4/google/callback
COOKIE_SECURE=true
```

最後の `COOKIE_SECURE=true` は、セッションクッキーに「HTTPS 以外では送るな」という印を付ける設定です。`http://localhost` だった PC 編では付けられませんでしたが、HTTPS で公開する今回はつけるべきです。

ところで「ドメインなんて大げさな。ファイアウォールでポート 4000 を開けて `http://<VMのIP>:4000` でアクセスすればよくない?」と思った人、良い勘です。でも残念ながら、それでは **Google ログインが動きません**。Twin:te のログインは Google OAuth を使っていて、認証後に Google が「アプリのこの URL に戻ってきてね」とブラウザをリダイレクトします。Google はこの戻り先として**事前に登録された URL しか**許してくれず、さらにその登録には「**生の IP アドレスは不可**」「**`localhost` 以外は https 必須**」というルールがあります[^oauth]。「本物のドメイン + HTTPS」は、公開された Web アプリでログインを成立させるために必要なのです。

[^oauth]: 本番の Twin:te が `https://app.twinte.net` でログインできるのは、本番用の OAuth クライアントに本番の URL が戻り先として登録されている(そして back の env にも本番の URL が設定されている)からです。「環境ごとに OAuth の登録と env が分かれている」のはこういう理由です。前のページであなたのドメインのコールバック URL の登録を運営に頼んだのも、このためでした。

## サーバ用の compose を書く

PC 編ではモノレポに入っている `compose.yaml` を使いました。これは**開発用**で、ソースコードをその場でビルドして変更を即座に反映する設定（ホットリロード）が入っています。今日は「ビルド済みイメージを動かすだけ」の**サーバ用**なので、小さな compose.yaml を自分で書きます。これは本番環境 [`infra/production/app/docker-compose.yml`](https://github.com/twin-te/twinte-infra-v4/blob/master/production/app/docker-compose.yml) の縮小版です。

エクスプローラーの新規ファイル作成ボタンで、いま開いているフォルダ(`root`)の直下に `compose.yaml` を作って[^nano]、以下を貼り付けてください。

[^nano]: 作る場所に注意してください。`twin-te`(モノレポ)の**中ではなく**、その1つ上です。モノレポの `compose.yaml` は開発用なので、混ざらないように分けています。ちなみに VSCode を使わない場合は、`nano compose.yaml` でターミナル用エディタを開いて貼り付け → `Ctrl+O` → `Enter` で保存 → `Ctrl+X` で終了、という操作になります。

```yaml title="/root/compose.yaml"
name: twin-te

services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - ./twin-te/db/docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  back:
    image: ghcr.io/twin-te/twin-te:back-stg
    restart: unless-stopped
    env_file: ./twin-te/back/.env.local
    depends_on:
      db:
        condition: service_healthy

  front:
    image: ghcr.io/twin-te/web-training-2026/twinte-front:latest
    restart: unless-stopped

  proxy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "127.0.0.1:4000:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - back
      - front

  # 以下、初期設定用

  migration:
    image: migrate/migrate
    profiles: ["setup"]
    volumes:
      - ./twin-te/db/migrations:/migrations
    command:
      [
        "-path", "/migrations",
        "-database", "postgres://postgres:password@db:5432/twinte_db?sslmode=disable",
        "up",
      ]
    depends_on:
      db:
        condition: service_healthy

  parser:
    image: ghcr.io/twin-te/twin-te:parser-stg
    profiles: ["setup"]
    volumes:
      - ./data:/data
    command:
      [
        "python3", "/usr/src/twin-te/parser/download_and_parse.py",
        "--year", "2026",
        "--output-path", "/data/kdb.json",
      ]

  update-courses:
    image: ghcr.io/twin-te/twin-te:back-stg
    profiles: ["setup"]
    env_file: ./twin-te/back/.env.local
    volumes:
      - ./data:/data
    command:
      [
        "/app", "update-courses-based-on-kdb",
        "--year", "2026",
        "--kdb-json-file-path", "/data/kdb.json",
      ]
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:
  caddy_data:
  caddy_config:
```

Caddy の設定ファイルも作ります。同じように `root` 直下に `Caddyfile` を作って、以下を貼り付けてください。PC 編で同じ役割をしていた [`proxy/nginx.docker.conf`](https://github.com/twin-te/twin-te/blob/master/proxy/nginx.docker.conf) と、書き方は違いますがやっていることは同じです。

```text title="/root/Caddyfile"
:80 {
	reverse_proxy /api/* back:8080
	reverse_proxy /auth/* back:8080
	reverse_proxy /calendar/* back:8080
	reverse_proxy /* front:80
}
```

`/api` などは back へ、それ以外は全部 front へ振り分けます。1行目の `:80` は「ポート 80 で待ち受ける」という意味です。後ほどここを実際のドメインに変更します。

## 起動する

準備がすべてそろったので　Twin:te を起動します。

まず DB のマイグレーション（テーブル作成）を行います。

```sh
root@localhost:~# docker compose run --rm migration
```

次に KdB からシラバスを取得して、DB に投入します。

```sh
root@localhost:~# docker compose run --rm parser
root@localhost:~# docker compose run --rm update-courses
```

そして Twin:te を起動します。

```sh
root@localhost:~# docker compose up -d
```

初回は ghcr.io からのイメージの pull が走ります。`docker compose ps` で db / back / front / proxy の4つが動いていることを確認したら、サーバの中から動作確認してみましょう。

```sh
root@localhost:~# curl http://localhost:4000
<!DOCTYPE html>...
```

HTML が返ってきたら、あなたのサーバの上で Twin:te が動いています!

ただし、まだ**サーバの中からしか**見えません。compose の `ports:` で `"127.0.0.1:4000:80"` を指定しているので、インターネット側には何も公開されていない状態です。手元のブラウザで開けるようにする作業を、[次のページ](/infra/5-publish/)で実施します。

## 本番はここからどうなっている?

ここでは、「サーバを立てる」「イメージを pull する」「起動する」をすべて手作業で行いました。本番環境の Twin:te がやっていることも基本的には同じになります。対応表にまとめました。

| 今日やったこと | 本番環境 |
|---|---|
| VM 1台でfront,back,db,proxyを起動した | app(front,back,proxy) / db の**2台**に分かれている([はじめに](/infra/)の構成図) |
| `compose.yaml` を手書きした | ほぼ同じものがモノレポの [`infra/production/app/docker-compose.yml`](https://github.com/twin-te/twinte-infra-v4/blob/master/production/app/docker-compose.yml) にある |
| `Caddyfile` を手書きした | ほぼ同じものがモノレポの [`infra/production/app/proxy/Caddyfile`](hhttps://github.com/twin-te/twinte-infra-v4/blob/master/production/app/proxy/Caddyfile) にある |
| SSH して手でイメージを pull → up した | GitHub Actions で Docker イメージをビルド → ghcr.io へ push → サーバ上の [`deploy.sh`](hhttps://github.com/twin-te/twinte-infra-v4/blob/master/production/app/script/deploy.sh)（中身は `docker compose pull` と `docker compose up -d`）が実行される。 |
| `docker compose run parser` で授業情報を入れた | 同じことをするスクリプト [`update_course.sh`](https://github.com/twin-te/twinte-infra-v4/blob/master/production/app/cronjob/update_course.sh) が**毎日自動実行**されている |

[^caddy]: ローカル開発(PC 編)では、同じ役割を nginx がやっていました。localhost には HTTPS が要らないので nginx でも十分ですが、今回は本番と同じ Caddy を採用しています。

時間のある人は、対応表のリンク先をぽちぽち開いて読んでみてください。今日手を動かした後なら「あ、これさっき自分がやったやつだ」と思える箇所がいくつかあるかもしれません。

それでは、いよいよ仕上げです。[インターネットに公開しよう](/infra/5-publish/)へ!
