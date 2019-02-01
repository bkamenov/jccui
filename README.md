JCCUI
=====

Jap'n'Chap Controls UI library (shortly JCC) is a compilation of flat controls used to create simplistic user interfaces for mobile and desktop websites and web based applications. All controls comein two themes 'a' and 'b' where 'a' is the dark (default) theme and 'b' is the light one. You are free to change the CSS of a particular theme or add new ones.

JCC does not depend on external libraries and is implemented fully in standard HTML, JavaScript and CSS3. JCC is markup oriented library which means that it will enhance speciffic blocks of your HTML code according to the 'role' of your HTML tags. JCC will not try to enhance your HTML automatically, though. You are responsible as a coder to tell JCC from which DOM-node(s) the enhancement should begin while traversing the DOM tree. The enhancement process can be done any time you decide - you just provide the DOM-hirarchy you want to be processed and that's it. In that way you will not collide JCC with other frameworks and libraries you might have used in your project.

JCC is intended to be used only for UI controls. The main 'jcc' object has few 'framework' methods but they are intended to be used internally by 'jcc' or if you wish to extend it with new controls rather than use them in your application's code. For that purpose we strongly advise you to use other proven libraries (jQuery, Angular or anything valuable you like).

JCC is free and is distributed under the Apache 2.0 license.

The project has following directory structure:

* dev - The source files of the JCC core including the common controls [implemented as plugins].
* dist - The redistributable files of the JCC core including embedded license info + minified version.
* docs - A HTML documentation created using the JCC library. Open `index.html` in your browser to start reading about using JCC and look at the examples.
* examples - List of all examples (also referenced in the docs).
* ionicons - The ionicons font instanse to be used in the examples and docs. Any other iconic font can be used (e.g. FontAwesome) as well.
* widgets - A set of optional widgets based on the JCC library.
	* grid - A resizable data grid to display large number of rows without overloading the browser. It recycles the unvisible rows. This plugin also implements a tree control based on the grid so it can also have unlimited nodes count.
		* dev - Grid and tree widgets source files.
		* dist - The redistributable files with embedded license info + minified version.
		* docs - Grid and tree widgets documentation.
		* examples - Grid and tree widgets examples (also referenced in the docs).
		* gulpfile.js - Utility file to generate minified versions of the widget and embed license header. Usage: `gulp compress-js` and `gulp compress-css`.
	* parallax - A parallax effect simulating widget. It was a pleasure to code it - it is just beautiful. Could be used with tilt sensor of the phone, for example.
		* dev - Parallax source files.
		* dist - The redistributable files with embedded license info + minified version.
		* docs - Parallax widget documentation.
		* examples - Parallax widget examples (also referenced in the docs).
		* gulpfile.js - Utility file to generate minified versions of the widget and embed license header. Usage: `gulp compress-js` and `gulp compress-css`.	
* gulpfile.js - Utility file to generate minified versions of JCC and embed license header. Usage: `gulp compress-js` and `gulp compress-css`.
		
JCC is compatible and tested with: 

* Mozilla Firefox (desktop and mobile)
* Internet Explorer and Edge (desktop and mobile)
* Safari (desktop and mobile)
* Chrome (desktop and mobile)
* Mozilla Firefox (desktop and mobile)
	
My name is Boris Kamenov (boriskamenov@abv.bg) and I created this library so I can create easily UI's for my Apache Cordova projects. I loved the idea of jQuery Mobile but not the vision and some of the code behind. So, I took a look on the most popular UI libraries, got what I loved and so JCC was born. 

JCC is already used in commercial products and seem to work fine. If you like it, feel free to use it. If you want you can type me a mail and share your experience.

I wish you happy times using JCC!
