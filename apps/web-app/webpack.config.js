const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js'],
      alias: {
        'react-native': 'react-native-web',
        'react-native-svg': 'react-native-svg-web',
      },
      fallback: {
        crypto: false,
        stream: false,
        fs: false,
        path: false,
      }
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
                '@babel/preset-typescript'
              ],
              plugins: [
                ['@babel/plugin-proposal-class-properties'],
                ['@babel/plugin-transform-runtime']
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset/resource'
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource'
        }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'LRPDM - GIS Platform',
        meta: {
          viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        }
      })
    ],

    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      port: 3001,
      hot: true,
      liveReload: true,
      open: true,
      historyApiFallback: true,
      client: {
        logging: 'warn',
        overlay: {
          errors: true,
          warnings: false
        },
        reconnect: 5
      },
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      ]
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true
    },

    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          maplibre: {
            test: /[\\/]node_modules[\\/](maplibre-gl|@mapbox)[\\/]/,
            name: 'maplibre',
            chunks: 'all',
          }
        }
      }
    },

    performance: {
      maxAssetSize: 1000000,
      maxEntrypointSize: 1000000,
      hints: isProduction ? 'warning' : false
    }
  };
};