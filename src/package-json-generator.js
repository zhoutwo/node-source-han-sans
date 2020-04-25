'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const { BASE_FONT_FAMILY, PACKAGE_PREFIX, HALF_WIDTH_KEYWORD } = require('./settings');

async function getPackageNameFromFolderPath(folderPath) {
  const file = (await fsp.readdir(folderPath)).filter((filename) => filename.endsWith('.otf'))[0];
  const baseFileName = BASE_FONT_FAMILY.split(' ').join('');
  const specifier = file.split('-')[0].replace(baseFileName, '');

  let packageNameWithSpaces;
  if (!specifier) {
    packageNameWithSpaces = BASE_FONT_FAMILY;
  } else if (specifier.includes(HALF_WIDTH_KEYWORD)) {
    if (specifier === HALF_WIDTH_KEYWORD) {
      packageNameWithSpaces = `${BASE_FONT_FAMILY} ${HALF_WIDTH_KEYWORD}`;
    } else {
      packageNameWithSpaces = `${BASE_FONT_FAMILY} ${HALF_WIDTH_KEYWORD} ${specifier.replace(HALF_WIDTH_KEYWORD, '')}`;
    }
  } else {
    packageNameWithSpaces = `${BASE_FONT_FAMILY} ${specifier}`;
  }

  return `${PACKAGE_PREFIX} ${packageNameWithSpaces}`.toLocaleLowerCase().split(' ').join('-');
}

module.exports = {
  async generatePackageJsonForFolders(folderPaths) {
    return Promise.all(
      folderPaths.map(async (folderPath) => {
        console.log(`Generating package.json for ${folderPath}`);
        const packageName = await getPackageNameFromFolderPath(folderPath);
        const basePackageJson = JSON.parse(String(await fsp.readFile(path.join(__dirname, '..', 'package.json'))));
        const packageJson = {
          name: packageName,
          ...basePackageJson,
        };

        await fsp.writeFile(path.join(folderPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      }),
    );
  },
};
