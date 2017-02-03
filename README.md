# Thumbnail Generator plugin for Ergo-CMS

This plugin provides the ability to rescale an image. For instance, to generate a 50px width thumbnail (keeping aspect ratio):

```
{{image #thumb{w:50} }}
```

or, to generate in the default size (512):

```
{{image #thumb }}
```

## Installation

In an existing ergo project folder:

```
ergo plugin install thumbnail
```

## Options 

You may specify the following options in your `config.ergo.js`:

```
default_fields: {
	thumb_defwidth:512, // default thumbnail size (default is 512)
	...
}
```


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
		...
}
```

Also, change the above `post.html` to use the updated filter:
```
{{image #safe_thumb }}  or
{{image #safe_thumb{w:512} }}
```


See the default themes provided for ergo-cms to see this implementation.


## Experimental - srcset Support

There is also experimental support for img srcset to generate something like `<img src="small.jpg" srcset="medium.jpg 800w,large.jpg 1000w">`:

```
<img {{image #srcset{w:'256,512,800',max:'1152'} }} ...>
```

This would generate:

```
<img src='/images/i-256.jpg' srcset='/images/i-512.jpg 512w, /images/i-800.jpg 800w, /images/i.jpg 1152w' ...>
```

(The 'max' parameter is the default source image width, and the others are the various thumbail widths to generate)



