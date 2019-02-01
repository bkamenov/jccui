var gulp  = require('gulp');
var minify = require('gulp-minify');
var minifyCss = require('gulp-clean-css');
var fs = require('fs.extra');
var inject = require('gulp-inject-string');

var header = 
"/*\n" +
"* JCC your_widget\n" +
"* Copyright (c) 2017 your_comany\n" +
"* www.example.com\n" +
"*\n" +
"* For open source use: GPLv3\n" +
"* For commercial needs use: your existing JCC core commercial license agreement at no extra charge\n" +
"*/\n";
 
gulp.task('compress-js',
function() 
{
	gulp.src('dev/jcc-your-widget.js')
    .pipe(minify(
	{
        ext:
		{
            min:'.min.js'
        },
        ignoreFiles: ['.min.js']
    }))
	.pipe(inject.prepend( header ))
	.pipe(gulp.dest('dist'));
});

gulp.task('compress-css',
function() 
{
	fs.copy('dev/jcc-your-widget.css', 'dist/jcc-your-widget.css', { replace: true }, 
	function()
	{
		gulp.src('dist/jcc-your-widget.css')
		.pipe(inject.prepend(header))
		.pipe(gulp.dest('dist'));
		
		fs.copy('dev/jcc-your-widget.css', 'dist/jcc-your-widget.min.css', { replace: true },
		function()
		{
			gulp.src('dist/jcc-your-widget.min.css')
			.pipe(minifyCss(
			{
				keepBreaks: true
			}))
			.pipe(inject.prepend(header))
			.pipe(gulp.dest('dist'));
		});
	});
});