# Sorgena — licensed brand typeface

Sorgena is not open source and is not distributed with this project. Place the
licensed webfonts in this folder and `src/lib/sorgena.ts` will register them on
load (it checks with a HEAD request, so nothing breaks while they are absent).

Accepted file names (woff2):

```
Sorgena-Variable.woff2            weights 300–700
Sorgena-Variable-Italic.woff2
Sorgena-Regular.woff2             Sogena Text equivalents use the
Sorgena-Italic.woff2              "SorgenaText-" prefix:
Sorgena-Medium.woff2              SorgenaText-Regular.woff2
Sorgena-Semibold.woff2            SorgenaText-Medium.woff2
Sorgena-Bold.woff2                SorgenaText-Semibold.woff2
                                  SorgenaText-Bold.woff2
```

`Sorgena` is used for display and the wordmark. `Sorgena Text` is used for
interface copy when provided; otherwise the interface keeps Archivo and the
display stack falls back to Bodoni Moda, then Instrument Serif.

If the foundry supplies `.otf` or `.ttf` files only, convert them to `.woff2`
(for example with `fonttools` or a webfont generator) before adding them here.
