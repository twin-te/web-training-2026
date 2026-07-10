---
title: "3. サーバで Twin:te を動かそう"
description: "GitHub Actions がビルドした Docker イメージを pull して、VM の上で Twin:te を起動します。仕上げに SSH ポートフォワードで手元のブラウザから接続します。"
---

SSH で入れるようになったので、ここから Twin:te の引っ越し作業です。ただし舞台はあなたの PC ではなく、大阪のデータセンターの中の VM です。

## 作戦: 本番と同じ「サーバではビルドしない」方式

PC 編の手順2を思い出してください。`docker compose build ...` で、フロントエンドやバックエンドのイメージを**その場でビルド**しましたよね。数分〜十数分かかって、メモリもたくさん食ったはずです。

ところで、[サーバを用意しよう](/infra/server/)で触れた通り、本番の Twin:te が動いているのはあなたの VM の 1/4、メモリ 1GB の **Nanode 1GB** です。そんなサーバでフルスタックのビルドなんてしたら、メモリ不足(OOM)で途中で死にます。でも本番は現にそれで動いている。種明かしはこうです。

**本番のサーバは、ビルドをしていません。**

モノレポの master に push されるたびに、GitHub Actions(CI)がクラウド上の強力なマシンでイメージをビルドして、**ghcr.io**(GitHub のコンテナレジストリ)に push します[^cd]。サーバがやるのは、そのビルド済みイメージを **pull して起動するだけ**。だから非力で安いサーバで足りるのです。

「どこでビルドするか」でサーバに要求されるスペックがまるで変わる——これは実際のインフラ設計でも頻出の話です。

