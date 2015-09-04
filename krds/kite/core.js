define('kite/core', function()
{
	var Core = 	
	{
		version			: '0.9',
		isInit			: false,
		hasCustomLocale	: false,

		locale			: null,

		init: function(opts)
		{
			if( ! opts.locale)
				return;

			Core.isInit				=	true;
			Core.locale				=	opts.locale;
			Core.hasCustomLocale	=	opts.hasCustomLocale || false;
		},

		injectLocale: function(url, force_inject)
		{
			var reg_locale	=	/[\?&]locale=[a-z]{2}_[A-Z]{2}/;
			var do_inject	=	Core.hasCustomLocale || force_inject;

			if(do_inject && reg_locale.test(url) === false)
			{
				if(url.indexOf('?') === -1)
					url	=	url + '?locale=' + Core.locale;
				else
					url	=	url + '&locale=' + Core.locale;
			}

			return url;
		}
	};
	
	Core.init({
		locale			: Env.core.locale,
		hasCustomLocale : Env.core.hasCustomLocale
	});
	
	return Core;
});