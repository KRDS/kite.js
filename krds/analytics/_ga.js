define(function(require)
{
	// https://gist.github.com/ismyrnow/6252718
	// Setup temporary Google Analytics objects.
	window.GoogleAnalyticsObject = 'ga';
	window.ga = function () { (window.ga.q = window.ga.q || []).push(arguments); };
	window.ga.l = 1 * new Date();

	if(Env.ga.uid)
		window.ga('create', Env.ga.id, { 'userId': Env.ga.uid });
	else
		window.ga('create', Env.ga.id, 'auto');

	return {
		__construct: function(config)
		{
			if( ! Env.ga || ! Env.ga.id)
				return;
			
			// If UTM are set by Kite, apply them manually (because they are not in the URL)
			var v;

			for(var k in config.utm)
			{
				v	=	null;

				switch(k)
				{
					case 'source':
						v	=	'campaignSource';
					break;

					case 'medium':
						v	=	'campaignMedium';
					break;

					case 'campaign':
						v	=	'campaignName';
					break;

					case 'content':
						v	=	'campaignContent';
					break;

					case 'term':
						v	=	'campaignKeyword';
					break;
				}

			   if(v)
				   window.ga('set', v, config.utm[k]);
			}
			
			// Add a page view event in the queue *only* when UTM params are applied!
			// window.ga('send', 'pageview');
			
			// Asynchronously load Google Analytics, letting it take over our `window.ga`
			// object after it loads. This allows us to add events to `window.ga` even
			// before the library has fully loaded.
			require(['//www.google-analytics.com/analytics.js']);
		}
	};
});