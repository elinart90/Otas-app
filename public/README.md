# Static assets

## UMaT emblem

Drop your UMaT emblem image file in this directory with the exact filename:

    umat-emblem.png

The recommended dimensions are roughly 1:1.26 ratio per the UMaT spec
(e.g. 200 x 252 px or 400 x 504 px).

If you provide a transparent PNG, it will look correct on both light and
dark backgrounds. SVG is also accepted — just rename the file to
`umat-emblem.svg` and the Logo component will pick it up.

If the file is missing, the app falls back to a monogram badge so nothing
breaks.
