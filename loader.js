define(['module'], function(Module)
{	
	/* Init part, loading of required polyfills, loading of app assets config module, libs path access */
	var modules		=	[Module.config().assetsConfig, 'kite/asset'];
	
	/* Dynamic path config */
	requirejs.config({
		paths: {
			'_kdeps': Module.config().libsPath
		}
	});
	
	if( ! window.JSON || ! window.JSON.parse || ! window.JSON.stringify)
		modules.push('_kdeps/json3/lib/json3.min');

	if( ! window.console)
		modules.push('_kdeps/console-polyfill/index');

	if( ! document.querySelector)
		modules.push('_kdeps/qs-polyfill/index');
	
	if( ! (!! (window.history && history.pushState))) //View module
		modules.push('_kdeps/history.js/scripts/bundled/html4+html5/native.history');
	
	/* Loader */
	var log	=	Module.config().debug,
		supportQuery	=	'querySelectorAll' in document.body;
		
	function viewReady(module, elt)
	{
		var scripts	=	supportQuery
							?	elt.querySelectorAll('script[type="application/json"]')
							:	elt.getElementsByTagName('script'),
			builtConfig		=	{},
			tmpConfig,
			scriptId;

		for(var i = 0, l = scripts.length; i < l; i++)
		{
			if( ! supportQuery && scripts[i].type !== 'application/json')
				continue;

			scriptId	=	scripts[i].getAttribute('data-id') || '';
			tmpConfig	=	JSON.parse(scripts[i].text || scripts[i].textContent || scripts[i].innerHTML || '{}');

			if(tmpConfig)
			{
				if(log)
					console.log('[krds/loader]: JS config "' + scriptId + '" parsed: ', tmpConfig);
					
				if(scriptId)
					builtConfig[scriptId]	=	{};
				
				for(var key in tmpConfig)
				{
					if(scriptId)
						builtConfig[scriptId][key]	=	tmpConfig[key];
					else
						builtConfig[key]	=	tmpConfig[key];
				}
			}
		}

		require(module).__construct(builtConfig);
	}
	
	function Loader()
	{
		this._ready = false,
			
		this._pending = [];
		
		this._loadedViewCss = [];
		
		this._loadedViewJs = [];
		
		this._chromeLoaded = false;
		
		this._alwaysCssLoaded = false;
		
		this._assetModule = null;
	}
	
	Loader.prototype.load = function(assets, callback, minLoadingTime, loadChromeAssets, transition)
	{
		if( ! this._ready)
			return this.onReady(arguments);
		
		var _this			=	this,
			types			=	['css', 'img', 'font', 'sound', 'video', 'js', 'func'],
			css_assets		=	[],
			js_assets		=	[],
			callback		=	callback || function(){},
			transition		=	transition || null,
			minLoadingTime	=	minLoadingTime || 0;

		for(var i = 0; i < assets.length; i++)
		{
			if(typeof assets[i] === 'string' && assets[i].indexOf('css.') === 0)
				css_assets.push(assets[i].substr(4));
			else if(assets[i].t === 'js') //Constructors to call
				js_assets.push(assets[i].s);
			else if(assets[i].t === 'css') //Css to unload at next view
				css_assets.push(assets[i].s);
		}
		
		//0. CSS unloading
		//- Only when the element is removed else the unloading is visible.
		//- Only for view loading, not user Loader.load() calls.
		//- Do not unload if the CSS module is loaded again.
		if(transition && _this._chromeLoaded && _this._loadedViewCss.length)
		{
			transition.stop(function(old_csss, new_csss)
			{
				return function()
				{						
					for(var i = 0; i < old_csss.length; i++)
					{
						if($.inArray(old_csss[i], new_csss) === -1)
							$('#__css_' + old_csss[i].match(/([a-z0-9]+)/gi).join('_') + '.lazyload').remove();
					}

					if(log)
						console.log('[krds/loader]: CSS unloading', old_csss);
				};
			}(_this._loadedViewCss, css_assets));
		}
		
		//Load Chrome assets if not done, and prepend them
		if(loadChromeAssets)
		{						
			for(var i = 0; i < types.length; i++)
			{					
				if(this._assetsConfig[types[i]] && this._assetsConfig[types[i]].init)
				{
					for(var j = this._assetsConfig[types[i]].init.length - 1; j >= 0 ; j--)
					{	
						if(types[i] === 'js') //Add JS init[] modules so that their __construct is called below.
							js_assets.push(this._assetsConfig[types[i]].init[j]);
						
						//init[] Css not added in css_assets meaning they will never get unloaded
						
						assets	=	[{t: types[i], s: this._assetsConfig[types[i]].init[j]}].concat(assets);
					}
				}
			}
		}
		
		if(transition && _this._chromeLoaded)
		{
			//3. JS unloading if view type loading
			var m;

			for(var i = 0; i < _this._loadedViewJs.length; i++)
			{
				m	=	require(_this._loadedViewJs[i]);

				if(typeof m === 'object' && typeof m.__destruct === 'function')
				{
					m.__destruct();
					
					if(log)
						console.log('[krds/loader]: __destruct() called for ' + _this._loadedViewJs[i]);
				}
			}

			//Unload exiting module, if any						
			for(var i = 0; i < js_assets.length; i++)
				requirejs.undef(js_assets[i]);
		}
		
		//View loading or chrome assets loading
		if(transition || loadChromeAssets)
		{
			//4. Add always[] modules
			for(var i = 0; i < types.length; i++)
			{					
				if(this._assetsConfig[types[i]] && this._assetsConfig[types[i]].always)
				{
					for(var j = this._assetsConfig[types[i]].always.length - 1; j >= 0 ; j--)
					{	
						if(types[i] === 'js') //Add JS always[] modules so that their __construct is called below.
							js_assets.push(this._assetsConfig[types[i]].always[j]);
						else if(types[i] === 'css' && _this._alwaysCssLoaded)
							continue; //Do not inject the same CSS continuously

						assets	=	assets.concat([{t: types[i], s: this._assetsConfig[types[i]].always[j]}]);
					}
				}
			}
		
			_this._alwaysCssLoaded	=	true;
			
			//Set css to be unloaded next time when view type loading
			_this._loadedViewCss	=	css_assets.concat();
		}
		
		return (function(assets, callback, minLoadingTime, loadChromeAssets, transition)
		{			
			return _this._assetModule.load(assets, function(loaded, requireJsMapping)
			{
				if(log)
					console.log('[krds/loader]: Static assets loaded', loaded);						

				var _callback		=	function()
				{													
					if(requireJsMapping)
						callback.apply(this, requireJsMapping);
					else
						callback();
				};

				//Minimal loading time
				var loadingStart	=	(new Date()).getTime();

				function waitMinTime(module, elt)
				{
					var loadingEnd	=	(new Date()).getTime(),
						deltaTime	=	loadingEnd - loadingStart;

					if(deltaTime > minLoadingTime)
					{
						//callback of Loader.load must be executed *once* and *after* the min time
						//but *before* any JS constructor as it stops the loader and reveal the content.
						if(_callback)
						{
							_callback();

							//Callback should be executed only once
							_callback	=	null;
						}

						if(module && elt)
							viewReady(module, elt);
					}
					else
					{
						window.setTimeout(function()
						{
							//callback of Loader.load must be executed *once* and *after* the min time
							//but *before* any JS constructor as it stops the loader and reveal the content.
							if(_callback)
							{
								_callback();

								//Callback should be executed only once
								_callback	=	null;
							}

							if(module && elt)
								viewReady(module, elt);
						}, minLoadingTime - deltaTime);
					}
				}

				//4. JS loading
				if(js_assets)
				{
					if(transition)
						_this._loadedViewJs	=	js_assets.concat();
					else
						_this._loadedViewJs	=	_this._loadedViewJs.concat(js_assets);

					var m, cb;
					
					for(var i = 0; i < js_assets.length; i++)
					{
						m	=	require(js_assets[i]);

						if(typeof m === 'object' && typeof m.__construct === 'function')
						{			
							if(transition)
							{										
								if(transition._hasStarted && transition._isStopped)
									waitMinTime(js_assets[i], transition._targetElement);
								else
								{
									cb	=	function(mod)
									{
										return function()
										{
											waitMinTime(mod, transition._targetElement);
										};
									}(js_assets[i]);

									transition.stop(cb);
								}
							}
							else
								waitMinTime(js_assets[i], document.getElementById('main'));
						}
					}

					waitMinTime(null, null);

					if(transition)
						transition.execute();
				}
				else
				{
					waitMinTime(null, null);

					if(transition)
						transition.execute();
				}

				if(loadChromeAssets)
					_this._chromeLoaded	=	true;
			});	
		})(assets, callback, minLoadingTime, loadChromeAssets, transition);
	};
		
	Loader.prototype.onReady = function()
	{
		return this._pending.push(arguments);
	};
	
	// Put on hold Loader.load() calls when the loader is not ready (polyfills loading)
	Loader.prototype.ready = function(assetsConfig, assetModule)
	{
		var self = this;
		
		this._ready = true;
		this._assetsConfig = assetsConfig;
		this._assetModule = assetModule;
		
		for(var i = 0; i < this._pending.length; i++)
		{
			(function(args){
				self.load(args[0], args[1]);
			})(this._pending[i][0])
		}
	};
	
	var loader = new Loader();
	
	requirejs(modules, function(assetsConfig, assetModule)
	{		
		loader.ready(assetsConfig, assetModule);
	});
	
	return loader;
});