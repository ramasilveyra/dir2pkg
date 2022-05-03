/* eslint-disable no-console */
import yargs from 'yargs';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import dir2pkg from './index';
import pkg from '../package.json';

export default function dir2pkgCli(argv) {
  console.log(chalk.bold.white(`${pkg.name} v${pkg.version}`));

  const parsedArgv = yargs(argv)
    .option('in-dir', {
      alias: 'i',
      describe: 'In directory',
      type: 'string',
      demandOption: true,
    })
    .option('out-dir', {
      alias: 'o',
      describe: 'Out directory',
      type: 'string',
      demandOption: true,
    })
    .option('pkg-json-name', {
      alias: 'n',
      describe: 'package name',
      type: 'string',
      demandOption: true,
    })
    .option('pkg-json-path', {
      alias: 'p',
      describe: 'Host package.json path',
      type: 'string',
      demandOption: true,
    })
    .option('ignore', {
      alias: 'd',
      describe: 'List of dependencies to ignore',
      type: 'array',
      default: [],
    })
    .option('force-peer-dep', {
      alias: 'f',
      describe: 'List of dependencies to force as peer dependencies',
      type: 'array',
      default: [],
    })
    .usage(`${pkg.description}.\nUsage: $0 [options]`)
    .version()
    .alias('version', 'v')
    .help()
    .alias('help', 'h').argv;

  const spinner = ora({ text: 'Processing...' });
  const progress = (report) => {
    spinner.stopAndPersist({ text: `${chalk.gray(report)}` });
  };

  spinner.start();

  return dir2pkg(
    path.join(process.cwd(), parsedArgv.inDir),
    path.join(process.cwd(), parsedArgv.outDir),
    {
      pkgJsonName: parsedArgv.pkgJsonName,
      pkgJsonPath: path.join(process.cwd(), parsedArgv.pkgJsonPath),
      ignore: parsedArgv.ignore,
      forcePeerDep: parsedArgv.forcePeerDep,
      progress,
    }
  )
    .then(() => {
      spinner.succeed(`${chalk.bold.green('success')} converted directory to package`);
    })
    .catch((err) => {
      spinner.stopAndPersist();
      spinner.fail(`${chalk.bold.red('error')} ${err.stack}`);
      process.exit(1);
    });
}
