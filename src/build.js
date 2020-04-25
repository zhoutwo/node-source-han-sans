'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const all = Promise.all.bind(Promise);

const settings = require('./settings');
const {
  CSS_BUILD_CONFIGURATIONS,
  EACH_FOLDER_TOKEN,
  ADDITIONAL_FILES,
  RUN_CONFIGURATIONS: {
    CLEAN_AND_RECREATE_FOLDERS,
    COPY_FONT_FILES,
    CONVERT_TO_WOFF2,
    GENERATE_CSS,
    GENERATE_PACKAGE_JSON,
    COPY_ADDITIONAL_FILES,
    RUN_NPM_PUBLISH,
  },
} = settings;
const { spawnPromisified, runInBatchedParallel } = require('./execution-helpers')(settings);
const { generateCssForFiles } = require('./css-generator');
const { generatePackageJsonForFolders } = require('./package-json-generator');

(async () => {
  const fontSrc = path.join(__dirname, 'source-han-sans');
  const distFolder = path.join(__dirname, '../dist');

  {
    if (!CLEAN_AND_RECREATE_FOLDERS) {
      console.log('Skipped: Clean and recreate dist folder');
    } else {
      console.log('Clean and recreate dist folder');
      if (fs.existsSync(distFolder)) {
        await fsp.rmdir(distFolder, { recursive: true });
      }
      await fsp.mkdir(distFolder);
    }
  }

  const otfFolders = (await fsp.readdir(path.join(fontSrc, 'OTF'), { withFileTypes: true }))
    .filter((file) => file.isDirectory())
    .map((folder) => folder.name);

  {
    if (CLEAN_AND_RECREATE_FOLDERS) {
      console.log('Create target folders');
      await all(otfFolders.map((folder) => fsp.mkdir(path.join(distFolder, folder))));
    }
  }

  const fontJobContexts = [];
  {
    console.log('Collect font file info');
    await all(
      otfFolders.map(async (otfFolder) => {
        console.log(`Processing ${otfFolder}`);
        const otfFolderPath = path.join(fontSrc, 'OTF', otfFolder);
        const distOtfFolder = path.join(distFolder, otfFolder);
        const fontFiles = (await fsp.readdir(otfFolderPath)).filter((filename) => filename.endsWith('.otf'));
        console.log(`Found font files: ${fontFiles}`);
        fontJobContexts.push({ otfFolder, otfFolderPath, distOtfFolder, fontFiles });
      }),
    );
  }

  {
    if (!COPY_FONT_FILES) {
      console.log('Skipped: Copy font files');
    } else {
      console.log('Copy font files');
      await all(
        fontJobContexts.flatMap(({ otfFolderPath, distOtfFolder, fontFiles }) =>
          fontFiles.map((fontFile) => {
            console.log(`Copy font ${fontFile}`);
            return fsp.copyFile(path.join(otfFolderPath, fontFile), path.join(distOtfFolder, fontFile));
          }),
        ),
      );
    }
  }

  {
    if (!CONVERT_TO_WOFF2) {
      console.log('Skipped: Convert font files to WOFF2');
    } else {
      console.log('Convert font files to WOFF2');
      await spawnPromisified({
        runCommand: ['docker', 'pull', 'vanekt/ttf2woff2'],
      });
      await runInBatchedParallel(
        fontJobContexts.flatMap(({ distOtfFolder, fontFiles, otfFolderPath }) =>
          fontFiles.map((fontFile) => ({ distOtfFolder, fontFile, otfFolderPath })),
        ),
        async ({ distOtfFolder, fontFile, otfFolderPath }) => {
          console.log(`Convert font ${fontFile} to WOFF2`);
          try {
            const containerName = `c${Math.floor(Math.random() * 1000000)}`;
            const runCommand = [
              'docker',
              'run',
              '--rm',
              '--name',
              containerName,
              '-v',
              `${distOtfFolder}:/workspace`,
              '-w',
              '/workspace',
              'vanekt/ttf2woff2',
              'compress',
              fontFile,
            ];

            const exitCommand = ['docker', 'stop', containerName];
            await spawnPromisified({
              runCommand,
              exitCommand,
            });
          } catch (e) {
            console.error(e);
            throw new Error(`Failed to process ${fontFile} under ${otfFolderPath}`);
          }
        },
      );
    }
  }

  {
    if (!GENERATE_CSS) {
      console.log('Skipped: Generate CSS output');
    } else {
      console.log('Generate CSS output');
      await all(
        fontJobContexts.flatMap(({ otfFolder, distOtfFolder, fontFiles }) => {
          console.log(`Generate CSS output for ${otfFolder}`);
          const fontFilesWithoutExtension = fontFiles.map((fontFile) => fontFile.replace('.otf', ''));
          Object.entries(CSS_BUILD_CONFIGURATIONS).forEach(
            ([configName, { includeLocal, includeOtf, includeWoff2 }]) => {
              const cssStr = generateCssForFiles(fontFilesWithoutExtension, includeLocal, includeOtf, includeWoff2);
              fs.writeFileSync(path.join(distOtfFolder, `${configName}.css`), cssStr);
            },
          );
        }),
      );
    }
  }

  {
    if (!GENERATE_PACKAGE_JSON) {
      console.log('Skipped: Generate package.json');
    } else {
      console.log('Generate package.json');
      await generatePackageJsonForFolders(fontJobContexts.map(({ distOtfFolder }) => distOtfFolder));
    }
  }

  {
    if (!COPY_ADDITIONAL_FILES) {
      console.log('Skipped: Copy additional files');
    } else {
      console.log('Copy additional files');
      await all(
        ADDITIONAL_FILES.flatMap(({ sourcePath, targetRelativePath }) => {
          const getCopyTask = (relativePath) => {
            const targetPath = path.join(distFolder, relativePath);
            console.log(`Copying ${sourcePath} to targetPath ${targetPath}`);
            return fsp.copyFile(sourcePath, targetPath);
          };

          if (!targetRelativePath.includes(EACH_FOLDER_TOKEN)) {
            return getCopyTask(targetRelativePath);
          } else {
            return otfFolders.map((otfFolder) =>
              getCopyTask(path.join(otfFolder, targetRelativePath.replace(EACH_FOLDER_TOKEN, ''))),
            );
          }
        }),
      );
    }
  }

  {
    if (!RUN_NPM_PUBLISH) {
      console.log('Skipped: Publish to npm');
    } else {
      console.log('Publish to npm');
      const { dryRun } = RUN_NPM_PUBLISH;
      if (!dryRun && !process.env.NODE_AUTH_TOKEN) {
        console.error(`Publish may fail without setting NODE_AUTH_TOKEN environment variable`);
      }

      await runInBatchedParallel(
        otfFolders,
        async (otfFolder) => {
          console.log(`Publishing ${otfFolder} to npm${dryRun ? ' in dry run' : ''}`);
          const otfFolderPath = path.join(distFolder, otfFolder);
          try {
            const runCommand = ['npm', 'publish', otfFolderPath, ...(dryRun ? ['--dry-run'] : [])];

            await spawnPromisified({
              runCommand,
            });
          } catch (e) {
            console.error(e);
            throw new Error(`Failed to publish ${otfFolder}`);
          }
        },
        true,
      );
    }
  }

  console.log('Completed all steps');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
