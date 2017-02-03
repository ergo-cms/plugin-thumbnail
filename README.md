# Thumbnail Generator plugin for Ergo-CMS

This plugin provides the ability to rescale an image, and provide support for responsive images, using `srcset` attribute. The images are automatically generated as part of the build process.

Note that this plugin makes use of two differing image libraries. The first is a 100% Javascript image library (Jimp), which is significantly slower than native libraries, but is more likely to work across different machine architectures. The second library (Sharp) is much faster, but may encounter installation issues. If the installation of Sharp fails, then Jimp is used automatically as a fallback. 
Initial testing shows that Sharp is around 5 times faster at processing images than Jimp.


## Installation

In an existing ergo project folder:

```
ergo plugin install thumbnail
cd plugins/thumbnail
npm install --production
```


## Options 

You may specify the following options in your `config.ergo.js`:

```
default_fields: {
	thumb_defwidth:512, // default thumbnail size (default is 512)
	srcset_origwidth: -1, // size of 'hi-res' images used in srcset. By default hi-res are NOT used
	srcset_widths: "256,512,1152", // list of image sizes to generate
	images_path: '/images'		// the path where images exist (in the output folder) & relative to base url for both *source* and *thumbnails*.
	...
}
```
## Thumbnail Images

```
<img src="{{image #thumb{w:50} }}">
```

or, to generate in the default size (512):

```
<img src="{{image #thumb }}">
```


## Responsive Images - srcset Support

There is also support for img srcset to generate a responsive image list:

```
<img src="{{image}}" srcset="{{image #srcset{w:'256,512,800',orig:'1152'} }}" sizes=...>
```

The 'orig' parameter is the default source image width, and the others are the various thumbail widths to generate. If 'orig' is omitted, then the original image is NOT used (unless `default_fields.srcset_origwidth` has been set as explained in Options, above).

This would generate:

```
<img src='/images/i.jpg' srcset='/images/i-256.jpg 256w, /images/i-512.jpg 512w, /images/i-800.jpg 800w, /images/i.jpg 1152w' sizes=...>
```


## Advanced Usage - Images path

By default, it is assumed that images exist in the '/images' folder. If this is not the case you may set the `images_path` field as specified in Options, above, or you may set `path` as a parameter:

```
<img src="{{image #thumb{path:'/elsewhere'} }}">
```

Note that BOTH the *source* must exist in this folder and *thumbnail* will be generated there too.

## Advanced Usage - Graceful Support

To gracefully add support if this plugin is enabled or not, in either `theme.ergo.js`, or `config.ergo.js` add the following to the `default_fields` section:

```
...
default_fields: {
	safe_thumb: function(image, params) { 
		if (!!this.thumb) 
			return this.thumb.call(this, image, params);
		else
			return image; // do nothing, if thumbnail not available
		},
	safe_srcset: function(image, params) { 
		if (!!this.srcset) 
			return this.srcset.call(this, image, params);
		else
			return ''; // do nothing
		},
		...
}
```

Also, change the source to use the updated filter:


eg.

```
<img src="{{image #safe_thumb{w:512} }}" srcset="{{image #safe_srcset{w:'256,512,800',orig:'1152'} }}" sizes=...>
```


See the default themes provided for ergo-cms to see this implementation.





