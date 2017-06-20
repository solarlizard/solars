const gulp = require('gulp');
const gulpTypescript = require("gulp-typescript");
const gulpClean = require('gulp-clean');
const gulpRelease = require('gulp-github-release');
const gulpTar = require('gulp-tar');
const gulpGzip = require('gulp-gzip');
const gulpCopy = require('gulp-copy');
const gulpTypedoc = require("gulp-typedoc");

var typescriptCompilerOptions = {
    noImplicitAny: true,
    module: "None",
    experimentalDecorators: true,
    suppressImplicitAnyIndexErrors: true,
    emitDecoratorMetadata: true,
    target: "ES6",
    moduleResolution : "Node",
    declaration : true
};

gulp.task('clean', function () {
    return gulp.src(['dist'], {read: false}).pipe(gulpClean());
});


gulp.task('build-src', function () {
    return gulp.src('src/*.ts').pipe(gulpTypescript(typescriptCompilerOptions)).pipe(gulp.dest("dist/src"));
});

gulp.task('build-test', function () {
    return gulp.src('test/*.ts').pipe(gulpTypescript(typescriptCompilerOptions)).pipe(gulp.dest("dist/test"));
});

gulp.task('build',['build-src','build-test'], function () {
    return gulp.src(['dist/src/*','package.json'])
        .pipe(gulp.dest('dist/pre-package/'))
        .pipe(gulpCopy("dist/package",{prefix : 3}))
        .pipe(gulpTar('archive.tar'))
        .pipe(gulpGzip())
        .pipe(gulp.dest('dist'));
});

gulp.task('release',['build'], function(){
  return gulp.src(['dist/archive.tar.gz'])
    .pipe(gulpRelease({
      draft: false,
      prerelease: false,
      manifest: require('./package.json')
    }));
});
