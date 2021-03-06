var path = require('path');
var fs = require('fs');
try { 
	var Promise = require('bluebird');
	// promisify a few funcs we need
	"readFile,writeFile,stat,utimes".split(',').forEach(function(fn) {
		fs[fn] = Promise.promisify(fs[fn])
	});
	var sharp = require('sharp');
}

catch(e) {}
try {

	var Jimp = !sharp ? require('jimp') : sharp; // we WILL use sharp if we've installed it ok (it's faster)
} catch(e) { }



var logColor = ""; //\x1b[34m";
var logColorReset = ""; //\x1b[0m";

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
		basepath: params.p || params.path || this.images_path,
		//source: image_name,
		//dest: '',
		w: parseInt(params.width || params.w),
		h: parseInt(params.height || params.h),
	}
	if (isNaN(inf.w)) inf.w = undefined;
	if (!inf.w && !inf.h)
		inf.w = parseInt(this.thumb_defwidth || 512);
	if (isNaN(inf.w)) inf.w = undefined;
	if (isNaN(inf.h)) inf.h = undefined;

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
// <img srcset="{{image #srcset{w:"800,512,256",o:2056} }}"> & it writes out, srcset attribs:
// <img srcset="i-256.jpg 256w, i-512.jpg 512w, i-800.jpg 800w, i.jpg 2056w">
function _thumbnail_srcset_filter(image_name, params) {
	//var data = this;
	var srcset = [];
	var basepath = params.p || params.path || this.images_path;
	//var maxwidth = params.max || params.maxwidth || params.max_width || this.srcset_maxwidth || -1;
	var maxwidth = params.o || params.orig || params.orig_width || params.src_width || this.srcset_origwidth || -1;
	var src;
	var widths = (params.width || params.widths || params.w || this.srcset_widths || "512")
		.split(',').filter(function(str) { return str.trim(); })
		.sort(function(a,b) { return a-b; })
		.forEach(function(w) {
			var dest = _thumbnail_filter.call(this, image_name, { w:w, path:basepath })
			srcset.push(path.join(basepath,dest) + ' ' + w + 'w')
		});
	if (maxwidth>0)
		srcset.push(path.join(basepath,image_name) + ' ' + maxwidth + 'w')
	return srcset.join(', ');
}

function _thumbnail_save(env) {
	return Promise.coroutine(function *() {
		for (var k in _env.__thumbailInf) {
			var inf = _env.__thumbailInf[k];
			var source = path.join(env.getOutPath(), inf.basepath, inf.source);
			var dest = path.join(env.getOutPath(), inf.basepath, inf.dest);
			var relDest = path.relative(env.getOutPath(), dest);

			var statsSource = yield fs.stat(source)
			var statsDest;
			try {
				statsDest = yield fs.stat(dest)
			}
			catch(e) { statsDest = undefined; }

			var make_image = false;
			if (!statsDest || statsDest.mtime.getTime() != statsSource.mtime.getTime()) {
				// something changed. rebuild resized image
				make_image = true;
			}

			if (make_image) {
				//l("Reading '"+source+"'");
				var data = yield fs.readFile(source)

				if (sharp) {
					//l("Opening '"+source+"'");
					var image = sharp(data);
					data = null;

					//l("Resizing '"+source+"'");
					image.resize(inf.w,inf.h);
					l("Writing '"+relDest+"' using Sharp");
					yield image.toFile(dest);
				}
				else
				{
					//l("Opening '"+source+"'");
					var image = yield Jimp.read(data);
					data = null;

					//l("Resizing '"+source+"'");
					image.resize(
							parseInt(inf.w) || Jimp.AUTO,
							parseInt(inf.h) || Jimp.AUTO).quality(70);
					l("Writing '"+relDest+"' using Jimp");
					var p = new Promise(function(resolve, reject) {
						image.write(dest, function(err, img) {
							if (err) reject(err);
							else resolve(img);
						})
					});
					yield p;
				}

				// write out the file with the same time. That way subsequent builds will be v. fast.
				yield fs.utimes(dest, statsSource.atime, statsSource.mtime);
			}
			else
				l("Skipping unchanged '"+relDest+"'")
			//l("done");

		}

		return true;
	})();
}

module.exports = {
	name: "Ergo Thumbnail Plugin",
	url: "https://github.com/ergo-cms/plugin-thumbnail",
	version: "1.1.2",
	active: true,
	registeras: 'thumbnail',

	init: function(env, options) { 
		_env = env; _env.__thumbailInf = {} 
		if (!Jimp)
			throw new Error("Thumbnail plugin requires some installation. Please run 'npm install --production' from inside the thumbnail folder: " + __dirname)
	},
	save: _thumbnail_save,

	default_fields: {
		has_thumbnails: true, // a simple signal to themes that we're available 
		images_path: '/images',
		thumb_defwidth: 512,
		srcset_origwidth: -1,
		srcset_widths: "256,512,1152",
		thumb: _thumbnail_filter,
		srcset: _thumbnail_srcset_filter
	}
}


