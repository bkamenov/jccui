var gulp  = require('gulp');
var minify = require('gulp-minify');
var minifyCss = require('gulp-clean-css');
var fs = require('fs.extra');
var inject = require('gulp-inject-string');

var header = 
"/*\n" +
"* JCC LIBRARY\n" +
"*\n" +
"* Copyright 2018 Boris Kamenov boriskamenov@abv.bg, www.stx-dev.com\n" +
"*\n" +
"* Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
"* you may not use this file except in compliance with the License.\n" +
"* You may obtain a copy of the License at\n" +
"*\n" +
"*     http://www.apache.org/licenses/LICENSE-2.0\n" +
"*\n" +
"* Unless required by applicable law or agreed to in writing, software\n" +
"* distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
"* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
"* See the License for the specific language governing permissions and\n" +
"* limitations under the License.\n" +
"*/\n";
 
gulp.task('compress-js', 
done =>
{
	gulp.src('dev/jcc-grid.js')
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

	done();
});

gulp.task('compress-css',
done =>
{
	fs.copy('dev/jcc-grid.css', 'dist/jcc-grid.css', { replace: true }, 
	function()
	{
		gulp.src('dist/jcc-grid.css')
		.pipe(inject.prepend(header))
		.pipe(gulp.dest('dist'));
		
		fs.copy('dev/jcc-grid.css', 'dist/jcc-grid.min.css', { replace: true },
		function()
		{
			gulp.src('dist/jcc-grid.min.css')
			.pipe(minifyCss(
			{
				keepBreaks: true
			}))
			.pipe(inject.prepend(header))
			.pipe(gulp.dest('dist'));
		});
	});

	done();
});