[^cd]: 実物はモノレポの [`.github/workflows/cd-staging.yml`](https://github.com/twin-te/twin-te/blob/master/.github/workflows/cd-staging.yml) にあります。back / front / sponsorship / parser のイメージを並列でビルドして `ghcr.io/twin-te/twin-te:back-stg` のようなタグで push しているのが読み取れます。

今日もこの方式でいきます。back と parser は、本番(staging)が使っているのと**同じビルド済みイメージ**を ghcr.io から pull します。

### ただし front だけは自分でビルドします

1つだけ例外があります。front(Vue の画面)です。

front はビルドすると「ただの静的ファイル(HTML/JS/CSS)」になるのですが、このとき **API のアクセス先 URL がファイルの中に焼き込まれます**。実際にモノレポの `front/` にある設定を見比べてみると:

```sh
# front/.env.staging (staging 用ビルドの設定)
VITE_API_URL=https://app.stg.twinte.net/api/v4

# front/.env.development (ローカル用ビルドの設定)
VITE_API_URL=http://localhost:4000/api/v4
```

つまり CI がビルドした `front-stg` イメージを pull してくると、**あなたのサーバで動いているのに、本物の staging 環境に話しかける front** ができあがってしまいます。それでは「自分専用の Twin:te」になりません。

本番でも同じ理由で、front だけは環境ごとに `front-stg` / `front-prod` と**別々のイメージ**がビルドされています。今日のあなたの環境のアクセス先は `http://localhost:4000`(なぜ localhost なのかは Step 5 で分かります)なので、**localhost:4000 が焼き込まれた front を自分でビルドする**必要があります。これが今日、サーバ上でやる唯一のビルド作業です。

そしてこれが、あなたの VM が本番より大きい理由でもあります。front のビルドはピークで 1.6〜1.7GB ほどメモリを食うので[^oom]、Nanode 1GB では OOM で死にます。「pull するだけなら 1GB で足りる。1回でもビルドするなら足りない」——サーバのスペックは、こういう"何をやらせるか"から逆算して決まります。

[^oom]: この教材を書くときに、メモリ上限を変えながら実測しました。1.6GB 制限では OOM で SIGKILL、1.7GB でぎりぎり成功です。つまり Linode 2GB でも OS や Docker 自身の分を引くと際どく、余裕を見て 4GB にしています。

## Step 4-1: Docker と git のインストール

SSH でサーバに入って作業します。Ubuntu には Docker が入っていないので、まずインストールします。手順は [Docker 公式ドキュメント](https://docs.docker.com/engine/install/ubuntu/)にありますが、公式が用意している便利スクリプトを使うのが早いです。

```sh
root@localhost:~# curl -fsSL https://get.docker.com | sh
```

git も入れておきます。

```sh
root@localhost:~# apt-get update && apt-get install -y git
```

終わったら確認してみましょう。

```sh
root@localhost:~# docker version
root@localhost:~# docker compose version
root@localhost:~# git --version
```

## Step 4-2: クローンと環境変数

作業用のディレクトリを作って、モノレポを clone します。

```sh
root@localhost:~# mkdir twinte-server && cd twinte-server
root@localhost:~/twinte-server# git clone https://github.com/twin-te/twin-te.git
```

「pull するだけならソースコードは要らないのでは?」と思うかもしれませんが、front のビルド材料・DB の初期化スクリプト・マイグレーションファイルはリポジトリから使うので、clone はしておきます。

次に環境変数です。PC 編と同じく、`back/.env` をコピーして `back/.env.local` を作り、Google OAuth の共有 env の値を書き込みます。

```sh
root@localhost:~/twinte-server# cp twin-te/back/.env twin-te/back/.env.local
```

値は **PC 編で使ったものとまったく同じ**でよいので、手元の PC からファイルごと送ってしまうのが楽です。ファイルを送るには `scp` というコマンドが使えます。**手元の PC のターミナルで**(モノレポのディレクトリから):

```sh
$ scp ./back/.env.local root@<あなたのVMのIPアドレス>:twinte-server/twin-te/back/.env.local
```

`scp` は「SSH の通信路を使ってファイルをコピーする」コマンドです。もちろん、VM 上で `nano` などのエディタを開いて値を貼り付けても構いません。

## Step 4-3: サーバ用の compose を書く

PC 編ではモノレポに入っている `compose.yaml` を使いました。あれは**開発用**で、ソースコードをその場でビルドして、変更を即座に反映する仕掛けが入っています。今日は「ビルド済みイメージを動かすだけ」の**サーバ用**なので、小さな compose を自分で書きます。これは本番の実物 [`infra/production/app/docker-compose.yml`](https://github.com/twin-te/twin-te/blob/master/infra/production/app/docker-compose.yml) の縮小版です。

`nano compose.yaml` でファイルを開いて[^nano]、以下を貼り付けてください。

[^nano]: nano はターミナル用のシンプルなエディタです。貼り付けたら `Ctrl+O` → `Enter` で保存、`Ctrl+X` で終了です。

```yaml title="~/twinte-server/compose.yaml"
name: twinte-server

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

  proxy:
    image: nginx
    restart: unless-stopped
    ports:
      - "127.0.0.1:4000:80"
    volumes:
      - ./twin-te/front/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - back

  # ---- ここから下は、初期設定のときだけ動かす一回きりのコマンドたち ----

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
```

登場人物は PC 編の「何が動いているのか」で見た4人と同じですが、いくつか見どころがあります。

- **back の `image:`** — `ghcr.io/twin-te/twin-te:back-stg`。GitHub Actions がビルドして push した、**本物の staging と同じイメージ**をそのまま指定しています。ビルドの記述(`build:`)はどこにもありません
- **back の `env_file:`** — さっき用意した `.env.local` をそのまま読み込みます。イメージは staging と同じでも、環境変数で「どの DB に繋ぐか」「OAuth の戻り先はどこか」を差し替えられる。**back がイメージ1つで済むのはこの性質のおかげ**で、ビルド時に URL が焼き込まれる front との対比ポイントです
- **proxy の `ports:`** — `127.0.0.1:4000:80`。ポート 4000 を**サーバ自身の中にだけ**公開しています。インターネット側には一切開けません(Step 5 に続く)
- **proxy の `volumes:`** — これからビルドする front の静的ファイル(`front/dist`)を nginx にそのまま配らせます
- **`profiles: ["setup"]` の3人** — マイグレーション・講義データの取得・DB への投入という「一回きりの仕事」です。profile を付けておくと、普段の `docker compose up` では起動せず、名指しの `docker compose run` のときだけ動きます
- **parser と update-courses の `--year`** — 年度です。当日の年度に合わせて読み替えてください(この資料の執筆時点では 2026)

nginx の設定ファイルも作ります。`nano nginx.conf` で以下を貼り付けてください。PC 編で同じ役割をしていた [`proxy/nginx.docker.conf`](https://github.com/twin-te/twin-te/blob/master/proxy/nginx.docker.conf) の、「front は開発サーバではなく静的ファイル」版です。

```nginx title="~/twinte-server/nginx.conf"
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location /api {
        proxy_pass http://back:8080;
    }
    location /auth {
        proxy_pass http://back:8080;
    }
    location /calendar {
        proxy_pass http://back:8080;
    }
    location / {
        try_files $uri /index.html;
    }
}
```

## Step 4-4: front をビルドする

さて、今日唯一のビルド作業です。`localhost:4000` 用の設定(`--mode development`)で front をビルドします。

```sh
root@localhost:~/twinte-server# docker run --rm \
    -v "$PWD/twin-te/front":/app -w /app \
    oven/bun:1.1.22-slim \
    sh -c 'bun install --frozen-lockfile && bun run vite build --mode development'
```

やっていることは「front のソースを bun のコンテナに見せて、依存を入れて、`vite build` する」です[^bunver]。`--mode development` を付けることで、さっき見た `.env.development` の `http://localhost:4000` が焼き込まれます。

それなりに重い仕事なので、**数分かかります**。じっと待たずに、この先の Step 5 を読みながら待つのがおすすめです。

[^bunver]: bun のバージョン(1.1.22)は、モノレポの `front/Dockerfile` が使っているものに合わせています。

終わったら、成果物ができていることを確認しましょう。

```sh
root@localhost:~/twinte-server# ls twin-te/front/dist
assets  favicon.ico  index.html  ...
```

これが「ビルドされた front」の正体です。ただのファイルの山ですね。あとは nginx がこれを配るだけです。

## Step 4-5: 起動する

準備が全部そろいました。初期設定の3連コンボから行きます。

まず DB のマイグレーション(テーブルの枠組み作り)。

```sh
root@localhost:~/twinte-server# docker compose run --rm migration
```

次に KdB から講義データを取得して、DB に投入します。

```sh
root@localhost:~/twinte-server# docker compose run --rm parser
root@localhost:~/twinte-server# docker compose run --rm update-courses
```

そして本命の起動です。

```sh
root@localhost:~/twinte-server# docker compose up -d
```

初回は ghcr.io からのイメージの pull が走ります。ビルドと違ってダウンロードするだけなので、本番の 1GB のサーバでも平気な作業です。`docker compose ps` で db / back / proxy の3つが動いていることを確認したら、サーバの中から動作確認してみましょう。

```sh
root@localhost:~/twinte-server# curl http://localhost:4000
<!DOCTYPE html>...
```

HTML が返ってきたら、あなたのサーバの上で Twin:te が動いています!

## Step 5: 手元のブラウザからアクセスしよう

VM の中で Twin:te は `http://localhost:4000` で動いています。でも、見たいのは手元のブラウザですよね。

ここで「じゃあファイアウォールでポート 4000 を開けて、ブラウザで `http://<VMのIP>:4000` を開けばいいのでは?」と思った人、良い勘です。**でも今回はそれをやりません**。

理由は2つあります。1つ目は Google ログインです。Twin:te のログインは Google OAuth を使っていて、認証後に Google が「アプリのこの URL に戻ってきてね」とブラウザをリダイレクトします。この**戻り先 URL が `http://localhost:4000` で登録されている**ため、`http://<VMのIP>:4000` でアクセスすると認証から戻ってこられず、ログインが壊れます[^oauth]。2つ目は front です。Step 4-4 で front に焼き込んだ URL も `http://localhost:4000` でしたね。つまりこのサーバの Twin:te は、隅から隅まで「`localhost:4000` でアクセスされること」を前提に組んであるのです。

[^oauth]: 本番の Twin:te がちゃんと `https://app.twinte.net` でログインできるのは、本番用の OAuth クライアントに本番のドメインが戻り先として登録されている(そして front にも本番の URL が焼き込まれている)からです。「環境ごとに OAuth クライアントと env と front のビルドが分かれている」のはこういう理由です。

そこで **SSH ポートフォワード**という技を使います。手元のターミナルで、新しくこう接続してください。

```sh
$ ssh -L 4000:localhost:4000 root@<あなたのVMのIPアドレス>
```

`-L 4000:localhost:4000` は「**手元の**ポート 4000 への通信を、SSH の通信路(トンネル)に通して、**接続先 VM から見た** `localhost:4000` に届けてね」という意味です。

この SSH がつながっている状態で、手元のブラウザで http://localhost:4000 を開いてみてください。

Twin:te が表示されましたか?
ブラウザから見ればあくまで `localhost:4000` なので、front の焼き込み URL とも辻褄が合い、Google ログインもそのまま通ります。
**あなた専用の Twin:te インスタンス、開通です!おめでとうございます!**

<!-- TODO: screenshot (ポートフォワード越しに表示された Twin:te のトップ画面) -->

### 動作を検証してみよう

ここで1つ考えてみてほしい問いがあります。

> ファイアウォールで許可している inbound はポート **22 だけ**なのに、なぜ手元のブラウザからポート 4000 のアプリにアクセスできているのでしょうか?

<details><summary>解答</summary>

インターネットを渡っている通信は、あくまで**ポート 22 の SSH 接続だけ**だからです。

ブラウザ → 手元の 4000 番 → (SSH トンネルの中を通る) → VM の中の `localhost:4000` という経路なので、ファイアウォールから見えるのはポート 22 への SSH 通信のみ。ポート 4000 への inbound 通信はそもそもインターネット上に存在していません(おまけに compose の `ports:` で `127.0.0.1` にしか公開していないので、たとえファイアウォールを開けても外からは繋がりません。二重に閉じてあるわけです)。

つまりポートフォワードは「開けたくないポートのサービスに、SSH で入れる人だけがアクセスする」手段でもあります。実際の運用でも、データベースや管理画面など公開したくないものに安全にアクセスする定番テクニックです。

逆に言えば、SSH で入れる人はトンネル経由で色々なものに触れるということでもあります。SSH の鍵の管理が大事な理由がひとつ増えましたね。

</details>

## 本番はここからどうなっている?

あなたはいま、「サーバを立てる」「イメージを pull する」「起動する」を全部手でやりました。本番の Twin:te がやっていることは、驚くほどこれと同じです。違いを対応表にしてみます。

| 今日あなたがやったこと | 本番 |
|---|---|
| VM 1台に全部入り | staging / production × app / db の**4台**に分かれている(はじめにの構成図) |
| `compose.yaml` を手書きした | ほぼ同じものがモノレポの [`infra/production/app/docker-compose.yml`](https://github.com/twin-te/twin-te/blob/master/infra/production/app/docker-compose.yml) にある |
| nginx でパスを振り分けた | [Caddy](https://caddyserver.com/) が同じ振り分けをしつつ、**HTTPS 証明書の取得・更新まで全自動**でやっている[^caddy] |
| SSH して手でイメージを pull → up した | master に push されると GitHub Actions がビルド → ghcr.io へ push → サーバ上の [`deploy.sh`](https://github.com/twin-te/twin-te/blob/master/infra/staging/app/script/deploy.sh)(中身は `docker compose pull` と `up -d`!)が実行される。**staging は push から数分で全自動**、production は人間の判断を挟んでから |
| `docker compose run parser` で講義データを入れた | 同じことをするスクリプト [`update_course.sh`](https://github.com/twin-te/twin-te/blob/master/infra/staging/app/cronjob/update_course.sh) が**毎日自動実行**されている |
| SSH ポートフォワードで自分だけアクセス | Cloudflare と本物のドメイン(`app.twinte.net`)で全世界に公開 |

[^caddy]: ローカル開発と今日の演習では同じ役割を nginx がやっていました。localhost には HTTPS が要らないので nginx で十分、本番は自動 HTTPS が欲しいので Caddy、という使い分けです。

時間のある人は、対応表のリンク先をぽちぽち開いて読んでみてください。今日手を動かした後なら「あ、これさっき自分がやったやつだ」だらけのはずです。全部を理解する必要はありません。対応が2〜3個腹落ちすれば今日は十分です。分からないところは Twin:te のインフラをやっている先輩に聞いてください。喜んで語ってくれるはずです。

さて、あなた専用の Twin:te を眺めて満足したら……最後にして最重要のステップ、[後片付けの儀式](/infra/cleanup/)が待っています。まだ遊び足りない人は、その前に[発展: 本物の URL で公開しよう](/infra/publish/)に挑戦するのもおすすめです。
