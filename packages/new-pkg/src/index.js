"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = dir2pkg;

var _moveFile = _interopRequireDefault(require("move-file"));

var _globby = _interopRequireDefault(require("globby"));

var _path = _interopRequireDefault(require("path"));

var _promises = _interopRequireDefault(require("fs/promises"));

var _generateDeps = _interopRequireDefault(require("./generate-deps"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function dir2pkg(inFolder, outFolder, {
  pkgJsonName,
  pkgJsonPath,
  ignore = [],
  progress
} = {}) {
  progress('Generating dependencies');

  const pattern = _path.default.join(inFolder, '/**/*.{js,jsx,ts,tsx}');

  const filePathList = await (0, _globby.default)(pattern);
  const dependencies = await (0, _generateDeps.default)(filePathList, pkgJsonPath, {
    ignore
  });
  progress('Moving directory');
  await (0, _moveFile.default)(inFolder, _path.default.join(outFolder, 'src'));
  progress('Creating package.json');
  const pkgJsonContent = {
    name: pkgJsonName,
    private: true,
    license: 'UNLICENSED',
    dependencies
  };
  await _promises.default.writeFile(_path.default.join(outFolder, 'package.json'), JSON.stringify(pkgJsonContent, null, '  '));
  progress('Creating README.md');
  const readmeContent = `# ${pkgJsonName}
`;
  await _promises.default.writeFile(_path.default.join(outFolder, 'README.md'), readmeContent);
}
//# sourceMappingURL=index.js.map