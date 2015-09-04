/*! ©2010-Present KRDS. All rights reserved. */

/**
 * 9.4: FBG 2.0
 * 9.3: - Kite 0.8, handleCallbackRelLinks / handleCanvasRelLinks removed and some rewriting
 * 9.2: 2 read_page_mailboxes permission
 * 9.1: f injectSessionInforms + hasCustomLocale + empty form action bug fix
 * 9.0: f handleCallbackRelLinks / handleCanvasRelLinks improvements.
 * 8.5: f IO6 is caching POST requests with cache: false
 * 8.4: + Canvas or website mode. forceResize deactivated for website. No signed_request injection for website.
 * 8.3: + SDK debug mode
 * 8.2: + Core object
 * 8.1: f $.off replaced by $.unbind for retrocompatibility.
 * 8.0: + rel callback links can't be clicked till the session is not injected.
 * 7.9: c Loading all.js with jquery to get rif of fb-root dependance.
 * 7.8: c Ensure fbready trigger on domready because we manipulate the dom in fbready here.
 * 7.7: f FB.JSON.* overwritten even if native JSON support.
 * 7.6: f JSON native
 * 7.5: f FB.getAuthResponse() now have __proto__ and break json encoding
 * 7.4: + frictionlessRequests added to true by default
 * 7.3: f FB.JSON.stringify fix with json3
 * 7.1: f Perms manager was totally wrong with popup blocker :o
 * 7.0: + Cookie as param
 * 6.9: f Fixes in Facebook.require: bug when not connected
 * 6.8: f FB changes notConnected to not_authorized
 * 6.7: c Permissions Manager without cache
 * 6.6: + Permissions Manager with cache
 * 6.5: - Deprecated perms stuff
 **/
