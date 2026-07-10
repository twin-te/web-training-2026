---
title: "Phase 2: リクエストを受けて適当なメッセージを返そう"
description: "リクエストをハンドリングすると本当にシンプルなメッセージだけ返すWeb APIを作ります。"
---

テンプレートリポジトリの `backend/main.go` を見てください。

EchoというGoでWebバックエンドを構築するためのフレームワークを使っています。
Twin:teの本番のバックエンドも同じGo + Echoで書かれていますよ。

上から順に追っていくと

1. Echoの Web API アプリケーション 用インスタンスを生成

2. エンドポイントやその他を設定

3. ポート番号を環境変数から取得。デフォルトは3000

4. 準備した Web API アプリケーション 用インスタンスを使って、取得したポート番号でサーブ開始

という風になっています。

ライブラリ(今回はEcho)が抽象化をしてくれているので、意外にシンプルなコードでWeb APIを作ることが出来ます。

**NOTE:** もしお使いのエディタで「`echo`というやつは知らない!」というようなエラーが出まくるようなら、[Goを入れて](https://go.dev/doc/install)`backend/`以下で`go mod download`すると良いです。

```go
package main

import (
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/twin-te/web-training-2026-template/backend/db"
)

func main() {
	e := echo.New() // 1.

	// 2.
	e.Use(middleware.Logger())
	e.Use(middleware.CORS())

	// データベースに接続し、モデルの定義からテーブルを自動生成する
	if err := db.Init(); err != nil {
		e.Logger.Fatal(err)
	}

	/* ここに追記 */

	// 3.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// 4.
	e.Logger.Fatal(e.Start(":" + port))
}
```

(途中でデータベースに接続している部分は、次のPhaseで登場します。今は「そういうものがあるんだな」くらいで大丈夫です。)

しかし、このままでは何も動きません。

エンドポイントのハンドリングの設定を何もしていないからです。

エンドポイントというのは、
URLで、

- `hogehoge.sohosai.com/users`
- `hogehoge.sohosai.com/messages/<message-id>`

というのがあったときにドメイン`hogehoge.sohosai.com`より後ろのスラッシュで何回か区切られた部分のことを言います。
つまりこの例では、

- `/users`
- `/messages/<message-id>`

がそれぞれエンドポイントです。

クライアントはこのようにURLのパスを指定してHTTPリクエストをしてくるので、
バックエンドはある特定のエンドポイントにリクエストが来たら用意した処理をする(リクエストをハンドリングする)わけです。

さて、この `/* ここに追記 */` の部分に以下のようなコードを追加してください。

```go
	/* ここに追記 */
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, healthResponse{
			Status:  "ok",
			Message: "Hello, World!",
		})
	})
```

あわせて、レスポンスの形を表す`healthResponse`という型を`func main() {`の上に定義してください。

```go
type healthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
```

もう1つ、`import`のカッコの中に`"net/http"`という1行を追記してください。
(`http.StatusOK`のために使います。)

```go
import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/twin-te/web-training-2026-template/backend/db"
)
```

Goには、使っていないパッケージが`import`に書いてあるとコンパイルエラーになるという厳しい掟があるので、
コードを書き換えるときは`import`もセットで面倒を見てあげる必要があります[^goimports]。

さて、最初に追記したコードは、

- `/health` というエンドポイントに
- HTTPの`GET`リクエストが来たら
- `func(c echo.Context) error { ... }` の関数でハンドリングする

というのを設定しています。

Echo では、リクエストのコンテキスト`c`がハンドラ関数には渡されることになっているようで、
`c.JSON()`としてやると、JSON形式のレスポンスを返せます。

`healthResponse{ ... }`の部分はGoのstruct(構造体)で、
フィールドの後ろに付いている`` `json:"status"` ``のようなタグによって、JSONに変換したときのキー名を指定しています[^jsontag]。

したがって、このエンドポイントにGETリクエストが来ると、登録したこの関数が(Echoによって)呼び出され、

```json
{
  "status": "ok",
  "message": "Hello, World!"
}
```

というJSONがとにかく直ちに返されるわけですね。

## 動作を検証してみよう

`.env.example`をコピーして`.env`というファイルを真横に作ってください。
ポート番号やこのあと出てくるデータベースの設定といった、環境変数設定用のファイルになります。

バックエンドのディレクトリで、Docker(docker compose)を起動してください。

(`$`はシェルの入力部分ですよという意味で書いているので打たなくて大丈夫ですよ)

```sh
$ cd ./backend
$ docker compose up
```

HTTPリクエストを送りたいときのシンプルなツールとして[`curl`](https://curl.se/)というものがあります。
指定したURLを見に行く(リクエストをする)だけなので _see URL_ ということで`curl`だそうです(読み方は「カール」)。

導入してみてください。(Windows含めデフォルトで入っている環境が多いと思います。)

さて、別のターミナルから `curl` を実行してみると

```sh
$ curl http://localhost:3000/health
curl: (7) Failed to connect to localhost port 3000 after 0 ms: Couldn't connect to server
```

あれ、おかしいですね。

そういえば、(docker composeで)ポートを開けていませんでした!

`backend/docker-compose.yml` を見てください。

```yaml
services:
  db:
    # 略

  adminer:
    # 略

  app:
    build:
      context: .
      target: dev
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL}
      PORT: ${PORT}

    # ここに追記

    volumes:
      - .:/app
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:
```

`app:` の下に `# ここに追記` があります。

以下のようになるように、追記してください。
インデントが正しい必要があるので気をつけてくださいね。

```yaml
services:
  # 略

  app:
    # 略
    environment:
      DATABASE_URL: ${DATABASE_URL}
      PORT: ${PORT}

    # ここに追記
    ports:
      - "3000:3000"

    volumes:
    # 略
```

これは、コンテナ内のポート番号3000(右の3000)を、ホストPCの世界のポート番号3000に紐づけて公開しますよ、という意味です。

これをすることで、`localhost:3000` への接続がコンテナ内のアプリケーションまで通るようになるのです。

ポート番号という概念があって、それを開放しないとアクセスできないんだよ、ということを知ってもらいたかったのです。

実際にアプリケーションをホストする際にも同様の事象はあり、
(仕組みは全く異なりますが)たとえばファイアウォールが設定されていてデフォルトではほとんどのポートへのリクエストが通らないということがあります。
そういうときもポートを開放するという設定をする必要があったりするのです。

詳しくはインフラ部門に聞いてみましょう。

---

さて、docker composeを立ち上げ直し、再度curlを実行してみると、

```sh
$ curl http://localhost:3000/health
{"status":"ok","message":"Hello, World!"}
```

無事、レスポンスが返ることを確認できました!

なお、テンプレートのDocker(dev target)には[air](https://github.com/air-verse/air)というホットリロード用のツールを仕込んであります。
一度`docker compose up`で立ち上げてしまえば、この後のPhaseでコードを書き換えても、保存するたびに自動でビルドし直して再起動してくれます。便利ですね。

また、[Appendix 2](/backend/2-practice/appendix2/)で紹介している検証用フロントエンド(`frontend/`)を起動してブラウザで開くと、
画面上部の「サーバ状態」に今作った`/health`のレスポンスが表示されます。
こちらからも動作確認ができますよ。

---

[^goimports]: 実際の開発では、エディタ(Go拡張, gopls)や`goimports`というツールが自動で`import`を追加・削除してくれるので、手で書くことはあまりありません。

[^jsontag]: Goではstructのフィールド名は大文字始まりにしないと外部(他のパッケージ)から見えないというルールがあるので、`userName`のような小文字始まりのキー名でJSONを返したいときはタグでの指定が必須になります。次のPhase以降でも登場しますよ。
