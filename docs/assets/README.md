# Brand and visual assets

Deterministic asset inventory for the jiahao front face. Everything under
`docs/assets/` is committed source; the rasters are produced by the
pipeline script, never hand-edited.

## Raster brand assets (`brand/`)

| File | Size | Use |
| --- | --- | --- |
| `brand/logo.png` | 1024×1024 RGBA | master mark — black line-art figure on transparency; light backgrounds |
| `brand/logo-dark.png` | 1024×1024 RGBA | dark-theme variant — white sticker halo under the same figure |
| `brand/favicon-16.png` / `-32` / `-48` / `-128` | PNG | browser favicon matrix (head/mask crop) |
| `brand/favicon.ico` | 16+32+48 | multi-size composite |
| `brand/apple-touch-icon.png` | 180×180 | opaque white tile, safe padding (iOS) |
| `brand/android-chrome-192x192.png` / `-512x512.png` | PNG | PWA manifest icons |
| `brand/social-preview.png` | 1280×640 | GitHub social preview (see upload steps below) |

Source draft: user-side GPT Image generation (external channel, per
grill-t23 D-005). The repo only ever runs deterministic processing.

## Pure-SVG assets (`assets/`)

| File | Content |
| --- | --- |
| `hero.svg` | dual-profile split + six-rung ladder + verdict rail motif strip |
| `diagrams/dual-profile.svg` | install flow: `.jiahao-profile` → profiles → hooks → four verdicts |
| `diagrams/verification-ladder.svg` | the six rungs verbatim from `src/SKILL.md` + the ESCALATE branch |
| `badge-license.svg`, `badge-profiles.svg`, `badge-channel.svg`, `badge-verdict.svg` | self-contained shields-style badges (no external image service) |

All SVGs: `viewBox`-sized, `<title>`/`<desc>` a11y, `prefers-color-scheme`
dark adaptation, no scripts / `foreignObject` / external references.
Gate: `node .scratch/grill-t23/check-svg-assets.cjs`.

## Regenerate

```sh
python .scratch/grill-t23/build-brand-assets.py   # rasters (needs Pillow; source: D:\NDM\generated-image.png)
node .scratch/grill-t23/check-svg-assets.cjs      # SVG gate
```

## Social preview — manual upload

GitHub exposes no API for the social-preview image. Upload
`docs/assets/brand/social-preview.png` manually:

1. Repo → **Settings** → **General** → **Social preview**.
2. **Edit** → **Upload an image…** → select `docs/assets/brand/social-preview.png` (1280×640, under 1 MB).
3. Save. Verify by sharing the repo URL — the card shows the hooded mark
   with `jiahao 嘉豪`, the dual-profile line, and the verdict ladder motif.
