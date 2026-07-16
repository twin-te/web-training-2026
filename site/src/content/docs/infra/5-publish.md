---
title: "5. インターネットに公開しよう"
---

いよいよ仕上げです。あなたの Twin:te はいま、サーバの中で動いてはいるものの、外からは誰も見られない状態です。これを `https://training-*.twinte.net` のような **URL で、誰でも**開けるようにします。[はじめに](/infra/)で見た本番の構成図に「Client → Cloudflare → Linode」という経路がありますが、これをあなたのサーバに向けて設定します。

## 公開に必要な3つの作業

1. **DNSの設定**: 「この名前はこの IP ですよ」という対応表が DNS です。 twinte.net のドメインは **Cloudflare** で管理されているので、そこにあなたの VM の IP を指すレコードを追加します。
2. **ポート 80/443 の開放**: ファイアウォールのポートを開けることで、インターネットからの HTTP/HTTPS 通信を受け付けられるようにします。
3. **SSL証明書の取得**: [前のページ](/infra/4-deploy/)で見た通り、Google OAuth は `localhost` 以外の戻り先に **HTTPS を要求**するので、公開するなら HTTPS は必須です。そのためのSSL証明書は **Caddy** が [Let's Encrypt](https://letsencrypt.org/ja/) から自動で取ってきてくれます。

それぞれの作業を順番にやっていきましょう。

## DNS が引けるか確認する

DNSレコードの追加は[サーバを用意しよう](/infra/3-server/)の最後でTAにしてもらっています。内容は以下の通りです。

- **DNS レコードの追加**: あなたのサブドメインの **A レコード**を、あなたの VM の Public IP に向けて追加してもらいました。
- **OAuth コールバックの登録**: 共有の Google OAuth クライアントに、あなたのサブドメインをコールバック先として追加してもらいました。Google は登録された URL に完全一致しなければ許可しないので、これがないとログインが動きません。

まだ依頼していなかった人は、いまTAに声をかけてください。

名前が引けるようになったか、手元で確認してみましょう。

```sh
$ dig +short <あなたのドメイン>
*.*.*.*
```

自分の VM の IP が返ってきたら OK です[^propagation]。世界中のどこから聞いても、この名前はあなたのサーバを指します。

[^propagation]: DNS の変更が行き渡るまで少し時間がかかることがあります(キャッシュの都合です)。数分待っても引けなかったらTAに確認してください。

## ファイアウォールで 80/443 を開ける

いままで inbound 通信はポート 22 だけ許可していましたが、追加でポート 80/443 を開放します。Akamai Cloud の自分の Firewall の Rules タブで、

- Preset: **HTTP**(TCP / Port 80)
- Preset: **HTTPS**(TCP / Port 443)

の2つの Inbound Rule を追加して、**Save Changes** を押してください。

## Caddy にドメインを教える

VSCode で `~/twinte-server/Caddyfile` を開いて、1行目の `:80` を自分のドメインに書き換えてください。

```text title="~/twinte-server/Caddyfile (1行目を書き換え)"
<あなたのドメイン> {
	reverse_proxy /api/* back:8080
	reverse_proxy /auth/* back:8080
	reverse_proxy /calendar/* back:8080
	reverse_proxy /* front:80
}
```

この変更によって、「ポート 80 で HTTP で応える」が「このドメインとして **HTTPS** で応える」になり、**そのドメインの証明書の取得・更新を Caddy が勝手にやってくれる**ようになります。

次に `compose.yaml` を開いて、`proxy` サービスの `ports:` を以下に書き換えます。

```yaml title="~/twinte-server/compose.yaml"
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
```

さっきまでの `127.0.0.1:4000:80` と違って、今度は `80:80` / `443:443` を**接続元を問わず**開いていることに注目してください。

## 起動し直す

ターミナルで以下のコマンドを実行します。

```sh
root@localhost:~# docker compose up -d
```

compose が「proxy の設定が変わったな」と検知して、そこだけ作り直してくれます。

## 開通確認

手元のブラウザで **`https://<あなたのドメイン>`** を開いてみてください。

初回は Caddy が証明書を取得するのに数十秒かかることがあります。うまくいかないときは `docker compose logs proxy` を見てみましょう。`certificate obtained successfully` のようなログが出ていれば取得成功です。

Twin:te が表示されて、アドレスバーに鍵マークが付いていて、Google ログインも通ったら、**あなた専用の Twin:te インスタンスが完成しました。おめでとうございます!**

Twin:te の Discord にあなたの URL を送って誰かに開いてもらってください（ **SNS など第三者が閲覧できる場所には投稿しないでください**）。今回作成した Twin:te インスタンスが誰でも使える状態になったはずです[^http]。

[^http]: ちなみに `http://`(s なし)で開くとどうなるでしょう?試してみると、自動で `https://` に転送されるはずです。これも Caddy が勝手にやってくれています。

:::caution[公開したということは]
この瞬間から、あなたのサーバは世界中の誰でも(そして bot でも)アクセスできる状態です。終わったら放置せず、[後片付け](/infra/6-cleanup/)へ進んでください。
:::


## 時間が余った人向け

- 削除する前に `/var/log/auth.log` を眺める
- 本番の [`update_course.sh`](https://github.com/twin-te/twin-te/blob/master/infra/staging/app/cronjob/update_course.sh) のように、講義データの更新を cron で**毎日自動実行**するようにしてみる
- 本番のように **app と db を2台の VM に分けて**、VPC(プライベートネットワーク)でつなぐ
