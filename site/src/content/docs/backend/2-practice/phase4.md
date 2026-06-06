---
title: "Phase 4: データベースに永続化しよう"
description: "クライアントから送られてきたデータをデータベースに保存します。"
---

引き続き `backend/src/api/routes/message.ts` で作業をします。

さきほどは`/messages`に来た`GET`をハンドリングする処理を追加しました。

今度は`POST`をハンドリングする処理を追記します。

```ts
// 先ほど登録した処理
messageRoutes.get("/", async (c) => {
  // 省略
});

messageRoutes.post("/", async (c) => {
  const body = await c.req.json<MessageRequest>();
  if (!body?.message || !body?.userName) {
    return c.json({ error: "invalid format" }, 400);
  }

  const [result] = await db.insert(messages).values({
    message: body.message,
    userName: body.userName,
  });
  const [created] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, result.insertId));
  return c.json(created, 201);
});
```

この `db.insert(messages).values({ ... })` を実行すると、

```sql
INSERT INTO messages VALUES ("メッセージ", "ユーザ名");
```

のようなSQL文が発行され、データベースにデータが格納されます。

`db.select()...`はPhase 3でも使いましたが、
データベースからレコードを取得することができます。
ただし今回は`.where()`で取得するレコードを指定しており、
`.insert()`で挿入したレコードをID指定して取得し、
正しく格納できていることを確認しています。

`c.json()`でそのレコードを返すことで、
投稿したメッセージをレスポンスで返すことにしています。

フロントエンドからすると、

```json
{
  "message": "こんにちは!",
  "userName": "風吹けば名無し"
}
```

というリクエストを送ると、

```json
{
  "id": 1,
  "message": "こんにちは!",
  "userName": "風吹けば名無し",
  "createdAt": "2026-06-06T06:38:24.000Z"
}
```

のようにレスポンスが返ってきて、
成功したことや何時に作成されたのかといった付加情報を得ることが出来ます。

## 動作を検証してみよう

curlで以下のようにすると`POST`メソッドを使うことと、
データ(ペイロード)を送信することを指定できます。

```sh
$ curl -X POST http://localhost:3000/messages -d '{ "message": "こんにちは!", "userName": "風吹けば名無し" }'
```

以下のように成功レスポンスが返ってきます。

```sh
$ curl -X POST http://localhost:3000/messages -d '{ "message": "こんにちは!", "userName": "風吹けば名無し" }'
{"id":2,"message":"こんにちは!","userName":"風吹けば名無し","createdAt":"2026-06-06T06:38:24.000Z"}
```

先程は`[]`という空の配列が返ってきた`/messages`への`GET`をし直してみましょう。

```sh
$ curl http://localhost:3000/messages
[{"id":1,"message":"こんにちは!","userName":"風吹けば名無し","createdAt":"2026-06-06T06:38:24.000Z"}]
```

成功です!
たしかに保存された投稿が取得できました。

また、掲示板UIを使ってブラウザから、「投稿」をしたりしてみてください。

![](./keijiban-post.png)

匿名掲示板らしい形になりましたね!
