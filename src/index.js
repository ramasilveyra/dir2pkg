import path from 'path';
import fs from 'fs/promises';
import repl from 'repl';
import { createRequire } from 'module';
import globby from 'globby';
import Bluebird from 'bluebird';
import { parse as babelParse } from '@babel/parser';
import babelTraverse from '@babel/traverse';

export default async function dir2pkg(pattern, hostpkgJsonPath, { ignore = [] } = {}) {
  const filePathList = await globby(pattern);
  const hostPkgJson = JSON.parse(await fs.readFile(hostpkgJsonPath, { encoding: 'utf8' }));

  const dependenciesRawList = [];
  const dependenciesRawListFilePath = [];

  await Bluebird.map(filePathList, async (filePathItem) => {
    const inputCode = await fs.readFile(filePathItem, { encoding: 'utf8' });
    const ast = babelParse(inputCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const visitor = {
      ImportDeclaration(babelPath) {
        let moduleId = babelPath.node.source.value;
        const segments = moduleId.split(path.sep);
        const name = segments[0];

        if (name[0] === '@') {
          const scopedName = segments[1];
          moduleId = `${name}/${scopedName}`;
        } else {
          moduleId = name;
        }

        if (
          !ignore.some((item) => moduleId.startsWith(item)) &&
          !moduleId.startsWith('.') &&
          !repl._builtinLibs.some((item) => moduleId.startsWith(`${item}/`)) &&
          !repl._builtinLibs.includes(moduleId) &&
          !dependenciesRawList.includes(moduleId)
        ) {
          dependenciesRawList.push(moduleId);
          dependenciesRawListFilePath.push(filePathItem);
        }
      },
      CallExpression(babelPath) {
        if (babelPath.node.callee.name !== 'require') {
          return;
        }
        let moduleId = babelPath.node.arguments[0].value;
        const segments = moduleId.split(path.sep);
        const name = segments[0];

        if (name[0] === '@') {
          const scopedName = segments[1];
          moduleId = `${name}/${scopedName}`;
        } else {
          moduleId = name;
        }

        if (
          !ignore.some((item) => moduleId.startsWith(item)) &&
          !moduleId.startsWith('.') &&
          !repl._builtinLibs.some((item) => moduleId.startsWith(`${item}/`)) &&
          !repl._builtinLibs.includes(moduleId) &&
          !dependenciesRawList.includes(moduleId)
        ) {
          dependenciesRawList.push(moduleId);
          dependenciesRawListFilePath.push(filePathItem);
        }
      },
    };
    babelTraverse(ast, visitor);
  });

  const hostDependencies = {};
  const realdependencies = {};
  await Bluebird.map(dependenciesRawList, async (moduleId, index) => {
    const filePathItem = dependenciesRawListFilePath[index];
    const hostPkgJsonDepVersion = hostPkgJson.dependencies[moduleId];
    const hostPkgJsonDevDepVersion = hostPkgJson.devDependencies[moduleId];
    const hostPkgJsonVersion = hostPkgJsonDepVersion || hostPkgJsonDevDepVersion;
    const require = createRequire(filePathItem);
    let realPkgJsonPath;
    try {
      realPkgJsonPath = resolvePkg(require.resolve(moduleId));
    } catch (error) {
      const messageMatch = error.message.match(/Cannot find module (.*)/);
      if (messageMatch) {
        const newMessage = [
          error.message.slice(0, messageMatch[0].length),
          `, use "--ignore ${messageMatch[1]}" to fix this issue`,
          error.message.slice(messageMatch[0].length),
        ].join('');
        error.message = newMessage;
      }
      throw error;
    }
    const realPkgJson = await fs.readFile(`${realPkgJsonPath}/package.json`, {
      encoding: 'utf8',
    });
    const realPkgJsonVersion = JSON.parse(realPkgJson).version;
    hostDependencies[moduleId] = hostPkgJsonVersion || 'missing';
    realdependencies[moduleId] = realPkgJsonVersion || 'missing';
  });

  const hostDependenciesSorted = Object.keys(hostDependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = hostDependencies[key];
      return acc;
    }, {});

  const realDependenciesSorted = Object.keys(realdependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = realdependencies[key];
      return acc;
    }, {});

  const dependencies = Object.keys(hostDependenciesSorted).reduce((acc, key) => {
    acc[key] =
      hostDependenciesSorted[key] === 'missing'
        ? realDependenciesSorted[key]
        : hostDependenciesSorted[key];
    return acc;
  }, {});

  return { dependencies };
}

function resolvePkg(modulePath) {
  const segments = modulePath.split('/');
  const index = segments.lastIndexOf('node_modules');

  if (index > -1) {
    const name = segments[index + 1];

    if (name[0] === '@') {
      return segments.slice(0, index + 3).join('/');
    } else {
      return segments.slice(0, index + 2).join('/');
    }
  } else {
    throw new TypeError("Couldn't find package");
  }
}