define('kite/platforms/facebook', ['kite/core', 'jquery'], function(Core)
{	
	var Facebook = {
		version			: '0.9.4',
		isInit			: false,
		isReady			: false,
		ajaxPreFiltered	: false,
		settings		: {},
		signedRequest	: '',
		isUserConnected	: null,
		userAuthStatus	: null,
		locale			: null,
		useCookie		: false,
		mode			: 'canvas',
		authStatus		: {
			connected: 1,
			not_authorized: 0,
			unknown: -1
		},

		init: function(opts)
		{
			if( ! opts.appId || ! opts.callbackUrl || ! opts.locale)
				return;

			// Old apps
			if( ! Core.isInit)
			{
				Core.init(
				{
					locale : opts.locale,
					hasCustomLocale : opts.hasCustomLocale || false
				});
			}

			$(document).bind('fbready', function()
			{				
				Facebook.injectSessionInForms();
				Facebook.forceResize();

				Facebook.isReady = true;
			});

			$(document).ready(function()
			{
				if(window.FB)
					Facebook._onReady();
				else
					window.fbAsyncInit = Facebook._onReady;
			});

			Facebook.appId					=	opts.appId;
			Facebook.callbackUrl			=	opts.callbackUrl;
			Facebook.locale					=	opts.locale;
			Facebook.signedRequest			=	opts.signedRequest;
			Facebook.version				=	opts.version || null;
			Facebook.canvasUrl				=	opts.canvasUrl || null;
			Facebook.authScope				=	opts.authScope || '';
			Facebook.usecookie				=	opts.cookie || false;
			Facebook.frictionlessRequests	=	typeof(opts.frictionlessRequests) !== 'boolean' ? true : opts.frictionlessRequests;

			if(opts.mode && opts.mode === 'website')
			{
				Facebook.usecookie	=	true;
				Facebook.mode		=	opts.mode;
			}

			$.ajax({
				url: document.location.protocol + '//connect.facebook.net/' + Facebook.locale + '/sdk' + (opts.debug ? '/debug' : '') + '.js',
				type: 'GET',
				cache: true,
				async: true,
				dataType: 'script'
			});
		},

		_onReady: function()
		{
			var params = {
				appId  : Facebook.appId,
				status : false, /* Does not provide any callback */
				cookie : Facebook.usecookie, /* Enable for FB connect */
				version: Facebook.version,
				xfbml  : true,
				oauth  : true,
				frictionlessRequests: Facebook.frictionlessRequests,
				channelUrl : Facebook.callbackUrl + '/channel.html' //required for ie
			};
			
			FB._https = window.location.protocol === 'https:'; //IE8 mixed content warning (22/09/11) - http://bit.ly/omolut
			FB.init(params);

			/* Replace status:true with advantages of safe callbacking */
			FB.getLoginStatus(function(r)
			{
				if(r)
				{
					Facebook.isUserConnected	=	false;

					if(r.status === 'connected')
					{
						Facebook.isUserConnected	=	true;
						Facebook.userAuthStatus		=	Facebook.authStatus.connected;
					}
					else if(r.status === 'unknown')
						Facebook.userAuthStatus = Facebook.authStatus.unknown;
					else if(r.status === 'not_authorized')
						Facebook.userAuthStatus = Facebook.authStatus.not_authorized;

					Facebook.isInit = true;
					FB.Canvas.setSize();
					FB.Canvas.setDoneLoading();

					var injectFBJSONSupport = function()
					{
						if(typeof FB.JSON !== 'undefined')
						{
							if(typeof FB.JSON.stringify === 'undefined')
								FB.JSON.stringify = JSON.stringify;

							if(typeof FB.JSON.parse === 'undefined')
								FB.JSON.parse = JSON.parse;
						}
						else
						{
							FB.JSON = {
								stringify: JSON.stringify,
								parse: JSON.parse
							}
						}
					}

					var cbc = function()
					{
						injectFBJSONSupport();

						$(document).ready(function()
						{
							$(document).trigger('fbready');
						});
					};

					/* JSON fix */
					if( ! window.JSON || ! window.JSON.parse || ! window.JSON.stringify)
					{
						$.ajax({
							url: 'https://s3-eu-west-1.amazonaws.com/fbappz/static/json3.min.js',
							type: 'GET',
							cache: true,
							async: true,
							dataType: 'script',
							success: cbc
						});
					}
					else
						cbc();
				}
			}, true);

			FB.Canvas.setAutoGrow(500);
		},

		forceResize: function()
		{
			if(Facebook.mode === 'website')
				return;

			$('#fbForceResize').css('display', 'block');

			FB.Canvas.setSize({ height: $('body').height() });
		},
		
		ready: function(f)
		{
			$(document).ready(function()
			{
				if( ! Facebook.isInit)
					$(document).bind('fbready', f);
				else
					f();
			});
		},

		redirect: function(url)
		{
			if(Facebook.isInit)
				this._redirect(url);
			else
			{
				$(document).bind('fbready', function()
				{
					Facebook._redirect(url);
				});
			}
		},

		_redirect: function(url)
		{
			url	=	Core.injectLocale(url);

			if(Facebook.mode === 'canvas')
			{
				$('#fb-form').empty();

				$('#fb-form').append($('<input />').attr({
					name: 'signed_request',
					value: Facebook.signedRequest,
					type: 'hidden'
				}));

				/* Forms */
				if(FB.getAuthResponse() != null)
				{
					$('#fb-form').append($('<input />').attr({
						name: 'authResponse',
						value: Facebook.getAuthResponse(true),
						type: 'hidden'
					}));
				}

				$('#fb-form').attr('action', url);
				$('#fb-form').submit();
			}
			else
				document.location.href = url;

			return false;
		},

		connect: function(scope, onConnectCallback, onRefuseCallback)
		{
			if(Facebook.isInit)
				this._connect(scope, onConnectCallback, onRefuseCallback);
			else
			{
				$(document).bind('fbready', function()
				{
					Facebook._connect(scope, onConnectCallback, onRefuseCallback);
				});
			}
		},

		_connect: function(scope, onConnectCallback, onRefuseCallback)
		{
			if(typeof onConnectCallback === 'function')
				Facebook.onConnectCallback = onConnectCallback;
			else
				Facebook.onConnectCallback = null;

			if(typeof onRefuseCallback === 'function')
				Facebook.onRefuseCallback = onRefuseCallback;
			else
				Facebook.onRefuseCallback = null;

			/* User already connected */
			if(FB.getAuthResponse())
			{
				Facebook.isUserConnected = true;

				if(typeof Facebook.onConnectCallback === 'function')
					Facebook.onConnectCallback(true);

				return;
			}

			var csvScope;

			if(typeof scope !== 'string')
				csvScope	=	scope.join(',');
			else
				csvScope	=	scope;

			FB.login(function(response)
			{
				if( ! response.authResponse)
				{
					if(Facebook.onRefuseCallback)
						Facebook.onRefuseCallback();
				}
				else
				{
					Facebook._onUserLogin();

					if(Facebook.onConnectCallback)
						Facebook.onConnectCallback(false);
				}
			}, { scope: csvScope || ''});
		},

		_onUserLogin: function()
		{
			/* Session has changed */
			$('form input[name="session"], form input[name="authResponse"], form input[name="signed_request"]').remove();

			Facebook.injectSessionInForms();

			Facebook.isUserConnected	=	true;
			Facebook.userAuthStatus		=	Facebook.authStatus.connected;
		},

		getAuthResponse: function(asStr)
		{
			var as_str	=	asStr || false;

			var far	=	FB.getAuthResponse();

			if(far == null)
				return null;

			var ar	=	{};

			for(var k in far)
				ar[k] = far[k];

			return as_str ? JSON.stringify(ar) : ar;
		},

		injectSessionInForms: function()
		{	
			$('form[id!="fb-form"]').each(function()
			{
				var action =	$(this).attr('action');

				$(this).attr('action', Core.injectLocale(action ? action : document.location.href));
			});

			/* Forms */
			if(FB.getAuthResponse() != null)
			{
				$('form[method="post"], form[method="POST"]').append($('<input />').attr({
					name: 'authResponse',
					value: Facebook.getAuthResponse(true),
					type: 'hidden'
				}));
			}

			if(Facebook.mode === 'canvas')
			{
				$('form[method="post"], form[method="POST"]').append($('<input />').attr({
					name: 'signed_request',
					value: Facebook.signedRequest,
					type: 'hidden'
				}));
			}

			/* Ajax calls */
			if( ! Facebook.ajaxPreFiltered)
			{
				Facebook.ajaxPreFiltered	=	true;
			
				$.ajaxPrefilter(function(options)
				{
					if(options.type.toUpperCase() !== 'POST')
					{
						options.url		=	Core.injectLocale(options.url, true);
					}
					else
					{
						options.url		=	Core.injectLocale(options.url, true);

						if(Facebook.mode === 'canvas')
							options.data += '&signed_request=' + Facebook.signedRequest;

						if(Facebook.getAuthResponse() != null)
							options.data += '&authResponse=' + encodeURI(Facebook.getAuthResponse(true));
					}

					/* IOS6 caching POST requests even with cache: false */
					if( ! options.cache)
					{
						if( ! options.headers)
							options.headers = {};

						$.extend(options.headers, { 'Cache-Control': 'no-cache' });
					}
				});
			}
		},

		_csvToArray: function(csvStr)
		{
			if( ! csvStr)
				return [];

			var arr = csvStr.split(',');

			return $.map(arr, function(a){ return $.trim(a); });
		},

		require: function(perm, cbSuccess, cbError, isCheck)
		{
			if(Facebook.permissionsManager.busy)
				return false;

			Facebook.permissionsManager.busy = true;

			if( ! Facebook.permissionsManager.isInit) /* permsManager module is required */
				return false;

			var perms		= [];
			var is_check	= isCheck ? true : false;
			var cb_error	= typeof cbError === 'function' ? cbError : function(){};
			var cb_success	= typeof cbSuccess === 'function' ? cbSuccess : function(){};

			if(typeof perm === 'string')
				perms = Facebook._csvToArray(perm);
			else if(Object.prototype.toString.apply(perm) === '[object Array]')
				perms = perm;
			else
				throw {'msg': 'Invalid permissions list'};

			var ok			=	true;
			var rerequest	=	false;
					
			for(var i = 0; i < perms.length; i++)
			{
				if( ! Facebook.permissionsManager.perms[perms[i]])
					ok = false;
				else if(Facebook.permissionsManager.perms[perms[i]] === 'granted')
					ok = ok && true;
				else //previously declined permission in the set. Use "rerequest".
				{
					ok			=	false;
					rerequest	=	true;
				}
			}

			if(ok)
			{
				Facebook.permissionsManager.busy = false;
				return cb_success();
			}

			/* User has refused perms */
			if(is_check)
			{
				Facebook.permissionsManager.busy = false;
				return cb_error();
			}

			var init_cb = function()
			{
				Facebook.require(perms, cb_success, cb_error, true);
			}

			FB.login(function(response)
			{
				/* User was maybe not connected! */
				if(response.authResponse)
					Facebook._onUserLogin();

				Facebook.permissionsManager.init(init_cb);
			}, {scope: perms.join(','), auth_type: rerequest ? 'rerequest' : null});
		},

		permissionsManager :  {

			isInit: false,
					
			perms: {},

			busy: false, /* FB.login is slow, prevent the user of clicking more than once */

			init: function(cbi)
			{
				var cb		=	cbi || function(){};

				FB.api('/me/permissions', function(response)
				{				
					Facebook.permissionsManager.busy = false;

					var always = function()
					{
						if( ! Facebook.permissionsManager.isInit)
						{
							Facebook.permissionsManager.isInit	=	true;
							$(document).trigger('fbpermsready');
						}

						cb();
					};

					if(response.error || response.error_code || ! response.data)
					{
						/* Unlogged user must continue the process
						 * If query fails in that case, all perms stay null.
						 * */
						always();
						return;
					}

					for(var i = 0; i < response.data.length; i++)
						Facebook.permissionsManager.perms[response.data[i].permission] = response.data[i].status;

					always();
				});
			}
		}
	};
	
	Facebook.init({
		appId			: Env.fb.appId,
		callbackUrl		: Env.fb.callbackUrl,
		canvasUrl		: Env.fb.canvasUrl,
		version			: Env.fb.version,
		locale			: Env.fb.locale,
		signedRequest	: Env.fb.signedRequest,
		mode			: Env.fb.mode
	});
	
	return Facebook;
});