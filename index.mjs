#!/usr/bin/env node

import * as tar from 'tar';
import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'js-yaml'; // Import js-yaml
import readline from 'readline';

const REGISTRY_URL = 'https://registry.npmjs.org';

const DEFAULT_PACKAGE_JSON = {
    name: "my-project",
    version: "1.0.0",
    description: "A new project",
    main: "index.js",
    scripts: {
        test: "echo \"Error: no test specified\" && exit 1"
    },
    keywords: [],
    author: "Your Name",
    license: "ISC",
};

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Function to log debug information with color if verbose mode is enabled
const debugLog = (message) => {
    if (verbose) {
        console.log(chalk.blue(`[DEBUG] ${message}`));
    }
};

const printHelp = () => {
    console.log(`
Usage: cnsh <command> [options] [package]

Commands:
  add       Install a package
  remove    Remove a package
  install   Install dependencies from package.json
  init      Initialize a new project

Options:
  -g        Install globally
  -y        Initialize with default settings
  --help    Display this help message
  --version Display the version number
  --verbose Display detailed debugging information
`);
};

const printVersion = async () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = fs.readJsonSync(packageJsonPath);
        console.log(`cnsh version ${packageJson.version || 'unknown'}`);
    } else {
        console.log('package.json not found.');
    }
};

const initProject = async (args) => {
    if (args.includes('-y')) {
        console.log('Initializing project with default settings...');
        fs.writeJsonSync(path.join(process.cwd(), 'package.json'), DEFAULT_PACKAGE_JSON, { spaces: 2 });
        console.log('Default package.json created.');
    } else {
        console.log('Initializing project...');
        const name = await prompt('Project name (default: my-project): ') || 'my-project';
        const version = await prompt('Version (default: 1.0.0): ') || '1.0.0';
        const description = await prompt('Description (default: A new project): ') || 'A new project';
        const author = await prompt('Author (default: Your Name): ') || 'Your Name';
        
        const packageJson = {
            ...DEFAULT_PACKAGE_JSON,
            name,
            version,
            description,
            author
        };

        fs.writeJsonSync(path.join(process.cwd(), 'package.json'), packageJson, { spaces: 2 });
        console.log('package.json created. Modify it as needed.');
    }
};

const prompt = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

const getPackageInfo = async (packageName) => {
    debugLog(`Fetching package info for: ${packageName}`);
    try {
        const response = await axios.get(`${REGISTRY_URL}/${packageName}/latest`);
        const { dist, version } = response.data;
        debugLog(`Tarball URL: ${dist.tarball}, Version: ${version}`);
        return { tarballUrl: dist.tarball, version };
    } catch (error) {
        throw new Error(`Failed to fetch package metadata: ${error.message}`);
    }
};

const downloadTarball = async (tarballUrl, tarballPath) => {
    debugLog(`Downloading tarball from URL: ${tarballUrl}`);
    const writer = fs.createWriteStream(tarballPath);
    const response = await axios.get(tarballUrl, { responseType: 'stream' });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            const fileSize = fs.statSync(tarballPath).size;
            debugLog(`Downloaded tarball size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
            if (fileSize < 1024) { // Adjust this threshold based on expected file sizes
                reject(new Error('Downloaded tarball is too small, indicating a possible issue.'));
            } else {
                resolve();
            }
        });
        writer.on('error', reject);
    });
};

const installPackage = async (packageName) => {
    const spinner = ora(`Installing ${packageName}...`).start();
    debugLog(`Starting installation of package: ${packageName}`);
    try {
        const { tarballUrl, version } = await getPackageInfo(packageName);
        const packageDir = path.join(installDir, packageName);
        const tarballPath = path.join(packageDir, `${packageName}.tar.gz`);

        // Ensure package directory exists
        if (!fs.existsSync(packageDir)) {
            fs.mkdirSync(packageDir, { recursive: true });
        }

        await downloadTarball(tarballUrl, tarballPath);

        debugLog(`Extracting ${packageName}...`);
        spinner.text = `Extracting ${packageName}...`;
        await tar.x({ file: tarballPath, cwd: packageDir });
        fs.removeSync(tarballPath); // Remove the tarball after extraction

        // Update the lock file with tarball URL and version
        updateLockFile(packageName, tarballUrl, version);

        debugLog(`Lock file updated for package: ${packageName}`);
        spinner.succeed(chalk.green(`${packageName} installed successfully!`));
        debugLog(`Installation of package ${packageName} completed.`);
    } catch (error) {
        spinner.fail(chalk.red(`Failed to install ${packageName}: ${error.message}`));
    }
};

const removePackage = (packageName) => {
    const spinner = ora(`Removing ${packageName}...`).start();
    const packagePath = path.join(installDir, packageName);
    if (fs.existsSync(packagePath)) {
        fs.removeSync(packagePath);
        // Update the lock file
        updateLockFile(packageName, null, null, false);
        spinner.succeed(chalk.green(`${packageName} removed successfully!`));
    } else {
        spinner.fail(chalk.red(`${packageName} is not installed`));
    }
};

const installDependencies = async () => {
    const spinner = ora('Installing dependencies from package.json...').start();
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json not found');
        }
        const packageJson = fs.readJsonSync(packageJsonPath);
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        if (Object.keys(dependencies).length === 0) {
            spinner.info(chalk.yellow('No dependencies to install.'));
            return;
        }

        spinner.text = 'Installing dependencies...';
        const installPromises = Object.keys(dependencies).map(dep => installPackage(dep));
        await Promise.all(installPromises);
        spinner.succeed(chalk.green('All dependencies installed successfully!'));
    } catch (error) {
        spinner.fail(chalk.red(`Failed to install dependencies: ${error.message}`));
    }
};

// Function to update the cnsh.lock file
const updateLockFile = (packageName, tarballUrl = null, version = null, installed = true) => {
    const lockFilePath = path.join(process.cwd(), 'cnsh.lock');
    let lockData = {};
    
    if (fs.existsSync(lockFilePath)) {
        lockData = yaml.load(fs.readFileSync(lockFilePath, 'utf8')) || {};
    }

    if (installed) {
        lockData[packageName] = { 
            ...(tarballUrl && { tarballUrl }), // Only add tarballUrl if it's provided
            ...(version && { version }) // Only add version if it's provided
        };
    } else {
        delete lockData[packageName];
    }

    fs.writeFileSync(lockFilePath, yaml.dump(lockData), 'utf8');
};

// Extract the command and package name
const command = args.find(arg => !arg.startsWith('--')) || '';
const packageArgs = args.filter(arg => !arg.startsWith('--') && arg !== command);
const packageName = packageArgs.length > 0 ? packageArgs[0] : '';

if (args.includes('--help')) {
    printHelp();
    process.exit(0);
}

if (args.includes('--version')) {
    await printVersion();
    process.exit(0);
}

if (command === 'init') {
    await initProject(args);
    process.exit(0);
}

// Remove `--verbose` from args if present to avoid it being mistaken as a package name
const isGlobal = args.includes('-g');
const installDir = isGlobal
    ? path.join(os.homedir(), '.cnsh-global', 'cnsh_lib')
    : path.join(process.cwd(), 'cnsh_lib');

if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
}

switch (command) {
    case 'add':
        if (packageName) {
            await installPackage(packageName);
        } else {
            console.log(chalk.red('No package name provided.'));
        }
        break;
    case 'remove':
        if (packageName) {
            removePackage(packageName);
        } else {
            console.log(chalk.red('No package name provided.'));
        }
        break;
    case 'install':
        await installDependencies();
        break;
    default:
        console.log(chalk.red('Unknown command.'));
        printHelp();
        break;
}
