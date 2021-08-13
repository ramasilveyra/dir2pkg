<h1 align="center">dir2pkg</h1>

Small CLI to help to split big JS codebases into packages.

Currently only reports the "dependencies" field of the new package, with these benefits:
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
$ dir2pkg --pattern "shared/**/*.{js,jsx,ts,tsx}" --pkg-json-path ./package.json
```

#### --pattern, -p

```bash
$ dir2pkg --pattern "shared/**/*.{js,jsx,ts,tsx}"
```

Glob pattern of files to check

#### --pkg-json-path, -j

```bash
$ dir2pkg --pkg-json-path ./package.json
```

Host package.json path

#### --ignore, -i

```bash
$ dir2pkg --ignore "shared" --ignore "@org/internal-alias"
```

List of dependencies to ignore. Useful for ignoring internal alias that can't be resolved to one node_modules dep.

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
