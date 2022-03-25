import moveFile from 'move-file';
import globby from 'globby';
import path from 'path';
import execa from 'execa';
import hasYarn from 'has-yarn';
import fs from 'fs/promises';
import generateDeps from './generate-deps';

export default async function dir2pkg(
  inFolder,
  outFolder,
  { pkgJsonName, pkgJsonPath, ignore = [], progress, forcePeerDep } = {}
) {
  progress('Generating dependencies');
  const pattern = path.join(inFolder, '/**/*.{js,jsx,ts,tsx}');
  const filePathList = await globby(pattern);
  const dependencies = await generateDeps(filePathList, pkgJsonPath, { ignore, forcePeerDep });

  progress('Moving directory');
  await moveFile(inFolder, path.join(outFolder, 'src'));

  progress('Creating package.json');
  const pkgJsonContent = {
    name: pkgJsonName,
    version: '1.0.0',
    private: true,
    license: 'UNLICENSED',
    ...dependencies,
  };
  await fs.writeFile(
    path.join(outFolder, 'package.json'),
    `${JSON.stringify(pkgJsonContent, null, '  ')}
`
  );

  progress('Creating README.md');
  const readmeContent = `# ${pkgJsonName}
`;
  await fs.writeFile(path.join(outFolder, 'README.md'), readmeContent);

  progress('Installing deps');
  const packageManager = hasYarn() ? 'yarn' : 'npm';
  await execa(packageManager, ['install'], { cwd: outFolder });
}
