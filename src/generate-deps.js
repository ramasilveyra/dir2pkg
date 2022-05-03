import path from 'path';
import fs from 'fs/promises';
import repl from 'repl';
import { createRequire } from 'module';
import Bluebird from 'bluebird';
import _ from 'lodash';
import { parse as babelParse } from '@babel/parser';
import babelTraverse from '@babel/traverse';

export default async function generateDeps(
  filePathList,
  hostpkgJsonPath,
  { ignore = [], forcePeerDep = [] } = {}
) {
  const hostPkgJson = _.defaults(
    JSON.parse(await fs.readFile(hostpkgJsonPath, { encoding: 'utf8' })),
    {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    }
  );

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
  const realDependencies = {};
  const dependeciesTypes = {};
  await Bluebird.map(dependenciesRawList, async (moduleId, index) => {
    const filePathItem = dependenciesRawListFilePath[index];
    const hostPkgJsonDepVersion = hostPkgJson.dependencies[moduleId];
    const hostPkgJsonDevDepVersion = hostPkgJson.devDependencies[moduleId];
    if (forcePeerDep.includes(moduleId)) {
      dependeciesTypes[moduleId] = 'peerDependencies';
    } else if (hostPkgJsonDepVersion) {
      dependeciesTypes[moduleId] = 'dependencies';
    } else if (hostPkgJsonDevDepVersion) {
      dependeciesTypes[moduleId] = 'devDependencies';
    } else {
      dependeciesTypes[moduleId] = 'unknown';
    }
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
          `, install it or use "--ignore ${messageMatch[1]}" to fix this issue`,
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
    realDependencies[moduleId] = realPkgJsonVersion || 'missing';
  });

  const hostDependenciesSorted = Object.keys(hostDependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = hostDependencies[key];
      return acc;
    }, {});

  const realDependenciesSorted = Object.keys(realDependencies)
    .sort()
    .reduce((acc, key) => {
      acc[key] = realDependencies[key];
      return acc;
    }, {});

  const allDependencies = Object.keys(hostDependenciesSorted).reduce((acc, key) => {
    acc[key] =
      hostDependenciesSorted[key] === 'missing'
        ? realDependenciesSorted[key]
        : hostDependenciesSorted[key];
    return acc;
  }, {});

  const dependencies = _.pickBy(
    allDependencies,
    (value, key) => dependeciesTypes[key] === 'dependencies'
  );
  const devDependencies = _.pickBy(
    allDependencies,
    (value, key) => dependeciesTypes[key] === 'devDependencies'
  );
  const peerDependencies = _.mapValues(
    _.pickBy(allDependencies, (value, key) => dependeciesTypes[key] === 'peerDependencies'),
    parsePeerDepRange
  );
  return { dependencies, devDependencies, peerDependencies };
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

// HACK: this fn removes yarn patch protocol and returns `^x.x.x`/
function parsePeerDepRange(depRange) {
  if (!depRange.startsWith('patch:')) {
    return depRange;
  }
  const patchVersionRegex = /(?<=npm:)(.*)(?=#)/;
  const regexResult = patchVersionRegex.exec(depRange);
  if (!regexResult || regexResult.length === 0) {
    return depRange;
  }
  return `^${regexResult[0]}`;
}
