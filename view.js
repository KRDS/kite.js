var modules = ['module', 'kite/loader', 'kite/transition', 'jquery'];

define('kite/view', modules, function(Module, Loader, Transition)
{
	return {
		_currentView: null,

		_pushStateOn	: false,

		//Used for HTML4 browser using History.js to ignore "statechange" event on pushState or replaceState calls
		_stateLocked	: true,
		_busy			: false,

		supports_history_api: function ()
		{
			return !! (window.history && history.pushState);
		},

		load: function(next, errorClbk, data)
		{
			var _this			=	this,
				_transitioner	=	null,
				_loader			=	_this.loader,
				_historize		=	true,
				_historyLoading	=	false,
				_onViewRendered,
				url;

			if(_this._busy)
				return;

			var mk		=	{_as_view : 1};
			data		=	$.extend(data, mk) || mk;

			if(typeof next !== 'string')
			{
				url = next.view;

				if(typeof next.historize === 'boolean')
					_historize		=	next.historize;

				//Internal stuff
				if(typeof next.historyLoading === 'boolean')
				{
					_historyLoading	=	next.historyLoading;

					if(_historyLoading)
						_historize		=	false;
				}

				if(next.transition instanceof Transition)
					_transitioner	=	next.transition;
				
				if(typeof next.onRendered === 'function')
					_onViewRendered	=	next.onRendered;
					
				if(typeof next.loader === 'object')
					_loader	=	next.loader;
			}
			else
				url	=	next;

			url	=	url.indexOf(Env.fb.callbackUrl) === -1 ? Env.fb.callbackUrl + url : url;
			
			if( ! _transitioner)
				_transitioner	=	new Transition();

			if( ! _this._currentView)
				_this._currentView	=	document.location.href;

			var historyHandler	=	_this.supports_history_api() ? history : History;

			_this._stateLocked	=	true;

			if(_historize)
			{
				historyHandler.replaceState(null, null, _this._currentView);
				historyHandler.pushState(null, null, url);
			}
			else if( ! _historyLoading)
			{
				historyHandler.replaceState(null, null, url);
			}

			if( ! _this._pushStateOn)
			{
				if(_this.supports_history_api())
				{
					window.addEventListener('popstate', function(e)
					{
						_this.load({view: location.href.replace(Env.fb.callbackUrl, ''), historyLoading: true});
					}, false);
				}
				else
				{
					History.Adapter.bind(window, 'statechange', function()
					{
						var self	=	_this;

						if(self._stateLocked)
							return;

						var State = History.getState();

						_this.load({view: State.url.replace(Env.fb.callbackUrl, ''), historyLoading: true});
					});
				}

				_this._pushStateOn	=	true;
			}

			_this._currentView		=	url;

			if(typeof errorClbk !== 'function')
			{
				errorClbk	=	function(jqXHR)
				{
					if(jqXHR.status == 400 || jqXHR.status == 500)
						console.log(jqXHR.responseText);
				};
			}

			if( ! _onViewRendered)
			{
				if(typeof Module.config().onViewRendered === 'function')
					_onViewRendered	=	Module.config().onViewRendered;
				else
					_onViewRendered	=	function(){};
			}

			_loader.start();
			_this._busy	=	true;

			$.ajax(
			{
				cache		:	false,
				url			:	url,
				type		:	'POST',
				dataType	:	'json',
				data		:	data,
				error		:	errorClbk,
				success		:	function(data)
				{					
					_transitioner
						.containerElement('main')
						.content(data.content)
						.stop(function()
						{
							_loader.stop();
							_onViewRendered();
						});
					
					Loader.load(data.assets, null, 0, false, _transitioner);
				},
				complete: function()
				{
					_this._stateLocked	=	false;
					_this._busy			=	false;
				}
			});

			return false;
		},
		
		/* Internal loader */
		loader: {
			start: function()
			{
				$('#view-loader').show();
				require('nprogress').start();
			},
			
			stop: function()
			{
				$('#view-loader').hide();
				require('nprogress').done();
			}
		}
	};
});