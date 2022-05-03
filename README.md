<h1 align="center">dir2pkg</h1>

Small CLI to help to split big JS codebases into packages.

Moves dirs, creates boilerplate and creates the "dependencies" field of the new package with these benefits:
- 🧹 dependencies used in the code but missing from the package.json are added.
- ➕ only dependencies used in the code are listed. 
- ➖ dependencies not used in the code are removed.

<p align="center">
  <img src="https://user-images.githubusercontent.com/7464663/149623800-0db1ba41-97b6-4ccf-97bf-1550815d6ba5.gif" alt="demo of dir2pkg" width="640">
</p>

<h2 align="center">Install</h2>

**Node.js v16.13 or newer** is required.

Via the yarn client:

```bash
$ yarn global add dir2pkg
```

Via the npm client:

```bash
$ npm install -g dir2pkg
```

<h2 align="center">Usage</h2>

```bash
$ dir2pkg --in-dir some-dir --out-dir packages/some-dir --pkg-json-name "@org/new-pkg" --pkg-json-path ./package.json
```

#### --in-dir, -i

```bash
$ dir2pkg --in-dir some-dir
```

In directory

#### --out-dir, -o

```bash
$ dir2pkg --out-dir packages/some-dir
```

Out directory

#### --pkg-json-name, -n

```bash
$ dir2pkg --pkg-json-name "@org/new-pkg"
```

Package name

#### --pkg-json-path, -j

```bash
$ dir2pkg --pkg-json-path ./package.json
```

Host package.json path

#### --ignore, -d

```bash
$ dir2pkg --ignore "shared" --ignore "@org/internal-alias"
```

List of dependencies to ignore. Useful for ignoring internal alias that can't be resolved to one node_modules dep.

#### --force-peer-dep, -f

```bash
$ dir2pkg --force-peer-dep react --force-peer-dep react-dom
```

List of dependencies to force as peer dependencies. Useful for libraries like react.

<h2 align="center">Development</h2>

```bash
# install deps
$ yarn
# build and watch for changes
$ yarn build --watch
# link dir2pkg globally
$ yarn link
# enjoy!
$ dir2pkg --help
```
