#!/usr/bin/env node

import * as tar from 'tar';
import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';

const REGISTRY_URL = 'https://registry.npmjs.org';

const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(chalk.red('Usage: cnsh <add|remove|install> [-g] <package>'));
    process.exit(1);
}

const command = args[0];
const isGlobal = args.includes('-g');
const packageName = args[args.length - 1];

const installDir = isGlobal
    ? path.join(os.homedir(), '.cnsh-global', 'cnsh_lib')
    : path.join(process.cwd(), 'cnsh_lib');

if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
}

const getTarballUrl = async (packageName) => {
    try {
        const response = await axios.get(`${REGISTRY_URL}/${packageName}/latest`);
        return response.data.dist.tarball;
    } catch (error) {
        throw new Error(`Failed to fetch package metadata: ${error.message}`);
    }
};

const downloadTarball = async (tarballUrl, tarballPath) => {
    const writer = fs.createWriteStream(tarballPath);
    const response = await axios.get(tarballUrl, { responseType: 'stream' });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            const fileSize = fs.statSync(tarballPath).size;
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
    try {
        const tarballUrl = await getTarballUrl(packageName);
        const packageDir = path.join(installDir, packageName);
        const tarballPath = path.join(packageDir, `${packageName}.tar.gz`);

        // Ensure package directory exists
        if (!fs.existsSync(packageDir)) {
            fs.mkdirSync(packageDir, { recursive: true });
        }

        await downloadTarball(tarballUrl, tarballPath);

        spinner.text = `Extracting ${packageName}...`;
        await tar.x({ file: tarballPath, cwd: packageDir });
        fs.removeSync(tarballPath); // Remove the tarball after extraction
        spinner.succeed(chalk.green(`${packageName} installed successfully!`));
    } catch (error) {
        spinner.fail(chalk.red(`Failed to install ${packageName}: ${error.message}`));
    }
};

const removePackage = (packageName) => {
    const spinner = ora(`Removing ${packageName}...`).start();
    const packagePath = path.join(installDir, packageName);
    if (fs.existsSync(packagePath)) {
        fs.removeSync(packagePath);
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

switch (command) {
    case 'add':
        await installPackage(packageName);
        break;
    case 'remove':
        removePackage(packageName);
        break;
    case 'install':
        await installDependencies();
        break;
    default:
        console.log(chalk.red('Unknown command. Use "add", "remove", or "install".'));
}
