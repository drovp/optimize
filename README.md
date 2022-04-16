# @drovp/optimize

[Drovp](https://drovp.app) plugin for perceptually lossless image & SVG size optimization.

Uses [imagemin](https://www.npmjs.com/package/imagemin) under the hood.

Available optimizers:

-   JPG: mozjpeg, libwebp
-   PNG: pngquant, optipng, libwebp
-   WEBP: libwebp
-   GIF: gifsicle, gif2webp
-   SVG: svgo

## Changelog

### 5.1.0

-   Added output flairs with file size savings percentage.
-   Updated dependencies.
