define(['kite/transition'], function(Transition)
{
	'use strict';

	return Transition.define('HorizontalSlide', function(params)
	{		
		var	that		=	this,
			duration	=	params.duration || 600;

		if(typeof duration === 'string')
		{
			switch(duration)
			{
				case 'slow': duration	=	800; break;
				case 'fast': duration	=	400; break;
				default: duration		=	600; break;
			}
		}

		var oldStyles	=	{
			position: $(params.containerElement).css('position'),
			overflow: $(params.containerElement).css('overflow'),
			margin: $(params.containerElement).css('margin'),
			"white-space": $(params.containerElement).css('white-space')
		};
		
		$(params.containerElement).css({position: 'relative', overflow: 'hidden', margin: '0 auto', width: '100%', 'white-space': 'nowrap'});
		
		var styles	=	{position: 'relative', display: 'inline-block', 'vertical-align': 'top', width: '100%', 'white-space': 'normal'};
		
		$(params.oldElement).css(styles);
		$(params.newElement).css(styles);
		
		$(params.containerElement).animate({scrollLeft: $(params.newElement).width()}, duration, function()
		{
			$(params.oldElement).remove();
			$(params.newElement).css({position: 'static', display: 'block'});
			$(params.containerElement).css(oldStyles);
			
			that.stop();
		});	
	});
});
