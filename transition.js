define(function()
{
	'use strict';

	//Some polyfills
	if (typeof Object.create !== 'function')
	{
		Object.create	=	function (o)
		{
			function F() {}
			F.prototype	=	o;
			return new F();
		};
	}

	if ( ! window.getComputedStyle)
	{
		window.getComputedStyle	=	function(el) {

			this.el	=	el;

			this.getPropertyValue	=	function(prop) {

				var re	=	/(\-([a-z]){1})/g;

				if(prop === 'float')
					prop	=	'styleFloat';

				if(re.test(prop))
				{
					prop	=	prop.replace(re, function ()
					{
						return arguments[2].toUpperCase();
					});
				}

				return el.currentStyle[prop] ? el.currentStyle[prop] : null;
			}

			return this;
		}
	}

	//Main class
	function Transition(params)
	{
		params	=	params || {};

		this._isStopped		=	true;
		this._hasStarted	=	false;
		this._stopCallbacks	=	[];

		this._duration		=	params.duration === undefined ? 400 : params.duration;
		this._domElement	=	null;
		this._firstChild	=	null;
		this._targetElement	=	null;
		this._content		=	params.content ? params.content : '';

		if(params.container)
			this.containerElement(params.container);

		delete params.duration;
		delete params.content;
		delete params.container;

		this._params	=	params;
	}

	Transition.prototype._start		=	function(data)
	{
		data.oldElement.parentNode.removeChild(data.oldElement);
		
		data.newElement.style.display	=	'block';

		this.stop();
	};

	Transition.prototype.stop	=	function(callback)
	{
		if(callback === undefined)
		{
			var totalCallbacks	=	this._stopCallbacks.length;

			if(totalCallbacks)
				for(var i = 0; i < totalCallbacks; i++)
					this._stopCallbacks[i].apply(this);

			this._isStopped	=	true;
		}
		else
			this._stopCallbacks.push(callback);

		return this;
	};

	Transition.prototype.content	=	function(newContent)
	{
		if(newContent === undefined)
			return this._content;

		this._content	=	newContent;

		return this;
	};

	Transition.prototype.duration	=	function(newDuration)
	{
		if(newDuration === undefined)
			return this._duration;

		this._duration	=	newDuration;

		return this;
	};

	Transition.prototype.containerElement	=	function(newDomElement)
	{
		if(newDomElement === undefined)
			return this._domElement;

		this._domElement	=	typeof newDomElement === 'string' ? document.getElementById(newDomElement) : newDomElement;

		var	totalChildren	=	this._domElement.childNodes.length,
			domElemStyle,
			domElemPosition;

		//Wrap all children into a single tag element
		if(totalChildren === 1)
			this._firstChild	=	this._domElement.childNodes[0];
		else
		{
			this._firstChild	=	document.createElement('div');

			domElemStyle		=	window.getComputedStyle(this._domElement);
			domElemPosition		=	domElemStyle.getPropertyValue('position');

			if( ! domElemPosition || domElemPosition === 'static')				
				this._domElement.style.position = 'relative';
			
			while(this._domElement.childNodes.length)
				this._firstChild.appendChild(this._domElement.firstChild);

			this._domElement.appendChild(this._firstChild);
		}

		this._targetElement					=	this._firstChild.cloneNode(false);
		
		this._targetElement.style.display	=	'none';

		return this;
	};

	Transition.prototype.execute	=	function()
	{
		this._targetElement.innerHTML		=	this._content;
		
		this._domElement.appendChild(this._targetElement);

		var params	=	{};

		for(var i in this._params)
			params[i]	=	this._params[i];

		params.oldElement		=	this._firstChild;
		params.newElement		=	this._targetElement;
		params.containerElement	=	this._domElement;
		params.duration 		=	this._duration;

		this._isStopped		=	false;
		this._hasStarted	=	true;

		this._start(params);

		return this;
	};

	//Defining new transitions
	Transition.define	=	function(name, startFunction)
	{
		Transition[name]	=	function(domElement, newContent)
		{
			Transition.call(this, domElement, newContent);
		};

		Transition[name].prototype	=	Object.create(Transition.prototype);

		if(startFunction)
			Transition[name].prototype._start	=	startFunction;

		return Transition[name];
	};

	return Transition;
});
