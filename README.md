# node-source-han-sans
An npm package to facilitate use of web fonts and CSS @font-faces for [adobe-fonts/source-han-sans](https://github.com/adobe-fonts/source-han-sans).

# Usage
## Quick Start
This package is to self-host web fonts for client-side usage instead of using a solution such as [Adobe TypeKit](https://fonts.adobe.com/).
If your project is able to load fonts, then this package should be able to plug-and-play.

Simply include in your JS/TS file:
```javascript
// Japanese seems to be the default language for the font because the font family name for "Regular" does not have language identifier in it.
require('node-source-han-sans/SourceHanSans-Regular-all.css');
// Or
import 'node-source-han-sans/SourceHanSans-Regular-all.css';
```
and you are ready to use the `Source Han Sans` for `font-family` in your CSS code.

## Advanced Options
The `SourceHanSans-Regular-all.css` here includes all font formats for `SourceHanSans-Regular`. There are other options to choose what to include.
Replace "all" with "local", "otf", "local-otf"... to use just `local` source, just `otf`, `local` source followed by `otf` source, etc.
Likewise, if you need different/additional font weights, you need to change the `SourceHanSans-Regular` part.
Look in the folder for what's available.

If you switch between languages/locales, consider switching to a different subset because certain characters do differ. Note that the font family name will also change.
For example, for Simplified Chinese, the font family name becomes "Source Han Sans SC". Refer to [SourceHanSansDesignGuide.pdf](https://github.com/adobe-fonts/source-han-sans/blob/1.001R/SourceHanSansDesignGuide.pdf)
and [SourceHanSansReadMe.pdf](https://github.com/adobe-fonts/source-han-sans/blob/1.001R/SourceHanSansReadMe.pdf) for more information.

`HW` refers to "Half-Width".

# Repo Structure
This package is merely a wrapper around [adobe-fonts/source-han-sans](https://github.com/adobe-fonts/source-han-sans/)
to distribute the fonts on npm. However, this is an early start of making the most optimized wrapper. As a result,
this repo uses several branches, each branch corresponding to a release of "Font Files" on [adobe-fonts/source-han-sans](https://github.com/adobe-fonts/source-han-sans/)
(e.g. Branch `1.001R` is based on the release in tag `1.001R` of [adobe-fonts/source-han-sans](https://github.com/adobe-fonts/source-han-sans/)).
The release version will have `dist-tags` corresponding to the font version (e.g. for branch `1.001R` the npm version
could be `v1.0.0-1.001R`, `v1.0.1-1.001R`, `v1.1.0-1.001R` and so on). The `wrapper` branch contains the documentation
and the code that are maintained by myself. Changes will be made on the `wrapper` branch first,
and then merged onto each branch, and a release will be made from each branch with a "patch" version bump.

The `src` folder is a git submodule reflecting the [adobe-fonts/source-han-sans](https://github.com/adobe-fonts/source-han-sans)
repo at the release tag. It is used for building and to include the [LICENSE](/LICENSE) of the font which, has to be the license under which this package and its source
code is released, as far as I understand. If that's not the case, please inform me by opening an [Issue](https://github.com/zhoutwo/node-source-han-sans/issues).

# How to Help
If this project is in the right direction, but it's "not there" yet, please open an [Issue](https://github.com/zhoutwo/node-source-han-sans/issues) to discuss it.

## Supporting Different Formats
Currently, I'm looking for a reliable way to convert the font source files into various formats.
Several tools, including [css3-font-converter (Docker Hub)](https://hub.docker.com/r/omarev/css3-font-converter/) and others fell short
because they do not have proper support for Unicode beyond a certain range, which, as far as I understand, does not include
CJK (Chinese, Japanese, Korean) unicode characters.

Instead, I was able to find [ttf2woff2 (Docker Hub)](https://hub.docker.com/r/vanekt/ttf2woff2) to convert `.otf` files
(somehow `.otf` seems to work interoperably with `.ttf` files, I don't know why) to `.woff2` files and that's
what's currently being supported. If there are ways to convert to other formats that has decent support, I'd like to add them.

Furthermore, if `less`/`sass`/`scss`/etc formats are needed, please let me know or open pull requests to add them.

# Build
I use the following command to build and publish the package:
```sh
node src/build.js
```

However, you might not want to execute all steps (especially `npm publish`). For control of that, please refer to [settings.js](src/settings.js)
and comment out (or set to desired values) specific fields.

The script uses [ttf2woff2](https://hub.docker.com/r/vanekt/ttf2woff2) to convert the `.otf` files (again `ttf` can
be used on `otf` here) to convert each file to `.woff2`. This project needs `Docker` to run `ttf2woff2`, and if your docker
needs to run with `sudo`, consider running the above command with `sudo` or modify the build script.
