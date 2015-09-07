define(['kite/transition'], function(Transition)
{
	'use strict';

	return Transition.define('VerticalSlide', function(params)
	{
		var	that			=	this,
			duration	=	params.duration || 400;

		if(typeof duration === 'string')
		{
			switch(duration)
			{
				case 'slow': duration	=	600; break;
				case 'fast': duration	=	200; break;
				default: duration		=	400; break;
			}
		}

		duration	/=	2;

		var $oldElement	=	$(params.oldElement).slideUp(duration, function()
		{
			$(params.newElement).slideDown(duration);
			$oldElement.remove();
			that.stop();
		});
	});
});