---
title: "Phase 4: データベースに永続化しよう"
description: "クライアントから送られてきたデータをデータベースに保存します。"
---

```ts
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
