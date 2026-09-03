# CI/CD

## CI

`.github/workflows/ci.yml`はPRと`main`へのpushで実行する。

- Nodeは`.node-version`で固定する。
- `npm ci`でlockfileどおりに復元する。
- `npm run check`でformat、lint、typecheck、unit、buildを実行する。
- PlaywrightはChromiumの主要導線を別jobで確認する。
- 失敗時だけPlaywright reportを7日間保存する。

## CD

`.github/workflows/deploy.yml`は`main`へのpushまたは手動実行で起動する。GitHub Environment `production`に次のsecretを登録する。

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

API tokenは対象accountのWorkers編集に限定し、ソースや`.env`へ保存しない。本番workflowはCI相当の検証後、Cloudflare公式Wrangler Actionでデプロイする。

## ローカル検証

```sh
npm ci
npm run check
npm run deploy:dry-run
```

実際のデプロイは認証済み環境で`npm run deploy`を実行する。`wrangler.jsonc`をCloudflare設定の唯一の正とする。
