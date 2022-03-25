"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = generateDeps;

var _path = _interopRequireDefault(require("path"));

var _promises = _interopRequireDefault(require("fs/promises"));

var _repl = _interopRequireDefault(require("repl"));

var _module = require("module");

var _bluebird = _interopRequireDefault(require("bluebird"));

var _lodash = _interopRequireDefault(require("lodash"));

var _parser = require("@babel/parser");

var _traverse = _interopRequireDefault(require("@babel/traverse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function generateDeps(filePathList, hostpkgJsonPath, {
  ignore = []
} = {}) {
  const hostPkgJson = _lodash.default.defaults(JSON.parse(await _promises.default.readFile(hostpkgJsonPath, {
    encoding: 'utf8'
  })), {
    dependencies: {},
    devDependencies: {}
  });

  const dependenciesRawList = [];
  const dependenciesRawListFilePath = [];
  await _bluebird.default.map(filePathList, async filePathItem => {
    const inputCode = await _promises.default.readFile(filePathItem, {
      encoding: 'utf8'
    });
    const ast = (0, _parser.parse)(inputCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    const visitor = {
      ImportDeclaration(babelPath) {
        let moduleId = babelPath.node.source.value;
        const segments = moduleId.split(_path.default.sep);
        const name = segments[0];

        if (name[0] === '@') {
          const scopedName = segments[1];
          moduleId = `${name}/${scopedName}`;
        } else {
          moduleId = name;
        }

        if (!ignore.some(item => moduleId.startsWith(item)) && !moduleId.startsWith('.') && !_repl.default._builtinLibs.some(item => moduleId.startsWith(`${item}/`)) && !_repl.default._builtinLibs.includes(moduleId) && !dependenciesRawList.includes(moduleId)) {
          dependenciesRawList.push(moduleId);
          dependenciesRawListFilePath.push(filePathItem);
        }
      },

      CallExpression(babelPath) {
        if (babelPath.node.callee.name !== 'require') {
          return;
        }

        let moduleId = babelPath.node.arguments[0].value;
        const segments = moduleId.split(_path.default.sep);
        const name = segments[0];

        if (name[0] === '@') {
          const scopedName = segments[1];
          moduleId = `${name}/${scopedName}`;
        } else {
          moduleId = name;
        }

        if (!ignore.some(item => moduleId.startsWith(item)) && !moduleId.startsWith('.') && !_repl.default._builtinLibs.some(item => moduleId.startsWith(`${item}/`)) && !_repl.default._builtinLibs.includes(moduleId) && !dependenciesRawList.includes(moduleId)) {
          dependenciesRawList.push(moduleId);
          dependenciesRawListFilePath.push(filePathItem);
        }
      }

    };
    (0, _traverse.default)(ast, visitor);
  });
  const hostDependencies = {};
  const realdependencies = {};
  await _bluebird.default.map(dependenciesRawList, async (moduleId, index) => {
    const filePathItem = dependenciesRawListFilePath[index];
    const hostPkgJsonDepVersion = hostPkgJson.dependencies[moduleId];
    const hostPkgJsonDevDepVersion = hostPkgJson.devDependencies[moduleId];
    const hostPkgJsonVersion = hostPkgJsonDepVersion || hostPkgJsonDevDepVersion;

    const require = (0, _module.createRequire)(filePathItem);

    let realPkgJsonPath;

    try {
      realPkgJsonPath = resolvePkg(require.resolve(moduleId));
    } catch (error) {
      const messageMatch = error.message.match(/Cannot find module (.*)/);

      if (messageMatch) {
        const newMessage = [error.message.slice(0, messageMatch[0].length), `, install it or use "--ignore ${messageMatch[1]}" to fix this issue`, error.message.slice(messageMatch[0].length)].join('');
        error.message = newMessage;
      }

      throw error;
    }

    const realPkgJson = await _promises.default.readFile(`${realPkgJsonPath}/package.json`, {
      encoding: 'utf8'
    });
    const realPkgJsonVersion = JSON.parse(realPkgJson).version;
    hostDependencies[moduleId] = hostPkgJsonVersion || 'missing';
    realdependencies[moduleId] = realPkgJsonVersion || 'missing';
  });
  const hostDependenciesSorted = Object.keys(hostDependencies).sort().reduce((acc, key) => {
    acc[key] = hostDependencies[key];
    return acc;
  }, {});
  const realDependenciesSorted = Object.keys(realdependencies).sort().reduce((acc, key) => {
    acc[key] = realdependencies[key];
    return acc;
  }, {});
  const dependencies = Object.keys(hostDependenciesSorted).reduce((acc, key) => {
    acc[key] = hostDependenciesSorted[key] === 'missing' ? realDependenciesSorted[key] : hostDependenciesSorted[key];
    return acc;
  }, {});
  return dependencies;
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
//# sourceMappingURL=generate-deps.js.map