
# cnsh
            
<img src="assets/logo.svg" alt="cnsh logo" class="lol">

[![npm version](https://img.shields.io/npm/v/cnsh)](https://www.npmjs.com/package/cnsh)
[![npm downloads](https://img.shields.io/npm/dt/cnsh)](https://www.npmjs.com/package/cnsh)
[![License](https://img.shields.io/npm/l/cnsh)](https://opensource.org/licenses/MIT)
[![Coverage Status](https://img.shields.io/coveralls/linuxfandudeguy/cnsh)](https://coveralls.io/github/linuxfandudeguy/cnsh)
[![GitHub stars](https://img.shields.io/github/stars/linuxfandudeguy/cnsh?style=social)](https://github.com/linuxfandudeguy/cnsh/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/linuxfandudeguy/cnsh?style=social)](https://github.com/linuxfandudeguy/cnsh/network)

`cnsh` is a lightweight package manager that provides a minimal alternative to Yarn. It fetches packages from the npm registry and installs them in a simplified directory structure.

## Features

- **Add Packages**: Install packages from the npm registry.
- **Remove Packages**: Uninstall packages from your project.
- **Install Dependencies**: Install all dependencies listed in `package.json`.
- **Global and Local Installation**: Supports both global and local package management.
- **Simple and Efficient**: Focuses on essential features for ease of use.

## Installation

To install `cnsh` globally, follow these steps:

1. **Install via pnpm**

   Run the following command in your terminal:

   ```bash
   pnpm install -g cnsh --verbose
   ```

   This will install `cnsh` globally, making it available from any directory on your system.

2. **Verify Installation**

   To check if `cnsh` is installed correctly, run:

   ```bash
   cnsh
   ```



   If `cnsh` is installed, you should see the following output in red text along with the output from the `--help` command:

```mathematica
Unknown command.
```

   This confirms that `cnsh` is properly installed and recognizing commands.

## Usage

`cnsh` offers a simple set of commands for managing packages. Here’s how to use it:

### Adding a Package

To add a package to your project, use:

```bash
cnsh add <package-name> --verbose
```
> ###### the verbose flag is optional, it is used to display more information

For example, to add `lodash`:

```bash
cnsh add lodash --verbose
```

This installs `lodash` into your project's `cnsh_lib` directory.

### Updating
 
To update it, run this command in your terminal:

```bash
pnpm install -g cnsh@latest
```

### Removing a Package

To remove a package, use:

```bash
cnsh remove <package-name>
```

For example, to remove `lodash`:

```bash
cnsh remove lodash
```

### Installing Dependencies

To install all dependencies listed in your `package.json`, use:

```bash
cnsh install
```

This reads the `package.json` file and installs all listed dependencies into your `cnsh_lib` directory.

### Global Installation

To install a package globally, use:

```bash
cnsh add -g <package-name>
```

Global packages will be installed in a global directory (typically `~/.cnsh-global/cnsh_lib`).

### Help

For a list of available commands and help, use:

```bash
cnsh --help
```


## Example: Using `axios` with `cnsh`

Here’s a demonstration of how to use `axios` with `cnsh`:

1. **Install `axios`**

   ```bash
   cnsh add axios
   ```

2. **Create a Simple Node.js Script**

   Create a file named `app.js` with the following content:

   ```javascript
   // Import axios from the local path where cnsh stores it
   import axios from './cnsh_lib/axios/package/dist/esm/axios.min.js';

   // Function to fetch data from a public API
   async function fetchData() {
       try {
           const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
           console.log('Data fetched:', response.data);
       } catch (error) {
           console.error('Error fetching data:', error);
       }
   }

   // Call the fetchData function
   fetchData();
   ```

or if you like CommonJS better:

```js
async function fetchData() {
    try {
        const axios = await import('./cnsh_lib/axios/package/dist/esm/axios.min.js');
        const response = await axios.default.get('https://jsonplaceholder.typicode.com/posts/1');
        console.log('Data fetched:', response.data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

fetchData();
```

UMD:

```js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['axios'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node.js or CommonJS
        module.exports = factory(require('./cnsh_lib/axios/package/dist/axios.js'));
    } else {
        // Browser global
        root.fetchData = factory(root.axios);
    }
}(typeof self !== 'undefined' ? self : this, function (axios) {
    'use strict';

    // Function to fetch data from a public API
    async function fetchData() {
        try {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log('Data fetched:', response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Return the function as part of the UMD module
    return fetchData;
}));

// To call fetchData in a browser environment:
fetchData();
```

3. **Run Your Script**

   Execute your script using Node.js:

   ```bash
   node app.js
   ```

   You should see the data fetched from the public API printed to your console.

## Contributing

Feel free to open issues or submit pull requests to help improve `cnsh`. If you have suggestions or feature requests, please let us know!

# NEEDED FIXES FORK TO FIX
- needs to install packages in `node_modules/.cnsh` and create a symlink
- can only be used for packages without dependencies
- Needs a `run` command
- needs to make a exported path for global packages
- needs a update Alert for The version specified in the `package.json` does not matchThe version according to the npm API

Once you Fork the package, publish it to npm with a name like `@cnsh/{id}`
Thanks for contributing!
## Licence

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

