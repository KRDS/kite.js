define('kite/platforms/facebook/toolbox', ['module', 'kite/platforms/facebook'], function(Module, Facebook)
{	
	var conf		=	Module.config();
		
	var inIframe	=	top !== self;
	
	return {
		busy: false,
		
		__construct: function()
		{			
			var _this	=	this;
			
			Facebook.ready(function()
			{				
				$('#_ktb').remove();
				
				var container	=	$('<section id="_ktb" class="_ktb"></section>');
				
				var reload		=	function()
				{					
					if(inIframe)
						top.location	=	Env.fb.callbackUrl;
					else
						document.location.reload();
				};
				
				var showReloadLink	=	function()
				{
					$('._ktbReload').show();
				};
				
				/* Info box */
				var containerInfo	=	$('<div class="_ktbInfo"></div>');
				
				//Unity
				if(conf.unity_url && conf.modules.unity)
				{
					var a_unt	=	$('<a target="_blank" href="' + conf.unity_url + '"></a>');
					
					containerInfo.append(a_unt);
				}
				
				//Last update
				if(Env.core.env !== Env.kite.env.dev)
					containerInfo.append('<p>Last updated on ' + new Date(Env.core.cb * 1000) + '</p>');
				
				/* Tools box */
				var containerTools		=	$('<div class="_ktbTools"><input type="checkbox" name="_ktbMenuCheck" id="_ktbMenuCheck" /></div>');
				var waitingPicRst		=	$('<i class="_ktbIconLoading"></i>');
				var waitingPicRvk		=	$('<i class="_ktbIconLoading"></i>');
				var waitingPicSt		=	$('<i class="_ktbIconLoading"></i>');
				var successPicRst		=	$('<i class="_ktbIconSuccess"></i>');
				var successPicRvk		=	$('<i class="_ktbIconSuccess"></i>');
				var successPicSt		=	$('<i class="_ktbIconSuccess"></i>');
				
				//Zoom, modern browser
				var zd	=	function()
				{
					var s	=	100;
					
					if(window.devicePixelRatio)
						s	=	window.devicePixelRatio;
					else if(window.screen && window.screen.deviceXDPI && window.screen.logicalXDPI)
						s	=	window.screen.deviceXDPI / window.screen.logicalXDPI;

					return s === parseInt(s) ? 100 : Math.round(s * 100);
				};
				
				$(window).on('resize', function()
				{					
					var z	=	zd();
					
					$('._ktbZoom').text(z + '%');
					
					if(z === 100)
						$('._ktbZoom').removeClass('_ktbWarn');
					else
						$('._ktbZoom').addClass('_ktbWarn');
				});
								
				/* Tools menu */
				var containerMenu	=	$('<div class="_ktbOptions"><div class="_ktbOptionsWrap"><ul><li class="_ktbReload" style="display: none"></li></ul></div></div>');
				
				var rLink			=	$('<a href="#">Reload?</a>').on('click', reload);
				
				containerMenu.find('li').append(rLink);
				
				//Like
				if(conf.like_url && conf.modules.like)
				{
					containerMenu.find('ul').append('<li class="_ktbLike"><div class="_ktbOptionsLike"><i class="_ktbIconUnlike"></i><div class="_ktbContainerLike"><fb:like href="' + conf.like_url + '" layout="button" width="50"></fb:like></div></div></li>');
					
					FB.Event.subscribe('edge.create', showReloadLink);
					FB.Event.subscribe('edge.remove', showReloadLink);
				}
				
				//Revoke
				var showRevokeLink = function()
				{
					if(FB.getUserID() && conf.modules.revoke)
					{
						var a_rvk	=	$('<span>Revoke authorization</span>').on('click', function(e)
						{
							e.preventDefault();
							e.stopPropagation();

							if(_this.busy)
								return;

							$('#_fb_tbox_rvk ._ktbIconLoading').remove();
							$('#_fb_tbox_rvk ._ktbIconSuccess').remove();
							$('#_fb_tbox_rvk').prepend(waitingPicRvk);

							_this.busy	=	true;

							FB.api('/me/permissions', 'delete', function()
							{
								FB.getLoginStatus(function(r)
								{
									showReloadLink();

									_this.busy	=	false;

									$('#_fb_tbox_rvk ._ktbIconLoading').remove();
									$('#_fb_tbox_rvk').prepend(successPicRvk);

									$('#_fb_tbox_rst span').addClass('disabled').off('click').on('click', function()
									{
										e.preventDefault();
										e.stopPropagation();
										return false;
									});

								}, true);

								$('input[name="authResponse"], input[name="signed_request"]').remove();

								Facebook.isUserConnected	=	false;
							});
						});

						var elt	=	$('<li class="_ktbRvk"><a id="_fb_tbox_rvk" href="#"><i class="_ktbIconTrash"></i></a></li>');
						
						if(containerMenu.find('._ktbLike').length)
							containerMenu.find('._ktbLike').after(elt);
						else
							containerMenu.find('ul').append(elt);
						
						containerMenu.find('#_fb_tbox_rvk').append(a_rvk);
					}
				};
				
				if(conf.modules.revoke)
				{
					showRevokeLink();
					
					FB.Event.subscribe('auth.statusChange', function(r)
					{
						if(r.status === 'connected')
						{
							showRevokeLink();
							showResetLink();
						}
					});
				}
						
				//Reset.
				var showResetLink = function()
				{
					if(FB.getUserID() && conf.reset_url && conf.modules.reset)
					{
						var a_rst	=	$('<span>Reset</span>').on('click', function(e)
						{						
							e.preventDefault();
							e.stopPropagation();

							$('#_fb_tbox_rst ._ktbIconLoading').remove();
							$('#_fb_tbox_rst ._ktbIconSuccess').remove();
							$('#_fb_tbox_rst').prepend(waitingPicRst);

							$.get(conf.reset_url).always(function()
							{
								showReloadLink();

								$('#_fb_tbox_rst ._ktbIconLoading').remove();
								$('#_fb_tbox_rst').prepend(successPicRst);
							});
						});
						
						var elt	=	$('<li class="_ktbRst"><a id="_fb_tbox_rst" href="#"><i class="_ktbIconReset"></i></a></li>');
						
						if(containerMenu.find('._ktbRvk').length)
							containerMenu.find('._ktbRvk').after(elt);
						else
							containerMenu.find('ul').append(elt);

						containerMenu.find('#_fb_tbox_rst').append(a_rst);
					}
				};
				
				showResetLink();

				//Detectizr
				if(conf.modules.support)
					containerMenu.find('ul').append($('<li><a id="_fb_tbox_details" href="#"><i class="_ktbIconEnvelope"></i><span>Send my browser info</span></a></li>'));
								
				containerMenu.find('._ktbOptionsWrap').append($('<div class="_ktbZoom">' +  zd() + '%</div>')).append(containerInfo);
				//End
				$('body').append(container.append(containerTools.append(containerMenu).append('<label class="_ktbMenu" for="_ktbMenuCheck"></label>')));
				
				//Detectizr event
				if(conf.modules.support)
				{
					$('#_fb_tbox_details').on('click', function(e)
					{					
						e.preventDefault();
						e.stopPropagation();

						if(_this.busy)
							return;
						
						$('#_fb_tbox_details').prepend(waitingPicSt);

						_this.busy	=	true;

						require(['kite/helpers/dev/modernizr.full.min', 'kite/helpers/dev/detectizr.min'], function()
						{			
							var details	=	{
								browser: Detectizr.browser,
								device: Detectizr.device,
								os: Detectizr.os,
								screen: {width: window.screen.availWidth, height: window.screen.availHeight},
								user: FB.getUserID(),
								ip: null,
								cookies: navigator.cookieEnabled,
								navigator: {
									ua: navigator.userAgent,
									plugins: (function()
									{
										var plugins = [], obj = {}, p;

										for(var i = 0; i < navigator.plugins.length; i++)
										{
											p	=	navigator.plugins[i];

											plugins.push({
												name: p.name,
												version: p.version,
												description: p.description
											});
										}

										return plugins;
									}())
								}
							};

							var commit	=	function()
							{
								$.post(Env.fb.callbackUrl + '/dev/support/email', {details: JSON.stringify(details)}, function()
								{
									_this.busy	=	false;
									
									$('#_fb_tbox_details ._ktbIconLoading').remove();
									$('#_fb_tbox_details ._ktbIconSuccess').remove();
									$('#_fb_tbox_details').prepend(successPicSt);
								}).always(function()
								{
									_this.busy	=	false;
								});
							};

							$.ajax({
								url: 'https://jsonip.appspot.com/',
								jsonp: 'callback',
								dataType: 'jsonp',
								timeout: 3000,
								success: function(response)
								{
									if(response.ip && /^[0-9\.]+$/.test(response.ip))
										details.ip	=	response.ip;
								},
								complete: function()
								{
									commit();
								}
							});
						});
					});
				}
				
				$('._ktbMenu').on('mouseover', function()
				{
					$('._ktbMenu').addClass('over');
					
					FB.XFBML.parse(document.getElementById('_ktb'));
				}).on('mouseout', function()
				{
					$('._ktbMenu').removeClass('over');
				}).on('click', function() //mobile
				{
					$('._ktbMenu').toggleClass('over');		
				});
			});
		}
	}
});