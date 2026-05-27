# Breeze Plugin Example

最小可运行示例，仅包含占位实现：

- `getInfo`
- `searchComic`
- `getComicDetail`
- `getReadSnapshot`
- `fetchImageBytes`
- `getSettingsBundle`

构建流程：

1. 生成根目录 `manifest.json`
2. `rspack` 构建 bundle
3. 自动生成 `.br` Brotli 压缩版本
