const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const destPath = path.resolve('./dist');

const envGlobal = dotenv.config({ path: path.join(__dirname, '.env') });
const envLocal = dotenv.config({ path: path.join(__dirname, '.env.local') });
const appEnv = Object.assign({}, envGlobal.parsed, envLocal.parsed);

/**
 * @function
 * @param {Object<string, *>|undefined} env
 * @param {Object<string, *>} argv
 * @returns {webpack.Configuration}
 */
module.exports = (env, argv) => {
  /** @type {'development'|'production'|'none'} */
  let mode = 'production';

  if ((env && env.development) || argv.mode == 'development') mode = 'development';

  /** @type {Object<string, *>} */
  const postcssOptions = {
    plugins: [autoprefixer],
  };

  if (mode === 'production')
    postcssOptions.plugins.push(
      cssnano({
        preset: [
          'default',
          {
            discardComments: { removeAll: true },
          },
        ],
      }),
    );

  /** @type {webpack.RuleSetRule} */
  const postcssLoader = {
    loader: 'postcss-loader',
    options: { postcssOptions },
  };

  return {
    entry: {
      main: './src/ts/main.ts',
    },
    output: {
      path: destPath,
      filename: 'assets/[name].js',
    },
    target: 'web',
    mode,
    stats: {
      all: undefined,
      assets: true,
      assetsSort: 'name',
      children: false,
      entrypoints: false,
      modules: false,
    },
    devtool: false,
    resolve: {
      extensions: ['.js', '.ts', '.scss', '.sass'],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            output: {
              comments: false,
            },
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader', postcssLoader, 'sass-loader'],
        },
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              compilerOptions: { noEmit: false },
            },
          },
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'assets/[name].css',
      }),
      // new NoEmitPlugin(['js/style.js']),
      new CopyPlugin({
        patterns: [
          { from: 'src/index.html', to: 'index.html' },
          // { from: 'src/assets', to: 'assets' },
        ],
      }),
      new webpack.SourceMapDevToolPlugin(),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(appEnv),
      }),
    ],
    devServer: {
      contentBase: destPath,
      port: 9000,
      compress: true,
    },
  };
};
