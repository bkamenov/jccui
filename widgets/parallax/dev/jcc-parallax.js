jcc.widgets["parallax-layer"] = 
{
	version : "1.1.1",
	can_enhance : function(el) 
	{ 	
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "parallax-layer";
	},
	enhance : function(el) { if(el.parallaxLayer) el.parallaxLayer.refresh(); else new jcc.parallaxLayer(el).refresh(); },
	unenhance : function(el) { if(el.parallaxLayer) el.parallaxLayer.destroy(); }
};
jcc.parallaxLayer = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var speed, ox, oy, px, py, sh, sv, dh, dv;
	
	function notifyParent()
	{
		jcc.dispatchCustomEvent(el.parentNode, "e-layer-loaded", { bubbles: false, cancelable: false, detail: el });
	}
	
	this.update = function(containerRect, windowRect, orthoCenter)
	{
		var width = el.offsetWidth;
		var height = el.offsetHeight;
		
		var bgWidth;
		var bgHeight;
		
		var ratio = height / width;
		
		if(sh == "cover")
		{	
			bgWidth = windowRect.width;
			bgHeight = bgWidth * ratio;
			
			if(windowRect.height > bgHeight)
			{
				bgHeight = windowRect.height;
				bgWidth = bgHeight / ratio;
			}							
		}
		else if(sh == "contain")
		{
			if(width >= height)
			{
				bgWidth = windowRect.width;
				bgHeight = bgWidth * ratio;
			}
			else
			{
				bgHeight = windowRect.height;
				bgWidth = bgHeight / ratio;
			}
		}
		else
		{
			if(isNaN(sh))
			{
				if(sh.indexOf("%") > 0) //percentage 
					bgWidth = parseInt(sh) / 100.0 * windowRect.width;
			}
			else //absolute size in pixels
				bgWidth = sh;
		
			if(isNaN(sv))
			{
				if(sv.indexOf("%") > 0) //percentage 
					bgHeight = parseInt(sv) / 100.0 * windowRect.height;
			}
			else //absolute size in pixels
				bgHeight = sv;	
				
			if(sh == "auto")
			{
				if(sv == "auto")
				{
					bgWidth = width;
					bgHeight = height;
				}
				else
					bgWidth = bgHeight / ratio;
			}
			else if(sv == "auto")
			{
				bgHeight = bgWidth * ratio;
			}
		}
		var xScale = bgWidth / width;
		var yScale = bgHeight / height;
		
		
		var x = containerRect.left - (orthoCenter.x - containerRect.width * 0.5);
		var y = containerRect.top - (orthoCenter.y - containerRect.height * 0.5);
		
		var xPos = -containerRect.left;
		
		if(isNaN(px))
		{
			if(px == "left")
				xPos += 0;
			else if(px == "center")
				xPos += (windowRect.width - width) * 0.5;
			else if(px == "right")
				xPos += windowRect.width - width;
			else //percentage
				xPos = parseInt(px) / 100.0 * windowRect.width;
		}
		else
		{
			xPos += px;
		}
		xPos += ox;
		
		if(dh)
			xPos += x * speed / 100;
		
		var yPos = -containerRect.top;
		
		if(isNaN(py))
		{
			if(py == "top")
				yPos += 0;
			else if(py == "center")
				yPos += (windowRect.height - height) * 0.5;
			else if(py == "bottom")
				yPos += windowRect.height - height;
			else //percentage
				yPos += parseInt(py) / 100.0 * windowRect.height;
		}
		else
		{
			yPos += py;
		}
		yPos += oy;
		
		if(dv)
			yPos += y * speed / 100;
		
		el.style.transform = "translate(" + xPos + "px," + yPos + "px) scale(" + xScale + "," + yScale + ")";
	}
	
	function readSpeed()
	{
		speed = parseInt(el.dataset.speed);
		if(isNaN(speed))
			speed = 100;
	}
	
	function readPosition()
	{
		//Read position
		px = py = "center";
		var parts = el.dataset.position.split(" ");
		if(parts.length > 0)
		{
			if(parts[0] == "left" || parts[0] == "center" || parts[0] == "right")
				px = parts[0];
			else
			{
				var val = parseInt(parts[0]);
				if(!isNaN(val))
				{
					if(parts[0].charAt(parts[0].length-1) == "%")
						px = val + "%";
					else
						px = val;
				}
			}
			
			if(parts.length > 1)
			{
				if(parts[1] == "top" || parts[1] == "center" || parts[1] == "bottom")
					py = parts[1];
				else
				{
					var val = parseInt(parts[1]);
					if(!isNaN(val))
					{
						if(parts[1].charAt(parts[1].length-1) == "%")
							py = val + "%";
						else
							py = val;
					}
				}
			}
		}
	}
	
	function readSize()
	{
		//Read size
		sh = "100%";
		sv = "auto";
		var parts = el.dataset.size.split(" ");
		if(parts.length > 0)
		{
			if(parts[0] == "auto" || parts[0] == "cover" || parts[0] == "contain")
				sh = parts[0];
			else
			{
				var val = parseInt(parts[0]);
				if(!isNaN(val))
				{
					if(parts[0].charAt(parts[0].length-1) == "%")
						sh = val + "%";
					else
						sh = val;
				}
			}
			
			if(parts.length > 1)
			{
				if(parts[1] == "auto")
					sv = parts[1];
				else
				{
					var val = parseInt(parts[1]);
					if(!isNaN(val))
					{
						if(parts[1].charAt(parts[1].length-1) == "%")
							sv = val + "%";
						else
							sv = val;
					}
				}
			}
		}
	}
	
	function readOffset()
	{
		//Read offset
		ox = oy = 0;
		parts = el.dataset.offset.split(" ");
		if(parts.length > 0)
		{
			var val = parseInt(parts[0]);
			if(!isNaN(val))
				ox = val;
			
			if(parts.length > 1)
			{
				var val = parseInt(parts[1]);
				if(!isNaN(val))
					oy = val;
			}
		}
	}
	
	this.setOptions = function(opt)
	{
		var refresh = false;

		for(var o in opt)
		{
			if(typeof opt[o] == "number" || typeof opt[o] == "string")
			{
				el.dataset[o] = opt[o].toString();
				
				if(o == "speed")
					readSpeed();
				else if(o == "position")
					readPosition();
				else if(o == "size")
					readSize();
				else if(o == "offset")
					readOffset();
				else
					refresh = true;
			}
		}
		if(refresh)
			this.refresh();
		else
			el.parentNode.parallax.update();
	}
	
	this.refresh = function()
	{
		if(!el.parentNode.dataset.role || el.parentNode.dataset.role != "parallax")
		{
			alert("JCC: An 'parallax-layer' node must be a direct child of a 'parallax'. Please revise your markup.");
			return;
		}
			
		this.destroy();
		
		el.parallaxLayer = this;
		
		//Set defaults
		if(!el.dataset.speed || el.dataset.speed.length == 0)
			el.dataset.speed = 100;
			
		if(!el.dataset.size || el.dataset.size.length == 0)
			el.dataset.size = "100% 100%";
		
		if(!el.dataset.position || el.dataset.position.length == 0)
			el.dataset.position = "center center";
		
		if(!el.dataset.offset || el.dataset.offset.length == 0)
			el.dataset.offset = "0 0";
			
		readSpeed();
		readPosition();
		readSize();
		readOffset();
			
		dh = el.parentNode.dataset.direction == "horizontal" || el.parentNode.dataset.direction == "all";
		dv = el.parentNode.dataset.direction == "vertical" || el.parentNode.dataset.direction == "all";
		
		el.classList.add("jcc-parallax-layer");
		
		notifyParent();
	}
	
	this.destroy = function()
	{
		if(el.parallaxLayer)
		{
			el.classList.remove("jcc-parallax-layer");
			delete el.parallaxLayer;
		}
	}
}

