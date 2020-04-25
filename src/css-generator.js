'use strict';

const {
  BASE_FONT_FAMILY,
  LOCALE_KEYWORDS,
  HALF_WIDTH_KEYWORD,
  REGULAR_FONT_WIDTH_NAME,
  FONT_WEIGHT_CONVERSION_TABLE,
} = require('./settings');

/**
 * Calculate the full font family and font weight name.
 *
 * @param filename {string}
 */
function inferFontFamilyFontWeightFromFileName(filename) {
  const [pascalName, fontWeightName] = filename.split('-');

  let fontFamily = BASE_FONT_FAMILY;
  fontFamily += pascalName.includes(HALF_WIDTH_KEYWORD) ? ` ${HALF_WIDTH_KEYWORD}` : '';
  const localKeyword =
    (LOCALE_KEYWORDS.includes(pascalName.substr(-2)) && pascalName.substr(-2)) ||
    (LOCALE_KEYWORDS.includes(pascalName.substr(-1)) && pascalName.substr(-1)) ||
    '';

  fontFamily += ` ${localKeyword}`;
  fontFamily = fontFamily.trim();
  fontFamily += fontWeightName === REGULAR_FONT_WIDTH_NAME ? '' : ` ${fontWeightName}`;

  return [fontFamily, fontWeightName];
}

/**
 * Generate the CSS string to be written to disk.
 *
 * @param fileNameWithoutExtension {string}
 * @param includeLocal {boolean}
 * @param includeOtf {boolean}
 * @param includeWoff2 {boolean}
 */
function generateCss(fileNameWithoutExtension, includeLocal, includeOtf, includeWoff2) {
  const [fullFontFamily, fontWeightName] = inferFontFamilyFontWeightFromFileName(fileNameWithoutExtension);

  /**
   * We strip out font-weight to register different weights under the same font-family
   * so that in CSS, the way to toggle between different font-weights can be controlled
   * using the {@code font-weight} CSS property.
   */
  const fontFamily = fullFontFamily.replace(fontWeightName, '').trim();
  const foundFontWeight = FONT_WEIGHT_CONVERSION_TABLE[fontWeightName];
  if (typeof foundFontWeight !== 'number') {
    throw new Error(`Unknown font weight name: ${fontWeightName}`);
  }
  const base = `@font-face {
  font-family: '${fontFamily}';
  font-style: normal;
  font-display: swap;
  font-weight: ${foundFontWeight};
  src:
    `;

  const srcSegments = [];
  if (includeLocal) {
    srcSegments.push(`local('${fullFontFamily}')`);
  }
  if (includeOtf) {
    srcSegments.push(`url(${fileNameWithoutExtension}.otf) format('opentype')`);
  }
  if (includeWoff2) {
    srcSegments.push(`url(${fileNameWithoutExtension}.woff2) format('woff2')`);
  }
  const segmentStr = srcSegments.join(',\n    ');

  return base + segmentStr + ';\n}\n';
}

module.exports = {
  generateCssForFiles(filenamesWithoutExtension, includeLocal, includeOtf, includeWoff2) {
    return filenamesWithoutExtension
      .map((filename) => generateCss(filename, includeLocal, includeOtf, includeWoff2))
      .join('\n');
  },
};
