# Releasing Incito

This guide explains how to ship new versions of Incito.

## Prerequisites

Before your first release, ensure these are configured:

1. **GitHub Secrets** (Settings → Secrets and variables → Actions → Secrets):
   - `TAURI_SIGNING_PRIVATE_KEY` - Your Tauri signing private key
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Password for the signing key
   - `GIST_TOKEN` - Personal access token with `gist` scope

2. **GitHub Variables** (Settings → Secrets and variables → Actions → Variables):
   - `GIST_ID` - The ID of your auto-updater Gist

3. **Auto-updater Gist**: Create a GitHub Gist with a file named `latest.json`

## Release Commands

### Bug Fix Release (v1.0.0 → v1.0.1)

```bash
npm version patch
git push --follow-tags
```

### Feature Release (v1.0.0 → v1.1.0)

```bash
npm version minor
git push --follow-tags
```

### Major Release (v1.0.0 → v2.0.0)

```bash
npm version major
git push --follow-tags
```

## What Happens Automatically

When you run `npm version`:

1. npm bumps the version in `package.json`
2. The `version` script runs and syncs the version to `tauri.conf.json`
3. npm commits both files with the version as the commit message
4. npm creates a git tag (e.g., `v1.0.1`)

When you run `git push --follow-tags`:

1. The commit and tag are pushed to GitHub
2. GitHub Actions sees the tag and triggers the release workflow
3. The app is built for macOS, Windows, and Linux
4. Build artifacts are uploaded to a new GitHub Release
5. The `update-gist` job updates the `latest.json` Gist
6. Users with the app installed receive an update notification

## Version Sync

The version is kept in sync between:

- `package.json` (source of truth)
- `src-tauri/tauri.conf.json` (synced automatically)

The sync script at `scripts/sync-version.cjs` handles this automatically when you use `npm version`.

## Generating Signing Keys

If you need to generate new Tauri signing keys:

```bash
npx tauri signer generate -w ~/.tauri/incito.key
```

This creates:
- `~/.tauri/incito.key` - Private key (add to `TAURI_SIGNING_PRIVATE_KEY` secret)
- `~/.tauri/incito.key.pub` - Public key (add to `tauri.conf.json` updater config)

## Troubleshooting

### Release not triggering

- Ensure the tag starts with `v` (e.g., `v1.0.1`)
- Check that the tag was pushed: `git tag -l` and `git ls-remote --tags origin`

### Auto-updater not working

- Verify the Gist contains valid JSON
- Check that the `GIST_TOKEN` has `gist` scope
- Ensure `GIST_ID` matches your Gist's ID
- Verify `tauri.conf.json` has the correct updater endpoint URL

### Build failures

- Check GitHub Actions logs for the specific error
- Ensure all secrets are configured correctly
- Verify the Rust and Node.js versions are compatible
