---
title: "Phase 3: データベースを読んでみよう"
description: "データベースに接続し読んでみましょう。"
---

さて、ここまででとにかくレスポンスを返すシンプルなバックエンドのコードを作りました。

しかし、「1章: 知っておきたい! 知識編」で触れたように、Webアプリケーションを構成する登場人物はこれだけではありませんでした。
すでにユーザが登録したデータを読んだり、新たにデータを永続化したりしたいですよね。
そこで、データベースの登場です。

今回は、MySQLというSQLの一種を、DrizzleというTS用のORMを介して操作していこうと思います。

## データベースのスキーマ定義

`backend/src/db/schema.ts` を見てください。

ここではSQLに`messages`テーブルを定義する処理が書いてあります。

```ts
import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  message: varchar("message", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

何やら大変なことが書いてありますが、

ターミナルから

```sh
$ docker compose exec app npm run db:push
```

を実行すると、`backend/src/db/schema.ts` が実行され、

```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  created_at TIEMSTAMP NOT NULL DEFAULT NOW(),
);
```

のようなSQL文が発行され、

| id (整数, 行追加時には自動でカウントアップされる) | message (255文字以下の文字列, 空っぽは駄目) | user_name (255文字以下の文字列, 空っぽは駄目) | created_at (時刻, 空っぽは駄目, デフォルトは現在の時刻) |
| ------------------------------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| 1                                                 | "こんにちは!\nいまなにしてる?"              | "風吹けば名無し"                              | 2026-06-06T13:00+09:00                                  |

のようなテーブルがデータベースに作られます。
なお、この段階では何のデータ(レコード, 行)も格納されていません。
(上の表の1行目のレコードは、こうなる予定というイメージです。)

## messageのハンドラ内でデータベースを操作しよう

`backend/src/api/routes/message.ts` を見てください。

```ts
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/client.js";
import { messages } from "../../db/schema.js";
import { MessageRequest } from "../models/message.js";

export const messageRoutes = new Hono();

// ここに追記
```

ここに、以下のように追記してください。

```ts
messageRoutes.get("/", async (c) => {
  const rows = await db.select().from(messages);
  return c.json(rows);
});
```

`messageRoutes.get("/", async (c) => { ... });`
という記法は先ほど見たのと同様で、
`/`への`GET`リクエストが来たらこの関数でハンドリングする、というのを登録します。

なお、`messageRoutes`を次に `index.ts` で`/messages`のルートとして登録してください。
これで、全体としては、`/messages`への`GET`リクエストのハンドラ関数を登録してることになります。

```ts
// 省略

// 追記する
import { messageRoutes } from "./api/routes/message.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

/* ここに追記 */
app.get("/health", (c) => c.json({ status: "ok", message: "Hello, World!" }));

// 追記する
app.route("/messages", messageRoutes);

// 省略
```

もう一度、今 `backend/src/api/routes/message.ts` に追加したコードを見てみましょう。

```ts
messageRoutes.get("/", async (c) => {
  const rows = await db.select().from(messages);
  return c.json(rows);
});
```

この `db.select().from(messages)` を実行すると、

```sql
SELECT * FROM messages;
```

のようなSQL文が発行されます。
`messages`テーブル(先ほど定義したテーブルですね)から何でもかんでも(`*`)を取り出すということです。

そうすると取得できたいくつもの行(`rows`)をこれまでと同様`c.json()`でレスポンスを返します。

## 動作を検証しよう

今回もまた、curlを使って検証をしていきましょう。

以下のように`/messages`を見に行くと...

```sh
$ curl http://localhost:3000/messages
```

何ということでしょう、`[]`という文字列が返ってきただけです。

```sh
$ curl http://localhost:3000/messages
[]
```

失敗でしょうか...

確認用クライアントからも確認してみましょう。

```sh
# frontend/ 以下で
$ npm i
$ npm run dev
```

![](./keijiban-no-messages.png)

> まだメッセージはありません

と表示されています。

そういえば先程作った`messages`テーブルには何のレコードも格納されていませんでしたね。

`[]`はJSONの空の配列を表し、つまり、メッセージが0件取得されたということです。
正しく動いていたのですね!

そうなると、今度はメッセージをデータベースに格納していきたいですね。
さあ、次のフェーズに行きましょう。
