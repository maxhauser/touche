var gulp = require('gulp');
var mocha = require('gulp-mocha');
var path = require('path');
var gutil = require('gulp-util');
var rimraf = require('gulp-rimraf');
var inject = require('gulp-inject');

var webpack = require('webpack');
var CompressionPlugin = require('compression-webpack-plugin');

var argv = require('minimist')(process.argv.slice(2));

var target = path.join(__dirname, 'dist');
var source = path.join(__dirname, 'client');

gulp.task('copy', ['clean'], function() {
    return gulp.src(source + '/html/favicon.ico')
        .pipe(gulp.dest(target));
});

gulp.task('clean', function() {
    return gulp.src(target, {
        read: false
    })
        .pipe(rimraf());

});

gulp.task('html', ['webpack'], function() {
    return gulp.src(source + '/html/index.html')
        .pipe(inject(gulp.src(target + '/app.*.js', {
            read: false
        }), {
            transform: function(filepath) {
                return '<script src="' + path.basename(filepath) + '"></script>';
            }
        }))
        .pipe(gulp.dest(target));
});

gulp.task('webpack', ['clean'], function(cb) {
    var config = {
        target: 'web',
        entry: {
            main: source + '/src/main.js'
        },
        output: {
            path: target,
            publicPath: '',
            filename: 'app.[hash].js',
            chunkFilename: '[chunkhash].js'
        },
        resolve: {
            modulesDirectories: ['bower_components', 'node_modules'],
            alias: {
                //'react$': 'react/react-with-addons.js',
                'lodash$': 'lodash/dist/lodash.js'
            }
        },
        resolveLoader: {
            fallback: path.join(__dirname, 'client')
        },
        plugins: [
            new webpack.DefinePlugin({DEBUG: !!argv.debug, 'process.env.NODE_ENV':argv.debug?'"debug"':'"production"'}),
            new CompressionPlugin({
                asset: "{file}",
                algorithm: "gzip",
                minRatio: 100 
            })
        ],
        module: {
            //noParse: [/react\-with\-addons(\.min)?\.js/, /lodash(\.min)?\.js/],
            loaders: [{
                test: /\.css$/,
                loader: 'style!css'
            }, {
                test: /\.(svg|otf|png|woff|eot|ttf)$/,
                loader: 'file'
            }, {
                test: /\.js$/,
                include: /client\/src\/.+\.js$/,
                loader: 'jsx'
            }, {
                test: /\.less$/,
                loader: 'style!css!less' 
            }, {
                test: /\.json$/,
                loader: 'json5' 
            }],
            postLoaders: [{
                test: /\.js/,
                include: /client\/src\/.+\.js$/,
                loader: 'jshint',
            }]
        },
        jshint: {
            "globals": {
                "console": false,
                "DEBUG": false
            },
            "browser": true,
            "undef": true
        }
    };

    if (argv.debug) {
        config.debug = true;
        config.devtool = 'sourcemap';
    } else {
        config.plugins.push(new webpack.optimize.UglifyJsPlugin());
        //config.resolve.alias['react$'] = 'react/react-with-addons.min.js';
        config.resolve.alias['lodash$'] = 'lodash/dist/lodash.min.js';
    }

    webpack(config, function(err, stats) {
        if (err) throw new gutil.PluginError("webpack", err);

        gutil.log("[webpack]", stats.toString({
            colors: true
        }));

        var errors = stats.compilation.errors;
        if (!argv.debug && errors && errors.length)
            throw new gutil.PluginError("webpack", errors[0].message);
        
        cb();
    });
});

gulp.task('test', function() {
    return gulp.src(source + '/tests/*.js')
        .pipe(mocha());
});

gulp.task('build', ['html', 'copy']);

gulp.task('default', ['build']);

gulp.task('watch', ['build'], function() {
    gulp.watch([source + '/src/**/*', source + '/html/**/*'], function(event) {
        gulp.run('build');
    });
});