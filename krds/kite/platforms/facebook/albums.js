/*
Copyright (c) 2012 KRDS SAS France, http://krds.com/
 
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
 
function FBAlbumsBrowser(settings)
{
	if( ! settings.container || ! settings.user)
		return;
 
	settings.perPage = settings.perPage || 4;
	settings.callback = settings.callback || null;
	settings.label = $.extend({
        loading : 'Chargement...',
        no_album : 'Aucun album disponible',
        no_item : 'Aucune photo ou vidéo disponible...',
        select : 'Choisir',
        album_title : 'Albums',
        photo_title : 'Photos'
    }, settings.label);
 
	var content =   '<div class="albums">';
    content     +=      '<h6>'+settings.label.album_title+'</h6><div>';
    content     +=      '<div class="loading">'+settings.label.loading+'</div>';
    content     +=  '</div></div>';
    content     +=  '<div class="items">';
    content     +=      '<div></div>';
    content     +=  '</div>';
 
	settings.container.html(content);
 
	settings.container = settings.container.find('.albums > div');
 
	var instance		=	this;
 
	this.user			=	settings.user;
	this.container		=	settings.container;
	this.perPage		=	settings.perPage;
	this.c_page			=	1;
	this.covers			=	[];
	this.albums			=	[];
	this.cnt_albums		=	0;
	this.selectedPic	=	null;
	this.selectCallback	=	settings.callback;
	this.albumsDom		=	document.createElement('ul');
	this.hasTagsAlbum	=	false;
	
	var fql;
 
	this._onAlbumsReceived = function(fb_albums)
	{
		instance.covers	=	[];
		instance.albums	=	[];
 
		for(var i = 0; i < fb_albums.length; i++)
		{
			instance.covers.push('"' + fb_albums[i].cover_pid.toString() + '"');
			instance.albums.push([fb_albums[i].cover_pid, fb_albums[i].name]);
		}
 		
		FB.api(
		{
			method		:	'fql.query',
			query		:	'SELECT pid, src_small, src FROM photo WHERE pid IN (SELECT pid FROM photo_tag WHERE subject=' + instance.user + ')'
		},
		function(response)
		{
			if(response)
				instance._onPhotosTaggedReceived(response)
		});
	}
 
	this._onPhotosTaggedReceived = function(fb_photos)
	{
		if(fb_photos.length > 0)
		{
			instance.hasTagsAlbum = true;
			
			/* Album of user's tag */
			instance._addAlbum(1, 'Tagged pictures', 'https://graph.facebook.com/' +  instance.user + '/picture?type=normal');
		}
		else
			instance.hasTagsAlbum = false;
 
		if(instance.covers.length == 0)
		{
			instance.container.html('<div class="fallback">'+settings.label.no_album+'</div>');
			return;
		}
 
		FB.api(
			{
				method		:	'fql.query',
				query		:	'SELECT pid, aid, src_small, src FROM photo WHERE pid IN(' + instance.covers.join(',') + ') ORDER BY created DESC'
			},
			function(response)
			{
				if(response)
					instance._onCoversReceived(response)
			}
		);
	}
 
	this._onCoversReceived = function(fb_covers)
	{				
		for(var i = 0; i < fb_covers.length; i++)
			instance._addAlbum(fb_covers[i].aid, instance._getAlbumName(fb_covers[i].pid), fb_covers[i].src);
 
		instance.cnt_albums = fb_covers.length;
		
		if(instance.hasTagsAlbum)
			instance.cnt_albums++;

		if(instance.albumsDom.getElementsByTagName('li').length == 0)
		{
			instance.container.html('<div class="fallback">'+settings.label.no_album+'</div>');
			return;
		}
 
		instance.container.text('');
		instance.container.addClass('browser_base');
		instance.container.addClass('vb');
 
		/* Full album DOM ready, paginate it. */
		for(i = 0; i < instance.cnt_albums; i++)
		{
			if(i > instance.perPage - 1) /* Skip Mes photos taggées albums if exists */
				$(instance.albumsDom.getElementsByTagName('li')[i]).css('display', 'none');
		}
 
		if(instance.cnt_albums > instance.perPage)
		{
			var ol = document.createElement('ol');
 
			/* Prev link */
			var ap = document.createElement('li');
            $(ap).text('«').addClass('prev');
            $(ap).click(function(){
                instance.previous();
                return false;
            })
 
			/* Next link */
			var an = document.createElement('li');
            $(an).text('»').addClass('next');
            $(an).click(function(){
                instance.next();
                return false;
            })
 
			/* Page number */
			var pn = Math.ceil(instance.cnt_albums / this.perPage);

			if(pn > 1)
                $(an).addClass('enabled');
 
			/* TODO: Limit if too many items */
			for(i = 1; i<= pn; i++)
			{
				var li = document.createElement('li');
 
				if(i == 1)
					$(li).addClass('active');
 
				$(li).addClass('page_' + i);
				$(li).text(i);
 
				$(li).bind('click', {page: i}, function(e)
				{
					instance.go(e.data.page);
					return false;
				})
 
				$(ol).append($(li));
			}
 
			$(ol).prepend($(ap));
			$(ol).append($(an));
 
			instance.container.prepend($(ol));
		}
 
		instance.container.append(instance.albumsDom);
	}
 
	this._addAlbum = function(aid, name, cover_src)
	{
		var liItem		=	document.createElement('li');
		var spanItem	=	document.createElement('span');
		var strongItem	=	document.createElement('strong');
 
		$(spanItem).css('backgroundImage', 'url("' + cover_src + '")');
		$(strongItem).text(name);
 
		$(liItem).append($(spanItem));
		$(liItem).append($(strongItem));
 
		$(liItem).bind('click', {aid: aid}, function(e)
		{
			instance.container.children('ul').children('li').each(function()
			{
				$(this).removeClass('active');
			});
 
			$(this).addClass('active');
 
			instance._browse(e.data.aid);
			return false;
		});
 
		instance.albumsDom.appendChild(liItem);
	}
 
	this._browse = function(aid)
	{		
		var fql = '';
 
		if(aid == 1) /* Only execute when targeted user is the current user */
			fql = 'SELECT pid, src_small, src, src_big FROM photo WHERE pid IN (SELECT pid FROM photo_tag WHERE subject=' + instance.user + ')';
		else
			fql = 'SELECT pid, src_small, src, src_big FROM photo WHERE aid="' + aid + '"';
 
		new FBItemsBrowser(
		{
			container : instance.container.parent().parent().find('.items'),
            perPage   : settings.perPage,
            label     : settings.label,
            fql       : fql,
            callback  : function(p){
                instance.selectCallback(p);
            }
		});
	}
 
	this.back = function()
	{
 
	}
 
	this.next = function()
	{
		instance.c_page++;
 
		if(instance.c_page > Math.ceil(instance.cnt_albums / instance.perPage))
			instance.c_page--;
 
		instance.go();
	}
 
	this.previous = function()
	{
		instance.c_page--;
 
		if(instance.c_page <= 0)
			instance.c_page = 1;
 
		instance.go();
	}
 
	this.go = function(p)
	{
		this.c_page = p || this.c_page;
 
		instance.container.children('ol').children('li').each(function(){
			$(this).removeClass('active');
		})
 
		instance.container.children('ol').children('li.page_' + this.c_page).addClass('active');
 
		/* items */
		instance.container.children('ul').children('li').each(function(){
			$(this).css('display', 'none');
		})

		var ap  =   instance.container.children('ol').children('li.prev');
        var an  =   instance.container.children('ol').children('li.next');
         
        ap.addClass('enabled');
        an.addClass('enabled');
         
        if(this.c_page == 1)
            ap.removeClass('enabled');
             
        if(this.c_page == Math.ceil(instance.cnt_albums / instance.perPage))
            an.removeClass('enabled');
 
		var start = (this.c_page - 1) * this.perPage;
		
		for(var i = start; i< start + this.perPage; i++)
		{
			instance.container.children('ul').children('li:nth-child(' + (i + 1) + ')').css('display', 'block');
		}
	}
 
	this._getAlbumName = function(pid)
	{
		for(var i = 0; i < instance.albums.length; i++)
		{
			if(instance.albums[i][0] == pid)
				return instance.albums[i][1];
		}
	}
 
	FB.api({
			method		:	'fql.query',
			query		:	'SELECT aid, name, cover_pid FROM album WHERE owner=' + this.user
		}, function(response)
		{						
			if(response)
				instance._onAlbumsReceived(response)
		}
	);
}