declare function _exports(env: any, argv: any): {
    entry: string;
    mode: string;
    devtool: string;
    resolve: {
        extensions: string[];
        alias: {
            'react-native': string;
            'react-native-svg': string;
        };
        fallback: {
            crypto: boolean;
            stream: boolean;
            fs: boolean;
            path: boolean;
        };
    };
    module: {
        rules: ({
            test: RegExp;
            exclude: RegExp;
            use: {
                loader: string;
                options: {
                    presets: string[];
                    plugins: string[][];
                };
            };
            type?: undefined;
        } | {
            test: RegExp;
            use: string[];
            exclude?: undefined;
            type?: undefined;
        } | {
            test: RegExp;
            type: string;
            exclude?: undefined;
            use?: undefined;
        })[];
    };
    plugins: any[];
    devServer: {
        static: {
            directory: string;
        };
        compress: boolean;
        port: number;
        hot: boolean;
        liveReload: boolean;
        open: boolean;
        historyApiFallback: boolean;
        client: {
            logging: string;
            overlay: {
                errors: boolean;
                warnings: boolean;
            };
            reconnect: number;
        };
        proxy: {
            context: string[];
            target: string;
            changeOrigin: boolean;
            secure: boolean;
        }[];
    };
    output: {
        path: string;
        filename: string;
        chunkFilename: string;
        publicPath: string;
        clean: boolean;
    };
    optimization: {
        splitChunks: {
            chunks: string;
            cacheGroups: {
                vendor: {
                    test: RegExp;
                    name: string;
                    chunks: string;
                };
                maplibre: {
                    test: RegExp;
                    name: string;
                    chunks: string;
                };
            };
        };
    };
    performance: {
        maxAssetSize: number;
        maxEntrypointSize: number;
        hints: string | boolean;
    };
};
export = _exports;
//# sourceMappingURL=webpack.config.d.ts.map