jcc.widgets["parallax"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 	
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "parallax";
	},
	enhance : function(el) { if(el.parallax) el.parallax.refresh(); else new jcc.parallax(el).refresh(); },
	unenhance : function(el) { if(el.parallax) el.parallax.destroy(); }
};
jcc.parallax = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var layers, layersLoaded, ocx, ocy, oox, ooy;
	var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	
	function update()
	{
		var containerRect = jcc.getElementRect(el);
		var windowRect = jcc.getViewportRect();
		var orthoCenter = { x: 0, y: 0};
		
		if(isNaN(ocx))
		{
			if(ocx == "left")
				orthoCenter.x = 0;
			else if(ocx == "center")
				orthoCenter.x = windowRect.width * 0.5;
			else if(ocx == "right")
				orthoCenter.x = windowRect.width;
			else //percentage
				orthoCenter.x = parseInt(ocx) / 100.0 * windowRect.width;
		}
		else
		{
			orthoCenter.x = ocx;
		}
		orthoCenter.x += oox;
			
		if(isNaN(ocy))
		{
			if(ocy == "top")
				orthoCenter.y = 0;
			else if(ocy == "center")
				orthoCenter.y = windowRect.height * 0.5;
			else if(ocy == "bottom")
				orthoCenter.y = windowRect.height;
			else //percentage
				orthoCenter.y = parseInt(ocy) / 100.0 * windowRect.height;
		}
		else
		{
			orthoCenter.y = ocy;
		}
		orthoCenter.y += ooy;
		
		for(var i=0;i<layers.length;i++)
		{
			if(layersLoaded[i] == true)
			{
				var layer = layers[i].parallaxLayer;
				if(layer)
					layer.update(containerRect, windowRect, orthoCenter);
			}
		}
	}
	
	function onPageResize()
	{
		if(isChrome) //background-size: cover does not update background on Chrome window resize.
		{
			var disp = el.style.display;
			el.style.display = 'none';
			var trick = el.offsetHeight;
			el.style.display = disp;
		}
		
		update();
	}
	
	function onLayerLoaded(event)
	{
		if(!layers)
			return;
			
		if(el.dataset.eLayerLoaded && el.dataset.eLayerLoaded.length > 0)
			eval(el.dataset.eLayerLoaded);
			
		var layer = event.detail;
		for(var i=0;i<layers.length;i++)
		{
			if(layers[i] == layer)
			{
				layersLoaded[i] = true;
				break;
			}
		}
		
		var allLoaded = true;
		for(var i=0;i<layersLoaded.length;i++)
		{
			if(layersLoaded[i] == false)
			{
				allLoaded = false;
				break;
			}
		}
		
		if(allLoaded)
		{
			update();
			jcc.dispatchCustomEvent(el, "e-loaded", { bubbles: false, cancelable: false });
		}
	}
	
	function onELoaded(event)
	{
		if(el.dataset.eLoaded && el.dataset.eLoaded.length > 0)
			eval(el.dataset.eLoaded);
	}
	
	function readOrthoCenter()
	{
		ocx = ocy = "center";
		var parts = el.dataset.orthoCenter.split(" ");
		if(parts.length > 0)
		{
			if(parts[0] == "left" || parts[0] == "center" || parts[0] == "right")
				ocx = parts[0];
			else
			{
				var val = parseInt(parts[0]);
				if(!isNaN(val))
				{
					if(parts[0].charAt(parts[0].length-1) == "%")
						ocx = val + "%";
					else
						ocx = val;
				}
			}
			
			if(parts.length > 1)
			{
				if(parts[1] == "top" || parts[1] == "center" || parts[1] == "bottom")
					ocy = parts[1];
				else
				{
					var val = parseInt(parts[1]);
					if(!isNaN(val))
					{
						if(parts[1].charAt(parts[1].length-1) == "%")
							ocy = val + "%";
						else
							ocy = val;
					}
				}
			}
		}
	}
	
	function readOrthoOffset()
	{
		oox = ooy = 0;
		parts = el.dataset.orthoOffset.split(" ");
		if(parts.length > 0)
		{
			var val = parseInt(parts[0]);
			if(!isNaN(val))
				oox = val;
			
			if(parts.length > 1)
			{
				var val = parseInt(parts[1]);
				if(!isNaN(val))
					ooy = val;
			}
		}
	}
	
	this.setOptions = function(opt)
	{
		var refresh = false;

		for(var o in opt)
		{
			if(typeof opt[o] == "number" || typeof opt[o] == "string")
			{
				el.dataset[o] = opt[o].toString();
				
				if(o == "orthoCenter")
					readOrthoCenter();
				else if(o == "orthoOffset")
					readOrthoOffset();
				else
					refresh = true;
			}
		}
		if(refresh)
			this.refresh();
		else
			update();
	}
	
	this.refresh = function()
	{
		//Set defaults
		if(el.dataset.direction != "horizontal" && el.dataset.direction != "vertical" && el.dataset.direction != "all")
			el.dataset.direction = "vertical";
			
		if(!el.dataset.orthoCenter || el.dataset.orthoCenter.length == 0)
			el.dataset.orthoCenter = "center center";
			
		if(!el.dataset.orthoOffset || el.dataset.orthoOffset.length == 0)
			el.dataset.orthoOffset = "0 0";
			
		this.destroy();
		
		el.parallax = this;
		
		readOrthoCenter();
		readOrthoOffset();
		
		var position = jcc.getComputedStyle(el, "position");
		if(position == "static")
			el.classList.add("jcc-parallax-relative");
			
		layers = el.querySelectorAll("div[data-role$='parallax-layer']");
		layersLoaded = [];
		for(var i=0;i<layers.length;i++)
			layersLoaded.push(false);
			
		el.classList.add("jcc-parallax");
		
		//Listen for all scroll events
		var listener = el.parentNode;
		do
		{
			if(listener == document.body)
				window.addEventListener("scroll", update, false);
			else
				listener.addEventListener("scroll", update, false);
		}
		while(listener != document.body && (listener = listener.parentNode));
		
		//Listen for window resize
		window.addEventListener("resize", onPageResize, false);
		
		//Listen for element moving
		el.addEventListener("e-moved", update, false);
		jcc.repositionMonitor.addElement(el);
		
		//Listen for layer loaded
		el.addEventListener("e-layer-loaded", onLayerLoaded, false);
		
		el.addEventListener("e-loaded", onELoaded, false);
	}
	
	this.destroy = function()
	{
		if(el.parallax)
		{
			el.removeEventListener("e-loaded", onELoaded);
			
			//Remove listener for layer loaded
			el.removeEventListener("e-layer-loaded", onLayerLoaded);
		
			//Remove listeners for all scroll events
			var listener = el.parentNode;
			do
			{
				if(listener == document.body)
					window.removeEventListener("scroll", update);
				else
					listener.removeEventListener("scroll", update);
			}
			while(listener != document.body && (listener = listener.parentNode));
			
			//Remove listener for for window resize
			window.removeEventListener("resize", onPageResize);
			
			//Remove listener for element moving
			el.removeEventListener("e-moved", update);
			jcc.repositionMonitor.removeElement(el);
		
			el.classList.remove("jcc-parallax");
			el.classList.remove("jcc-parallax-relative");
			
			layers = undefined;
			layersLoaded = undefined;
			
			delete el.parallax;
		}
	}
}
