/* Dynamic shim */
requirejs.config({
    shim: {
		'pxloaderImage': {
			deps: ['pxloader']
		},
		'pxloaderSound': {
			deps: ['pxloader']
		},
		'pxloaderVideo': {
			deps: ['pxloader']
		},
		'_kdeps/krds-lazyload/PxLoaderCss': {
			deps: ['pxloader', '_kdeps/krds-lazyload/lazyload']
		},
		'_kdeps/pxloader-font/index': {
			deps: ['pxloader', '_kdeps/fontjs/Font.min']
		}
	}
});

define('kite/asset', [
    'app/assets', 
    '_kdeps/krds-lazyload/lazyload', /* pxloaderCss */
    '_kdeps/fontjs/Font.min',  /* PxFont */
    'pxloader', /* PxImage, PxSound, PxVideo*/
    'pxloaderImage', /* shim deps: pxloader*/
    'pxloaderSound', /* shim deps: pxloader*/
    'pxloaderVideo', /* shim deps: pxloader*/
    '_kdeps/krds-lazyload/pxloaderCss', /* shim deps: lazyload*/
    '_kdeps/pxloader-font/index' /* shim deps: Font*/
], function(config)
{
    return {

        v: ! config.urlArgs ? '' : '?' + config.urlArgs,

        load: function(assets, onComplete)
        {
            var _this	=	this,
                loaded	=	[],
                pattern	=	/^(css|img|font|sound|video|js|func)\.(.+)$/,
                pxAssetsLoaded			=	false,
                pxAssetsCount			=	0,
                jsAssetsLoaded			=	false,
                totalRemainingFuncs		= 	0,
                loadedRequireJsModules	=	[],
                pxMimicker				=	{
                    addProgressListener: function(){}
                };
            
            /**
             * Assets loading:
             *	-	func assets
             *	-	pxloader assets (css, img, font, sound, video)
             *	-	requireJs assets (js)
             */

            //No assets to load should not break the expected progressListener method.			
            if( ! assets.length)
            {
                onComplete(loaded, loadedRequireJsModules);
                
                return pxMimicker;
            }

            var a, p, css = [], fonts = [], js = [], others = [];

            for(var i = 0; i < assets.length; i++)
            {
                a	=	assets[i];

                if(typeof a === 'string' && pattern.test(a))
                {
                    p	=	a.match(pattern);

                    a	=	{t: p[1], s: p[2]};
                }

                switch(a.t)
                {
                    case 'css':
                        if(config['css'].paths[a.s])
                        {
                            if(config.css.paths[a.s].indexOf('/') === 0 || config['css'].paths[a.s].indexOf('http') === 0)
                                css.push({'id': a.s, 'url': config.css.paths[a.s] + _this.v});
                            else
                                css.push({'id': a.s, 'url': config.css.baseUrl + '/' + config.css.paths[a.s] + _this.v});
                        }
                        else
                            css.push({'id': a.s, 'url': config.css.baseUrl + '/' + a.s + '.css' + _this.v});
                        
                        loaded.push({t: a.t, s: css[css.length - 1].url});
                    break;

                    case 'font':
                        fonts.push(a);
                    break;

                    case 'js':
                        js.push(a.s);
                        loaded.push(a);
                    break;

                    default:
                        others.push(a);
                }
            }

            //Js assets handle by requireJs (dependencies management)
            if(js)
            {											
                requirejs(js, function()
                {										
                    jsAssetsLoaded	=	true;

                    if(pxAssetsLoaded && ! totalRemainingFuncs)
                        onComplete(loaded, arguments);
                    else
                        loadedRequireJsModules	=	arguments;
                });
            }
            else
                jsAssetsLoaded	=	true;

            //Static assets by us.
            assets	=	[].concat(fonts).concat(others);

            var px	=	new pxloader();
            var asset, fontSupport;

            fontSupport	=	typeof px.addFont === 'function' && window.Font;

            //Load CSS as a batch, to keep their order (see lazyload on CSS ordering)			
            if(css.length)
            {
                pxAssetsCount++;
                px.addCss(css);
            }

            var f, conf, src, src_type,	type, subassets;
            
            var prependCallback	=	function(base, url)
            {
                return url.indexOf('http') === 0 || url.indexOf('//') === 0 ? url : base + '/' +  url;
            };
            
            function assetfnDone()
            {
                if(--totalRemainingFuncs === 0)
                {
                    if(pxAssetsLoaded && jsAssetsLoaded)
                        onComplete(loaded, loadedRequireJsModules);
                }
            }

            for(var i = 0; i < assets.length; i++)
            {			
                type	=	assets[i].t;
                src		=	assets[i].s;
                conf	=	config[type];
                        
                switch(type)
                {
                    case 'img':
                        pxAssetsCount++;
                        f = function(asset){px.addImage(asset);};
                    break;

                    case 'font':
                        if( ! fontSupport)
                            continue;

                        pxAssetsCount++;
                        f = function(asset){px.addFont(asset);};
                    break;

                    case 'sound':
                        pxAssetsCount++;
                        f = function(asset){px.addSound(asset.id, asset.url, asset.tags, asset.priority);};
                    break;

                    case 'video':
                        pxAssetsCount++;
                        f = function(asset){px.addVideo(asset);};
                    break;

                    case 'func':
                        f = function(asset){asset(assetfnDone);};
                    break;

                    default:
                        continue;
                }

                subassets	=	[];

                //Mapping resolver.
                if(type === 'font')
                    asset	=	src;
                else if(type !== 'css')
                {			
                    //Named asset. Js path resolving handle by requireJS: do not resolve path for js here.
                    if(type !== 'js' && conf && conf.paths && conf.paths[src])
                    {	
                        //Asset source
                        src		=	conf.paths[src];
                    
                        //Asset src type
                        src_type	=	typeof src;
                                                
                        //Direct URL
                        if(src_type === 'string')
                        {	
                            asset =  prependCallback(conf.baseUrl, src + _this.v);
                            
                            if(type === 'sound')
                                asset	=	{id: undefined, url: asset};
                        }
                        else if(src_type === 'function') //Asset function
                        {								
                            asset	=	src;
                            totalRemainingFuncs++;
                        }
                        else if(Object.prototype.toString.call(src) === '[object Array]') //Asset group
                        {
                            for(var j = 0; j < src.length; j++)
                            {
                                if(conf.paths[src[j]])
                                {
                                    if(typeof src[j] === 'string' && typeof conf.paths[src[j]] === 'string')
                                    {
                                        asset	=	conf.paths[src[j]];
                                    }
                                    else
                                    {
                                        // Asset group inside asset group
                                        
                                        if(conf.paths[src[j]].length > 0)
                                        {
                                            for(var k = 0; k < (conf.paths[src[j]].length - 1); k++)
                                            {
                                                asset	=	prependCallback(conf.baseUrl, conf.paths[src[j]][k] + _this.v);
                                                
                                                subassets.push(asset);
                                            }
                                            
                                            asset	=	conf.paths[src[j]][k];
                                        }
                                    }
                                }								
                                else
                                    asset = src[j];

                                if(type === 'func')
                                    totalRemainingFuncs++;
                                else if(type === 'sound')
                                {	
                                    if(typeof asset === 'string')
                                        asset	=	{id: undefined, url: asset};
                                    
                                    asset.url	=	prependCallback(conf.baseUrl, asset.url + _this.v);
                                }
                                else
                                    asset	=	prependCallback(conf.baseUrl, asset + _this.v);
                                    
                                subassets.push(asset);
                            }
                        }
                        else if(type === 'sound') //src_type not a string not an array but sound
                        {							
                            asset		=	src;
                                                        
                            if(typeof asset === 'string')
                                asset	=	{id: undefined, url: asset};
                            
                            asset.url	=	prependCallback(conf.baseUrl, asset.url + _this.v);
                        }
                    }
                    else //Unnamed asset
                    {
                        if(type === 'func')
                        {
                            totalRemainingFuncs++;
                            asset	=	src;
                        }
                        else if(type === 'sound')
                        {							
                            asset		=	src;
                                                        
                            if(typeof asset === 'string')
                                asset	=	{id: undefined, url: asset};
                            
                            asset.url	=	prependCallback(conf.baseUrl, asset.url + _this.v);
                        }
                        else
                            asset	=	prependCallback(conf.baseUrl, src + _this.v);
                    }
                }
            
                if( ! subassets.length)
                    subassets.push(asset);
                
                for(var k = 0; k < subassets.length; k++)
                {
                    f(subassets[k]);

                    loaded.push({t: assets[i].t, s: subassets[k]});
                }
            }
            
            if(pxAssetsCount)
            {
                px.addCompletionListener(function()
                {
                    pxAssetsLoaded	=	true;

                    if(jsAssetsLoaded && ! totalRemainingFuncs)
                        onComplete(loaded, loadedRequireJsModules);
                });

                px.start();
                
                return px;
            }
            else
            {
                pxAssetsLoaded	=	true; //single func asset to load requires this
                
                //No assets to load and no func pending
                if(jsAssetsLoaded && ! totalRemainingFuncs)
                    onComplete(loaded, loadedRequireJsModules);

                return pxMimicker;
            }
            
        }
    };
});