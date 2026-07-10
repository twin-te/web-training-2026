import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://web-training-2026.twin-te.workers.dev",
  integrations: [
    starlight({
      title: "Twin:te 勉強会 2026",
      description: "Twin:te 勉強会 2026",
      defaultLocale: "root",
      locales: {
        root: { label: "日本語", lang: "ja" },
      },
      social: {
        github: "https://github.com/twin-te/web-training-2026",
      },
      customCss: ["./src/styles/custom.css"],
      lastUpdated: true,
      sidebar: [
        {
          label: "はじめに",
          items: [{ label: "ようこそ", link: "/" }],
        },
        {
          label: "フロントエンド",
          items: [
            { label: "はじめに", slug: "frontend" },
            {
              label: "Day 1 — HTML / CSS / JavaScript",
              items: [
                { label: "Day 1 概要", slug: "frontend/day1" },
                {
                  label: "Phase 1 — HTML",
                  collapsed: false,
                  items: [
                    { label: "はじめに", slug: "frontend/day1/phase1" },
                    {
                      label: "1. HTML とは",
                      slug: "frontend/day1/phase1/01-html-toha",
                    },
                    {
                      label: "2. HTML を構成する要素",
                      slug: "frontend/day1/phase1/02-html-elements",
                    },
                    { label: "3. 演習", slug: "frontend/day1/phase1/03-enshu" },
                  ],
                },
                {
                  label: "Phase 2 — CSS",
                  items: [{ label: "はじめに", slug: "frontend/day1/phase2" }],
                },
                {
                  label: "Phase 3 — JavaScript",
                  collapsed: true,
                  items: [
                    { label: "はじめに", slug: "frontend/day1/phase3" },
                    {
                      label: "1. はじめに",
                      slug: "frontend/day1/phase3/01-hajimeni",
                    },
                    {
                      label: "2. 数値演算",
                      slug: "frontend/day1/phase3/02-suuchi-enzan",
                    },
                    {
                      label: "3. 文字列",
                      slug: "frontend/day1/phase3/03-mojiretsu",
                    },
                    {
                      label: "4. 変数",
                      slug: "frontend/day1/phase3/04-hensuu",
                    },
                    {
                      label: "5. 配列",
                      slug: "frontend/day1/phase3/05-hairetsu",
                    },
                    {
                      label: "6. オブジェクト",
                      slug: "frontend/day1/phase3/06-object",
                    },
                    {
                      label: "7. 制御構文",
                      slug: "frontend/day1/phase3/07-seigyo-koubun",
                    },
                    {
                      label: "8. 関数",
                      slug: "frontend/day1/phase3/08-kansuu",
                    },
                    { label: "9. DOM", slug: "frontend/day1/phase3/09-dom" },
                  ],
                },
              ],
            },
            {
              label: "Day 2 — シェル / TypeScript",
              items: [
                { label: "Day 2 概要", slug: "frontend/day2" },
                { label: "Phase 0 — シェル操作", slug: "frontend/day2/phase0" },
                { label: "Phase 1 — TypeScript", slug: "frontend/day2/phase1" },
              ],
            },
            {
              label: "Day 3 — React・Astro・Vue",
              items: [
                { label: "Day 3 概要", slug: "frontend/day3" },
                {
                  label: "React",
                  collapsed: true,
                  autogenerate: { directory: "frontend/day3/react" },
                },
                {
                  label: "Astro",
                  collapsed: true,
                  autogenerate: { directory: "frontend/day3/astro" },
                },
                {
                  label: "Vue",
                  collapsed: true,
                  autogenerate: { directory: "frontend/day3/vue" },
                },
              ],
            },
          ],
        },
        {
          label: "バックエンド",
          items: [
            { label: "はじめに", slug: "backend" },
            {
              label: "1章: 知っておきたい! 知識編",
              items: [
                { label: "1章 概要", slug: "backend/1-knowledge" },
                {
                  label:
                    "Phase 1: Webアプリケーションを俯瞰してみよう/バックエンドって何をしているの?",
                  slug: "backend/1-knowledge/phase1",
                },
                {
                  label: "Phase 2: バックエンドに使われる技術たち",
                  slug: "backend/1-knowledge/phase2",
                },
              ],
            },
            {
              label: "2章: 楽しい、楽しい 実践編",
              items: [
                { label: "2章 概要", slug: "backend/2-practice" },
                {
                  label: "Appendix 1: Gitを使おう",
                  slug: "backend/2-practice/appendix1",
                },
                {
                  label:
                    "Appendix 2: Web API の様々な検証方法 / 検証用フロントエンド",
                  slug: "backend/2-practice/appendix2",
                },
                {
                  label: "Phase 1: 環境構築しよう",
                  slug: "backend/2-practice/phase1",
                },
                {
                  label: "Phase 2: リクエストを受けて適当なメッセージを返そう",
                  slug: "backend/2-practice/phase2",
                },
                {
                  label: "Phase 3: データベースを読んでみよう",
                  slug: "backend/2-practice/phase3",
                },
                {
                  label: "Phase 4: データベースに永続化しよう",
                  slug: "backend/2-practice/phase4",
                },
                {
                  label: "Phase 5: もっと改造しよう",
                  slug: "backend/2-practice/phase5",
                },
              ],
            },
            {
              label: "3章: 高度な話題! 発展編",
              items: [
                { label: "3章 概要", slug: "backend/3-improve" },
                {
                  label: "Phase 1: 続! HTTP探検隊",
                  slug: "backend/3-improve/phase1",
                },
                {
                  label: "Phase 2: 認証・認可とその方法",
                  slug: "backend/3-improve/phase2",
                },
              ],
            },
          ],
        },
        {
          label: "インフラ",
          items: [
            { label: "はじめに", slug: "infra" },
            { label: "1. 自分の PC で動かす", slug: "infra/pc" },
            { label: "2. サーバを用意する", slug: "infra/server" },
            { label: "3. サーバで Twin:te を動かす", slug: "infra/deploy" },
            { label: "発展: 本物の URL で公開する", slug: "infra/publish" },
            { label: "4. 後片付けの儀式", slug: "infra/cleanup" },
          ],
        },
        {
          label: "Git/GitHub",
          autogenerate: { directory: "git" },
        },
        {
          label: "付録",
          items: [{ label: "Windows 環境構築", slug: "windows-setup" }],
        },
      ],
    }),
  ],
});
