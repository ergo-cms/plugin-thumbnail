var path = require('path');
var fs = require('fs');
try { 
	var Promise = require('bluebird');
	var Jimp = require('jimp'); 
} catch(e) { }

// promisify a few funcs we need
"readFile,writeFile".split(',').forEach(function(fn) {
	fs[fn] = Promise.promisify(fs[fn])
});

var logColor = "\x1b[34m";
var logColorReset = "\x1b[0m";

var l = function(str) { console.log(logColor+'thumbail: '+str+logColorReset); }
var _env;


function _filename_inject(filename, suffix) {
	var ar = filename.split('.');
	ar[ar.length-2] = ar[ar.length-2]+ '-' + suffix;
	return ar.join('.');
}


function _thumbnail_filter(image_name, params) {
	//var data = this;
	var inf = {
		basepath: params.path || '/images',
		//source: image_name,
		//dest: '',
		w: params.width || params.w,
		h: params.height || params.h,
	}
	if (!inf.w && !inf.h)
		inf.w = this.thumb_defwidth || 512;

	var w = inf.w || '';
	var h = inf.h;
	inf.source = image_name; //path.join(inf.basepath, image_name)
	inf.dest = _filename_inject(inf.source, w + (!!h?'x' + h:''));
	if (_env.__thumbailInf[inf.dest])
		return inf.dest; // already registered

	_env.__thumbailInf[inf.dest] = inf; 

	return inf.dest;
}

// This filter is assumed to be part of included in a <img> tag like this:
// <img {{image #srcset{w:"800,512,256"} }}"> & it writes out, href AND srcset attribs:
// <img href="ix256.jpg" srcset="ix512.jpg 512w, i.jpg 800w">
function _thumbnail_srcset_filter(image_name, params) {
	//var data = this;
	var srcset = [];
	var basepath = params.path || '/images';
	var maxwidth = params.max || params.maxwidth || params.max_width || this.srcset_maxwidth || -1;
	var src;
	var widths = (params.width || params.widths || params.w || this.srcset_widths || "512")
		.split(',').filter(function(str) { return str.trim(); })
		.sort(function(a,b) { return a-b; })
		.forEach(function(w) {
			var dest = _thumbnail_filter.call(this, image_name, { w:w, path:basepath })
			if (src === undefined)
				// first (/smallest) image becomes the href
				src = path.join(basepath,dest);
			//else
				// others become srcset
				srcset.push(path.join(basepath,dest) + ' ' + w + 'w')
		});
	if (!src)
		return 'src="'+image_name+'"'; // no sizes added
	if (maxwidth>0)
		srcset.push(path.join(basepath,image_name) + ' ' + maxwidth + 'w')
	return 'src="'+src+'" srcset="'+srcset.join(', ')+'"';
}

function _thumbnail_save(env) {
	return Promise.coroutine(function *() {
		for (var k in _env.__thumbailInf) {
			var inf = _env.__thumbailInf[k];
			var source = path.join(env.getOutPath(), inf.basepath, inf.source);
			var dest = path.join(env.getOutPath(), inf.basepath, inf.dest);

			l("Reading '"+source+"'");
			var data = yield fs.readFile(source)
			l("Opening '"+source+"'");
			var image = yield Jimp.read(data);
			delete data;

			l("Resizing '"+source+"'");
			image.resize(
					parseInt(inf.w) || Jimp.AUTO,
					parseInt(inf.h) || Jimp.AUTO).quality(70);
			l("Writing '"+dest+"'");
			image.write(dest);
			l("done");

		}

		return true;
	})();
}

module.exports = {
	name: "Ergo Thumbnail Plugin",
	url: "https://github.com/ergo-cms/plugin-thumbnail",
	active: true,
	registeras: 'thumbnail',
	
	//priority: 50,
	binary: true,
	extensions: [], // don't register to process anything specificially

	init: function(env, options) { 
		_env = env; _env.__thumbailInf = {} 
		if (!Jimp)
			throw new Error("Thumbnail plugin requires some installation. Please run 'npm install --production' from inside the thumbnail folder!")
	},
	save: _thumbnail_save,

	default_fields: {
		has_thumbnails: true, // a simple signal to themes that we're available 
		thumb_defwidth: 512,
		srcset_maxwidth: "-1",
		srcset_widths: "256,512,720",
		thumb: _thumbnail_filter,
		srcset: _thumbnail_srcset_filter
	}
}


