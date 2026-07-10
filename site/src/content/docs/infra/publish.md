---
title: "発展: 本物の URL で公開しよう"
description: "Cloudflare で DNS を貼り、Caddy の自動 HTTPS で、あなたの Twin:te をインターネットに公開します。"
---

ここは**発展編**です。[サーバで Twin:te を動かそう](/infra/deploy/)まで終わって、まだ時間と体力がある人向け。そして**運営側の作業(DNS レコードの追加と OAuth の登録)が必要**なので、やりたくなったらまず運営に声をかけてください。

いまのあなたの Twin:te は、SSH トンネルを張れる**あなただけ**が見られる状態です。これを `https://<あなた>.training.twinte.net` のような**本物の URL で、誰でも**開けるようにします。[はじめに](/infra/)で見た本番の構成図に「Client → Cloudflare → Linode」という道がありましたよね。あの道を、あなたのサーバに向けて引くのがこのページです。

<!-- TODO: 運営が記入: 研修用サブドメインの命名規則(例: <GitHubユーザー名>.training.twinte.net)と、DNS レコード追加・OAuth コールバック登録の依頼方法(Discord のどのチャンネルに何を書くか) -->

## 公開に必要な4つの部品

1. **DNS** — 「この名前はこの IP ですよ」という対応表。twinte.net のドメインは **Cloudflare** で管理されているので、そこにあなたの VM の IP を指すレコードを足します
2. **HTTPS** — Google OAuth は `localhost` 以外の戻り先に **https を要求**するので、公開するなら HTTPS は必須です。証明書は **Caddy** が [Let's Encrypt](https://letsencrypt.org/ja/) から自動で取ってきてくれます(本番の Twin:te と同じ方式!)
3. **ポート 80/443 の開放** — 「公開する」とは、ファイアウォールのポートを開けることでもあります
4. **URL の書き換え** — front の焼き込み URL と back の env を、あなたのドメインに合わせて作り直します

## Step A: 運営に DNS と OAuth を頼む

自分ではできない2つを、まず運営に依頼します。

- **DNS レコードの追加**: あなたのサブドメイン(例: `arata.training.twinte.net`)の **A レコード**を、あなたの VM の Public IP に向けて追加してもらいます。Cloudflare のプロキシ(オレンジ色の雲)は**オフ(DNS only)**にしてもらってください[^proxy]
- **OAuth コールバックの登録**: 共有の Google OAuth クライアントに、`https://<あなたのドメイン>/auth/v4/google/callback` を戻り先として追加してもらいます。Google は登録された URL への完全一致でしか戻してくれないので、これがないとログインだけ壊れます

[^proxy]: オレンジ色の雲(プロキシ)をオンにすると、通信が Cloudflare のサーバを経由するようになり、HTTPS の終端も Cloudflare が行うため証明書の取り方が変わります。本番の Twin:te はこちらの構成ですが、今日は仕組みが見えやすい「DNS だけ借りて、証明書は自分の Caddy が取る」方式でいきます。

追加してもらったら、名前が引けるようになったか手元で確認してみましょう。

```sh
$ dig +short <あなたのドメイン>
172.233.xx.xx
```

自分の VM の IP が返ってきたら OK です[^propagation]。世界中のどこから聞いても、この名前はあなたのサーバを指します。

[^propagation]: DNS の変更が行き渡るまで少し時間がかかることがあります(キャッシュの都合です)。数分待っても引けなかったら運営と一緒にレコードを確認しましょう。

## Step B: ファイアウォールで 80/443 を開ける

いままで inbound はポート 22 だけの引きこもりサーバでしたが、公開するので玄関を開けます。Cloud Manager の自分の Firewall の Rules タブで、

- Preset: **HTTP**(TCP / Port 80)
- Preset: **HTTPS**(TCP / Port 443)

の2つの Inbound Rule を追加して、**Save Changes** を押してください。80 番は Let's Encrypt が「本当にそのドメインの持ち主?」と確認しに来る通り道と http→https リダイレクト用、443 番が HTTPS 本体です。

## Step C: nginx を Caddy に置き換える

いよいよ本番と同じリバースプロキシ、Caddy の登場です。まず Caddy の設定ファイルを作ります。`nano Caddyfile` で以下を貼り付けてください(`<あなたのドメイン>` は自分のものに書き換え)。

```text title="~/twinte-server/Caddyfile"
<あなたのドメイン> {
	handle /api/* {
		reverse_proxy back:8080
	}
	handle /auth/* {
		reverse_proxy back:8080
	}
	handle /calendar/* {
		reverse_proxy back:8080
	}
	handle {
		root * /srv
		try_files {path} /index.html
		file_server
	}
}
```

nginx.conf と見比べてみてください。書き方は違いますが、やっていること(API は back へ、それ以外は front の静的ファイル)はまったく同じです。違いは1行目にドメイン名を書くだけで、**そのドメインの証明書の取得・更新を Caddy が勝手にやってくれる**こと。本番の [Caddyfile](https://github.com/twin-te/twin-te/blob/master/infra/production/app/proxy/Caddyfile) もほぼ同じ形をしています。

次に `nano compose.yaml` で、`proxy` サービスを丸ごと以下に置き換えます。

```yaml title="~/twinte-server/compose.yaml (proxy を置き換え)"
  proxy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./twin-te/front/dist:/srv:ro
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - back
```

ファイル末尾の `volumes:` にも2行追加します(証明書の保存場所です)。

```yaml title="~/twinte-server/compose.yaml (末尾の volumes:)"
volumes:
  db_data:
  caddy_data:
  caddy_config:
```

nginx のときの `127.0.0.1:4000:80` と違って、今度は `80:80` / `443:443` を**インターネットに向けて**開いていることに注目してください。今回は公開するのが目的なので、これが正解です。

## Step D: URL を書き換える(front と back)

[サーバで動かしたとき](/infra/deploy/)に散々やった「URL の焼き込み」問題、今度はあなたのドメインで焼き直します。

```sh
root@localhost:~/twinte-server# docker run --rm \
    -v "$PWD/twin-te/front":/app -w /app \
    -e VITE_APP_URL=https://<あなたのドメイン> \
    -e VITE_API_URL=https://<あなたのドメイン>/api/v4 \
    oven/bun:1.1.22-slim \
    sh -c 'bun run vite build --mode development'
```

コマンドは前回とほぼ同じですが、`-e` で URL を上書きしています(環境変数は `.env` ファイルより優先されるので、`--mode development` のまま URL だけ差し替わります)。

back のほうは環境変数を書き換えるだけです。`nano twin-te/back/.env.local` で、URL が入っている行を自分のドメインに合わせます。

```sh title="twin-te/back/.env.local (書き換える行)"
APP_URL=https://<あなたのドメイン>/
CORS_ALLOWED_ORIGINS=https://<あなたのドメイン>
AUTH_DEFAULT_REDIRECT_URL=https://<あなたのドメイン>
AUTH_ALLOWED_REDIRECT_URLS=https://<あなたのドメイン>
AUTH_GOOGLE_CALLBACK_URL=https://<あなたのドメイン>/auth/v4/google/callback
COOKIE_SECURE=true
```

`COOKIE_SECURE=true` も忘れずに。HTTPS になったので、セッションクッキーに「HTTPS 以外では送るな」という印を付けられるようになりました。

全部そろったら、起動し直します。

```sh
root@localhost:~/twinte-server# docker compose up -d
```

compose が「proxy と back の設定が変わったな」と検知して、その2つだけ作り直してくれます。

## Step E: 開通確認

手元のブラウザで **`https://<あなたのドメイン>`** を開いてみてください。今度は SSH トンネルなし、素のインターネット越しです。

初回は Caddy が証明書を取得するのに数十秒かかることがあります。うまくいかないときは `docker compose logs proxy` を見てみましょう。`certificate obtained successfully` のようなログが出ていれば取得成功です。

Twin:te が表示されて、アドレスバーに鍵マークが付いていて、Google ログインも通ったら——**開通です。おめでとうございます!**

仕上げに、隣の人にあなたの URL を送って、開いてもらってください。あなたが今日ぽちぽち作ったサーバが、他人のスマホからも見える。これが「公開する」ということです[^http]。

[^http]: ちなみに `http://`(s なし)で開くとどうなるでしょう?試してみると、自動で `https://` に転送されるはずです。これも Caddy が勝手にやってくれています。

:::caution[公開したということは]
この瞬間から、あなたのサーバは世界中の誰でも(そして bot でも)アクセスできる状態です。放置せず、遊び終わったら[後片付けの儀式](/infra/cleanup/)へ進んでください。**このページをやった人は、片付けるものが1つ増えています**(DNS レコードの削除)。理由は後片付けのページで。
:::
