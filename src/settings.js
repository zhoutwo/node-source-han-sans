'use strict';

const path = require('path');

const EACH_FOLDER_TOKEN = '__each_folder__';

module.exports = {
  PARALLELISM_FACTOR: Number(process.env.PARALLELISM_FACTOR) || 4,
  SHUTDOWN_TIMEOUT_SECONDS: 10,
  CHILD_TERMINATE_TIMEOUT_SECONDS: 1.5,
  PACKAGE_PREFIX: 'node',
  BASE_FONT_FAMILY: 'Source Han Sans',
  LOCALE_KEYWORDS: ['K', 'SC', 'HC', 'TC'],
  HALF_WIDTH_KEYWORD: 'HW',
  REGULAR_FONT_WIDTH_NAME: 'Regular',
  /**
   * Table based on the released README file from adobe-fonts/source-han-sans
   * {@see SourceHanSansReadMe.pdf}
   * @type {{ExtraLight: number, Light: number, Normal: number, Regular: number, Medium: number, Bold: number, Heavy: number}}
   */
  FONT_WEIGHT_CONVERSION_TABLE: {
    ExtraLight: 1, // This should be 0, but CSS font-weight values have to be at least 1
    Light: 160,
    Normal: 320,
    Regular: 420,
    Medium: 560,
    Bold: 780,
    Heavy: 1000,
  },
  CSS_BUILD_CONFIGURATIONS: {
    all: { includeLocal: true, includeOtf: true, includeWoff2: true },
    local: { includeLocal: true, includeOtf: false, includeWoff2: false },
    otf: { includeLocal: false, includeOtf: true, includeWoff2: false },
    woff2: { includeLocal: false, includeOtf: false, includeWoff2: true },
    'local-otf': { includeLocal: true, includeOtf: true, includeWoff2: false },
    'local-woff2': { includeLocal: true, includeOtf: false, includeWoff2: true },
    'otf-woff2': { includeLocal: false, includeOtf: true, includeWoff2: true },
  },
  EACH_FOLDER_TOKEN,
  ADDITIONAL_FILES: [
    {
      sourcePath: path.join(__dirname, 'source-han-sans', 'LICENSE.txt'),
      targetRelativePath: `${EACH_FOLDER_TOKEN}/LICENSE`,
    },
    {
      sourcePath: path.join(__dirname, '..', 'README.md'),
      targetRelativePath: `${EACH_FOLDER_TOKEN}/README.md`,
    },
    // {
    //   sourcePath: path.join(__dirname, '..', '.npmrc.default'),
    //   targetRelativePath: `${EACH_FOLDER_TOKEN}/.npmrc`,
    // },
  ],
  RUN_CONFIGURATIONS: {
    CLEAN_AND_RECREATE_FOLDERS: true,
    COPY_FONT_FILES: true,
    CONVERT_TO_WOFF2: true,
    GENERATE_CSS: true,
    GENERATE_PACKAGE_JSON: true,
    COPY_ADDITIONAL_FILES: true,
    // RUN_NPM_PUBLISH: {
    //   dryRun: false,
    // },
  },
};
