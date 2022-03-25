"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = dir2pkgCli;

var _yargs = _interopRequireDefault(require("yargs"));

var _chalk = _interopRequireDefault(require("chalk"));

var _ora = _interopRequireDefault(require("ora"));

var _path = _interopRequireDefault(require("path"));

var _index = _interopRequireDefault(require("./index"));

var _package = _interopRequireDefault(require("../package.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-console */
function dir2pkgCli(argv) {
  console.log(_chalk.default.bold.white(`${_package.default.name} v${_package.default.version}`));
  const parsedArgv = (0, _yargs.default)(argv).option('in-dir', {
    alias: 'i',
    describe: 'In directory',
    type: 'string',
    demandOption: true
  }).option('out-dir', {
    alias: 'o',
    describe: 'Out directory',
    type: 'string',
    demandOption: true
  }).option('pkg-json-name', {
    alias: 'n',
    describe: 'package name',
    type: 'string',
    demandOption: true
  }).option('pkg-json-path', {
    alias: 'p',
    describe: 'Host package.json path',
    type: 'string',
    demandOption: true
  }).option('ignore', {
    alias: 'd',
    describe: 'List of dependencies to ignore',
    type: 'array',
    default: []
  }).usage(`${_package.default.description}.\nUsage: $0 <file or dir> [options]`).version().alias('version', 'v').help().alias('help', 'h').argv;
  const spinner = (0, _ora.default)({
    text: 'Processing...'
  });

  const progress = report => {
    spinner.stopAndPersist({
      text: `${_chalk.default.gray(report)}`
    });
  };

  spinner.start();
  return (0, _index.default)(_path.default.join(process.cwd(), parsedArgv.inDir), _path.default.join(process.cwd(), parsedArgv.outDir), {
    pkgJsonName: parsedArgv.pkgJsonName,
    pkgJsonPath: _path.default.join(process.cwd(), parsedArgv.pkgJsonPath),
    ignore: parsedArgv.ignore,
    progress
  }).then(() => {
    spinner.succeed(`${_chalk.default.bold.green('success')} converted directory to package`);
  }).catch(err => {
    spinner.stopAndPersist();
    spinner.fail(`${_chalk.default.bold.red('error')} ${err.stack}`);
    process.exit(1);
  });
}
//# sourceMappingURL=cli.js.map