define(['kite/transition', 'libs/codrops-pt/js/pagetransitions'], function(Transition, pt)
{
	'use strict';

	return Transition.define('CodropsPageTransition', function(params)
	{				
		var	that	=	this,
			animId	=	params.animation || 1;

		if(animId === 'random')
			animId	= Math.floor(Math.random() * 67) + 1;
		
		$(params.containerElement).height($('.pt-page').height());
		$('.pt-page').css('position', 'absolute');
		$(params.oldElement).addClass('pt-page pt-page-current');
		$(params.newElement).addClass('pt-page').css('display', 'block');

		pt.nextPage(animId, function(outPage, inPage)
		{
			outPage.remove();
			
			$('.pt-page').css('position', 'static');
			$(params.containerElement).css('height', 'auto');
			
			that.stop();
		});
	});
});
