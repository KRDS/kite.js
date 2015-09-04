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
 
function FBItemsBrowser(settings)
{
	if( ! settings.container || ! settings.fql)
		return;
 
	settings.perPage = settings.perPage || 4;
	settings.callback = settings.callback || null;

	settings.label = $.extend({
        loading : 'Chargement...',
        no_item : 'Aucune photo ou vidéo disponible...',
        photo_title : 'Photos',
        select : 'Choisir'
    }, settings.label);
 
	var content =   '<h6>'+settings.label.photo_title+'</h6>';
    content     +=      '<div><div class="loading">'+settings.label.loading+'</div></div>';
 
	settings.container.html(content);
 
	var instance		=	this;
 
	this.container      =   settings.container.find('> div');
	this.perPage		=	settings.perPage;
	this.c_page			=	1;
	this.items			=	[];
	this.selectedItem	=	null;
	this.selectCallback	=	settings.callback;
	this.itemsDom		=	document.createElement('ul');
 
	this._onItemsReceived = function(fb_items)
	{		
		instance.items	=	fb_items;
 
		for(var i=0; i<fb_items.length;i++)
			instance._addItem(fb_items[i]);
 
		if(instance.itemsDom.getElementsByTagName('li').length == 0)
		{
			instance.container.html('<div class="fallback">'+settings.label.no_item+'</div>');
			return;
		}
 
		instance.container.text('');
		instance.container.addClass('browser_base');
 
		if(fb_items[0].src)
			instance.container.addClass('pb');
		else
			instance.container.addClass('vb');
 
		/* Full album DOM ready, paginate it. */
		for(i=0; i<this.items.length; i++)
		{
			if(i > this.perPage - 1)
				$(instance.itemsDom.getElementsByTagName('li')[i]).css('display', 'none');
		}
 
		if(this.items.length > this.perPage)
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
			var pn = Math.ceil(this.items.length / this.perPage);
 
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
 
		instance.container.append(instance.itemsDom);
 
	}
 
	this._addItem = function(v)
	{
		var liItem		=	document.createElement('li');
		var divItem		=	document.createElement('div');
 
		$(divItem).addClass('item').html('<b>'+settings.label.select+'</b>');
 
		/* Video */
		if(v.thumbnail_link)
		{
			$(divItem).css('backgroundImage', 'url("' + v.thumbnail_link + '")');
 
			var strongItem	=	document.createElement('strong');
 
			$(strongItem).text(v.title);
 
			$(liItem).append($(strongItem));
		}
		else if(v.src)
		{
			$(divItem).css('backgroundImage', 'url("' + v.src + '")');
		}
		else
			return;
 
 
		$(liItem).prepend($(divItem));
 
		$(liItem).bind('click', {v: v}, function(e)
		{
			instance.container.children('ul').children('li').each(function()
			{
				$(this).removeClass('active');
			});
 
			$(this).addClass('active');
 
			instance._select(v);
			return false;
		});
 
		instance.itemsDom.appendChild(liItem);
	}
 
	this.next = function()
	{
		this.c_page++;
 
		if(this.c_page > Math.ceil(this.items.length / this.perPage))
			this.c_page--;
 
		this.go();
	}
 
	this.previous = function()
	{
		this.c_page--;
 
		if(this.c_page <= 0)
			this.c_page = 1;
 
		this.go();
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
		});

		var ap  =   instance.container.children('ol').children('li.prev');
        var an  =   instance.container.children('ol').children('li.next');
         
        ap.addClass('enabled');
        an.addClass('enabled');
         
        if(this.c_page == 1)
            ap.removeClass('enabled');
             
        if(this.c_page == Math.ceil(this.items.length / this.perPage))
            an.removeClass('enabled');
 
		var start = (this.c_page - 1)* this.perPage;
 
		for(var i = start; i< start + this.perPage; i++)
		{
			instance.container.children('ul').children('li:nth-child(' + (i + 1) + ')').css('display', 'block');
		}
	}
 
	this._select = function(item)
	{
		instance.selectedItem = item;
 
		if(this.selectCallback)
			this.selectCallback(instance.selectedItem);
	}
 
	/* Get the items here (ie fix) */
	FB.api(
		{
			method		:	'fql.query',
			query		:	settings.fql
		},
		function(response)
		{
			if(response)
				instance._onItemsReceived(response)
		}
	);
}