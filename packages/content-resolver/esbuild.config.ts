import chalk from 'chalk';
import { exec } from 'child_process';
import { build } from 'esbuild';
import { rimraf } from 'rimraf';

(async () => {
  await rimraf('./dist');
  console.log(chalk.magenta('🧹 Cleared ./dist folder'));
  console.log(chalk.cyan('🚀 Starting esbuild...'));

  const esbuildStart = Date.now();
  const tscStart = Date.now();

  const esbuild = build({
    entryPoints: ['src/index.ts', 'src/server/nodejs.ts'],
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'node',
    outbase: 'src',
    outdir: 'dist',
    packages: 'external',
  }).then(() => {
    const esbuildEnd = Date.now();
    console.log(
      chalk.green(
        `✅ esbuild ${((esbuildEnd - esbuildStart) / 1000).toFixed(2)}s`
      )
    );
  });

  const tsc = new Promise<void>((resolve, reject) => {
    console.log(chalk.cyan('📝 Generating .d.ts files...'));
    exec('tsc -p tsconfig.json', {}, (error, stdout, stderr) => {
      if (error) {
        console.error(chalk.red('❌ tsc failed:'), stderr);
        reject(error);
      } else {
        if (stdout) console.log(stdout);
        console.log(
          chalk.green(`✅ tsc ${((Date.now() - tscStart) / 1000).toFixed(2)}s`)
        );
        resolve();
      }
    });
  });

  try {
    await Promise.all([esbuild, tsc]);
    // console.log(chalk.green('🏁 All builds finished!'));
  } catch (err) {
    console.error(chalk.red('❌ Build failed:'), err);
    process.exit(1);
  }
})();
