let gulp = require('gulp')

gulp.task('clean', () => {
  let del = require('del')
  return del(['lib/*.js', 'postcss.js', 'build/', 'api/'])
})

// Build

gulp.task('compile', () => {
  let sourcemaps = require('gulp-sourcemaps')
  let changed = require('gulp-changed')
  let babel = require('gulp-babel')
  return gulp.src('lib/*.es6')
    .pipe(changed('lib', { extension: '.js' }))
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('lib'))
})

gulp.task('build:lib', ['compile'], () => {
  return gulp.src(['lib/*.js', 'lib/*.d.ts']).pipe(gulp.dest('build/lib'))
})

gulp.task('default', ['clean', 'build:lib'])
