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
    .option('p', {
      alias: 'pattern',
      describe: 'Glob pattern',
      type: 'string',
      demandOption: true,
    })
    .option('j', {
      alias: 'pkg-json-path',
      describe: 'Host package.json path',
      type: 'string',
      demandOption: true,
    })
    .option('i', {
      alias: 'ignore',
      describe: 'List of dependencies to ignore',
      type: 'array',
      default: [],
    })
    .usage(`${pkg.description}.\nUsage: $0 <file or dir> [options]`)
    .version()
    .alias('version', 'v')
    .help()
    .alias('help', 'h').argv;

  const spinner = ora({ text: 'Processing...' });
  const progress = (report) => {
    spinner.stopAndPersist({ text: `${chalk.gray(report)}` });
  };

  spinner.start();

  return dir2pkg(path.join(process.cwd(), parsedArgv.p), path.join(process.cwd(), parsedArgv.j), {
    ignore: parsedArgv.i,
    progress,
  })
    .then((result) => {
      spinner.succeed(`${chalk.bold.green('success')} converted directory to package`);
      console.log(JSON.stringify(result, null, '  '));
    })
    .catch((err) => {
      spinner.stopAndPersist();
      spinner.fail(`${chalk.bold.red('error')} ${err.stack}`);
      process.exit(1);
    });
}
