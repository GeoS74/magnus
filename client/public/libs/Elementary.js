/*
конструктор:
new El('p')
new El('<p>text</p>')
new El('<ul><li>1</li><li>1</li></ul>')
new El('#identificator')
new El('.class')
*/
"use strict"
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////pattern Observer////////////////////pattern Observer////////////////////pattern Observer////////////////////pattern Observer////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function Detector()
{
	this.observers = []; //abstruct properties
	this.value = null;   //abstruct properties

	this.then = [];

	Object.defineProperties(
		this,
		{
			observers: {enumerable: false},
			value: {enumerable: false},
			then: {enumerable: false},
		}
	);
}

Detector.prototype.attach = function(observer)
{
	this.observers.push(observer); 
	return this;
};

Detector.prototype.detach = function(observer)
{
	for(let i = 0; i < this.observers.length; i++)
	{
		if( this.observers[i] == observer )
		{
			//this.observers.splice( i, 1 ); //bug detected
			this.observers[i] = null;
			break;
		}
	}
	return this;
};

/*
Detector.prototype.setVal = function(value)
{
	this.value = value; 
	this.notify();
	return this;
}
*/

Detector.prototype.setVal = function(value, notify = true)
{
	let promise = new Promise(function(resolve, reject)
	{
		this.value = value; 
		if(notify) this.notify();
		resolve();
	}.bind(this));

	if(this.then.length) for(let i = 0; i < this.then.length; i++) promise.then(this.then[i]);
	
	return this;
}

Detector.prototype.setThen = function(func)
{
	this.then.push(func);
	return this;
}



Detector.prototype.getVal = function()
{
	return this.value;
};

//Detector.prototype.notify = function() {}; //abstruction method
Detector.prototype.notify = function()
{
	for(let i = 0; i < this.observers.length; i++) if(this.observers[i] !== null) this.observers[i].update(); //bug detected
};

Object.defineProperties(
	Detector.prototype,
	{
		attach: {enumerable: false},
		detach: {enumerable: false},
		setVal: {enumerable: false},
		getVal: {enumerable: false},
		notify: {enumerable: false},
		setThen: {enumerable: false},
	}
);


function Observer(model)
{
  this.model = model;
  this.model.attach(this);
  
  Object.defineProperty(this, 'model', {enumerable: false});
}

Observer.prototype.update = function() {};//abstruction method

Object.defineProperty(Observer.prototype, 'update', {enumerable: false});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////pattern Observer////////////////////pattern Observer////////////////////pattern Observer////////////////////pattern Observer////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////










function Backend() //extends Detector
{
	Detector.call(this);
	this.backend = {
		path: '',
		method: '',
		data: {}
	};

	Object.defineProperty(this, 'backend', {enumerable: false});
}

Backend.prototype = Object.create(Detector.prototype);

Backend.prototype.constructor = Backend;

Backend.prototype.setPath = function(path)
{
	this.backend.path = path;
	return this;
};

Backend.prototype.setMethod = function(method)
{
	this.backend.method = method;
	return this;
};

Backend.prototype.setData = function(data)
{
	this.backend.data = data;
	return this;
};

Backend.prototype.query = function()
{
	GsHttpRequest.query(
		this.backend.path,
		this.backend.data,
		function(result, errors)
		{
			if(errors)
			{ 
				console.log(errors);	
			}
			this.setVal(result);
		}.bind(this), //здесь контекст теряется (this == window), поэтому используется привязка
		true
    );
	return this;
};

Object.defineProperties(
	Backend.prototype,
	{
		constructor: {enumerable: false},
		setPath: {enumerable: false},
		setData: {enumerable: false},
		query: {enumerable: false},
	}
);














//смешанный функционал субъекта и наблюдателя
function Unit(model) //extends Backend, Observer
{
	Backend.call(this);

	Observer.call(this, (model || this)); //*magic

	this.update = this.handler(); //set handler function
	
	Object.defineProperty(this, 'update', {enumerable: false});
}
Unit.prototype = Object.create(Backend.prototype);

Unit.prototype.constructor = Unit;

Unit.prototype.update = function(){}; //это не будет вызвано

Unit.prototype.handler = function(){return this.update;}; //Override this function

Unit.prototype.setHandler = function(func)
{
	if(typeof func == 'function') this.update = func;
	return this;
};

/*
Unit.prototype.handler = function(){
	return function(){
		some code
	};
};
*/

Object.defineProperties(
	Unit.prototype,
	{
		constructor: {enumerable: false},
		update: {enumerable: false},
		handler: {enumerable: false},
		setHandler: {enumerable: false},
	}
);









function El(html, model) //extends Unit
{
	this.parentNode = document.body; 	//type object
	this.elem = null; 	//type object
	this.error; 	//type object

	if(html) this.create(html);

	Unit.call(this, model);

	return this;
}

El.prototype = Object.create(Unit.prototype);

El.prototype.constructor = El;

El.prototype.setParentNode = function(parentNode)
{
	this.parentNode = (typeof parentNode !== 'string') ? parentNode : document.querySelector(parentNode);
	return this;
};


El.prototype.html = function(html)
{
	if(html) this.create(html);

	return this.elem.outerHTML;
};

El.prototype.render = function(type, html)
{
	if(html)
	{
		this.elem.insertAdjacentHTML((type || 'afterend'), html);
	}
	else
	{
		this.parentNode.insertAdjacentElement((type || 'beforeend'), this.elem);
	}
	return this;
};

/*
El.prototype.__render = function(type)
{
	if(type == 'prepend') this.parentNode.prepend(this.elem);
	else if(type == 'before') this.parentNode.before(this.elem);
	else if(type == 'after') this.parentNode.after(this.elem);
	else this.parentNode.append(this.elem);
	return this;
};

El.prototype.renderer = function(html, type)
{
	this.elem.insertAdjacentHTML((type || 'afterend'), html);
	return this;
}
*/


El.prototype.create = function(html)
{
	let div = document.createElement('div');

	div.insertAdjacentHTML('afterbegin', html);

	this.elem = div.firstElementChild;

	return this;
};

El.prototype.error = function(error)
{
	if(error)
	{
		this.error = error;
	}
	else
	{
		console.log(error.name);
		console.log(error.message);
	}
};



El.prototype.on = function(event, handler)
{
	this.elem.addEventListener(event, handler);
	return this;
};

El.prototype.off = function(event){};



El.prototype.wrap = function(html)
{
	let div = document.createElement('div');
	div.insertAdjacentHTML('afterbegin', html); //вставить обертку во временный div
	this.elem.after(div.firstElementChild); //спозиционировать обёртку
	this.elem.nextElementSibling.append(this.elem); //переместить элемент
	return this;
};


Object.defineProperties(
	El.prototype,
	{
		constructor: {enumerable: false},
		setParentNode: {enumerable: false},
		render: {enumerable: false},
		create: {enumerable: false},
		error: {enumerable: false},
		on: {enumerable: false},
		wrap: {enumerable: false},
		html: {enumerable: false},
	}
);
