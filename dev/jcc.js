var jcc = new function()
{
	this.version = function() { return "1.1.5" }

	var currentHistoryState = 
	{
		id: 0,
		page: "",
		popups: []
	};
	
	this.currentHistoryState = function()
	{
		return currentHistoryState;
	}
	
	this.historyStateCopy = function(historyState)
	{
		var stateCopy = 
		{
			id : historyState.id,
			page : historyState.page,
			popups : []
		};
		for(var i=0;i<historyState.popups.length;i++)
			stateCopy.popups.push(historyState.popups[i]);
			
		return stateCopy;
	}
	
	this.historyStateToHash = function(state)
	{
		var str = "";
		if(state.page.length > 0)
			str += state.page + "|";
		for(var i=0;i<state.popups.length;i++)
			str += state.popups[i] + "|";
			
		return ("#" + str);
	}
	
	this.now = function()
	{
		return (window.performance && window.performance.now) ? window.performance.now() : (Date.now ? Date.now() : new Date().getTime());
	}
	
	this.parseHash = function()
	{
		var parts = location.hash.substr(1).split("|");
		return parts;
	}
	
	this.handleHistory = function()
	{
		if(window.parent != window.top)
			return;
			
		var state = history.state;
		var hash = location.hash.substr(1);
		var argIdx = hash.indexOf("?");
		var urlArgs = "";
		if(argIdx > -1)
		{
			urlArgs = hash.substr(argIdx);
			hash = hash.substr(0, argIdx);
		}
		
		//These two lines fix the IE bug not changing the state on a hashchange as new history record
		if(state && state.id == currentHistoryState.id)
		{
			state = null;
		}
		
		if(state == null) //a new history entry
		{
			var back = false;
			
			if(hash.indexOf("|") < 0 && hash.length > 0) //a single object request
			{
				var el = document.getElementById(hash);
		
				if(el)
				{
					if(el.page) //a page is requested
					{
						//Unload the previuous page
						var prevPage = document.getElementById(el.page.pageview().page());//document.getElementById(currentHistoryState.page);
						if(prevPage && prevPage.page && prevPage.page.isLoaded())
							prevPage.page.__unload();
							
						//Load the page
						if(!el.page.isLoaded())
						{
							el.page.__load();
						
							//Update state page
							if(el.page.pageview().element().dataset.history == "yes")
								currentHistoryState.page = el.id;
							else
								back = true;
						}
					}
					else if(el.popup) //a popup is requested
					{
						if(!el.popup.isVisible())
						{
							el.popup.__show();
						
							if(el.dataset.history == "yes")
							{
								currentHistoryState.popups.push(el.id);
							}
							else
								back = true;
						}
					}
				}
			}
			else //A bulk request for pages/popups  
			{
				var hashParts = jcc.parseHash();
				
				//Create a map of popups from the current state for faster access
				var currentStateItemsMap = {};
				if(currentHistoryState.page.length > 0)
					currentStateItemsMap[currentHistoryState.page] = currentHistoryState.page;
				for(var i=0;i<currentHistoryState.popups.length;i++)
					currentStateItemsMap[currentHistoryState.popups[i]] = currentHistoryState.popups[i];
				
				//Create a map of the hash items for faster access
				var desiredItemsMap = {};
				for(var i=0;i<hashParts.length;i++)
				{
					var hash = hashParts[i];
					var argIdx = hash.indexOf("?");
					if(argIdx > -1)
						hash = hash.substr(0, argIdx);
			
					if(hash.length > 0)
						desiredItemsMap[hash] = hash;
				}
				
				for(var i in currentStateItemsMap)
				{
					if(!desiredItemsMap[i]) //The item was VISIBLE but now it should NOT be
					{
						var itemEl = document.getElementById(i);
						if(itemEl) //Item found
						{
							if(itemEl.popup) //Item is a popup
							{
								if(itemEl.popup.isVisible()) //Hide it now
									itemEl.popup.__hide(0);
								
								//Remove it from the list
								for(var p=0;p<currentHistoryState.popups.length;p++)
								{
									if(currentHistoryState.popups[p] == i)
									{
										currentHistoryState.popups.splice(p, 1);
										break;
									}
								}
							}
							else if(itemEl.page) //Item is a page
							{
								if(itemEl.page.isLoaded()) //Unload it now
									itemEl.page.__unload();
								
								if(currentHistoryState.page == i)
									currentHistoryState.page = "";
							}
						}
					}
				}
				
				for(var i in desiredItemsMap)
				{
					if(!currentStateItemsMap[i]) //The item was NOT VISIBLE but now it should be
					{
						var itemEl = document.getElementById(i);
						if(itemEl) //Item found
						{
							if(itemEl.popup && itemEl.dataset.history == "yes") //Item is a popup with history enabled
							{
								if(!itemEl.popup.isVisible()) //Show it now
								{
									itemEl.popup.__show();
									
									currentHistoryState.popups.push(i); //add it to the list of visible popups
								}
							}
							else if(itemEl.page && itemEl.page.pageview().element().dataset.history == "yes") //Item is a page
							{
								if(currentHistoryState.page == "") //No current page yet
								{
									if(!itemEl.page.isLoaded()) //Load it now
									{
										itemEl.page.__load();
									
										currentHistoryState.page = i;
									}
								}
							}
						}
					}
				}
			}
			
			if(back)
			{
				setTimeout(function() { history.back(); }, 0);
			}
			else
			{
				//Update the state
				currentHistoryState.id++;
				window.history.replaceState(currentHistoryState, "", jcc.historyStateToHash(currentHistoryState) + urlArgs);
			}
		}
		else
		{
			var reversedAnimation = state.id < currentHistoryState.id;
			
			//Page must be changed
			if(currentHistoryState.page != state.page)
			{
				//Unload the previous page
				var prevPage = document.getElementById(currentHistoryState.page);
				if(prevPage && prevPage.page && prevPage.page.isLoaded())
					prevPage.page.__unload(reversedAnimation);
				
				//Load the stored page
				var currentPage = document.getElementById(state.page);
				if(currentPage && currentPage.page && !currentPage.page.isLoaded())
					currentPage.page.__load(reversedAnimation);
			}
			
			//Create a map of popups from the current state for faster access
			var currentStatePopupsMap = {};
			for(var i=0;i<currentHistoryState.popups.length;i++)
				currentStatePopupsMap[currentHistoryState.popups[i]] = currentHistoryState.popups[i];
			//Create a map of popups from the desired state for faster access
			var desiredStatePopupsMap = {};
			for(var i=0;i<state.popups.length;i++)
				desiredStatePopupsMap[state.popups[i]] = state.popups[i];
				
			for(var p in currentStatePopupsMap)
			{
				if(!desiredStatePopupsMap[p]) //The popup was VISIBLE but now it should not be
				{
					var popEl = document.getElementById(p);
					if(popEl && popEl.popup && popEl.popup.isVisible())
						popEl.popup.__hide(0, reversedAnimation);
				}
			}
			
			for(var p in desiredStatePopupsMap)
			{
				if(!currentStatePopupsMap[p]) //The popup was NOT VISIBLE but now it should be
				{
					var popEl = document.getElementById(p);
					if(popEl && popEl.popup && !popEl.popup.isVisible())
						popEl.popup.__show(reversedAnimation);
				}
			}
			
			//set current state
			currentHistoryState = state;
		}
	}
	
	var prevHash = "";
	function hashchangeMonitor()
	{
		if(prevHash != location.hash)
		{
			jcc.handleHistory();
			prevHash = location.hash;
		}
		
		setTimeout(function(){ hashchangeMonitor(); }, 0);
	}

	//Dialog and page animations
	this.animations = 
	{
		"none" : { suffix : "none" },
		"pop" : { suffix : "pop" },
		"fade" : { suffix : "fade" },
		"slow-fade" : { suffix : "slow-fade" },
		"slideright" : { suffix : "slideright" },
		"slideleft" : { suffix : "slideleft" },
		"slidefade" : { suffix : "slidefade" },
		"slideup" : { suffix : "slideup" },
		"slidedown" : { suffix : "slidedown" },
		"upmenu" : { suffix : "upmenu"},
		"downmenu" : { suffix : "downmenu"},
		"leftmenu" : { suffix : "leftmenu"},
		"rightmenu" : { suffix : "rightmenu"},
		"flow" : { suffix : "flow" },
		"flip" : { suffix : "flip", parentClass : "jcc-viewport-flip" },
		"turn" : { suffix : "turn", parentClass : "jcc-viewport-turn" }
	};
	
	//Options for the library 
	this.options = 
	{
		alert:
		{
			theme: undefined,
			defaultTitle: "Message:",
			okText: "OK"
		},
		confirm:
		{
			theme: undefined,
			defaultTitle: "Confirmation needed:",
			yesText: "Yes",
			noText: "No"
		},
		prompt:
		{
			theme: undefined,
			defaultTitle: "Input needed:",
			okText: "OK",
			cancelText: "Cancel"
		},
		datetime:
		{
			theme: undefined,
			okText: "OK",
			nowText: "Now",
			cancelText: "Cancel",
			hourText: "h",
			minuteText: "min",
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			weekDays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
			DIALOG_MODE : 
			{
				DATE: 1,
				TIME: 2
			},
			overrideDefaultInputType: false
		},
		colorpicker:
		{
			theme: undefined,
			okText: "OK",
			cancelText: "Cancel",
			COLOR_FORMAT:
			{
				HEX: 1,
				RGB: 2,
				RGBA: 3
			},
			overrideDefaultInputType: false
		}
	};
	
	//here we shall register the new widget class types
	this.widgets = {};

	//all new widgets must extend jcc.widget class
	this.widget = function(el)
	{
		this.theme = function()
		{	
			var theme = "";
			
			var dom_el = el;
			do
			{
				var theTheme = dom_el.getAttribute("data-theme");
				if(theTheme)
				{
					theme = theTheme;
					break;
				}
			}
			while(dom_el != document.body && (dom_el = dom_el.parentNode));
			
			if(theme == "")
				theme = "a";
				
			return theme;
		}
		
		this.setOptions = function(opt)
		{
			for(var o in opt)
			{
				if(typeof opt[o] == "number" || typeof opt[o] == "string")
					el.dataset[o] = opt[o].toString();
			}
			this.refresh();
		}
		
		this.getOption = function(opt)
		{
			return el.dataset[opt.toString()];
		}
		
		this.element = function() { return el; }
		
		this.refresh = function() { alert("JCC: widget.refresh() is not implemented!"); }
		this.destroy = function() { alert("JCC: widget.destroy() is not implemented!"); }
	};
	
	if(!window.requestAnimationFrame)
	{
		window.requestAnimationFrame =  window.mozRequestAnimationFrame || 
										window.webkitRequestAnimationFrame ||
										function(fn) { return window.setTimeout(fn, 20); };
	}
	
	if(!window.cancelAnimationFrame)
	{
		window.cancelAnimationFrame =  window.mozCancelAnimationFrame || 
										window.webkitCancelAnimationFrame ||
										function(to) { return window.clearTimeout(to); };
	}
	
	(function () 
	{
		if(typeof window.CustomEvent === "function")
			return;

		function CustomEvent(event, params)
		{
			params = params || { bubbles: false, cancelable: false, detail: undefined };
			var evt = document.createEvent('CustomEvent');
			evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
			
			return evt;
		}

		CustomEvent.prototype = window.Event.prototype;

		window.CustomEvent = CustomEvent;
	})();

	this.dispatchCustomEvent = function(el, type, params)
	{
		var event = new CustomEvent(type, params);
		
		//This is a fix for the IE11 bug not setting the event.defaultPrevented to true 
		//after calling event.preventDefault() in the event handler(s).
		var origPreventDefault = event.preventDefault;
		event.preventDefault = function () 
		{
			if(event.cancelable) 
			{
				origPreventDefault.apply(this);
				Object.defineProperty(this, "defaultPrevented", {get: function () {return true;}});
			}
		};

		el.dispatchEvent(event);
		return event;
	}
	
	this.getViewportRect = function()
	{
		var rect = 
		{
			left: 0,
			right: window.innerWidth,
			top: 0,
			bottom: window.innerHeight,
			width: window.innerWidth,
			height: window.innerHeight
		};
		
		return rect;
	}
	
	this.getElementRect = function(el)
	{
		var rect;
		if(el == document.body)
		{
			rect = {};
			rect.width = (document.documentElement.offsetWidth || document.body.scrollWidth);
			rect.height = (document.documentElement.offsetHeight || document.body.scrollHeight);
			rect.left = document.body.offsetLeft - window.pageXOffset;
			rect.right = rect.left + rect.width;
			rect.top = document.body.offsetTop - window.pageYOffset;
			rect.bottom = rect.top + rect.height;
		}
		else
		{
			var r = el.getBoundingClientRect();
			//Avoid readonly "r"
			rect = 
			{
				left: r.left,
				right: r.right,
				top: r.top,
				bottom: r.bottom,
				width: r.width,
				height: r.height
			};
		}
		return rect;
	}
	
	this.getElementLocalRect = function(el)
	{
		var rect;
		if(el == document.body)
		{
			rect = {};
			rect.width = (document.documentElement.offsetWidth || document.body.scrollWidth);
			rect.height = (document.documentElement.offsetHeight || document.body.scrollHeight);
			rect.left = 0;
			rect.right = rect.left + rect.width;
			rect.top = 0;
			rect.bottom = rect.top + rect.height;
		}
		else
		{
			var r = el.getBoundingClientRect();
			rect = 
			{
				left: 0,
				right: r.width,
				top: 0,
				bottom: r.height,
				width: r.width,
				height: r.height
			};
		}
		
		return rect;
	}
	
	this.isVisible = function(el)
	{
		do
		{
			var display = jcc.getComputedStyle(el, "display");
			if(display == "none")
				return false;
				
			var visibility = jcc.getComputedStyle(el, "visibility");
			if(visibility == "hidden")
				return false;
		}
		while((el = el.parentNode) != null && el != document.body);
		
		return true;
	}
	
	this.resizeMonitor = new function()
	{
		var q = [];
		var mustInit = true;
		
		function Monitor()
		{
			for(var i=0;i<q.length;i++)
			{
				var rect = jcc.getElementLocalRect(q[i].el);
				if(q[i].w != rect.width || q[i].h != rect.height)
				{
					jcc.dispatchCustomEvent(q[i].el, "e-resized", { bubbles: false, cancelable: false });
				}
				q[i].w = rect.width;
				q[i].h = rect.height;
			}
			
			setTimeout(function(){ Monitor(); }, 0);
			//window.requestAnimationFrame(Monitor);
		}
		
		this.addElement = function(el)
		{
			for(var i=0;i<q.length;i++)
			{
				if(q[i].el == el)
				{
					q[i].refCounter++;
					return;
				}
			}
			
			q.push({ el : el, refCounter: 1 });
			
			if(mustInit)
			{
				mustInit = false;
				Monitor();
			}
		}
		
		this.removeElement = function(el)
		{
			for(var i=0;i<q.length;i++)
			{
				if(q[i].el == el)
				{
					if(--q[i].refCounter == 0)
						q.splice(i, 1);
						
					break;
				}
			}
		}
	};
	
	this.repositionMonitor = new function()
	{
		var q = [];
		var mustInit = true;
		
		function Monitor()
		{
			for(var i=0;i<q.length;i++)
			{
				var rect = jcc.getElementRect(q[i].el);
				if(q[i].left != rect.left || q[i].top != rect.top)
				{
					jcc.dispatchCustomEvent(q[i].el, "e-moved", { bubbles: false, cancelable: false });
				}
				q[i].left = rect.left;
				q[i].top = rect.top;
			}
			
			setTimeout(function(){ Monitor(); }, 0); 
			//window.requestAnimationFrame(Monitor);
		}
		
		this.addElement = function(el)
		{
			for(var i=0;i<q.length;i++)
			{
				if(q[i].el == el)
				{
					q[i].refCounter++;
					return;
				}
			}
			q.push({ el : el, refCounter: 1 });
			
			if(mustInit)
			{
				mustInit = false;
				Monitor();
			}
		}
		
		this.removeElement = function(el)
		{
			for(var i=0;i<q.length;i++)
			{
				if(q[i].el == el)
				{
					if(--q[i].refCounter == 0)
						q.splice(i, 1);
						
					break;
				}
			}
		}
	};
	
	this.getComputedStyle = function(el, prop) 
	{
		if(el.currentStyle)
			return el.currentStyle[prop];
		else if(window.getComputedStyle)
		{
			var computedStyle = window.getComputedStyle(el, null);
			if(computedStyle)
				return computedStyle.getPropertyValue(prop);
			else
				return el.style[prop];
		}
		else
			return el.style[prop];
	}
	
	this.copyCss = function(dst, src, style)
	{	
		var original = {};
		if(typeof(style) == "string")
		{
			original[style] = dst.style[style];
			dst.style[style] = src.style[style];
		}
		else
		{
			for(var i=0;i<style.length;i++)
			{
				var p = style[i];
				
				original[p] = dst.style[p];
				dst.style[p] = src.style[p];
			}
		}
		return original;
	}
	
	this.setCss = function(el, css)
	{
		var original = {};
		for(var p in css)
		{
			if(typeof css[p] != "string")
				continue;
				
			original[p] = el.style[p];
			el.style[p] = css[p];
		}
		return original;
	}
	
	this.getCss = function(el, style)
	{
		var css = {};
		if(typeof style == "string")
		{
			css[style] = el.style[style];
		}
		else if(typeof style == "object" && style.length)
		{
			for(var i=0;i<style.length;i++)
			{
				var p = style[i];
				css[p] = el.style[p];
			}
		}
		return css;
	}
	
	this.preload = function(imgUrl)
	{
		var img = document.createElement("img");
		img.src = imgUrl;
	}
	
	this.prevAll = function(el)
	{
		var res = [], prev;
		while(prev = el.previousSibling)
		{
			res.push(prev);
			el = prev;
		}
		return res;
	}
	
	this.nextAll = function(el)
	{
		var res = [], next;
		while(next = el.nextSibling)
		{
			res.push(next);
			el = next;
		}
		return res;
	}
	
	this.insertBefore = function(newElement, targetElement) 
	{
		var parent = targetElement.parentNode;
		parent.insertBefore(newElement, targetElement);
	}
	
	this.insertAfter = function(newElement, targetElement) 
	{
		var parent = targetElement.parentNode;
		if(parent.lastchild == targetElement)
			parent.appendChild(newElement);
        else 
			parent.insertBefore(newElement, targetElement.nextSibling);
	}
	
	this.detach = function(el)
	{
		if(el.parentNode)
			el.parentNode.removeChild(el);
	}
	
	var inputSupport = {};
	this.inputTypeSupported = function(type) 
	{
		type = type.toLowerCase();
		
		if(type == "text" || 
		type == "password" || 
		type == "checkbox" || 
		type == "radio" || 
		type == "submit" || 
		type == "button")
			return true;
		
		if(inputSupport[type] == undefined)
		{
			var input = document.createElement('input');
			input.setAttribute('type', type);

			var invalidValue = '~';
			input.setAttribute('value', invalidValue); 

			inputSupport[type] = (input.type == type && input.value !== invalidValue);
		}
		
		return inputSupport[type];
	}
	
	var supportedTransitionEnd = null;
	this.whatTransitionEnd = function()
	{
		if(supportedTransitionEnd === null)
		{
			var el = document.createElement('div');

			var transEndEventNames = 
			{
				transition       : 'transitionend',
				WebkitTransition : 'webkitTransitionEnd',
				MozTransition    : 'transitionend',
				OTransition      : 'oTransitionEnd otransitionend'
			};

			for(var name in transEndEventNames)
			{
				if(el.style[name] !== undefined)
				{
					supportedTransitionEnd = transEndEventNames[name];
					break;
				}
			}
			
			if(supportedTransitionEnd === null)
				supportedTransitionEnd = false;
		}
		
		return supportedTransitionEnd;
	}
	
	var supportedAnimationEnd = null;
	this.whatAnimationEnd = function()
	{
		if(supportedAnimationEnd === null)
		{
			var el = document.createElement('div');

			var animEndEventNames = 
			{
				animation       : 'animationend',
				WebkitAnimation : 'webkitAnimationEnd',
				MozAnimation    : 'animationend',
				OAnimation      : 'oAnimationEnd oanimationend'
			};

			for(var name in animEndEventNames)
			{
				if(el.style[name] !== undefined)
				{
					supportedAnimationEnd = animEndEventNames[name];
					break;
				}
			}
			
			if(supportedAnimationEnd === null)
				supportedAnimationEnd = false;
		}
		
		return supportedAnimationEnd;
	}
	
	this.addTransitionEndListener = function(el, callback, capture)
	{
		var evt = this.whatTransitionEnd();
		if(evt)
		{
			el.addEventListener(evt, callback, capture);
			return true;
		}
		
		return false;	
	}
	
	this.removeTransitionEndListener = function(el, callback)
	{
		var evt = this.whatTransitionEnd();
		if(evt)
		{
			el.removeEventListener(evt, callback);
			return true;
		}
		
		return false;
	}
	
	this.addAnimationEndListener = function(el, callback, capture)
	{
		var evt = this.whatAnimationEnd();
		if(evt)
		{
			el.addEventListener(evt, callback, capture);
			return true;
		}
		
		return false;	
	}
	
	this.removeAnimationEndListener = function(el, callback)
	{
		var evt = this.whatAnimationEnd();
		if(evt)
		{
			el.removeEventListener(evt, callback);
			return true;
		}
		
		return false;
	}
	
	this.elementText = function(el, text)
	{
		el.innerHTML = this.xmlEncode(text);
	}
	
	this.xmlEncode = function(text)
	{
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
	}
	
	this.enhance = function(dom_el)
	{
		if(dom_el.nodeType != 1)
			return;
			
		var childNodes = dom_el.childNodes;
		
		for(var w in this.widgets)
		{
			if(this.widgets[w] && this.widgets[w].can_enhance && this.widgets[w].can_enhance(dom_el) == true)
			{
				this.widgets[w].enhance(dom_el);
				break;
			}
		}
		
		for(var i=0;i<childNodes.length;i++)
			this.enhance(childNodes[i]);
	}
	
	this.unenhance = function(dom_el)
	{
		if(dom_el.nodeType != 1)
			return;
					
		for(var w in this.widgets)
		{
			if(this.widgets[w] && this.widgets[w].can_enhance && this.widgets[w].can_enhance(dom_el) == true)
			{
				this.widgets[w].unenhance(dom_el);
				break;
			}
		}
		
		var childNodes = dom_el.childNodes;
		for(var i=0;i<childNodes.length;i++)
			this.unenhance(childNodes[i]);
	}
	
	//Creation of built-in dialogs
	function CreateAlertDialog()
	{
		var div = document.createElement("div");
		div.id = "jcc-alert-dialog";
		div.classList.add("jcc-alert-dialog");
		
		div.dataset.role = "popup";
		div.dataset.theme = jcc.options["alert"]["theme"] ? jcc.options["alert"]["theme"] : (document.body.dataset.theme ? document.body.dataset.theme : "a");
		div.dataset.modal = "explicit";
		div.dataset.cancelable = "yes";
		div.dataset.shadow = "yes";
		div.dataset.corners = "smooth";
		div.dataset.animation = "pop";
		
		div.innerHTML = 
		'<div style="margin-bottom:10px;">' +
			'<h3 id="jcc-alert-dialog-title"></h3>' + 
			'<div data-role="delimiter" data-isotope="smooth-ends" style="margin:10px 0px;"></div>' + 
			'<span id="jcc-alert-dialog-message"></span>' +
		'</div>' +
		'<div data-role="delimiter" data-isotope="smooth-ends"></div>' + 
		'<div style="text-align:center;">' +
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-alert-dialog-button-ok"></button>' + 
				'<span id="jcc-alert-dialog-button-ok-text"></span>' +
			'</label>' + 
		'</div>';
		document.body.appendChild(div);
		
		document.getElementById("jcc-alert-dialog-button-ok").addEventListener("click", 
		function()
		{
			div.popup.hide(0);
		}, false);
		
		jcc.enhance(div);
		
		jcc.alert = function(message, title, onenddialog)
		{
			jcc.elementText(document.getElementById("jcc-alert-dialog-message"), message);
			
			title = title ? title : jcc.options["alert"]["defaultTitle"];
			jcc.elementText(document.getElementById("jcc-alert-dialog-title"), title);
			jcc.elementText(document.getElementById("jcc-alert-dialog-button-ok-text"), jcc.options["alert"]["okText"]);
			
			if(typeof onenddialog == "function")
			{
				function onHideAlertDialog(evt) 
				{
					div.removeEventListener("e-hide", onHideAlertDialog);
					onenddialog(evt.detail.result);  
				}
				div.addEventListener("e-hide", onHideAlertDialog, false);
			}
			
			div.popup.show();
			document.getElementById("jcc-alert-dialog-button-ok").focus();
		};
	}
	
	function CreateConfirmDialog()
	{
		var div = document.createElement("div");
		div.id = "jcc-confirm-dialog";
		div.classList.add("jcc-confirm-dialog");
		
		div.dataset.role = "popup";
		div.dataset.theme = jcc.options["confirm"]["theme"] ? jcc.options["confirm"]["theme"] : (document.body.dataset.theme ? document.body.dataset.theme : "a");
		div.dataset.modal = "explicit";
		div.dataset.cancelable = "yes";
		div.dataset.shadow = "yes";
		div.dataset.corners = "smooth";
		div.dataset.animation = "pop";
		
		div.innerHTML = 
		'<div style="margin-bottom:10px;">' +
			'<h3 id="jcc-confirm-dialog-title"></h3>' + 
			'<div data-role="delimiter" data-isotope="smooth-ends" style="margin:10px 0px;"></div>' + 
			'<span id="jcc-confirm-dialog-message"></span>' +
		'</div>' +
		'<div data-role="delimiter" data-isotope="smooth-ends"></div>' + 
		'<div style="text-align:center;">' +
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-confirm-dialog-button-yes"></button>' +
				'<span id="jcc-confirm-dialog-button-yes-text"></span>' +
			'</label>' + 
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-confirm-dialog-button-no"></button>' +
				'<span id="jcc-confirm-dialog-button-no-text"></span>' +
			'</label>' + 
		'</div>';
		document.body.appendChild(div);
		
		document.getElementById("jcc-confirm-dialog-button-yes").addEventListener("click", 
		function()
		{
			div.popup.hide(true);
		}, false);
		
		document.getElementById("jcc-confirm-dialog-button-no").addEventListener("click", 
		function()
		{
			div.popup.hide(false);
		}, false);
		
		jcc.enhance(div);
		
		jcc.confirm = function(message, title, onenddialog)
		{
			jcc.elementText(document.getElementById("jcc-confirm-dialog-message"), message);
			
			title = title ? title : jcc.options["confirm"]["defaultTitle"];
			jcc.elementText(document.getElementById("jcc-confirm-dialog-title"), title);
			jcc.elementText(document.getElementById("jcc-confirm-dialog-button-yes-text"), jcc.options["confirm"]["yesText"]);
			jcc.elementText(document.getElementById("jcc-confirm-dialog-button-no-text"), jcc.options["confirm"]["noText"]);
			
			if(typeof onenddialog == "function")
			{
				function onHideConfirmDialog(evt) 
				{
					div.removeEventListener("e-hide", onHideConfirmDialog);
					onenddialog(evt.detail.result);  
				}
				div.addEventListener("e-hide", onHideConfirmDialog, false);
			}
			
			div.popup.show();
			document.getElementById("jcc-confirm-dialog-button-no").focus();
		};
	}
	
	function CreatePromptDialog()
	{
		var div = document.createElement("div");
		div.id = "jcc-prompt-dialog";
		div.classList.add("jcc-prompt-dialog");
		
		div.dataset.role = "popup";
		div.dataset.theme = jcc.options["prompt"]["theme"] ? jcc.options["prompt"]["theme"] : (document.body.dataset.theme ? document.body.dataset.theme : "a");
		div.dataset.modal = "explicit";
		div.dataset.cancelable = "yes";
		div.dataset.shadow = "yes";
		div.dataset.corners = "smooth";
		div.dataset.animation = "pop";
		div.dataset.cancelValue = "cancel";
		
		div.innerHTML = 
		'<div style="margin-bottom:10px;">' +
			'<h3 id="jcc-prompt-dialog-title"></h3>' + 
			'<div data-role="delimiter" data-isotope="smooth-ends" style="margin:10px 0px;"></div>' + 
			'<span id="jcc-prompt-dialog-message"></span>' +
			'<br/>' + 
			'<div data-role="inputfield" style="margin-top:10px;">' +
				'<input id="jcc-prompt-dialog-input" type="text" value=""/>' +
				'<div></div>' +
			'</div>' +
		'</div>' +
		'<div data-role="delimiter" data-isotope="smooth-ends"></div>' + 
		'<div style="text-align:center;">' +
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-prompt-dialog-button-ok"></button>' +
				'<span id="jcc-prompt-dialog-button-ok-text"></span>' +
			'</label>' + 
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-prompt-dialog-button-cancel"></button>' +
				'<span id="jcc-prompt-dialog-button-cancel-text"></span>' +
			'</label>' + 
		'</div>';
		document.body.appendChild(div);
		
		document.getElementById("jcc-prompt-dialog-button-ok").addEventListener("click", 
		function()
		{
			div.popup.hide(document.getElementById("jcc-prompt-dialog-input").value);
		}, false);
		
		document.getElementById("jcc-prompt-dialog-button-cancel").addEventListener("click", 
		function()
		{
			div.popup.hide(div.dataset.cancelValue);
		}, false);
		
		jcc.enhance(div);
		
		jcc.prompt = function(message, title, onenddialog, cancelValue)
		{
			if(cancelValue == undefined)
				cancelValue = "cancel";
				
			div.dataset.cancelValue = cancelValue;
				
			document.getElementById("jcc-prompt-dialog-input").value = "";
			
			jcc.elementText(document.getElementById("jcc-prompt-dialog-message"), message);
			
			title = title ? title : jcc.options["prompt"]["defaultTitle"];
			jcc.elementText(document.getElementById("jcc-prompt-dialog-title"), title);
			jcc.elementText(document.getElementById("jcc-prompt-dialog-button-ok-text"), jcc.options["prompt"]["okText"]);
			jcc.elementText(document.getElementById("jcc-prompt-dialog-button-cancel-text"), jcc.options["prompt"]["cancelText"]);
			
			if(typeof onenddialog == "function")
			{
				function onHidePromptDialog(evt) 
				{
					div.removeEventListener("e-hide", onHidePromptDialog);
					onenddialog(evt.detail.result);  
				}
				div.addEventListener("e-hide", onHidePromptDialog, false);
			}
			
			div.popup.show();
			document.getElementById("jcc-prompt-dialog-input").focus();
		};
	}
	
	function CreateDatetimeDialog()
	{
		var theme = jcc.options["datetime"]["theme"] ? jcc.options["datetime"]["theme"] : (document.body.dataset.theme ? document.body.dataset.theme : "a");
		
		var div = document.createElement("div");
		div.id = "jcc-datetime-dialog";
		div.classList.add("jcc-datetime-dialog-" + theme);
		
		div.dataset.role = "popup";
		div.dataset.theme = theme;
		div.dataset.modal = "explicit";
		div.dataset.cancelable = "yes";
		div.dataset.shadow = "yes";
		div.dataset.corners = "smooth";
		div.dataset.animation = "pop";
		
		div.innerHTML = 
		'<div id="jcc-datetime-dialog-calendar" style="width:100%">' +
			'<div class="jcc-datetime-dialog-header" style="position:relative; width:100%; height:20px; line-height:20px; border-radius:4px; text-align:center;">' +
				'<div id="jcc-datetime-dialog-bw" data-role="triangle" data-direction="left" data-solid="yes" style="position:absolute; left:0px; top:0px;"></div>' + 
				'<h4 id="jcc-datetime-dialog-month-year" style="vertical-align:middle;margin:0;"></h4>' + 
				'<div id="jcc-datetime-dialog-fw" data-role="triangle" data-direction="right" data-solid="yes" style="position:absolute; right:0px; top:0px;"></div>' + 
			'</div>' +
			
			'<div style="width:100%; text-align:center; margin-top:4px;">' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-0"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-1"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-2"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-3"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-4"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-5"></div></div>' +
				'<div class="weekDay"><div class="inset" id="jcc-datetime-dialog-day-6"></div></div>' +
				
				'<div id="jcc-datetime-dialog-days" style="width:100%;"></div>' +
			'</div>' +
		'</div>' +
		'<div id="jcc-datetime-dialog-timeselect" style="width:100%;">' +
			'<div style="width:100%; text-align:center;">' +
				
				'<div data-role="dropdown" style="width:75px; border: none;">' +
					'<select id="jcc-datetime-dialog-hour">' +
					'</select>' +
					'<div></div>' +
				'</div>' +
				
				'<div style="width:20px; text-align:center; font-size:16px; font-weight:bold; display:inline-block;">:</div>' +
				
				'<div data-role="dropdown" style="width:75px; border:none;">' +
					'<select id="jcc-datetime-dialog-minute">' +
					'</select>' +
					'<div></div>' +
				'</div>' +
			
			'</div>' +
		'</div>' +
		'<div data-role="delimiter" data-isotope="smooth-ends"></div>' + 
		'<div style="text-align:center;">' +
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:33%;">' +
				'<button id="jcc-datetime-dialog-button-ok"></button>' +
				'<span id="jcc-datetime-dialog-button-ok-text"></span>' +
			'</label>' + 
			'<label data-role="button" data-isotope="quiet" data-action="yes" style="margin:1px 0px; width:33%;">' +
				'<button id="jcc-datetime-dialog-button-now"></button>' +
				'<span id="jcc-datetime-dialog-button-now-text"></span>' +
			'</label>' + 
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:33%;">' +
				'<button id="jcc-datetime-dialog-button-cancel"></button>' +
				'<span id="jcc-datetime-dialog-button-cancel-text"></span>' +
			'</label>' + 
		'</div>';
		document.body.appendChild(div);
		
		document.getElementById("jcc-datetime-dialog-button-cancel").addEventListener("click", 
		function()
		{
			div.popup.hide(0);
		}, false);
		
		var hours = document.getElementById("jcc-datetime-dialog-hour");
		for(var i=0;i<24;i++)
		{
			var option = document.createElement("option");
			var value = i < 10 ? ("0" + i.toString()) : i.toString();
			option.value = value;
			hours.add(option);
		}
		var minutes = document.getElementById("jcc-datetime-dialog-minute");
		for(var i=0;i<60;i++)
		{
			var option = document.createElement("option");
			var value = i < 10 ? ("0" + i.toString()) : i.toString();
			option.value = value;
			minutes.add(option);
		}
		
		jcc.enhance(div);
		
		jcc.datetime = function(input, mode, onenddialog)
		{
			var hoursOptions = hours.querySelectorAll("option");
			for(var i=0;i<hoursOptions.length;i++)
			{
				var option = hoursOptions[i];
				var value = i < 10 ? ("0" + i.toString()) : i.toString();
				option.text = value + " " + jcc.options["datetime"]["hourText"];
			}
			var minutesOptions = minutes.querySelectorAll("option");
			for(var i=0;i<minutesOptions.length;i++)
			{
				var option = minutesOptions[i];
				var value = i < 10 ? ("0" + i.toString()) : i.toString();
				option.text = value + " " + jcc.options["datetime"]["minuteText"];
			}
		
			jcc.elementText(document.getElementById("jcc-datetime-dialog-button-ok-text"), jcc.options["datetime"]["okText"]);
			jcc.elementText(document.getElementById("jcc-datetime-dialog-button-now-text"), jcc.options["datetime"]["nowText"]);
			jcc.elementText(document.getElementById("jcc-datetime-dialog-button-cancel-text"), jcc.options["datetime"]["cancelText"]);
			for(var i=0;i<7;i++)
				jcc.elementText(document.getElementById("jcc-datetime-dialog-day-" + i), jcc.options["datetime"]["weekDays"][i]);
				
			function parseField()
			{
				var sValue = input.value;
				var oDate = new Date();
				oDate.setDate(1);
				
				if(mode & jcc.options["datetime"].DIALOG_MODE.DATE)
				{
					var nYear = parseInt(sValue.substr(0, 4), 10);
					if(!isNaN(nYear))
					{
						nYear = nYear < 1970 ? 1970 : nYear;
						oDate.setFullYear(nYear);
					}
					
					var nMonth = parseInt(sValue.substr(5, 2), 10);
					if(!isNaN(nMonth))
					{
						nMonth--;
						
						nMonth = nMonth < 0 ? 0 : nMonth;
						nMonth = nMonth > 11 ? 11 : nMonth;
						
						oDate.setMonth(nMonth);
					}
					
					var nDay = parseInt(sValue.substr(8, 2), 10);
					if(!isNaN(nDay))
					{
						var nDaysFeb = oDate.getFullYear() % 4 == 0 ? 29 : 28;
						var aDays = [31, nDaysFeb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
						var nMaxDay = aDays[oDate.getMonth()];
						nDay = nDay < 1 ? 1 : nDay;
						nDay = nDay > nMaxDay ? nMaxDay : nDay;
						
						oDate.setDate(nDay);
					}
				}

				if(mode & jcc.options["datetime"].DIALOG_MODE.TIME)
				{
					var idx = 0;
					if(mode & jcc.options["datetime"].DIALOG_MODE.DATE)
						idx = 11;
						
					var nHours = parseInt(sValue.substr(idx, 2), 10);
					if(!isNaN(nHours))
					{
						nHours = nHours < 0 ? 0 : nHours;
						nHours = nHours > 23 ? 23 : nHours;
						
						oDate.setHours(nHours);
					}
					
					var nMinutes = parseInt(sValue.substr(idx+3, "mm".length), 10);
					if(!isNaN(nMinutes))
					{
						nMinutes = nMinutes < 0 ? 0 : nMinutes;
						nMinutes = nMinutes > 59 ? 59 : nMinutes;
						
						oDate.setMinutes(nMinutes);
					}
				}
				
				return oDate;
			}
			
			var currentDateTime = parseField();
				
			hours.onchange = function() { currentDateTime.setHours(this.selectedIndex); };
			minutes.onchange = function() { currentDateTime.setMinutes(this.selectedIndex); };
			
			function onOk()
			{
				updateField();
				div.popup.hide(currentDateTime);
				document.getElementById("jcc-datetime-dialog-button-ok").removeEventListener("click", onOk);
			}
			
			function onNow()
			{
				setDateTime(new Date());
				document.getElementById("jcc-datetime-dialog-button-now").removeEventListener("click", onOk);
			}
			
			function updateField()
			{
				var month = currentDateTime.getMonth() + 1;
				month = month < 10 ? ("0" + month) : month.toString();
				
				var date = currentDateTime.getDate();
				date = date < 10 ? ("0" + date) : date.toString();
				
				var hours = currentDateTime.getHours();
				hours = hours < 10 ? ("0" + hours) : hours.toString();
				
				var minutes = currentDateTime.getMinutes();
				minutes = minutes < 10 ? ("0" + minutes) : minutes.toString();
				
				var value = "";
				if(mode & jcc.options["datetime"].DIALOG_MODE.DATE)
					value += currentDateTime.getFullYear() + "-" + month + "-" + date;
				if(mode & jcc.options["datetime"].DIALOG_MODE.DATE && mode & jcc.options["datetime"].DIALOG_MODE.TIME)
					value += " ";
				if(mode & jcc.options["datetime"].DIALOG_MODE.TIME)
					value += hours + ":" + minutes;
				
				input.value = value;
			}
			
			function setDateTime(oDate)
			{
				currentDateTime = oDate;
				
				if(mode & jcc.options["datetime"].DIALOG_MODE.TIME)
				{
					hours.selectedIndex = currentDateTime.getHours();
					minutes.selectedIndex = currentDateTime.getMinutes();
				}
				
				if(mode & jcc.options["datetime"].DIALOG_MODE.DATE)
				{
					document.getElementById("jcc-datetime-dialog-month-year").innerHTML = 
						jcc.xmlEncode(jcc.options["datetime"]["months"][currentDateTime.getMonth()]) + ", " + currentDateTime.getFullYear();
					
					var now = new Date();
					
					var tempDate = new Date();
					tempDate.setFullYear(currentDateTime.getFullYear());
					tempDate.setDate(1);
					tempDate.setMonth(currentDateTime.getMonth());
					var nDaysFeb = tempDate.getFullYear() % 4 == 0 ? 29 : 28;
					var aDays = [31, nDaysFeb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
					var nDays = aDays[tempDate.getMonth()];
					
					var daysDiv = document.getElementById("jcc-datetime-dialog-days");
					daysDiv.innerHTML = "";
					
					var nPadding = tempDate.getDay();
					for(var i=0;i<nPadding;i++)
					{
						var padDiv = document.createElement("div");
						padDiv.className = "day";
						daysDiv.appendChild(padDiv);
					}
						
					for(var i=0;i<nDays;i++)
					{
						var day = (i+1);
						
						tempDate.setDate(day);
						
						var oContainer = document.createElement("div");
						oContainer.className = "day";
						
						var dayDiv = document.createElement("div");
						dayDiv.dataset.day = day;
						oContainer.appendChild(dayDiv);
						
						dayDiv.onmousedown = function()
						{
							var oNew = new Date();
							oNew.setDate(1);
							oNew.setFullYear(currentDateTime.getFullYear());
							oNew.setMonth(currentDateTime.getMonth());
							oNew.setDate(this.dataset.day);
							oNew.setHours(currentDateTime.getHours());
							oNew.setMinutes(currentDateTime.getMinutes());
							
							setDateTime(oNew);
						};
						
						var className = "inset";
						if(currentDateTime.getDate() == tempDate.getDate())
							className += " selected";
						else
							className += " selectable";
							
						if(now.getFullYear() == tempDate.getFullYear() && 
							now.getMonth() == tempDate.getMonth() &&
							now.getDate() == tempDate.getDate())
						{
							className += " now";
						}
						dayDiv.className = className;
						dayDiv.innerHTML = day;
						
						daysDiv.appendChild(oContainer);
					}
					
					nPadding = (nPadding + nDays) % 7 ? 7 - (nPadding + nDays) % 7 : 0;
					for(var i=0;i<nPadding;i++)
					{
						var padDiv = document.createElement("div");
						padDiv.className = "day";
						daysDiv.appendChild(padDiv);
					}
				}
			}
			
			document.getElementById("jcc-datetime-dialog-button-ok").addEventListener("click", onOk, false);
			document.getElementById("jcc-datetime-dialog-button-now").addEventListener("click", onNow, false);
			
			var calendar = document.getElementById("jcc-datetime-dialog-calendar");
			if(mode & jcc.options["datetime"].DIALOG_MODE.DATE)
			{
				calendar.style.display = "";
				
				if(mode & jcc.options["datetime"].DIALOG_MODE.TIME)
					calendar.style.marginBottom = "0px";
				else
					calendar.style.marginBottom = "5px";
					
				document.getElementById("jcc-datetime-dialog-bw").onmousedown = 
				function()
				{
					var nYear = currentDateTime.getFullYear();
					var nMonth = currentDateTime.getMonth() - 1;
					if(nMonth < 0)
					{
						nMonth = 11;
						nYear--;
						if(nYear < 1970)
							nYear = 1970;
					}
					
					var oNew = new Date();
					oNew.setFullYear(nYear);
					oNew.setMonth(nMonth, 1);
					oNew.setHours(currentDateTime.getHours());
					oNew.setMinutes(currentDateTime.getMinutes());
					
					setDateTime(oNew);
				};
				
				document.getElementById("jcc-datetime-dialog-fw").onmousedown = 
				function()
				{
					var nYear = currentDateTime.getFullYear();
					var nMonth = currentDateTime.getMonth() + 1;
					if(nMonth > 11)
					{
						nMonth = 0;
						nYear++;
					}
					
					var oNew = new Date();
					oNew.setFullYear(nYear);
					oNew.setMonth(nMonth, 1);
					oNew.setHours(currentDateTime.getHours());
					oNew.setMinutes(currentDateTime.getMinutes());
					
					setDateTime(oNew);
				};
			}
			else
			{
				calendar.style.display = "none";
			}
			
			var timeselect = document.getElementById("jcc-datetime-dialog-timeselect");
			if(mode & jcc.options["datetime"].DIALOG_MODE.TIME)
				timeselect.style.display = "";
			else
				timeselect.style.display = "none";
				
			if(typeof onenddialog == "function")
			{
				function onHideDatetimeDialog(evt) 
				{
					div.removeEventListener("e-hide", onHideDatetimeDialog);
					onenddialog(evt.detail.result);  
				}
				div.addEventListener("e-hide", onHideDatetimeDialog, false);
			}
			
			setDateTime(currentDateTime);
			div.popup.show();
			document.getElementById("jcc-datetime-dialog-button-now").focus();
		};
	}
	
	function CreateColorPickerDialog()
	{
		var div = document.createElement("div");
		div.id = "jcc-colorpicker-dialog";
		div.classList.add("jcc-colorpicker-dialog");
		
		div.dataset.role = "popup";
		div.dataset.theme = jcc.options["colorpicker"]["theme"] ? jcc.options["colorpicker"]["theme"] : (document.body.dataset.theme ? document.body.dataset.theme : "a");
		div.dataset.modal = "explicit";
		div.dataset.cancelable = "yes";
		div.dataset.shadow = "yes";
		div.dataset.corners = "smooth";
		div.dataset.animation = "pop";
		
		div.innerHTML = 
		'<div class="contents">' +
		
			'<div class="hue-saturation-container">' +
				'<div class="hue-saturation">' +
					'<canvas id="jcc-colorpicker-dialog-hs-canvas" width="252" height="145"></canvas>' + 
					'<div id="jcc-colorpicker-dialog-hs-picker" class="picker">' +
						'<div class="move-handle" data-role="dragon" data-rect-constraint="left:-13 right:-13 top:-13 bottom:-13" data-parent-pointer-anchor="13 13">' +
							'<div class="ho"></div><div class="vo"></div>' +
							'<div class="hi"></div><div class="vi"></div>' +
						'</div>' + 
					'</div>' + 
				'</div>' +
			'</div>' +
			
			'<div class="lightness-container">' +
				'<div class="lightness">' +
					'<canvas id="jcc-colorpicker-dialog-lightness-canvas" width="26" height="145"></canvas>' + 
					'<div id="jcc-colorpicker-dialog-lightness-picker" class="picker">' +
						'<div class="move-handle" data-role="dragon" data-directions="v" data-rect-constraint="top:-5 bottom:-5" data-parent-pointer-anchor="5 5">' +
							'<div class="middle">' + 
								'<div class="window"></div>' +
							'</div>' +
						'</div>' + 
					'</div>' + 
				'</div>' +
			'</div>' +
			
			'<div class="alpha-container">' +
				'<div class="alpha">' +
					'<canvas id="jcc-colorpicker-dialog-alpha-canvas" width="292" height="26"></canvas>' + 
					'<div id="jcc-colorpicker-dialog-alpha-picker" class="picker">' +
						'<div class="move-handle" data-role="dragon" data-directions="h" data-rect-constraint="left:-5 right:-5" data-parent-pointer-anchor="5 5">' +
							'<div class="middle">' + 
								'<div class="window"></div>' +
							'</div>' +
						'</div>' + 
					'</div>' + 
				'</div>' +
			'</div>' +
			
		'</div>' +
		'<div data-role="delimiter" data-isotope="smooth-ends"></div>' + 
		'<div style="text-align:center; padding:0;">' +
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-colorpicker-dialog-button-ok"></button>' +
				'<span id="jcc-colorpicker-dialog-button-ok-text"></span>' +
			'</label>' + 
			'<label data-role="button" data-isotope="contrast-quiet" style="margin:1px 0px; width:50%;">' +
				'<button id="jcc-colorpicker-dialog-button-cancel"></button>' +
				'<span id="jcc-colorpicker-dialog-button-cancel-text"></span>' +
			'</label>' + 
		'</div>';
		document.body.appendChild(div);
		
		var hs_picker = document.getElementById("jcc-colorpicker-dialog-hs-picker");
		hs_picker.style.left = "-13px";
		hs_picker.style.top = "-13px";

		var l_picker = document.getElementById("jcc-colorpicker-dialog-lightness-picker");
		l_picker.style.top = "-5px";
		
		var a_picker = document.getElementById("jcc-colorpicker-dialog-alpha-picker");
		a_picker.style.left = "-5px";
		
		var hs_canvas = document.getElementById("jcc-colorpicker-dialog-hs-canvas");
		var hs_context = hs_canvas.getContext("2d");
		
		var h_step = 360 / hs_canvas.width;
		var s_step = 100 / hs_canvas.height;
		
		var h_gradient = hs_context.createLinearGradient(0, 0, hs_canvas.width, 0);
		h_gradient.addColorStop(0 / 6, "#f00");
		h_gradient.addColorStop(1 / 6, "#ff0");
		h_gradient.addColorStop(2 / 6, "#0f0");
		h_gradient.addColorStop(3 / 6, "#0ff");
		h_gradient.addColorStop(4 / 6, "#00f");
		h_gradient.addColorStop(5 / 6, "#f0f");
		h_gradient.addColorStop(6 / 6, "#f00");
		
		var s_gradient = hs_context.createLinearGradient(0, 0, 0, hs_canvas.height);
		s_gradient.addColorStop(0, "rgba(255,255,255,0)");
		s_gradient.addColorStop(1, "rgba(255,255,255,1)");

		hs_context.fillStyle = h_gradient;
		hs_context.fillRect(0, 0, hs_canvas.width, hs_canvas.height);
		
		hs_context.fillStyle = s_gradient;
		hs_context.fillRect(0, 0, hs_canvas.width, hs_canvas.height);
		
		var l_canvas = document.getElementById("jcc-colorpicker-dialog-lightness-canvas");
		var l_context = l_canvas.getContext("2d");
		var l_step = 100 / l_canvas.height;
		
		var a_canvas = document.getElementById("jcc-colorpicker-dialog-alpha-canvas");
		var a_context = a_canvas.getContext("2d");
		var a_step = 1.0 / a_canvas.width;
		
		var control_element = null;
		var currentColor = [0,0,0,1];
		var color_mode;
		
		function hsl_rgb(h, s, l) 
		{
			var u = 255 * (l / 100);

			h /= 60;
			s /= 100;

			var i = Math.floor(h);
			var f = i%2 ? h-i : 1-(h-i);
			var m = u * (1 - s);
			var n = u * (1 - s * f);
			
			u = Math.round(u);
			m = Math.round(m);
			n = Math.round(n);
			
			switch (i) 
			{
				case 6:
				case 0: return [u,n,m];
				case 1: return [n,u,m];
				case 2: return [m,u,n];
				case 3: return [m,n,u];
				case 4: return [n,m,u];
				case 5: return [u,m,n];
			}
		}
		
		function rgb_hsl(r, g, b)
		{
			r /= 255;
			g /= 255;
			b /= 255;
			
			var n = Math.min(Math.min(r, g), b);
			var v = Math.max(Math.max(r, g), b);
			var m = v - n;
			
			if (m === 0) 
				return [ 0, 0, 100 * v ];
				
			var h = r === n ? (3 + (b - g) / m) : ( g === n ? (5 + (r - b) / m) : (1 + (g - r) / m) );
			return [60 * (h === 6 ? 0 : h),	100 * (m / v), 100 * v];
		}
		
		function rgb_hex_text(rgb)
		{
			return "#" + (0x100 | rgb[0]).toString(16).substr(1) + (0x100 | rgb[1]).toString(16).substr(1) + (0x100 | rgb[2]).toString(16).substr(1);
		}
		
		function rgb_rgb_text(rgb)
		{
			return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
		}
		
		function rgba_rgba_text(rgba)
		{
			var a = (rgba[3].toString().length > 4 ? rgba[3].toFixed(2) : rgba[3]).toString();
			if(a.charAt(a.length - 1) == "0" && a.length > 1)
				a = a.substr(0, a.length-1);
				
			return "rgba(" + rgba[0] + "," + rgba[1] + "," + rgba[2] + "," + a + ")";
		}
		
		function adjustLightnessColor()
		{
			var x = parseInt(hs_picker.style.left) + 13;
			var y = parseInt(hs_picker.style.top) + 13;
			
			var h = x * h_step;
			var s = 100 - y * s_step;
			
			var color1 = hsl_rgb(h, s, 100);
			var color2 = hsl_rgb(h, s, 0);
			
			var l_gradient = l_context.createLinearGradient(0, 0, 0, l_canvas.height);
			l_gradient.addColorStop(0, rgb_rgb_text(color1));
			l_gradient.addColorStop(1, rgb_rgb_text(color2));
			
			l_context.fillStyle = l_gradient;
			l_context.fillRect(0, 0, l_canvas.width, l_canvas.height);
		}
		
		function adjustCurrentColor()
		{
			var x = parseInt(hs_picker.style.left) + 13;
			var y = parseInt(hs_picker.style.top) + 13;
			
			var h = x * h_step;
			var s = 100 - y * s_step;
			
			y = parseInt(l_picker.style.top) + 5;
			var l = 100 - y * l_step;
			
			var rgb = hsl_rgb(h, s, l);
			
			currentColor[0] = rgb[0];
			currentColor[1] = rgb[1];
			currentColor[2] = rgb[2];
		}
		
		function adjustAlpha()
		{
			a_picker.style.display = color_mode == jcc.options["colorpicker"].COLOR_FORMAT.RGBA ? "" : "none";
			
			var rgba1 = [currentColor[0],currentColor[1],currentColor[2],1];
			var rgba2 = [currentColor[0],currentColor[1],currentColor[2], color_mode == jcc.options["colorpicker"].COLOR_FORMAT.RGBA ? 0 : 1];
			
			var a_gradient = a_context.createLinearGradient(0, 0, a_canvas.width, 0);
			a_gradient.addColorStop(0, rgba_rgba_text(rgba1));
			a_gradient.addColorStop(1, rgba_rgba_text(rgba2));
			
			a_context.clearRect(0, 0, a_canvas.width, a_canvas.height);

			a_context.fillStyle = a_gradient;
			a_context.fillRect(0, 0, a_canvas.width, a_canvas.height);
		}
		
		hs_picker.addEventListener("e-drag", 
		function()
		{
			adjustLightnessColor();
			adjustCurrentColor();
			adjustAlpha();
		}, false);
		
		l_picker.addEventListener("e-drag", 
		function()
		{
			adjustCurrentColor();
			adjustAlpha();
		}, false);
		
		a_picker.addEventListener("e-drag", 
		function()
		{
			var x = parseInt(a_picker.style.left) + 5;
			currentColor[3] = 1.0 - x * a_step;	
		}, false);
		
		document.getElementById("jcc-colorpicker-dialog-button-ok").addEventListener("click", 
		function()
		{
			var result;
			if(color_mode == jcc.options["colorpicker"].COLOR_FORMAT.RGB)
				result = rgb_rgb_text(currentColor);
			else if(color_mode == jcc.options["colorpicker"].COLOR_FORMAT.RGBA)
				result = rgba_rgba_text(currentColor);
			else //if(color_mode == jcc.options["colorpicker"].COLOR_FORMAT.HEX)
				result = rgb_hex_text(currentColor);
				
			if(control_element)
			{
				control_element.style.backgroundColor = result;
				
				if(control_element.type)
				{
					control_element.style.color = result;
					control_element.value = result;
				}
			}
			
			div.popup.hide(result);
		}, false);
		
		document.getElementById("jcc-colorpicker-dialog-button-cancel").addEventListener("click", 
		function()
		{
			div.popup.hide(0);
		}, false);
		
		jcc.enhance(div);
		
		function importColor()
		{
			currentColor = [0,0,0,1];
			
			var parsed = false;
			if(control_element)
			{
				var str_col = control_element.type ? control_element.value : control_element.style.backgroundColor;
				if(str_col && str_col.length > 0)
				{
					str_col = str_col.toLowerCase().replace(/\s/g, "");
					
					var m;
					
					if(m = str_col.match(/^#([a-f0-9]{3})$/))
						str_col = "#" + m[1].charAt(0) + m[1].charAt(0) + m[1].charAt(1) + m[1].charAt(1) + m[1].charAt(2) + m[1].charAt(2);
					
					if(m = str_col.match(/^#([a-f0-9]{6})$/))
					{
						currentColor[0] = parseInt(m[1].substr(0, 2), 16);
						currentColor[1] = parseInt(m[1].substr(2, 2), 16);
						currentColor[2] = parseInt(m[1].substr(4, 2), 16);
						
						parsed = true;
					}
					else if(m = str_col.match(/^rgba?\(([^)]*)\)$/))
					{
						if(m[1].length > 0)
						{
							var components = m[1].split(",");
							
							if(components.length == 3 || components.length == 4)
							{
								currentColor[0] = parseInt(components[0]);
								currentColor[1] = parseInt(components[1]);
								currentColor[2] = parseInt(components[2]);
								
								if(components.length == 4)
									currentColor[3] = parseFloat(components[3]);
									
								if(!isNaN(currentColor[0]) &&
									!isNaN(currentColor[1]) &&
									!isNaN(currentColor[2]) &&
									!isNaN(currentColor[3]))
								{
									currentColor[0] = currentColor[0] < 0 ? currentColor[0] : (currentColor[0] > 255 ? 255 : currentColor[0]);
									currentColor[1] = currentColor[1] < 0 ? currentColor[1] : (currentColor[1] > 255 ? 255 : currentColor[1]);
									currentColor[2] = currentColor[2] < 0 ? currentColor[2] : (currentColor[2] > 255 ? 255 : currentColor[2]);
									currentColor[3] = currentColor[3] < 0 ? currentColor[3] : (currentColor[3] > 1 ? 1 : currentColor[3]);
									
									parsed = true;
								}
							}
						}
					}
				}
			}
			
			if(!parsed)
				currentColor = [0,0,0,1];
				
			var hsl = rgb_hsl(currentColor[0], currentColor[1], currentColor[2]);
			
			var x = Math.round(hsl[0] / h_step) - 13;
			var y = Math.round((100 - hsl[1]) / s_step) - 13;
			
			hs_picker.style.left = x + "px";
			hs_picker.style.top = y + "px";
			
			adjustLightnessColor();
		
			y = Math.round((100 - hsl[2]) / l_step) - 5;
			l_picker.style.top = y + "px";
			
			adjustAlpha();
			
			if(color_mode == jcc.options["colorpicker"].COLOR_FORMAT.RGBA)
			{	
				x = Math.round((1.0 - currentColor[3]) / a_step) - 5;
				a_picker.style.left = x + "px";
			}
		}
		
		jcc.colorpicker = function(element, mode, onenddialog)
		{
			jcc.elementText(document.getElementById("jcc-colorpicker-dialog-button-ok-text"), jcc.options["colorpicker"]["okText"]);
			jcc.elementText(document.getElementById("jcc-colorpicker-dialog-button-cancel-text"), jcc.options["colorpicker"]["cancelText"]);
			
			var orig_color = jcc.getComputedStyle(element, "color");
			var orig_bg = jcc.getComputedStyle(element, "background-color");
			
			control_element = element;
			color_mode = mode;
			
			if(typeof onenddialog == "function")
			{
				function onHideColorpickerDialog(evt) 
				{
					div.removeEventListener("e-hide", onHideColorpickerDialog);
					onenddialog(evt.detail.result);  
				}
				div.addEventListener("e-hide", onHideColorpickerDialog, false);
			}
			
			div.popup.show();
			document.getElementById("jcc-colorpicker-dialog-button-cancel").focus();
			
			importColor();
		};
	}
	
	this.init = function(domNode)
	{
		CreateAlertDialog();
		CreateConfirmDialog();
		CreatePromptDialog();
		CreateDatetimeDialog();
		CreateColorPickerDialog();
		
		if(domNode)
			this.enhance(domNode);
		
		hashchangeMonitor();
	}
	
	this.sortedPrimitiveArray = function(array, sortNow)
	{
		array.findInsertPos = function(element)
		{
			if(this.length == 0) 
				return 0;
				
			var fisrt = 0;
			var last = this.length - 1;
			var mid;
			
			//Check the first and the last element
			if(this[fisrt] >= element)
			{
				if(this[fisrt] == element)
					return -1; 
				else 
					return fisrt;
			}
			
			if(this[last] <= element) 
			{
				if(this[last] == element)	
					return -1; 
				else 
					return last+1;
			}
			
			//Perform search
			while(true)
			{
				if(last - fisrt <= 1)	
					return last;
					
				mid = fisrt + Math.floor((last-fisrt)/2);
				
				if(this[mid] < element) 
					fisrt = mid;
				else if(this[mid] == element) 
					return -1;
				else 
					last = mid;
			}
		}
		
		array.findIndex = function(element)
		{
			if(this.length <= 0) 
				return -1;
			
			var fisrt = 0;
			var last = this.length - 1;
			var mid;
			
			//Check the first and the last element
			if(this[fisrt] >= element)
			{
				if(this[fisrt] == element) 
					return fisrt;
				
				return -1;
			}
			if(this[last] <= element)
			{
				if(this[last] == element) 
					return last;
				
				return -1;
			}
			
			//Perform search
			while(true)
			{
				if(last-fisrt <= 1) 
					return -1; // Not found

				mid = fisrt + Math.floor((last-fisrt)/2);

				if(this[mid] < element) 
					fisrt = mid;
				else if(this[mid] == element) 
					return mid;
				else 
					last = mid;
			}
		}
		
		array.add = function(element)
		{
			var insertIndex = this.findInsertPos(element);
			if(insertIndex > -1)
				this.splice(insertIndex, 0, element);
			
			return insertIndex;
		}
		
		array.remove = function(element)
		{
			var removeIndex = this.findIndex(element);
			if(removeIndex > -1)
				this.splice(removeIndex, 1);
				
			return removeIndex;
		}

		if(sortNow)
		{
			array.sort(function(a,b) {return a==b ? 0 : a<b ? -1 : 1});
		}
	}
	
	this.sortedArray = function(array, sortValueName, sortNow, descending)
	{
		if(!descending)
			descending = false;
		else
			descending = true;

		if(descending)
		{
			array.findInsertPosition = function(item)
			{
				if(this.length <= 0) 
					return 0;

				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first and the last item
				if(this[firstIndex][sortValueName] <= item[sortValueName]) 
					return firstIndex;
				if(this[lastIndex][sortValueName] >= item[sortValueName]) 
					return lastIndex + 1;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1) 
						return lastIndex;

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][sortValueName] > item[sortValueName]) 
						firstIndex = midIndex;
					else if(this[midIndex][sortValueName] == item[sortValueName]) 
						return midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		else
		{
			array.findInsertPosition = function(item)
			{
				if(this.length <= 0) 
					return 0;

				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first and the last item
				if(this[firstIndex][sortValueName] >= item[sortValueName]) 
					return firstIndex;
				if(this[lastIndex][sortValueName] <= item[sortValueName]) 
					return lastIndex+1;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1) 
						return lastIndex;

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][sortValueName] < item[sortValueName]) 
						firstIndex = midIndex;
					else if(this[midIndex][sortValueName] == item[sortValueName]) 
						return midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		
		if(descending) 
		{
			array.findIndexBySortValue = function(sortValue)
			{
				if(this.length <= 0) 
					return -1;
				
				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first item
				if(this[firstIndex][sortValueName] < sortValue) 
					return -1;
				if(this[firstIndex][sortValueName] == sortValue) 
					return firstIndex;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1)
					{
						if(this[firstIndex][sortValueName] == sortValue) 
							return firstIndex;
						else if(this[lastIndex][sortValueName] == sortValue) 
							return lastIndex;
						else 
							return -1; // Not found
					}

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][sortValueName] > sortValue) 
						firstIndex = midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		else
		{
			array.findIndexBySortValue = function(sortValue)
			{
				if(this.length <= 0) 
					return -1;
				
				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first item
				if(this[firstIndex][sortValueName] > sortValue) 
					return -1;
				if(this[firstIndex][sortValueName] == sortValue) 
					return firstIndex;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1)
					{
						if(this[firstIndex][sortValueName] == sortValue) 
							return firstIndex;
						else if(this[lastIndex][sortValueName] == sortValue) 
							return lastIndex;
						else 
							return -1; //Not found
					}

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][sortValueName] < sortValue) 
						firstIndex = midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		
		array.findIndex = function(item)
		{
			return this.findIndexBySortValue(item[sortValueName]);
		}

		array.findIndexCompare = function(item, cmpFunc)
		{
			var firstIndex = this.findIndexBySortValue(item[sortValueName]);
			if(firstIndex > -1)
			{
				for(;firstIndex<this.length && this[firstIndex][sortValueName] == item[sortValueName]; firstIndex++)
				{
					if(cmpFunc(item, this[firstIndex]))
						return firstIndex;
				}
			}
			
			return -1;
		}

		array.add = function(item)
		{
			var insertIndex = this.findInsertPosition(item);
			if(insertIndex > -1)
				this.splice(insertIndex, 0, item);
				
			return insertIndex;
		}

		array.remove = function(item, cmpFunc)
		{
			var removeIndex = typeof(cmpFunc) == 'function' ? array.findIndexCompare(item, cmpFunc) : array.findIndex(item);
			if(removeIndex > -1)
				this.splice(removeIndex, 1);
				
			return removeIndex;
		}

		if(sortNow)
		{
			if(descending)
				array.sort( function(a,b) {return a[sortValueName] == b[sortValueName] ? 0 : a[sortValueName] < b[sortValueName] ? 1 : -1});
			else
				array.sort( function(a,b) {return a[sortValueName] == b[sortValueName] ? 0 : a[sortValueName] < b[sortValueName] ? -1 : 1});
		}
	}
	
	this.sortedSubfieldArray = function(array, subfieldName, sortValueName, sortNow, descending)
	{
		if(!descending)
			descending = false;
		else
			descending = true;

		if(descending)
		{
			array.findInsertPosition = function(item)
			{
				if(this.length <= 0) 
					return 0;

				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first and the last item
				if(this[firstIndex][subfieldName][sortValueName] <= item[subfieldName][sortValueName]) 
					return firstIndex;
				if(this[lastIndex][subfieldName][sortValueName] >= item[subfieldName][sortValueName]) 
					return lastIndex + 1;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1) 
						return lastIndex;

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][subfieldName][sortValueName] > item[subfieldName][sortValueName]) 
						firstIndex = midIndex;
					else if(this[midIndex][subfieldName][sortValueName] == item[subfieldName][sortValueName]) 
						return midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		else
		{
			array.findInsertPosition = function(item)
			{
				if(this.length <= 0) 
					return 0;

				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first and the last item
				if(this[firstIndex][subfieldName][sortValueName] >= item[subfieldName][sortValueName]) 
					return firstIndex;
				if(this[lastIndex][subfieldName][sortValueName] <= item[subfieldName][sortValueName]) 
					return lastIndex+1;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1) 
						return lastIndex;

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][subfieldName][sortValueName] < item[subfieldName][sortValueName]) 
						firstIndex = midIndex;
					else if(this[midIndex][subfieldName][sortValueName] == item[subfieldName][sortValueName]) 
						return midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		
		if(descending) 
		{
			array.findIndexBySortValue = function(sortValue)
			{
				if(this.length <= 0) 
					return -1;
				
				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first item
				if(this[firstIndex][subfieldName][sortValueName] < sortValue) 
					return -1;
				if(this[firstIndex][subfieldName][sortValueName] == sortValue) 
					return firstIndex;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1)
					{
						if(this[firstIndex][subfieldName][sortValueName] == sortValue) 
							return firstIndex;
						else if(this[lastIndex][subfieldName][sortValueName] == sortValue) 
							return lastIndex;
						else 
							return -1; // Not found
					}

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][subfieldName][sortValueName] > sortValue) 
						firstIndex = midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		else
		{
			array.findIndexBySortValue = function(sortValue)
			{
				if(this.length <= 0) 
					return -1;
				
				var firstIndex = 0;
				var lastIndex = this.length - 1;
				var midIndex;

				//Check the first item
				if(this[firstIndex][subfieldName][sortValueName] > sortValue) 
					return -1;
				if(this[firstIndex][subfieldName][sortValueName] == sortValue) 
					return firstIndex;

				//Perform search
				while(true)
				{
					if(lastIndex-firstIndex <= 1)
					{
						if(this[firstIndex][subfieldName][sortValueName] == sortValue) 
							return firstIndex;
						else if(this[lastIndex][subfieldName][sortValueName] == sortValue) 
							return lastIndex;
						else 
							return -1; //Not found
					}

					//Find the middle item
					midIndex = firstIndex + Math.floor((lastIndex-firstIndex)/2);

					if(this[midIndex][subfieldName][sortValueName] < sortValue) 
						firstIndex = midIndex;
					else 
						lastIndex = midIndex;
				}
			}
		}
		
		array.findIndex = function(item)
		{
			return this.findIndexBySortValue(item[subfieldName][sortValueName]);
		}

		array.findIndexCompare = function(item, cmpFunc)
		{
			var firstIndex = this.findIndexBySortValue(item[subfieldName][sortValueName]);
			if(firstIndex > -1)
			{
				for(;firstIndex<this.length && this[firstIndex][subfieldName][sortValueName] == item[subfieldName][sortValueName]; firstIndex++)
				{
					if(cmpFunc(item, this[firstIndex]))
						return firstIndex;
				}
			}
			
			return -1;
		}

		array.add = function(item)
		{
			var insertIndex = this.findInsertPosition(item);
			if(insertIndex > -1)
				this.splice(insertIndex, 0, item);
				
			return insertIndex;
		}

		array.remove = function(item, cmpFunc)
		{
			if(typeof(cmpFunc) != 'function')
				cmpFunc = function() { return true; }
				
			var removeIndex = typeof(cmpFunc) == 'function' ? array.findIndexCompare(item, cmpFunc) : array.findIndex(item);
			if(removeIndex > -1)
				this.splice(removeIndex, 1);
				
			return removeIndex;
		}

		if(sortNow)
		{
			if(descending)
				array.sort( function(a,b) {return a[subfieldName][sortValueName] == b[subfieldName][sortValueName] ? 0 : a[subfieldName][sortValueName] < b[subfieldName][sortValueName] ? 1 : -1});
			else
				array.sort( function(a,b) {return a[subfieldName][sortValueName] == b[subfieldName][sortValueName] ? 0 : a[subfieldName][sortValueName] < b[subfieldName][sortValueName] ? -1 : 1});
		}
	}
};

/* CONTAINER */
jcc.widgets["container"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 	
		return (el.nodeName == "BODY" || el.nodeName == "DIV") && el.getAttribute("data-role") == "container";
	},
	enhance : function(el) { if(el.container) el.container.refresh(); else new jcc.container(el).refresh(); },
	unenhance : function(el) { if(el.container) el.container.destroy(); }
};
jcc.container = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.selection != "yes" && el.dataset.selection != "no")
			el.dataset.selection = "no";

		el.container = this;
		
		el.classList.add("jcc-container");		
		el.classList.add("jcc-container-" + theme);
	}
	
	this.destroy = function()
	{
		if(el.container)
		{
			el.classList.remove("jcc-container");
			el.classList.remove("jcc-container-" + theme);
			
			delete el.container;
		}
	}
}

/* POPUP */
jcc.widgets["popup"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "popup";
	},
	enhance : function(el) { if(el.popup) el.popup.refresh(); else new jcc.popup(el).refresh(); },
	unenhance : function(el) { if(el.popup) el.popup.destroy(); }
};
jcc.popup = function(el)
{
	this.container = jcc.container;
	this.container(el);
	this.super_getOption = this.getOption;
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var theme;
	var modal, pane, visible = false, parent,
		resize_dirs, resizable = false, will_resize, prex, prey, gainx, gainy, 
		s_left, s_top, s_w, s_h, 
		centered_x, centered_y,
		historyEnabled,
		cancelable,
		position,
		animation, parentClass, reversedOut,
		relateElement, currentPositioning,
		shadow, 
		align, arrow, arrow_element,
		anchor,
		ignoreResizeOnce;
	
	var self = this;
	
	//called if parent element resized
	function onParentResize(evt)
	{
		if(!visible)
			return;
		
		if(centered_x || centered_y)
			recomputePosition();
	}
	
	//called if parent element resized
	function onRelateElementParentsScroll(evt)
	{
		if(!visible || !relateElement)
			return;
		
		recomputePosition();
	}
	
	//called when popup resized
	function onPopupResize(evt)
	{
		if(ignoreResizeOnce || !visible)
		{
			ignoreResizeOnce = false;
			return;
		}
		
		recomputePosition();
	}
	
	//called when relate element resized or moved
	function onRelateElementChanged(evt)
	{
		if(!relateElement || !visible)
			return;
		
		recomputePosition();
	}
	
	//called when user changed position of the popup using the mouse or touch
	function onPopupDrag(evt)
	{
		centered_x = centered_y = false;
	}
	
	//called when user changed size of the popup using the mouse or touch
	function onPopupManualResize(evt)
	{
		centered_x = centered_y = false;
		ignoreResizeOnce = true;
	}
	
	function onPaneClick(evt)
	{
		self.hide(0);
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onElementPointerDown(evt)
	{
		if(!resizable)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
	
		var elementRect = jcc.getElementRect(el);
	
		will_resize = {};
		if(resize_dirs["left"])
		{
			if(pageX >= elementRect.left && pageX < elementRect.left + resize_dirs["left"])
				will_resize["left"] = true;
		}
		if(resize_dirs["right"])
		{
			if(pageX >= elementRect.right - resize_dirs["right"] && pageX < elementRect.right)
				will_resize["right"] = true;
		}
		if(resize_dirs["top"])
		{
			if(pageY >= elementRect.top && pageY < elementRect.top + resize_dirs["top"])
				will_resize["top"] = true;
		}
		if(resize_dirs["bottom"])
		{
			if(pageY >= elementRect.bottom - resize_dirs["bottom"] && pageY < elementRect.bottom)
				will_resize["bottom"] = true;
		}
		
		if( will_resize["left"] || will_resize["right"] || will_resize["top"] || will_resize["bottom"] )
		{
			prex = pageX;
			prey = pageY;
			gainx = gainy = 0;
			s_left = parseInt(jcc.getComputedStyle(el, "left"));
			s_top = parseInt(jcc.getComputedStyle(el, "top"));
			s_w = elementRect.width;
			s_h = elementRect.height;
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		else
			will_resize = null;
	}
	
	function onElementPointerMove(evt)
	{
		if(!resizable)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
	
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
		
		var elementRect = jcc.getElementRect(el);
		
		var sets = {};
		if(resize_dirs["left"])
		{
			if(pageX >= elementRect.left && pageX < elementRect.left + resize_dirs["left"])
				sets["left"] = true;
		}
		if(resize_dirs["right"])
		{
			if(pageX >= elementRect.right - resize_dirs["right"] && pageX < elementRect.right)
				sets["right"] = true;
		}
		if(resize_dirs["top"])
		{
			if(pageY >= elementRect.top && pageY < elementRect.top + resize_dirs["top"])
				sets["top"] = true;
		}
		if(resize_dirs["bottom"])
		{
			if(pageY >= elementRect.bottom - resize_dirs["bottom"] && pageY < elementRect.bottom)
				sets["bottom"] = true;
		}
		
		var cursor = "auto";
		if( (sets["left"] && sets["top"]) || (sets["right"] && sets["bottom"]) )
			cursor = "nwse-resize";
		else if( (sets["right"] && sets["top"]) || (sets["left"] && sets["bottom"]) )
			cursor = "nesw-resize";
		else if( sets["left"] || sets["right"] )
			cursor = "ew-resize";
		else if( sets["top"] || sets["bottom"] )
			cursor = "ns-resize";
			
		el.style.cursor = cursor;
	}
	
	function onDocumentPointerMove(evt)
	{
		if(!resizable || !will_resize || !visible)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		evt.preventDefault();
		evt.stopPropagation();
		
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
		
		gainx += pageX - prex;
		gainy += pageY - prey;
		
		prex = pageX;
		prey = pageY;
		
		var px = s_left + gainx;
		var py = s_top + gainy;
		
		var wnd_w = window.innerWidth;
		var wnd_h = window.innerHeight;
		
		var parentRect = currentPositioning == "window" ? jcc.getViewportRect() : jcc.getElementLocalRect(parent);
		
		var min_w = parseInt(jcc.getComputedStyle(el, "min-width"));
		if(isNaN(min_w)) min_w = 2;
		var max_w = parseInt(jcc.getComputedStyle(el, "max-width"));
		
		var min_h = parseInt(jcc.getComputedStyle(el, "min-height"));
		if(isNaN(min_h)) min_h = 2;
		var max_h = parseInt(jcc.getComputedStyle(el, "max-height"));
		
		if(will_resize["left"])
		{
			var w = s_w - gainx;
			if(w < min_w)
			{
				px -= min_w - w;
				w = min_w;
			}
			else if(isNaN(max_w) == false && w > max_w)
			{
				px += w - max_w;
				w = max_w;
			}
			
			el.style.left = px + "px";
			el.style.width = w + "px";
			
			onPopupManualResize();
		}
		if(will_resize["top"])
		{
			var h = s_h - gainy;
			if(h < min_h)
			{
				py -= min_h - h;
				h = min_h;
			}
			else if(isNaN(max_h) == false && h > max_h)
			{
				py += h - max_h;
				h = max_h;
			}
			
			el.style.top = py + "px";
			el.style.height = h + "px";
			
			onPopupManualResize();
		}
		if(will_resize["right"])
		{
			var w = s_w + gainx;
			if(w < min_w)
				w = min_w;
			else if(isNaN(max_w) == false && w > max_w)
				w = max_w;
			
			el.style.width = w + "px";
			
			onPopupManualResize();
		}
		if(will_resize["bottom"])
		{
			var h = s_h + gainy;
			if(h < min_h)
				h = min_h;
			else if(isNaN(max_w) == false && h > max_h)
				h = max_h;
			
			el.style.height = h + "px";
			
			onPopupManualResize();
		}
	}
	
	function onDocumentPointerUp(evt)
	{
		will_resize = null;
	}
	
	function onEShow(event)
	{
		if(el.dataset.eShow && el.dataset.eShow.length > 0)
			eval(el.dataset.eShow);
	}
	
	function onEHide(event)
	{
		if(el.dataset.eHide && el.dataset.eHide.length > 0)
			eval(el.dataset.eHide);
	}
	
	function onInAnimationEnd()
	{
		if(!el.popup)
			return;
			
		jcc.removeAnimationEndListener(el, onInAnimationEnd);
			
		el.addEventListener("e-resized", onPopupResize, false);
		
		if(relateElement)
		{
			jcc.resizeMonitor.addElement(relateElement);
			jcc.repositionMonitor.addElement(relateElement);
			
			relateElement.addEventListener("e-resized", onRelateElementChanged, false);
			relateElement.addEventListener("e-moved", onRelateElementChanged, false);
			
			var parentNode = relateElement.parentNode;
			do
			{
				parentNode.addEventListener("scroll", onRelateElementParentsScroll, false);
			}
			while(parentNode = parentNode.parentNode);
		}
	}
	
	function onOutAnimationEnd()
	{
		if(!el.popup)
			return;
			
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		el.classList.add("jcc-popup-hidden");
		
		if(pane)
			pane.classList.add("jcc-popup-pane-hidden");
	}
	
	function removeAnimationClasses()
	{
		el.classList.remove("jcc-animation-" + animation);
		el.classList.remove("jcc-in");
		el.classList.remove("jcc-out");
		el.classList.remove("jcc-back");
		if(parentClass && parentClass != "")
		{
			el.parentNode.classList.remove(parentClass);
			parentClass = null;
		}
	}
	
	function readAnchor()
	{		
		anchor = { x:"center", y:"center" };
		
		var props = el.dataset.anchor.toLowerCase().split(" ");
		
		anchor.x = props[0];
		if(anchor.x != "left" && anchor.x != "center" && anchor.x != "right")
		{
			anchor.x = parseInt(anchor.x);
			if(isNaN(anchor.x))
				anchor.x = "center";
		}
			
		if(props.length > 1)
		{
			anchor.y = props[1];
			if(anchor.y != "top" && anchor.y != "center" && anchor.y != "bottom")
			{
				anchor.y = parseInt(anchor.y);
				if(isNaN(anchor.y))
					anchor.y = "center";
			}
		}
	}
	
	function readPosition()
	{	
		position = { x: "auto", y: "auto" };
		var props = el.dataset.position.split(" ");
		if(props.length > 0)
		{
			var v = parseInt(props[0]);
			if(!isNaN(v))
				position.x = v;
				
			if(props.length > 1)
			{
				v = parseInt(props[1]);
				if(!isNaN(v))
					position.y = v;
			}
		}
	}
	
	function readAnimation()
	{
		reversedOut = el.dataset.reversedOut == "yes";
		
		animation = el.dataset.animation;
		animation = jcc.animations[animation];
		if(animation)
		{
			animation = animation.suffix;
			parentClass = animation.parentClass;
		}
		else
		{
			animation = "none";
			parentClass = null;
		}
	}
	
	function pushFront()
	{
		if(!jcc.popups_z)
			jcc.popups_z = {};
		
		var z = 999;
		for(var i in jcc.popups_z)
		{
			if(jcc.popups_z[i].z == undefined)
				continue;
				
			if(jcc.popups_z[i].z > z)
				z = jcc.popups_z[i].z;
		}
		z += 2; //one for the popup and one for its pane
		jcc.popups_z[el.id] = { z:z }; 
		el.style.zIndex = z.toString();
		if(pane)
			pane.style.zIndex = (z-1).toString();
	}
	
	function pushBack()
	{
		if(jcc.popups_z)
			delete jcc.popups_z[el.id];
	}
	
	function unlinkRelateElementEvents()
	{
		if(relateElement)
		{
			jcc.resizeMonitor.removeElement(relateElement);
			jcc.repositionMonitor.removeElement(relateElement);
			
			relateElement.removeEventListener("e-resized", onRelateElementChanged);
			relateElement.removeEventListener("e-moved", onRelateElementChanged);
			
			var parentNode = relateElement.parentNode;
			do
			{
				parentNode.removeEventListener("scroll", onRelateElementParentsScroll);
			}
			while(parentNode = parentNode.parentNode);
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
				
				if(o != "animation" && o != "anchor" && o != "relateTo" && o != "position" && o != "align")
					refresh = true;
				else
				{
					if(visible)
						alert("JCC: The options 'animation', 'anchor', 'relateTo', 'align' and 'position' should be set ONLY when the popup widget is NOT visible to avoid undefined and undesired behaviour!");
				}
					
			}
		}
		if(refresh)
			this.refresh();
	}
	
	this.refresh = function()
	{
		if(!el.id || el.id.length == 0)
		{
			alert("JCC: Each 'popup' should have its unique 'id' attribute in the HTML markup!");
			return;
		}
		
		if(el.id.indexOf("|") > 0)
		{
			alert("JCC: A 'popup' may not contain | in its ID as it is reserved for URL encoding!");
			return;
		}
		
		this.destroy();
		this.super_refresh();
		
		theme = this.theme();
		
		el.popup = this;
		
		//Set defaults
		if(!el.dataset.animation || el.dataset.animation.length == 0)
			el.dataset.animation = "none";
			
		if(el.dataset.history != "yes" && el.dataset.history != "no")
			el.dataset.history = "no";
		
		if(el.dataset.cancelable != "yes" && el.dataset.cancelable != "no")
			el.dataset.cancelable = "yes";
			
		if(el.dataset.shadow != "yes" && el.dataset.shadow != "no")
			el.dataset.shadow = "yes";
			
		if(el.dataset.arrow != "yes" && el.dataset.arrow != "no")
			el.dataset.arrow = "no";
			
		if(el.dataset.reversedOut != "yes" && el.dataset.reversedOut != "no")
			el.dataset.reversedOut = "no";
			
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth")
			el.dataset.corners = "smooth";
			
		if(!el.dataset.align)
			el.dataset.align = "";
			
		if(el.dataset.modal != "no" && el.dataset.modal != "implicit" && el.dataset.modal != "explicit")
			el.dataset.modal = "no";
			
		if(!el.dataset.resizeGrip || el.dataset.resizeGrip.length == 0)
			el.dataset.resizeGrip = "left:none right:none top:none bottom:none";
			
		if(!el.dataset.position)
			el.dataset.position = "auto auto";
			
		if(!el.dataset.anchor || el.dataset.anchor.length == 0)
			el.dataset.anchor = "center center";
			
		if(!el.dataset.relateTo || el.dataset.relateTo.length == 0)
			el.dataset.relateTo = "window";
		
		//Read properties
		historyEnabled = el.dataset.history == "yes";
		cancelable = el.dataset.cancelable == "yes";
		arrow = el.dataset.arrow == "yes";
		
		resize_dirs = {};
		resizable = false;
		props = el.dataset.resizeGrip.toLowerCase().split(" ");
		for(var i=0;i<props.length;i++)
		{
			var dir_props = props[i].split(":");
			if( dir_props.length == 2 && 
				(dir_props[0] == "left" || dir_props[0] == "right" || dir_props[0] == "top" || dir_props[0] == "bottom") )
			{
				var amount = parseInt(dir_props[1]);
				if(!isNaN(amount) && amount > 0)
				{
					resize_dirs[dir_props[0]] = amount;
					resizable = true;
				}
			}
		}
		
		align = [];
		if(!resizable)
		{
			var props = el.dataset.align.toLowerCase().split(" ");
			for(var i=0;i<props.length;i++)
			{
				if(props[i] == "left" || props[i] == "right" || props[i] == "top" || props[i] == "bottom")
					align.push(props[i]);
			}
		}
		
		if(arrow)
		{
			if(resizable)
			{
				alert("JCC: A popup with arrow may not be resizable!");
				return;
			}
			
			arrow_element = document.createElement("div");
			el.appendChild(arrow_element);
			
			if(align.length == 0)
			{
				el.dataset.align = "left right top bottom";
				align = ["left", "right", "top", "bottom"];
			}
		}
		
		modal = el.dataset.modal;
		if(modal == "no" && cancelable)
			modal = "implicit";
		
		//Init widget
		parent = el.parentNode;
		jcc.resizeMonitor.addElement(parent);
		if(parent != document.body && jcc.getComputedStyle(parent, "position") == "static")
			parent.classList.add("jcc-popup-make-parent-relative");
			
		jcc.resizeMonitor.addElement(el);
		
		if(modal != "no")
		{
			pane = document.createElement("div");
			pane.classList.add("jcc-popup-pane");
			pane.classList.add("jcc-popup-pane-hidden");
			if(modal == "explicit")
				pane.classList.add("jcc-popup-pane-darken");
			
			document.body.appendChild(pane);
		}
		
		el.classList.add("jcc-popup");
		el.classList.add("jcc-popup-" + theme);
		el.classList.add("jcc-popup-hidden");
		if(arrow)
			el.classList.add("jcc-popup-with-arrow");
		
		el.addEventListener("e-show", onEShow, false);
		el.addEventListener("e-hide", onEHide, false);
	
		el.addEventListener("e-drag", onPopupDrag, false);
		el.addEventListener("mousedown", onElementPointerDown, false);
		el.addEventListener("touchstart", onElementPointerDown, false);
		el.addEventListener("mousemove", onElementPointerMove, false);
		el.addEventListener("touchmove", onElementPointerMove, false);
		document.addEventListener("mousemove", onDocumentPointerMove, false);
		document.addEventListener("touchmove", onDocumentPointerMove, false);
		document.addEventListener("mouseup", onDocumentPointerUp, false);
		document.addEventListener("touchend", onDocumentPointerUp, false);
		window.addEventListener("resize", onParentResize, false);
		parent.addEventListener("e-resized", onParentResize, false);
	}
	
	this.destroy = function()
	{
		this.super_destroy();
		
		if(el.popup)
		{
			jcc.resizeMonitor.removeElement(el);
			
			if(relateElement)
			{
				unlinkRelateElementEvents();
				delete relateElement;
			}
		
			el.removeEventListener("e-show", onEShow);
			el.removeEventListener("e-hide", onEHide);
			
			el.removeEventListener("e-resized", onPopupResize);
			el.removeEventListener("e-drag", onPopupDrag);
			el.removeEventListener("mousedown", onElementPointerDown);
			el.removeEventListener("touchstart", onElementPointerDown);
			el.removeEventListener("mousemove", onElementPointerMove);
			el.removeEventListener("touchmove", onElementPointerMove);
			document.removeEventListener("mousemove", onDocumentPointerMove);
			document.removeEventListener("touchmove", onDocumentPointerMove);
			document.removeEventListener("mouseup", onDocumentPointerUp);
			document.removeEventListener("touchend", onDocumentPointerUp);
			window.removeEventListener("resize", onParentResize);
			jcc.removeAnimationEndListener(el, onInAnimationEnd);
			jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
			pushBack();
			
			if(pane)
			{
				pane.removeEventListener("click", onPaneClick);
				jcc.detach(pane);
				pane = null;
			}
			
			if(arrow_element)
			{
				el.removeChild(arrow_element);
				arrow_element = null;
			}
			
			el.classList.remove("jcc-popup");
			el.classList.remove("jcc-popup-" + theme);
			el.classList.remove("jcc-popup-hidden");
			el.classList.remove("jcc-popup-with-arrow");
			
			removeAnimationClasses();
			
			el.classList.remove("jcc-popup-position-parent");
			el.classList.remove("jcc-popup-position-window");
			
			if(parent)
			{
				jcc.resizeMonitor.removeElement(parent);
				parent.removeEventListener("e-resized", onParentResize);
				parent.classList.remove("jcc-popup-make-parent-relative");
				parent = null;
			}
		
			delete el.popup;
		}
	}
	
	this.show = function(overrideHistoryState)
	{
		if(!el.popup || visible)
			return;
			
		if(historyEnabled)
		{
			var hash = location.hash.substr(1);
			var argIdx = hash.indexOf("?");
			var urlArgs = "";
			if(argIdx > -1)
				urlArgs = hash.substr(argIdx);
			
			this.overrideHistoryState = overrideHistoryState;

			if(overrideHistoryState)
			{
				var state = jcc.historyStateCopy(jcc.currentHistoryState());
				state.popups.push(el.id);
				
				window.history.replaceState(null, "", jcc.historyStateToHash(state) + urlArgs);
			}	
			else
			{
				location.hash = "#" + el.id + urlArgs;
			}
		}
		else
		{
			this.__show();
		}
	}
	
	function recomputePosition()
	{
		var x = position.x;
		var y = position.y;
		
		if(align.length > 0 || relateElement)
		{
			if(x == "auto") 
				x = 0;
			if(y == "auto") 
				y = 0;
		}
		
		if(align.length > 0 && arrow_element)
		{
			arrow_element.style.left = 
			arrow_element.style.right = 
			arrow_element.style.top = 
			arrow_element.style.bottom = "";
		}
		
		var windowRect = jcc.getViewportRect();
		var parentRect = null;
		var parentRectWnd = null; //Parent rect in window coords
		if(currentPositioning == "window")
			parentRect = parentRectWnd = windowRect;
		else //currentPositioning == "parent"
		{
			parentRect = jcc.getElementLocalRect(parent);
			parentRectWnd = jcc.getElementRect(parent);
		}
		
		var elementRect = jcc.getElementLocalRect(el);
		var w = elementRect.width;
		var h = elementRect.height;
		
		var px = 0;
		var py = 0;
		
		if(relateElement) //element rect
		{
			var relateRectWnd = jcc.getElementRect(relateElement);
			
			if(align.length > 0) //Alignment requested
			{
				//Compute intersection rect
				var intersectionRect = 
				{
					left: Math.max(parentRectWnd.left, windowRect.left),
					right: Math.min(parentRectWnd.right, windowRect.right),
					top: Math.max(parentRectWnd.top, windowRect.top),
					bottom: Math.min(parentRectWnd.bottom, windowRect.bottom) 
				};
				
				var side = align[0];
				
				if(align.length > 1) //Choosing best fit
				{
					var weights = [];
					for(var i=0;i<align.length;i++)
					{
						var a = align[i];
						if(a == "left")
							weights.push({ s:a, w:(relateRectWnd.left - intersectionRect.left)/w });
						else if(a == "right")
							weights.push({ s:a, w:(intersectionRect.right - relateRectWnd.right)/w });
						else if(a == "top")	
							weights.push({ s:a, w:(relateRectWnd.top - intersectionRect.top)/h });
						else if(a == "bottom")	
							weights.push({ s:a, w:(intersectionRect.bottom - relateRectWnd.bottom)/h });
					}
					weights.sort(function(a, b) { return b.w - a.w; });
					side = weights[0].s;
				}
				
				if(arrow_element)
					arrow_element.className = "jcc-arrow jcc-arrow-" + side + "-" + theme;
				var aw = arrow ? Math.round(arrow_element.offsetWidth/2) + 1 : 0;
				
				if(side == "left")
				{
					x = -x;
					x += -w + relateRectWnd.left - aw;
					
					y += -h/2 + relateRectWnd.top + relateRectWnd.height/2;
					if(y + h > intersectionRect.bottom)
					{
						y = intersectionRect.bottom - h;
						if(y + h < relateRectWnd.bottom)
							y = relateRectWnd.bottom - h;
					}
					if(y < intersectionRect.top)
					{
						y = intersectionRect.top;
						if(y > relateRectWnd.top)
							y = relateRectWnd.top;
					}

					if(arrow_element)
						arrow_element.style.top = Math.round(relateRectWnd.top + relateRectWnd.height/2 - y - aw) + "px";
				}
				else if(side == "right")
				{
					x += relateRectWnd.right + aw;
					
					y += -h/2 + relateRectWnd.top + relateRectWnd.height/2;
					if(y + h > intersectionRect.bottom)
					{
						y = intersectionRect.bottom - h;
						if(y + h < relateRectWnd.bottom)
							y = relateRectWnd.bottom - h;
					}
					if(y < intersectionRect.top)
					{
						y = intersectionRect.top;
						if(y > relateRectWnd.top)
							y = relateRectWnd.top;
					}

					if(arrow_element)
						arrow_element.style.top = Math.round(relateRectWnd.top + relateRectWnd.height/2 - y - aw) + "px";
				}
				else if(side == "top")
				{
					y = -y;
					y += -h + relateRectWnd.top - aw;
					
					x += -w/2 + relateRectWnd.left + relateRectWnd.width/2;
					if(x + w > intersectionRect.right)
					{
						x = intersectionRect.right - w;
						if(x + w < relateRectWnd.right)
							x = relateRectWnd.right - w;
					}
					if(x < intersectionRect.left)
					{
						x = intersectionRect.left;
						if(x > relateRectWnd.left)
							x = relateRectWnd.left;
					}
					
					if(arrow_element)
						arrow_element.style.left = Math.round(relateRectWnd.left + relateRectWnd.width/2 - x - aw) + "px";
				}
				else if(side == "bottom")
				{
					y += relateRectWnd.bottom + aw;
					
					x += -w/2 + relateRectWnd.left + relateRectWnd.width/2;
					if(x + w > intersectionRect.right)
					{
						x = intersectionRect.right - w;
						if(x + w < relateRectWnd.right)
							x = relateRectWnd.right - w;
					}
					if(x < intersectionRect.left)
					{
						x = intersectionRect.left;
						if(x > relateRectWnd.left)
							x = relateRectWnd.left;
					}

					if(arrow_element)
						arrow_element.style.left = Math.round(relateRectWnd.left + relateRectWnd.width/2 - x - aw) + "px";
				}
			}
			else //Just center over the element
			{
				x += relateRectWnd.left + relateRectWnd.width/2 - w/2;
				y += relateRectWnd.top + relateRectWnd.height/2 - h/2;
			}
			
			//Go back to initial coordinates
			x -= parentRectWnd.left;
			y -= parentRectWnd.top;
		}
		else //point
		{
			if(align.length > 0) //Alignment requested
			{
				var MIN_POINT_OFFSET = 20;
				
				//Work in window coordinates
				var wx = x + parentRectWnd.left;
				var wy = y + parentRectWnd.top;
				
				//Compute intersection rect
				var intersectionRect = 
				{
					left: Math.max(parentRectWnd.left, windowRect.left),
					right: Math.min(parentRectWnd.right, windowRect.right),
					top: Math.max(parentRectWnd.top, windowRect.top),
					bottom: Math.min(parentRectWnd.bottom, windowRect.bottom) 
				};
				
				var side = align[0];
				if(align.length > 1) //Choosing best fit
				{
					var weights = [];
					for(var i=0;i<align.length;i++)
					{
						var a = align[i];
						if(a == "left")
							weights.push({ s:a, w:(wx - intersectionRect.left)/w });
						else if(a == "right")
							weights.push({ s:a, w:(intersectionRect.right - wx)/w });
						else if(a == "top")	
							weights.push({ s:a, w:(wy - intersectionRect.top)/h });
						else if(a == "bottom")
							weights.push({ s:a, w:(intersectionRect.bottom - wy)/h });
					}
					weights.sort(function(a, b) { return b.w - a.w; });
					side = weights[0].s;
				}
				
				if(arrow_element)
					arrow_element.className = "jcc-arrow jcc-arrow-" + side + "-" + theme;
				var aw = arrow ? Math.round(arrow_element.offsetWidth / 2) + 1 : 0;
				
				if(side == "left")
				{
					x = -w + wx - aw;
					
					y = -h/2 + wy;
					if(y + h > intersectionRect.bottom)
					{
						y = intersectionRect.bottom - h;
						if(y + h < wy + MIN_POINT_OFFSET)
							y = wy + MIN_POINT_OFFSET;
					}
					if(y < intersectionRect.top)
					{
						y = intersectionRect.top;
						if(y > wy - MIN_POINT_OFFSET)
							y = wy - MIN_POINT_OFFSET;
					}

					if(arrow_element)
						arrow_element.style.top = Math.round(wy - y - aw) + "px";
				}
				else if(side == "right")
				{
					x = wx + aw;
					
					y = -h/2 + wy;
					if(y + h > intersectionRect.bottom)
					{
						y = intersectionRect.bottom - h;
						if(y + h < wy + MIN_POINT_OFFSET)
							y = wy + MIN_POINT_OFFSET;
					}
					if(y < intersectionRect.top)
					{
						y = intersectionRect.top;
						if(y > wy - MIN_POINT_OFFSET)
							y = wy - MIN_POINT_OFFSET;
					}
					
					if(arrow_element)
						arrow_element.style.top = Math.round(wy - y - aw) + "px";
				}
				else if(side == "top")
				{
					y = -h + wy - aw;
					
					x = -w/2 + wx;
					if(x + w > intersectionRect.right)
					{
						x = intersectionRect.right - w;
						if(x + w < wx + MIN_POINT_OFFSET)
							x = wx + MIN_POINT_OFFSET;
					}
					if(x < intersectionRect.left)
					{
						x = intersectionRect.left;
						if(x > wx - MIN_POINT_OFFSET)
							x = wx - MIN_POINT_OFFSET;
					}

					if(arrow_element)
						arrow_element.style.left = Math.round(wx - x - aw) + "px";
				}
				else if(side == "bottom")
				{
					y = wy + aw;
					
					x = -w/2 + wx;
					if(x + w > intersectionRect.right)
					{
						x = intersectionRect.right - w;
						if(x + w < wx + MIN_POINT_OFFSET)
							x = wx + MIN_POINT_OFFSET;
					}
					if(x < intersectionRect.left)
					{
						x = intersectionRect.left;
						if(x > wx - MIN_POINT_OFFSET)
							x = wx - MIN_POINT_OFFSET;
					}

					if(arrow_element)
						arrow_element.style.left = Math.round(wx - x - aw) + "px";
				}
				
				//Go back to initial coordinates
				x -= parentRectWnd.left;
				y -= parentRectWnd.top;
			}
			else
			{
				if(anchor.x == "right")	
					px = -w;
				else if(anchor.x == "left")
					px = 0;
				else if(anchor.x == "center")
					px = -w / 2;
				else
					px = -anchor.x;
				
				if(anchor.y == "bottom")	
					py = -h;
				else if(anchor.y == "top")
					py = 0;
				else if(anchor.y == "center")
					py = -h / 2;
				else
					py = -anchor.y;
			}
		}
		
		centered_x = centered_y = false;
		
		if(x == "auto")
		{
			centered_x = true;
			px += parentRect.width / 2;
		}
		else
			px += x;
		
		if(y == "auto")
		{
			centered_y = true;
			py += parentRect.height / 2;
		}
		else
			py += y;
		
		px = Math.round(px);
		py = Math.round(py);
	
		el.style.left = px + "px";
		el.style.top = py + "px";
	}
	
	this.__show = function(animationReversed)
	{
		if(!el.popup || visible)
			return;
		
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
			
		readAnchor();
		readPosition();
		
		relateElement = null;
		
		currentPositioning = el.dataset.relateTo;
		if(currentPositioning != "parent" && currentPositioning != "window")
		{
			relateElement = document.body.querySelector(currentPositioning);
			if(relateElement)
			{
				var bSameHierarchy = false;
				var relateElementHierarchy = relateElement.parentNode;
				do
				{
					if(parent == relateElementHierarchy)
					{
						bSameHierarchy = true;
						break;
					}
				}
				while(relateElementHierarchy = relateElementHierarchy.parentNode);
			
				if(bSameHierarchy)
					currentPositioning = jcc.getComputedStyle(relateElement, "position") == "fixed" ? "window" : "parent";
				else
				{
					alert("JCC: Popup parent node must be direct or indirect parent of the relate element!");
					return;
				}
			}
			else
			{
				alert("JCC: A popup relate element cannot be found - fix your HTML markup!");
				return;
			}
		}
		
		if(currentPositioning == "window" && parent != document.body)
		{
			alert("JCC: A popup related to the window must be a direct child of document.body in order to work properly!");
			return;
		}
	
		//Prev animation cleanup
		removeAnimationClasses();
			
		//Prepare new animation
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		if(currentPositioning == "window")
		{
			el.classList.remove("jcc-popup-position-parent");
			el.classList.add("jcc-popup-position-window");
		}
		else //if(currentPositioning == "parent")
		{
			el.classList.remove("jcc-popup-position-window");
			el.classList.add("jcc-popup-position-parent");
		}
		
		el.classList.remove("jcc-popup-hidden");
		if(pane)
		{
			if(cancelable)
				pane.addEventListener("click", onPaneClick, false);
				
			pane.classList.remove("jcc-popup-pane-hidden");
		}
		
		pushFront(); //adjust z index to be topmost
		
		recomputePosition();
		
		if( animation == "none" )
			onInAnimationEnd();
		else
		{
			el.classList.add("jcc-in");
			if(animationReversed && !reversedOut)
				el.classList.add("jcc-back");
			
			if(jcc.addAnimationEndListener(el, onInAnimationEnd, false) == false)
				onInAnimationEnd();
		}
		
		visible = true;
		jcc.dispatchCustomEvent(el, "e-show", { bubbles: false, cancelable: false });
	}
	
	this.hide = function(result)
	{
		if(!el.popup || !visible)
			return;
			
		if(historyEnabled)
		{
			var hash = location.hash.substr(1);
			var argIdx = hash.indexOf("?");
			var urlArgs = "";
			if(argIdx > -1)
				urlArgs = hash.substr(argIdx);
				
			var overrideHistoryState = this.overrideHistoryState;
			
			var state = jcc.historyStateCopy(jcc.currentHistoryState());
			for(var i=0;i<state.popups.length;i++)
			{
				if(state.popups[i] == el.id)
				{
					state.popups.splice(i, 1);
					break;
				}
			}
			
			if(overrideHistoryState)
				window.history.replaceState(null, "", jcc.historyStateToHash(state) + urlArgs);
			else
				location.hash = jcc.historyStateToHash(state) + urlArgs;
		}
		else
		{
			this.__hide(result);
		}
	}
	
	this.__hide = function(result, animationReversed)
	{
		if(!el.popup || !visible)
			return;
			
		unlinkRelateElementEvents();
			
		el.removeEventListener("e-resized", onPopupResize);
		
		if(pane)
			pane.removeEventListener("click", onPaneClick);
		
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
			
		//Prev animation cleanup
		removeAnimationClasses();
			
		//Current animation selection
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		pushBack();
		
		if( animation == "none" )
			onOutAnimationEnd();
		else
		{
			el.classList.add("jcc-out");
			if(animationReversed || reversedOut)
				el.classList.add("jcc-back");
			
			if(jcc.addAnimationEndListener(el, onOutAnimationEnd, false) == false)
				onOutAnimationEnd();
		}
		
		visible = false;
		jcc.dispatchCustomEvent(el, "e-hide", { bubbles: false, cancelable: false, detail: { result : result } });
	}
	
	this.isVisible = function()
	{
		return visible && el.popup;
	}
}

/* ICON */
jcc.widgets["icon"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "I" && el.getAttribute("data-role") == "icon";
	},
	enhance : function(el) { if(el.icon) el.icon.refresh(); else new jcc.icon(el).refresh(); },
	unenhance : function(el) { if(el.icon) el.icon.destroy(); }
};
jcc.icon = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var icon, animation, orig_transform;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.icon = this;
		
		//set defaults
		if(el.dataset.rotate == undefined || el.dataset.rotate.length == 0)
			el.dataset.rotate = "";
			
		if(el.dataset.icon == undefined)
			el.dataset.icon = "";
			
		if(el.dataset.flip != "horizontal" && el.dataset.flip != "vertical")
			el.dataset.flip = "none";
			
		if(el.dataset.position != "auto" && el.dataset.position != "left"  && el.dataset.position != "right")
			el.dataset.position = "auto";
			
		if(el.dataset.animation == undefined || el.dataset.animation.length == 0)
			el.dataset.animation = "none";	
		
		el.classList.add("jcc-icon");
		
		var rotate = el.dataset.rotate;
		if(isNaN(parseFloat(rotate)) == false)
		{
			var transform = "rotate(" + rotate + "deg)";
			orig_transform = jcc.setCss(el, 
			{
				"-webkit-transform" : transform,
				"-moz-transform" : transform,
				"transform" : transform
			});
		}
	
		if(el.dataset.icon.length > 0)
		{
			icon = el.dataset.icon;
			el.classList.add(icon);
		}
		
		if(el.dataset.animation != "none")
		{
			animation = el.dataset.animation;
			el.classList.add("jcc-icon-animation-" + animation);
		}
	}
	
	this.destroy = function()
	{
		if(el.icon)
		{
			if(orig_transform)
			{
				jcc.setCss(el, orig_transform);
				orig_transform = undefined;
			}
			
			el.classList.remove("jcc-icon");
			
			if(icon)
				el.classList.remove(icon);
			
			if(animation)
				el.classList.remove("jcc-icon-animation-" + animation);
			
			delete el.icon;
		}
	}
}

/* CHECKBOX */
jcc.widgets["checkbox"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "LABEL" && el.getAttribute("data-role") == "checkbox";
	},
	enhance : function(el) { if(el.checkbox) el.checkbox.refresh(); else new jcc.checkbox(el).refresh(); },
	unenhance : function(el) { if(el.checkbox) el.checkbox.destroy(); }
};
jcc.checkbox = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var checkmark;
	var input = null;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.checkbox = this;
		
		el.classList.add("jcc-checkbox");
		el.classList.add("jcc-checkbox-" + theme);
		
		input = el.querySelector("input[type=checkbox]");
		if(input)
		{
			checkmark = document.createElement("div");
			jcc.insertAfter(checkmark, input);
			checkmark.classList.add("jcc-checkbox-checkmark-" + theme);
			
			input.classList.add("jcc-checkbox-input-" + theme);
		}
	}
	
	this.destroy = function()
	{	
		if(el.checkbox)
		{
			el.classList.remove("jcc-checkbox");
			el.classList.remove("jcc-checkbox-" + theme);
			
			if(input)
			{
				input.classList.remove("jcc-checkbox-input-" + theme);
				input = null;
			}
			
			delete el.checkbox;
		}
		
		if(checkmark)
		{
			jcc.detach(checkmark);
			checkmark = null;
		}
	}
	
	this.checked = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.checked = arguments[0];
				
			return input.checked;
		}
		
		return false;
	}
	
	this.disabled = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.disabled = arguments[0];
				
			return input.disabled;
		}
		
		return false;
	}
};

/* RADIO */
jcc.widgets["radio"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "LABEL" && el.getAttribute("data-role") == "radio";
	},
	enhance : function(el) { if(el.radio) el.radio.refresh(); else new jcc.radio(el).refresh(); },
	unenhance : function(el) { if(el.radio) el.radio.destroy(); }
};
jcc.radio = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var checkmark;
	var input = null;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.radio = this;
		
		el.classList.add("jcc-radio");
		el.classList.add("jcc-radio-" + theme);
		
		input = el.querySelector("input[type=radio]");
		if(input)
		{
			checkmark = document.createElement("div");
			jcc.insertAfter(checkmark, input);
			checkmark.classList.add("jcc-radio-checkmark-" + theme);
			
			input.classList.add("jcc-radio-input-" + theme);
		}	
	}
	
	this.destroy = function()
	{	
		if(el.radio)
		{
			el.classList.remove("jcc-radio");
			el.classList.remove("jcc-radio-" + theme);
			
			if(input)
			{
				input.classList.remove("jcc-radio-input-" + theme);
				input = null;
			}
			
			delete el.radio;
		}
		
		if(checkmark)
		{
			jcc.detach(checkmark);
			checkmark = null;
		}
	}
	
	this.checked = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.checked = arguments[0];
				
			return input.checked;
		}
		
		return false;
	}
	
	this.disabled = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.disabled = arguments[0];
				
			return input.disabled;
		}
		
		return false;
	}
};

/* PROGRESSBAR */
jcc.widgets["progressbar"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "progressbar";
	},
	enhance : function(el) { if(el.progressbar) el.progressbar.refresh(); else new jcc.progressbar(el).refresh(); },
	unenhance : function(el) { if(el.progressbar) el.progressbar.destroy(); }
};
jcc.progressbar = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme, indeterminate;
	var pri, sec;
	
	function vupdate(val)
	{
		if(pri)
			pri.style.width = val + '%';
	}
	
	function svupdate(val)
	{
		if(sec)
			sec.style.width = val + '%';
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.progressbar = this;
		
		//Set defaults
		if(el.dataset.indeterminate != "yes" && el.dataset.indeterminate != "no")
			el.dataset.indeterminate = "no";
			
		if(!el.dataset.value)
			el.dataset.value = "0";
			
		if(!el.dataset.secondaryValue)
			el.dataset.secondaryValue = "0";
		
		indeterminate = el.dataset.indeterminate == "yes";
		
		sec = document.createElement("div");
		el.appendChild(sec);
		pri = document.createElement("div");
		el.appendChild(pri);
		
		el.classList.add("jcc-progress-bar-" + theme);
		if(indeterminate)
		{
			el.classList.add("jcc-progress-bar-indeterminate-" + theme);
		}
		else
		{
			el.classList.add("jcc-progress-bar-determinate-" + theme);
			
			vupdate(this.value());
			svupdate(this.svalue());
		}
	}
	
	this.destroy = function()
	{	
		if(el.progressbar)
		{
			el.classList.remove("jcc-progress-bar-" + theme);
			
			if(indeterminate)
				el.classList.remove("jcc-progress-bar-indeterminate-" + theme);
			else
				el.classList.remove("jcc-progress-bar-determinate-" + theme);
			
			delete el.progressbar;
		}
		
		if(pri)
		{
			jcc.detach(pri);
			pri = null;
		}
		
		if(sec)
		{
			jcc.detach(sec);
			sec = null;
		}
	}
	
	this.value = function(/*val*/)
	{
		if(indeterminate)
			return 0;
		
		var val = el.hasAttribute("data-value") ? parseInt(el.getAttribute("data-value")) : 0;
		if(arguments.length > 0)	
			val = arguments[0];
			
		val = val < 0 || isNaN(val) ? 0 : (val > 100 ? 100 : val);
		
		if(arguments.length > 0)
		{
			el.setAttribute("data-value", val);
			vupdate(val);
		}
		
		return val;
	}
	
	this.svalue = function(/*val*/)
	{
		if(indeterminate)
			return 0;
		
		var val = el.hasAttribute("data-secondary-value") ? parseInt(el.getAttribute("data-secondary-value")) : 0;
		if(arguments.length > 0)	
			val = arguments[0];
			
		val = val < 0 || isNaN(val) ? 0 : (val > 100 ? 100 : val);
		
		if(arguments.length > 0)
		{
			el.setAttribute("data-secondary-value", val);
			svupdate(val);
		}
		
		return val;
	}
};

/* RANGE */
jcc.widgets["range"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "INPUT" && el.getAttribute("type") == "range" && el.getAttribute("data-role") == "range";
	},
	enhance : function(el) { if(el.range) el.range.refresh(); else new jcc.range(el).refresh(); },
	unenhance : function(el) { if(el.range) el.range.destroy(); }
};
jcc.range = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.range = this;
		
		el.classList.add("jcc-range-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.range)
		{
			el.classList.remove("jcc-range-" + theme);
			
			delete el.range;
		}
	}
};

/* DROPDOWN */
jcc.widgets["dropdown"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "dropdown";
	},
	enhance : function(el) { if(el.dropdown) el.dropdown.refresh(); else new jcc.dropdown(el).refresh(); },
	unenhance : function(el) { if(el.dropdown) el.dropdown.destroy(); }
};
jcc.dropdown = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var select = null, div;
	var icon = null;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.dropdown = this;
		
		div = document.createElement("div");
		
		el.classList.add("jcc-dropdown-" + theme);
		
		select = el.querySelector("select");
		jcc.insertAfter(div, select);
		
		icon = el.querySelector("i[data-role='icon']");
		if(icon)
			el.classList.add("jcc-dropdown-iconic");
	}
	
	this.destroy = function()
	{	
		if(el.dropdown)
		{
			el.classList.remove("jcc-dropdown-" + theme);
			
			if(icon)
			{
				el.classList.remove("jcc-dropdown-iconic");
				icon = null;
			}
			
			select = null;
			
			delete el.dropdown;
		}
		
		if(div)
		{
			jcc.detach(div);
			div = null;
		}
	}
	
	this.selectedIndex = function(/*selectedIndex*/)
	{
		if(select)
		{
			if(arguments.length > 0)
				select.selectedIndex = arguments[0];
				
			return select.selectedIndex;
		}
		
		return -1;
	}
	
	this.disabled = function(/*disabled*/)
	{
		if(select)
		{
			if(arguments.length > 0)
				select.disabled = arguments[0];
				
			return select.disabled;
		}
		
		return false;
	}
};

/* FLIPSWITCH */
jcc.widgets["flipswitch"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "LABEL" && el.getAttribute("data-role") == "flipswitch";
	},
	enhance : function(el) { if(el.flipswitch) el.flipswitch.refresh(); else new jcc.flipswitch(el).refresh(); },
	unenhance : function(el) { if(el.flipswitch) el.flipswitch.destroy(); }
};
jcc.flipswitch = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var toggle;
	var input = null;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.flipswitch = this;
		
		
		el.classList.add("jcc-flipswitch");
		
		input = el.querySelector("input[type=checkbox]");
		if(input)
		{
			toggle = document.createElement("div");
			jcc.insertAfter(toggle, input);
			toggle.classList.add("jcc-flipswitch-toggle-" + theme);
			
			input.classList.add("jcc-flipswitch-input-" + theme);
		}
	}
	
	this.destroy = function()
	{	
		if(el.flipswitch)
		{
			el.classList.remove("jcc-flipswitch");
			
			if(input)
			{
				input.classList.remove("jcc-flipswitch-input-" + theme);
				input = null;
			}
			
			delete el.flipswitch;
		}
		
		if(toggle)
		{
			jcc.detach(toggle);
			toggle = null;
		}
	}
	
	this.checked = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.checked = arguments[0];
				
			return input.checked;
		}
		
		return false;
	}
	
	this.disabled = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.disabled = arguments[0];
				
			return input.disabled;
		}
		
		return false;
	}
};

/* TEXTINPUT */
jcc.widgets["inputfield"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "inputfield";
	},
	enhance : function(el) { if(el.inputfield) el.inputfield.refresh(); else new jcc.inputfield(el).refresh(); },
	unenhance : function(el) { if(el.inputfield) el.inputfield.destroy(); }
};
jcc.inputfield = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var input = null, type, div;
	var icon = null, icon_pos;
	
	function onFocusDate(evt)
	{
		jcc.datetime(input, jcc.options["datetime"].DIALOG_MODE.DATE);
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onFocusTime(evt)
	{
		jcc.datetime(input, jcc.options["datetime"].DIALOG_MODE.TIME);
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onFocusDateTime(evt)
	{
		jcc.datetime(input, jcc.options["datetime"].DIALOG_MODE.DATE|jcc.options["datetime"].DIALOG_MODE.TIME);
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onFocusColor(evt)
	{
		jcc.colorpicker(input, jcc.options["colorpicker"].COLOR_FORMAT.HEX);
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.inputfield = this;
		
		//Set defaults
		if(el.dataset.isotope != "normal" && el.dataset.isotope != "underscore")
			el.dataset.isotope = "normal";
		
		input = el.querySelector("input");
		if(input)
		{
			div = document.createElement("div");
			jcc.insertAfter(div, input);
			
			el.classList.add("jcc-inputfield-" + theme);
			
			input.classList.add("jcc-inputfield-input-" + theme);
			
			type = input.getAttribute("type");
			type = type.toLowerCase();
			
			if(type == "date" && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
			{
				input.setAttribute("readonly", "readonly");
				input.setAttribute("type", "text");
				input.addEventListener("focus", onFocusDate, false);
			}
			else if(type == "time" && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
			{
				input.setAttribute("readonly", "readonly");
				input.setAttribute("type", "text");
				input.addEventListener("focus", onFocusTime, false);
			}
			else if((type == "datetime" || type == "datetime-local") && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
			{
				input.setAttribute("readonly", "readonly");
				input.setAttribute("type", "text");
				input.addEventListener("focus", onFocusDateTime, false);
			}
			else if(type == "color" && (!jcc.inputTypeSupported(type) || jcc.options["colorpicker"]["overrideDefaultInputType"]))
			{
				input.setAttribute("readonly", "readonly");
				input.setAttribute("type", "text");
				input.addEventListener("focus", onFocusColor, false);
			}
			
			icon = el.querySelector("i[data-role='icon']");
			if(icon)
			{
				icon_pos = icon.dataset.position != "right" ? "left" : "right";
				input.classList.add("jcc-inputfield-iconic-" + icon_pos);
			}
		}
	}
	
	this.destroy = function()
	{	
		if(el.inputfield)
		{
			el.classList.remove("jcc-inputfield-" + theme);
			
			if(input)
			{
				input.classList.remove("jcc-inputfield-input-" + theme);
				
				if(type == "date" && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
				{
					input.setAttribute("type", type);
					input.removeEventListener("focus", onFocusDate);
				}
				else if(type == "time" && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
				{
					input.setAttribute("type", type);
					input.removeEventListener("focus", onFocusTime);
				}
				else if((type == "datetime" || type == "datetime-local") && (!jcc.inputTypeSupported(type) || jcc.options["datetime"]["overrideDefaultInputType"]))
				{
					input.setAttribute("type", type);
					input.removeEventListener("focus", onFocusDateTime);
				}
				else if(type == "color" && (!jcc.inputTypeSupported(type) || jcc.options["colorpicker"]["overrideDefaultInputType"]))
				{
					input.setAttribute("type", type);
					input.removeEventListener("focus", onFocusColor);
				}
			
				if(icon)
				{
					input.classList.remove("jcc-inputfield-iconic-" + icon_pos);
					icon = null;
				}
				
				input = null;
			}
	
			delete el.inputfield;
		}
		
		if(div)
		{
			jcc.detach(div);
			div = null;
		}
	}
	
	this.value = function(/*val*/)
	{	
		var val = arguments.length > 0 ? arguments[0] : (input ? input.value : "");
		if(input && arguments.length > 0)
			input.value = val;
		
		return val;
	}
	
	this.disabled = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.disabled = arguments[0];
				
			return input.disabled;
		}
		
		return false;
	}
};

/* TEXTAREA */
jcc.widgets["textarea"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "textarea";
	},
	enhance : function(el) { if(el.textarea) el.textarea.refresh(); else new jcc.textarea(el).refresh(); },
	unenhance : function(el) { if(el.textarea) el.textarea.destroy(); }
};
jcc.textarea = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	var input = null;
	var icon = null, icon_pos;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.textarea = this;
		
		el.classList.add("jcc-textarea-" + theme);
		
		input = el.querySelector("textarea");
		if(input)
		{
			icon = el.querySelector("i[data-role='icon']");
			if(icon)
			{
				icon_pos = icon.dataset.position != "right" ? "left" : "right";
				input.classList.add("jcc-textarea-iconic-" + icon_pos);
			}
		}
	}
	
	this.destroy = function()
	{	
		if(el.textarea)
		{
			el.classList.remove("jcc-textarea-" + theme);
			
			if(input)
			{
				if(icon)
				{
					input.classList.remove("jcc-textarea-iconic-" + icon_pos);
					icon = null;
				}
				
				input = null;
			}
	
			delete el.textarea;
		}
	}
	
	this.value = function(/*val*/)
	{	
		var val = arguments.length > 0 ? arguments[0] : (input ? input.value : "");
		if(input && arguments.length > 0)
			input.value = val;
		
		return val;
	}
	
	this.disabled = function()
	{
		if(input)
		{
			if(arguments.length > 0)
				input.disabled = arguments[0];
				
			return input.disabled;
		}
		
		return false;
	}
};

/* BUTTON */
jcc.widgets["button"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return (el.nodeName == "LABEL" || el.nodeName == "A") && el.getAttribute("data-role") == "button";
	},
	enhance : function(el) { if(el.button) el.button.refresh(); else new jcc.button(el).refresh(); },
	unenhance : function(el) { if(el.button) el.button.destroy(); }
};
jcc.button = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme, div, button;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth" && el.dataset.corners != "round")
			el.dataset.corners = "smooth";
			
		if(el.dataset.action != "yes" && el.dataset.action != "no")
			el.dataset.action = "no";
			
		if(el.dataset.sized != "yes" && el.dataset.sized != "no")
			el.dataset.sized = "no";
			
		if(el.dataset.isotope == undefined || el.dataset.isotope.length == 0)
			el.dataset.isotope = "normal";
			
		el.button = this;
		
		div = document.createElement("div");
		button = el.querySelector("button");
		if(button)
			jcc.insertAfter(div, button);
		else
		{
			var icon = el.querySelector("i");
			if(icon)
				jcc.insertBefore(div, icon);
			else
			{
				var span = el.querySelector("span");
				if(span)
					jcc.insertBefore(div, span);
			}
		}
		
		if(el.dataset.backgroundColor != undefined && el.dataset.backgroundColor.length > 0)
			div.style.backgroundColor = el.dataset.backgroundColor;
		
		el.classList.add("jcc-button");
		el.classList.add("jcc-button-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.button)
		{
			el.classList.remove("jcc-button");
			el.classList.remove("jcc-button-" + theme);
		
			delete el.button;
		}
		
		if(div)
		{
			jcc.detach(div);
			div = null;
		}
		
		button = null;
	}
	
	this.disabled = function()
	{
		if(button)
		{
			if(arguments.length > 0)
				button.disabled = arguments[0];
				
			return button.disabled;
		}
		
		return false;
	}
};

/* DELIMITER */
jcc.widgets["delimiter"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "delimiter";
	},
	enhance : function(el) { if(el.delimiter) el.delimiter.refresh(); else new jcc.delimiter(el).refresh(); },
	unenhance : function(el) { if(el.delimiter) el.delimiter.destroy(); }
};
jcc.delimiter = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.delimiter = this;
		
		//Set defaults
		if(!el.dataset.colors)
			el.dataset.colors = "";
			
		if(!el.dataset.thickness)
			el.dataset.thickness = "1";
		
		el.classList.add("jcc-delimiter-" + theme);
		
		var thickness = parseInt(el.dataset.thickness);
		if(isNaN(thickness) || thickness < 0)
			thickness = 1;
	
		if(el.dataset.orientation == "vertical")
		{
			el.style.width = thickness + "px";
			if(el.dataset.colors.length > 0)
			{
				el.style.background = "-moz-linear-gradient(to bottom, " + el.dataset.colors + ")";
				el.style.background = "-webkit-linear-gradient(to bottom, " + el.dataset.colors + ")";
				el.style.background = "linear-gradient(to bottom, " + el.dataset.colors + ")";
			}			
		}
		else
		{
			el.style.height = thickness + "px";
			if(el.dataset.colors.length > 0)
			{
				el.style.background = "-moz-linear-gradient(to right, " + el.dataset.colors + ")";
				el.style.background = "-webkit-linear-gradient(to right, " + el.dataset.colors + ")";
				el.style.background = "linear-gradient(to right, " + el.dataset.colors + ")";
			}
		}
	}
	
	this.destroy = function()
	{	
		if(el.delimiter)
		{
			el.classList.remove("jcc-delimiter-" + theme);
			el.style.width = "";
			el.style.height = "";
			el.style.background = "";
			
			delete el.delimiter;
		}
	}
};

/* TRIANGLE */
jcc.widgets["triangle"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "triangle";
	},
	enhance : function(el) { if(el.triangle) el.triangle.refresh(); else new jcc.triangle(el).refresh(); },
	unenhance : function(el) { if(el.triangle) el.triangle.destroy(); }
};
jcc.triangle = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		theme = this.theme();
		
		el.triangle = this;
		
		if(el.dataset.direction != "left" &&
		el.dataset.direction != "right" &&
		el.dataset.direction != "top" &&
		el.dataset.direction != "bottom")
		{
			el.dataset.direction = "left";
		}
		
		el.classList.add("jcc-triangle-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.triangle)
		{
			el.classList.remove("jcc-triangle-" + theme);
			delete el.triangle;
		}
	}
};

/* DRAGON */
jcc.widgets["dragon"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "dragon";
	},
	enhance : function(el) { if(el.dragon) el.dragon.refresh(); else new jcc.dragon(el).refresh(); },
	unenhance : function(el) { if(el.dragon) el.dragon.destroy(); }
};
jcc.dragon = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var MOVED_THRESHOLD = 2;
	
	var directions, rectConstraint, parentPointerAnchor, 
	movable, position, s_left, s_top, prex, prey, gainx, gainy, will_move,
	parent, pixelsMoved;
	
	function prepareMovableAndParent()
	{
		movable.classList.remove("jcc-dragon-make-it-movable");
		parent.classList.remove("jcc-dragon-make-it-movable-host");
		
		position = jcc.getComputedStyle(movable, "position");
		if(position == "static")
		{
			movable.classList.add("jcc-dragon-make-it-movable");
			position = "absolute";
		}
		if(position == "absolute" && jcc.getComputedStyle(parent, "position") == "static" && parent != document.body)
			parent.classList.add("jcc-dragon-make-it-movable-host");
	}
	
	function onPlayersResize(evt)
	{
		prepareMovableAndParent();
	
		var movableRect = jcc.getElementLocalRect(movable);
		var w = movableRect.width;
		var h = movableRect.height;
		
		var parentRect = position == "absolute" ? jcc.getElementLocalRect(parent) : jcc.getViewportRect();
		
		if(directions.x)
		{
			var px = parseInt(jcc.getComputedStyle(movable, "left"));
			var correction = false;
			
			if( !isNaN(rectConstraint["right"]) ) //right
			{
				if(px + w > parentRect.right - rectConstraint["right"])
				{
					px = parentRect.right - w - rectConstraint["right"];
					correction = true;
				}
			}
			if( !isNaN(rectConstraint["left"]) ) //left
			{
				if(px < parentRect.left + rectConstraint["left"])
				{
					px = parentRect.left + rectConstraint["left"];
					correction = true;
				}
			}
			
			if(correction == true)
				movable.style.left = px + "px";
		}
		
		if(directions.y)
		{
			var py = parseInt(jcc.getComputedStyle(movable, "top"));
			
			if( !isNaN(rectConstraint["bottom"]) ) //bottom
			{
				if(py + h > parentRect.bottom - rectConstraint["bottom"])
				{
					py = parentRect.bottom - h - rectConstraint["bottom"];
					correction = true;
				}
			}
			if( !isNaN(rectConstraint["top"]) ) //top
			{
				if(py < parentRect.top + rectConstraint["top"])
				{
					py = parentRect.top + rectConstraint["top"];
					correction = true;
				}
			}
			
			if(correction == true)
				movable.style.top = py + "px";
		}
	}
	
	function onElementClick(evt)
	{
		if(pixelsMoved > MOVED_THRESHOLD)
		{
			pixelsMoved = 0;
			evt.preventDefault();
			evt.stopPropagation();
		}
	}
	
	function onElementPointerDown(evt)
	{
		if(will_move)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		if(parentPointerAnchor)
			return;
			
		prepareMovableAndParent();
			
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
		
		prex = pageX;
		prey = pageY;
		
		pixelsMoved = 0;
		gainx = gainy = 0;
		s_left = parseInt(jcc.getComputedStyle(movable, "left"));
		s_top = parseInt(jcc.getComputedStyle(movable, "top"));
		
		if(directions.x || directions.y)
		{
			will_move = true;
			
			jcc.dispatchCustomEvent(movable, "e-dragstart", { bubbles: false, cancelable: false });
			jcc.dispatchCustomEvent(movable, "e-drag", { bubbles: false, cancelable: false });
		}
	}
	
	function onDocumentPointerDown(evt)
	{
		if(will_move)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		if(!parentPointerAnchor)
			return;
			
		if(!jcc.isVisible(movable))
			return;
			
		prepareMovableAndParent();
			
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
		
		pixelsMoved = 0;
		var movableRect = jcc.getElementRect(movable);
		var w = movableRect.width;
		var h = movableRect.height;
		
		var parentPageRect = jcc.getElementRect(parent);
		var parentRect = position == "absolute" ? jcc.getElementLocalRect(parent) : jcc.getViewportRect();
		
		if(position == "absolute")
		{	
			//Make sure we clicked within the parent rect
			if( pageX < parentPageRect.left || pageX > parentPageRect.right || 
				pageY < parentPageRect.top || pageY > parentPageRect.bottom )
			{
				if( pageX < movableRect.left || pageX > movableRect.right || 
					pageY < movableRect.top || pageY > movableRect.bottom )
				{
					return;
				}
			}
		}
		
		prex = pageX;
		prey = pageY;
		gainx = gainy = 0;
			
		var px = position == "absolute" ? (pageX - parentPageRect.left) : (pageX - window.pageXOffset);
		var py = position == "absolute" ? (pageY - parentPageRect.top) : (pageY - window.pageYOffset);
		
		if(parentPointerAnchor.x == "left")
			px -= 0;
		else if(parentPointerAnchor.x == "center")
			px -= Math.round(w / 2);
		else if(parentPointerAnchor.x == "right")
			px -= w;
		else
			px -= parentPointerAnchor.x;
			
		if(parentPointerAnchor.y == "top")
			py -= 0;
		else if(parentPointerAnchor.y == "center")
			py -= Math.round(h / 2);
		else if(parentPointerAnchor.y == "bottom")
			py -= h;
		else
			py -= parentPointerAnchor.y;
		
		if(directions.x)
		{
			if( !isNaN(rectConstraint["right"]) ) //right
			{
				if(px + w > parentRect.right - rectConstraint["right"])
				{
					gainx = -(parentRect.right - rectConstraint["right"] - (px + w));
					px = parentRect.right - w - rectConstraint["right"];
				}
			}
			if( !isNaN(rectConstraint["left"]) ) //left
			{
				if(px < parentRect.left + rectConstraint["left"])
				{
					gainx = -(parentRect.left + rectConstraint["left"] - px);
					px = parentRect.left + rectConstraint["left"];
				}
			}
			
			movable.style.left = px + "px";
			s_left = px;
			will_move = true;
		}
		
		if(directions.y)
		{
			if( !isNaN(rectConstraint["bottom"]) ) //bottom
			{
				if(py + h > parentRect.bottom - rectConstraint["bottom"])
				{
					gainy = -(parentRect.bottom - rectConstraint["bottom"] - (py + h));
					py = parentRect.bottom - h - rectConstraint["bottom"];
				}
			}
			if( !isNaN(rectConstraint["top"]) ) //top
			{
				if(py < parentRect.top + rectConstraint["top"])
				{
					gainy = -(parentRect.top + rectConstraint["top"] - py);
					py = parentRect.top + rectConstraint["top"];
				}
			}
			
			movable.style.top = py + "px";
			s_top = py;
			will_move = true;
		}
		
		if(will_move)
		{
			jcc.dispatchCustomEvent(movable, "e-dragstart", { bubbles: false, cancelable: false });
			jcc.dispatchCustomEvent(movable, "e-drag", { bubbles: false, cancelable: false });
		}
	}
	
	function onDocumentPointerMove(evt)
	{
		if(!will_move)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		evt.preventDefault();
		evt.stopPropagation();
		
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		pageX -= window.pageXOffset;
		pageY -= window.pageYOffset;
		
		var movableRect = jcc.getElementLocalRect(movable);
		var w = movableRect.width;
		var h = movableRect.height;
		
		var parentRect = position == "absolute" ? jcc.getElementLocalRect(parent) : jcc.getViewportRect();
		
		if(directions.x)
		{
			var dx = pageX - prex;
			pixelsMoved += Math.abs(dx);
			
			gainx += dx;
			var px = s_left + gainx;
			
			if( !isNaN(rectConstraint["right"]) ) //right
			{
				if(px + w > parentRect.right - rectConstraint["right"])
					px = parentRect.right - w - rectConstraint["right"];
			}
			if( !isNaN(rectConstraint["left"]) ) //left
			{
				if(px < parentRect.left + rectConstraint["left"])
					px = parentRect.left + rectConstraint["left"];
			}
			
			movable.style.left = px + "px";
		}
		prex = pageX;
		
		if(directions.y)
		{
			var dy = pageY - prey;
			pixelsMoved += Math.abs(dy);
			
			gainy += dy;
			var py = s_top + gainy;
			
			if( !isNaN(rectConstraint["bottom"]) ) //bottom
			{
				if(py + h > parentRect.bottom - rectConstraint["bottom"])
					py = parentRect.bottom - h - rectConstraint["bottom"];
			}
			if( !isNaN(rectConstraint["top"]) ) //top
			{
				if(py < parentRect.top + rectConstraint["top"])
					py = parentRect.top + rectConstraint["top"];
			}
			
			movable.style.top = py + "px";
		}
		prey = pageY;
		
		jcc.dispatchCustomEvent(movable, "e-drag", { bubbles: false, cancelable: false });
	}
	
	function onDocumentPointerUp(evt)
	{
		if(will_move)
		{
			jcc.dispatchCustomEvent(movable, "e-dragend", { bubbles: false, cancelable: false });
			will_move = false;
		}
	}
	
	function onEDragstart(event)
	{
		if(movable.dataset.eDragstart && movable.dataset.eDragstart.length > 0)
			eval(movable.dataset.eDragstart);
	}
	
	function onEDrag(event)
	{
		if(movable.dataset.eDrag && movable.dataset.eDrag.length > 0)
			eval(movable.dataset.eDrag);
	}
	
	function onEDragend(event)
	{
		if(movable.dataset.eDragend && movable.dataset.eDragend.length > 0)
			eval(movable.dataset.eDragend);
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		movable = el.parentNode;
		if(movable == document.body)
		{
			alert("JCC: document.body element cannot be dragged using the 'dragon' widget!");
			return;
		}
		parent = movable.parentNode;
		
		el.dragon = this;
		
		//Set defaults
		if(el.dataset.rectConstraint == undefined || el.dataset.rectConstraint.length == 0)
			el.dataset.rectConstraint = "left:none right:none top:none bottom:none";
		
		if(el.dataset.directions == undefined || el.dataset.directions.length == 0)
			el.dataset.directions = "h v";
			
		if(el.dataset.parentPointerAnchor == undefined)
			el.dataset.parentPointerAnchor = "";
			
		rectConstraint = { left: "none", right: "none", top: "none", bottom: "none" };	
		var props = el.dataset.rectConstraint.toLowerCase().split(" ");
		if(props.length > 0)
		{
			for(var i=0;i<props.length;i++)
			{
				var parts = props[i].split(":");
				if(parts[0] == "left" || parts[0] == "right" || parts[0] == "top" || parts[0] == "bottom")
				{
					var c = parseInt(parts[1]);
					if(!isNaN(c))
						rectConstraint[parts[0]] = c;
				}
			}
		}

		if(el.dataset.parentPointerAnchor.length > 0)
		{
			parentPointerAnchor = {x: "center", y: "center"};
			
			var props = el.dataset.parentPointerAnchor.toLowerCase().split(" ");
			if(props[0])
			{
				if(props[0] == "left" || props[0] == "center" || props[0] == "right")
					parentPointerAnchor.x = props[0];
				else
				{
					parentPointerAnchor.x = parseInt(props[0]);
					parentPointerAnchor.x = isNaN(parentPointerAnchor.x) ? "center" : parentPointerAnchor.x;
				}
			}
			if(props[1])
			{
				if(props[1] == "top" || props[1] == "center" || props[1] == "bottom")
					parentPointerAnchor.y = props[1];
				else
				{
					parentPointerAnchor.y = parseInt(props[1]);
					parentPointerAnchor.y = isNaN(parentPointerAnchor.y) ? "center" : parentPointerAnchor.y;
				}
			}
		}
		
		directions = { x: false, y: false };
		var props = el.dataset.directions.toLowerCase().split(" ");
		for(var i=0;i<props.length;i++)
		{
			var p = props[i];
			if(p == "h")
				directions.x = true;
			else if(p == "v")	
				directions.y = true;
		}
		
		el.classList.add("jcc-dragon");
		if(directions.x && directions.y)
			el.classList.add("jcc-dragon-hv");
		else if(directions.x)
			el.classList.add("jcc-dragon-h");
		else if(directions.y)
			el.classList.add("jcc-dragon-v");
			
		pixelsMoved = 0;
			
		document.addEventListener("mousedown", onDocumentPointerDown, false);
		document.addEventListener("touchstart", onDocumentPointerDown, false);
	
		el.addEventListener("mousedown", onElementPointerDown, false);
		el.addEventListener("touchstart", onElementPointerDown, false);
		
		el.addEventListener("click", onElementClick, false);
		
		document.addEventListener("mousemove", onDocumentPointerMove, false);
		document.addEventListener("touchmove", onDocumentPointerMove, false);
		
		document.addEventListener("mouseup", onDocumentPointerUp, false);
		document.addEventListener("touchend", onDocumentPointerUp, false);
		
		movable.addEventListener("e-dragstart", onEDragstart, false);
		movable.addEventListener("e-drag", onEDrag, false);
		movable.addEventListener("e-dragend", onEDragend, false);
		
		parent.addEventListener("e-resized", onPlayersResize, false);
		movable.addEventListener("e-resized", onPlayersResize, false);
		
		jcc.resizeMonitor.addElement(parent);
		jcc.resizeMonitor.addElement(movable);
	}
	
	this.destroy = function()
	{	
		if(el.dragon)
		{
			el.classList.remove("jcc-dragon");
			
			if(directions.x && directions.y)
				el.classList.remove("jcc-dragon-hv");
			else if(directions.x)
				el.classList.remove("jcc-dragon-h");
			else if(directions.y)
				el.classList.remove("jcc-dragon-v");
				
			jcc.resizeMonitor.removeElement(parent);
				
			parent.removeEventListener("e-resized", onPlayersResize);
			movable.removeEventListener("e-resized", onPlayersResize);
				
			document.removeEventListener("mousedown", onDocumentPointerDown);
			document.removeEventListener("touchstart", onDocumentPointerDown);
	
			el.removeEventListener("mousedown", onElementPointerDown);
			el.removeEventListener("touchstart", onElementPointerDown);
			el.removeEventListener("click", onElementClick);

			document.removeEventListener("mousemove", onDocumentPointerMove);
			document.removeEventListener("touchmove", onDocumentPointerMove);
			
			document.removeEventListener("mouseup", onDocumentPointerUp);
			document.removeEventListener("touchend", onDocumentPointerUp);
			
			if(movable)
			{
				movable.removeEventListener("e-dragstart", onEDragstart);
				movable.removeEventListener("e-drag", onEDrag);
				movable.removeEventListener("e-dragend", onEDragend);
				
				movable.classList.remove("jcc-dragon-make-it-movable");
				movable = null;
			}
			
			if(parent)
			{
				parent.classList.remove("jcc-dragon-make-it-movable-host");
				parent = null;
			}
			
			delete el.dragon;
		}
	}
};

/* PAGEVIEW */
jcc.widgets["pageview"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return (el.nodeName == "BODY" || el.nodeName == "DIV") && el.getAttribute("data-role") == "pageview";
	},
	enhance : function(el) { if(el.pageview) el.pageview.refresh(); else new jcc.pageview(el).refresh(); },
	unenhance : function(el) { if(el.pageview) el.pageview.destroy(); }
};
jcc.pageview = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var animation;
	
	function onEChanged(event)
	{
		el.dataset.page = event.detail.page;
		
		if(el.dataset.eChanged && el.dataset.eChanged.length > 0)
			eval(el.dataset.eChanged);
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		el.pageview = this;
		
		//Set defaults
		if(!el.dataset.page)
			el.dataset.page = "";
			
		if(!el.dataset.animation || el.dataset.animation.length == 0)
			el.dataset.animation = "none";
			
		if(el.dataset.history != "yes" && el.dataset.history != "no")
			el.dataset.history = "yes";
		
		animation = el.dataset.animation;
			
		el.classList.add("jcc-pageview");
		
		el.addEventListener("e-changed", onEChanged, false);
	}
	
	this.destroy = function()
	{	
		el.removeEventListener("e-changed", onEChanged);
		
		if(el.pageview)
		{
			el.classList.remove("jcc-pageview");
			delete el.pageview;
		}
	}
	
	this.page = function(pageID, overrideHistoryState)
	{
		if(arguments.length == 0)
			return el.dataset.page;
		else
		{
			if(pageID && pageID.length > 0)
			{
				var pageEl = document.getElementById(pageID);
				if(pageEl && pageEl.page && !pageEl.page.isLoaded())
				{
					if(el.dataset.history == "yes")
					{
						var hash = location.hash.substr(1);
						var argIdx = hash.indexOf("?");
						var urlArgs = "";
						if(argIdx > -1)
							urlArgs = hash.substr(argIdx);
				
						if(overrideHistoryState)
						{
							var state = jcc.historyStateCopy(jcc.currentHistoryState());
							state.page = pageEl.id;
							
							window.history.replaceState(null, "", jcc.historyStateToHash(state) + urlArgs);
						}
						else
						{
							location.hash = "#" + pageEl.id + urlArgs;
						}
					}
					else
					{
						var prevPageID = this.page();
						var prevPageEl = document.getElementById(prevPageID);
						
						var reversedAnimation = false;
						
						if(prevPageEl && prevPageEl.page && prevPageEl.page.isLoaded())
						{
							var prevPageIndex = -1, nextPageIndex = -1;
							var allPages = el.querySelectorAll("*[data-role='page']");
							for(var i=0;i<allPages.length;i++)
							{
								if(allPages[i] == prevPageEl)
									prevPageIndex = i;
								else if(allPages[i] == pageEl)
									nextPageIndex = i;
									
								if(nextPageIndex > -1 && prevPageIndex > -1)
								{
									reversedAnimation = nextPageIndex < prevPageIndex;
									break;
								}
							}
							
							prevPageEl.page.__unload(reversedAnimation);
						}
							
						pageEl.page.__load(reversedAnimation);
					}
				}
			}
		}
	}
};

/* PAGE */
jcc.widgets["page"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "page";
	},
	enhance : function(el) { if(el.page) el.page.refresh(); else new jcc.page(el).refresh(); },
	unenhance : function(el) { if(el.page) el.page.destroy(); }
};
jcc.page = function(el)
{
	this.container = jcc.container;
	this.container(el);
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var pageview, loaded,
	animation, parentClass;
	
	function onELoad(event)
	{
		if(el.dataset.eLoad && el.dataset.eLoad.length > 0)
			eval(el.dataset.eLoad);
	}
	
	function onEUnload(event)
	{
		if(el.dataset.eUnload && el.dataset.eUnload.length > 0)
			eval(el.dataset.eUnload);
	}
	
	function onOutAnimationEnd()
	{
		if(!el.page)
			return;
			
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		el.classList.add("jcc-page-hidden");
	}
	
	function removeAnimationClasses()
	{
		el.classList.remove("jcc-animation-" + animation);
		el.classList.remove("jcc-in");
		el.classList.remove("jcc-out");
		el.classList.remove("jcc-back");
		if(parentClass && parentClass != "")
		{
			el.parentNode.classList.remove(parentClass);
			parentClass = null;
		}
	}
	
	function readAnimation()
	{
		animation = el.dataset.animation;
		if(!animation)
		{
			animation = el.parentNode.dataset.animation;
			if(!animation)
				animation = "none";
		}
		animation = jcc.animations[animation];
		if(animation)
		{
			animation = animation.suffix;
			parentClass = animation.parentClass;
		}
		else
		{
			animation = "none";
			parentClass = null;
		}
	}
	
	this.setOptions = function(opt)
	{
		var refresh = false;
		for(var o in opt)
		{
			if(typeof opt[o] == "number" || typeof opt[o] == "string")
				el.dataset[o] = opt[o].toString();
				
			if(o != "animation")
				refresh = true;
		}
		if(refresh)
			this.refresh();
	}
	
	this.pageview = function() { return pageview; }
	
	this.refresh = function()
	{	
		if(!el.id || el.id.length == 0)
		{
			alert("JCC: Each 'page' should have its unique 'id' attribute in the HTML markup!");
			return;
		}
		
		if(el.id.indexOf("|") > 0)
		{
			alert("JCC: A 'page' may not contain | in its ID as it is reserved for URL encoding!");
			return;
		}
		
		if(el.parentNode.dataset.role != "pageview")
		{
			alert("JCC: A 'page' can exist only as a direct child of a 'pageview'! Please fix your HTML markup!");
			return;
		}
		
		this.destroy();
		this.super_refresh();
		
		el.page = this;
		
		loaded = false;
		
		pageview = el.parentNode.pageview;
		
		el.classList.add("jcc-page");
		el.classList.add("jcc-page-hidden");
		
		el.addEventListener("e-load", onELoad, false);
		el.addEventListener("e-unload", onEUnload, false);
		
		if(pageview.page() == el.id)
		{
			//Load the page only if history is off, or hash is not set
			if(pageview.element().dataset.history != "yes" || location.hash == "" || location.hash.substr(1) == "")
				pageview.page(el.id, true);
		}
	}
	
	this.load = function(overrideHistoryState)
	{
		if(!el.page || loaded)
			return;
			
		pageview.page(el.id, overrideHistoryState);
	}
	
	this.__load = function(animationReversed)
	{
		if(!el.page || loaded)
			return;
			
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		//Prev animation cleanup
		removeAnimationClasses();
		
		//Prepare new animation
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		el.classList.remove("jcc-page-hidden");
		el.classList.remove("jcc-page-front");
		
		el.classList.add("jcc-in");
		
		if(animationReversed)
			el.classList.add("jcc-back");
		
		loaded = true;
		
		pageview.element().dataset.page = el.id;
		
		jcc.dispatchCustomEvent(el, "e-load", { bubbles: false, cancelable: false });
		jcc.dispatchCustomEvent(pageview.element(), "e-changed", { bubbles: false, cancelable: false, detail: { page: el.id } });
	}
	
	this.__unload = function(animationReversed)
	{
		if(!el.page || !loaded)
			return;
		
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		//Prev animation cleanup
		removeAnimationClasses();
		
		//Prepare new animation
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		el.classList.add("jcc-page-front");
		
		if( animation == "none" )
			onOutAnimationEnd();
		else
		{
			el.classList.add("jcc-out");
			
			if(animationReversed)
				el.classList.add("jcc-back");
			
			if(jcc.addAnimationEndListener(el, onOutAnimationEnd, false) == false)
				onOutAnimationEnd();
		}
		
		loaded = false;
		jcc.dispatchCustomEvent(el, "e-unload", { bubbles: false, cancelable: false });
	}
	
	this.isLoaded = function()
	{
		return loaded && el.page;
	}
	
	this.destroy = function()
	{	
		this.super_destroy();
		
		el.removeEventListener("e-load", onELoad);
		el.removeEventListener("e-unload", onEUnload);
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		removeAnimationClasses();
			
		if(pageview)
			pageview = null;
		
		if(el.page)
		{
			el.classList.remove("jcc-page");
			el.classList.remove("jcc-page-hidden");
			el.classList.remove("jcc-page-front");
			delete el.page;
		}
	}
};

/* TOOLBAR */
jcc.widgets["toolbar"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "toolbar";
	},
	enhance : function(el) { if(el.toolbar) el.toolbar.refresh(); else new jcc.toolbar(el).refresh(); },
	unenhance : function(el) { if(el.toolbar) el.toolbar.destroy(); }
};
jcc.toolbar = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.toolbar = this;
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.fixed != "yes" && el.dataset.fixed != "no")
			el.dataset.fixed = "no";
			
		if(el.dataset.orientation != "horizontal" && el.dataset.orientation != "vertical")
			el.dataset.orientation = "horizontal";
			
		if(el.dataset.size != "tiny" && el.dataset.size != "small" && el.dataset.size != "medium" && 
		el.dataset.size != "large" && el.dataset.size != "huge")
		{
			el.dataset.size = "medium";
		}
		
		if(el.dataset.orientation == "horizontal")
		{
			if(el.dataset.position != "top" && el.dataset.position != "bottom")
				el.dataset.position = "top";
		}
		else //if(el.dataset.orientation == "vertical")
		{
			if(el.dataset.position != "left" && el.dataset.position != "right")
				el.dataset.position = "left";
		}
			
		if(el.dataset.fixed != "yes")
		{
			var parentPosition = jcc.getComputedStyle(el.parentNode, "position");
			if(parentPosition == "static" && el.parentNode.nodeName != "BODY") //BODY may not have a position attribute
				el.parentNode.classList.add("jcc-toolbar-parent-relative");
		}
		
		el.classList.add("jcc-toolbar");
		el.classList.add("jcc-toolbar-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.toolbar)
		{
			el.classList.remove("jcc-toolbar");
			el.classList.remove("jcc-toolbar-" + theme);
			
			delete el.toolbar;
		}
	}
};

/* ICONIC-LINK */
jcc.widgets["iconic-link"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "A" && el.getAttribute("data-role") == "iconic-link";
	},
	enhance : function(el) { if(el.iconicLink) el.iconicLink.refresh(); else new jcc.iconicLink(el).refresh(); },
	unenhance : function(el) { if(el.iconicLink) el.iconicLink.destroy(); }
};
jcc.iconicLink = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.iconicLink = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-iconic-link");
	}
	
	this.destroy = function()
	{	
		if(el.iconicLink)
		{
			el.classList.remove("jcc-iconic-link");
			
			delete el.iconicLink;
		}
	}
};

/* SCROLLABLE */
jcc.widgets["scrollable"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "scrollable";
	},
	enhance : function(el) { if(el.scrollable) el.scrollable.refresh(); else new jcc.scrollable(el).refresh(); },
	unenhance : function(el) { if(el.scrollable) el.scrollable.destroy(); }
};
jcc.scrollable = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme, contents, hscroll, vscroll, hdragon, vdragon;
	var frameH, offsetH, velocityH, amplitudeH, prevX, targetScrollLeft;
	var frameV, offsetV, velocityV, amplitudeV, prevY, targetScrollTop;
	var pressed, timestamp, continueTrackVelocity, mouseWheel;
	var canScrollH, canScrollV, scrollbarsVisible, kinetics, movedDeltaH, movedDeltaV;
	var timeConstant = 325, hideScrollbarsAfter = 250, hideTimeout, scrollbarsVisibility;
	
	var MAX_VELOCITY = 1000;
	
	//For the smooth scrolling
	var WHEEL_SCROLL_SPEED = 250;
	var MIN_WHEEL_SCROLL_STEP = 30;
	var startSmoothScrollTop, startSmoothScrollLeft, smoothScrollFrame, smoothScrollStartTime, shoothScrolling, wheelScrollStep;
	
	var MOVED_THRESHOLD = 2;
	
	function adjustScrollbars()
	{
		var rect = jcc.getElementLocalRect(contents);
		
		if(canScrollH)
		{
			var hsize = Math.round(Math.max((rect.width / contents.scrollWidth) * rect.width, 20));
			var hpos = Math.round(((rect.width - hsize) / (contents.scrollWidth - rect.width)) * contents.scrollLeft);
			hscroll.style.width = hsize + "px";
			hscroll.style.left = hpos + "px";
			
			if(rect.width >= contents.scrollWidth || rect.width < hsize)
				hscroll.classList.add("jcc-hidden-scroll");
			else if(scrollbarsVisibility != 0) //not none
				hscroll.classList.remove("jcc-hidden-scroll");
		}
		
		if(canScrollV)
		{
			var vsize = Math.round(Math.max((rect.height / contents.scrollHeight) * rect.height, 20));
			var vpos = Math.round(((rect.height - vsize) / (contents.scrollHeight - rect.height)) * contents.scrollTop);
				
			vscroll.style.height = vsize + "px";
			vscroll.style.top = vpos + "px";
				
			if(rect.height >= contents.scrollHeight || rect.height < vsize)
				vscroll.classList.add("jcc-hidden-scroll");
			else if(scrollbarsVisibility != 0) //not none
				vscroll.classList.remove("jcc-hidden-scroll");
		}
	}
	
	function removeScrollbarsAnimation()
	{
		if(canScrollH && hscroll)
		{
			hscroll.classList.remove("jcc-animation-slow-fade");
			hscroll.classList.remove("jcc-in");
			hscroll.classList.remove("jcc-out");
		}
		
		if(canScrollV && vscroll)
		{
			vscroll.classList.remove("jcc-animation-slow-fade");
			vscroll.classList.remove("jcc-in");
			vscroll.classList.remove("jcc-out");
		}
	}
	
	function showScrollbars()
	{
		if(scrollbarsVisibility != 1 || scrollbarsVisible)
			return;
			
		scrollbarsVisible = true;
		
		removeScrollbarsAnimation();
		
		if(canScrollH && hscroll)
		{
			hscroll.classList.remove("jcc-scroll-transparent");
			hscroll.classList.add("jcc-animation-slow-fade");
			hscroll.classList.add("jcc-in");
		}
		
		if(canScrollV && vscroll)
		{
			vscroll.classList.remove("jcc-scroll-transparent");
			vscroll.classList.add("jcc-animation-slow-fade");
			vscroll.classList.add("jcc-in");
		}
	}
	
	function hideScrollbars()
	{
		if(scrollbarsVisibility != 1 || !scrollbarsVisible)
			return;
			
		scrollbarsVisible = false;
		
		removeScrollbarsAnimation();
		
		if(canScrollH && hscroll)
		{
			hscroll.classList.add("jcc-animation-slow-fade");
			hscroll.classList.add("jcc-out");
		}
		
		if(canScrollV && vscroll)
		{
			vscroll.classList.add("jcc-animation-slow-fade");
			vscroll.classList.add("jcc-out");
		}
	}
	
	function resetHideTimeout()
	{
		clearTimeout(hideTimeout);
		hideTimeout = setTimeout(hideScrollbars, hideScrollbarsAfter);
	}
	
	function computeWheelScrollStep()
	{
		wheelScrollStep = Math.floor(Math.max(jcc.getElementLocalRect(contents).height * 0.5, MIN_WHEEL_SCROLL_STEP));
	}
	
	function onEResized()
	{
		computeWheelScrollStep();
		
		adjustScrollbars();
		showScrollbars();
		resetHideTimeout();
	}
	
	function trackVelocity()
	{
        var now = jcc.now();
        var elapsed = now - timestamp;
        timestamp = now;
		
		var dx = offsetH - frameH;
        frameH = offsetH;
		
        var dy = offsetV - frameV;
        frameV = offsetV;

		var vh = 1000 * dx / (1 + elapsed);
        velocityH = 0.8 * vh + 0.2 * velocityH;
		
        var vv = 1000 * dy / (1 + elapsed);
        velocityV = 0.8 * vv + 0.2 * velocityV;
		
		if(continueTrackVelocity)
			requestAnimationFrame(trackVelocity);
	}
	
	function scrollH(x)
	{
		contents.scrollLeft = x;
		
		jcc.dispatchCustomEvent(contents, "scroll", { bubbles: false, cancelable: false });
		
		offsetH = x;
		showScrollbars();
		resetHideTimeout();
	}
	
	function scrollV(y)
	{
		contents.scrollTop = y;
		
		jcc.dispatchCustomEvent(contents, "scroll", { bubbles: false, cancelable: false, detail: { scrollTop: y } });
		
		offsetV = y;
		showScrollbars();
		resetHideTimeout();
	}
	
	function smoothScrollEase(time) { return time * (2 - time); }
	
	function stopSmoothScroll()
	{
		shoothScrolling = false;
		
		if(smoothScrollFrame) 
		{
			window.cancelAnimationFrame(smoothScrollFrame);
			smoothScrollFrame = undefined;
		}
	}
	
	function performSmoothScrollStep() 
	{
		// call method again on next available frame
		smoothScrollFrame = window.requestAnimationFrame(performSmoothScrollStep);

		var elapsed = (jcc.now() - smoothScrollStartTime) / WHEEL_SCROLL_SPEED;
	
		elapsed = elapsed > 1 ? 1 : elapsed;
		
		var value = smoothScrollEase(elapsed);
		
		var cx = startSmoothScrollLeft + (targetScrollLeft - startSmoothScrollLeft) * value;
		var cy = startSmoothScrollTop + (targetScrollTop - startSmoothScrollTop) * value;

		scrollH(cx);
		scrollV(cy);

		// return when end points have been reached
		if(cx === targetScrollLeft && cy === targetScrollTop)
			stopSmoothScroll();
    }

    function startSmoothScroll() 
	{
		smoothScrollStartTime = jcc.now();
		startSmoothScrollTop = contents.scrollTop;
		startSmoothScrollLeft = contents.scrollLeft;
		performSmoothScrollStep();
    }
	
	function autoScroll() 
	{ 
		var elapsed = jcc.now() - timestamp;
        var exp = Math.exp(-elapsed / timeConstant);
		var needFrame = false;
		var updateScrollbars = false;
		
		if(amplitudeH) 
		{
			var rect = jcc.getElementLocalRect(contents);
			
            var delta = -amplitudeH * exp;
            if(delta > 0.5 || delta < -0.5) 
			{
                scrollH(targetScrollLeft + delta);
				
				if(contents.scrollLeft <= 0 || contents.scrollLeft >= contents.scrollWidth - rect.width)
					amplitudeH = 0;
				else
					needFrame = true;
            } 
			else
			{
                scrollH(targetScrollLeft);
				amplitudeH = 0;
			}
			
			updateScrollbars = true;
        }
		
		if(amplitudeV) 
		{
			var rect = jcc.getElementLocalRect(contents);
			
            var delta = -amplitudeV * exp;
            if(delta > 0.5 || delta < -0.5) 
			{
                scrollV(targetScrollTop + delta);
				
				if(contents.scrollTop <= 0 || contents.scrollTop >= contents.scrollHeight - rect.height)
					amplitudeV = 0;
				else
					needFrame = true;
            } 
			else
			{
                scrollV(targetScrollTop);
				amplitudeV = 0;
			}
			
			updateScrollbars = true;
        }
		
		if(needFrame)
			requestAnimationFrame(autoScroll);
    }
	
	function stopAutoscroll()
	{
		if(kinetics)
		{
			velocityH = amplitudeH = 0;
			velocityV = amplitudeV = 0;
			continueTrackVelocity = false;
		}
	}
	
	function onContentsPointerDown(evt)
	{
		if(pressed)
			return;
		
		stopSmoothScroll();
		stopAutoscroll();
		
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		if(evt.target.nodeName == "TEXTAREA" || evt.target.nodeName == "INPUT")
			return;
		
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		movedDeltaH = 0;
		movedDeltaV = 0;
		pressed = true;
		
		prevX = pageX;
        prevY = pageY;
		
		offsetH = contents.scrollLeft;
		offsetV = contents.scrollTop;
		
		if(kinetics)
		{
			timestamp = jcc.now();
			frameH = offsetH;
			frameV = offsetV;
			velocityH = amplitudeH = 0;
			velocityV = amplitudeV = 0;
		
			continueTrackVelocity = true;
			trackVelocity();
		}
	}
	
	function onDocumentPointerMove(evt)
	{
        if(!pressed)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
		
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
		{
			pageX = evt.changedTouches[0].pageX;
			pageY = evt.changedTouches[0].pageY;
		}
		else
		{
			pageX = evt.pageX;
			pageY = evt.pageY;
		}
		
		var dx = prevX - pageX;
		var dy = prevY - pageY;
		
		prevX = pageX;
		prevY = pageY;
		
		var scrolled = false;
		
		if(canScrollH && dx)
		{
			scrolled = true;
			movedDeltaH += Math.abs(dx);
			
			scrollH(offsetH + dx);
		}
		
		if(canScrollV && dy)
		{
			scrolled = true;
			movedDeltaV += Math.abs(dy);
			
			scrollV(offsetV + dy);
		}
			
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onWheel(evt)
	{
		if(!canScrollV || !mouseWheel || evt.ctrlKey == true)
			return;
	
		var delta = evt.wheelDelta || -evt.detail;
		delta = delta < 0 ? -1 : 1;
		
		//Check if the node raizing the event is scrollable
		var node = evt.target;
		var overflowY = jcc.getComputedStyle(node, "overflow-y");
		if(overflowY == "auto" || overflowY == "scroll")
		{
			if( (delta > 0 && node.scrollTop > 0) ||
				(delta < 0 && node.scrollTop < node.scrollHeight - node.clientHeight) )
			{
				return;
			}
		}
		if( (delta > 0 && contents.scrollTop == 0) ||
			(delta < 0 && contents.scrollTop == contents.scrollHeight - contents.clientHeight) )
		{
			return;
		}
		
		//Stop the autoscroll
		stopAutoscroll();
		
		if(!shoothScrolling)
		{
			targetScrollTop = contents.scrollTop - delta*wheelScrollStep;
			targetScrollLeft = contents.scrollLeft;
			
			if(targetScrollTop < 0)
				targetScrollTop = 0;
			else if(targetScrollTop > contents.scrollHeight - contents.clientHeight)
				targetScrollTop = contents.scrollHeight - contents.clientHeight;
			
			stopSmoothScroll();
			shoothScrolling = true;
			startSmoothScroll();
		}
		
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onDocumentPointerUp(evt)
	{
		if(!pressed)
			return;
			
		pressed = false;

		continueTrackVelocity = false;
		
        if(kinetics && (velocityH > 10 || velocityH < -10 || velocityV > 10 || velocityV < -10))
		{	
			if(velocityH < -MAX_VELOCITY)
				velocityH = -MAX_VELOCITY;
			else if(velocityH > MAX_VELOCITY)
				velocityH = MAX_VELOCITY;
				
			if(velocityV < -MAX_VELOCITY)
				velocityV = -MAX_VELOCITY;
			else if(velocityV > MAX_VELOCITY)
				velocityV = MAX_VELOCITY;
			
			amplitudeH = 0;
			amplitudeV = 0;
		
			if(canScrollH)
			{
				if(velocityH > 10 || velocityH < -10)
				{
					amplitudeH = 0.8 * velocityH;
					targetScrollLeft = offsetH + amplitudeH;
				}
			}
			
			if(canScrollV)
			{
				if(velocityV > 10 || velocityV < -10)
				{
					amplitudeV = 0.8 * velocityV;
					targetScrollTop = offsetV + amplitudeV;
				}
			}
			
            timestamp = jcc.now();
            requestAnimationFrame(autoScroll);
        }
	}
	
	function onScroll()
	{
		resetHideTimeout();
		adjustScrollbars();
		
		if(!shoothScrolling)
			stopSmoothScroll();
		
		jcc.dispatchCustomEvent(el, "e-scroll", { bubbles: false, cancelable: false });
	}
	
	function onEScroll()
	{
		if(el.dataset.eScroll && el.dataset.eScroll.length > 0)
			eval(el.dataset.eScroll);
	}
	
	function onClick(evt)
	{
		if(movedDeltaH > MOVED_THRESHOLD || movedDeltaV > MOVED_THRESHOLD)
		{	
			movedDeltaH = movedDeltaV = 0;
			evt.preventDefault();
			evt.stopPropagation();
		}
	}
	
	function onHScrollDrag()
	{
		stopAutoscroll();
		stopSmoothScroll();
		
		showScrollbars();
		resetHideTimeout();
		
		var rect = jcc.getElementLocalRect(contents);
		var hsize = parseInt(hscroll.style.width);
		var hpos = parseInt(hscroll.style.left);
		contents.scrollLeft = Math.round(hpos / ((rect.width - hsize) / (contents.scrollWidth - rect.width)));
	}
	
	function onVScrollDrag()
	{
		stopAutoscroll();
		stopSmoothScroll();
		
		showScrollbars();
		resetHideTimeout();
		
		var rect = jcc.getElementLocalRect(contents);
		var vsize = parseInt(vscroll.style.height);
		var vpos = parseInt(vscroll.style.top);
		contents.scrollTop = Math.round(vpos / ((rect.height - vsize) / (contents.scrollHeight - rect.height)));
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		contents = el.querySelector("div:first-child");
		if(!contents)
		{
			alert("JCC: A 'scrollable' is missing its contents div. Please fix your HTML markup");
			return;
		}
		
		el.scrollable = this;
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.kinetics != "yes" && el.dataset.kinetics != "no")
			el.dataset.kinetics = "yes";
			
		if(el.dataset.mouseWheel != "yes" && el.dataset.mouseWheel != "no")
			el.dataset.mouseWheel = "yes";
			
		if(el.dataset.scrollDirection != "horizontal" && el.dataset.scrollDirection != "vertical" && el.dataset.scrollDirection != "all")
			el.dataset.scrollDirection = "vertical";
			
		if(el.dataset.hScrollbarLocation != "top" && el.dataset.hScrollbarLocation != "bottom")
			el.dataset.hScrollbarLocation = "bottom";
			
		if(el.dataset.vScrollbarLocation != "left" && el.dataset.vScrollbarLocation != "right")
			el.dataset.vScrollbarLocation = "right";
			
		if(el.dataset.scrollbarsVisibility != "always" && el.dataset.scrollbarsVisibility != "fade" && el.dataset.scrollbarsVisibility != "none")
			el.dataset.scrollbarsVisibility = "fade";
		
		kinetics = el.dataset.kinetics == "yes";
		
		mouseWheel = el.dataset.mouseWheel != "no";
		
		canScrollH = el.dataset.scrollDirection == "horizontal" || el.dataset.scrollDirection == "all";
		canScrollV = el.dataset.scrollDirection == "vertical" || el.dataset.scrollDirection == "all";
		
		scrollbarsVisibility = el.dataset.scrollbarsVisibility == "always" ? 2 : (el.dataset.scrollbarsVisibility == "fade" ? 1 : 0);
		
		hscroll = document.createElement("div");
		hscroll.classList.add("jcc-scroll"); 
		hscroll.classList.add("jcc-h-scroll");
		if(scrollbarsVisibility == 0) //none
			hscroll.classList.add("jcc-hidden-scroll");
		else if(scrollbarsVisibility == 1) //fade
			hscroll.classList.add("jcc-scroll-transparent");
		
		vscroll = document.createElement("div");
		vscroll.classList.add("jcc-scroll");
		vscroll.classList.add("jcc-v-scroll");
		if(scrollbarsVisibility == 0) //none
			vscroll.classList.add("jcc-hidden-scroll");
		if(scrollbarsVisibility == 1) //fade
			vscroll.classList.add("jcc-scroll-transparent");
		
		el.appendChild(hscroll);
		el.appendChild(vscroll);
		
		if(canScrollH)
		{
			hdragon = document.createElement("div");
			hdragon.dataset.role = "dragon";
			hdragon.dataset.directions = "h";
			hdragon.dataset.rectConstraint = "left:0 right:0";
			hdragon.style.width = "100%";
			hdragon.style.height = "100%";
			hscroll.appendChild(hdragon);
			hscroll.addEventListener("e-drag", onHScrollDrag, false);
			jcc.enhance(hdragon);
		}
		if(canScrollV)
		{
			vdragon = document.createElement("div");
			vdragon.dataset.role = "dragon";
			vdragon.dataset.directions = "v";
			vdragon.dataset.rectConstraint = "top:0 bottom:0";
			vdragon.style.width = "100%";
			vdragon.style.height = "100%";
			vscroll.appendChild(vdragon);
			vscroll.addEventListener("e-drag", onVScrollDrag, false);
			jcc.enhance(vdragon);
		}
		
		contents.classList.add("jcc-contents");
		
		el.classList.add("jcc-scrollable");
		el.classList.add("jcc-scrollable-" + theme);
		
		var position = jcc.getComputedStyle(el, "position");
		if(position == "static")
			el.classList.add("jcc-scrollable-relative");

		jcc.resizeMonitor.addElement(contents);
		
		computeWheelScrollStep();
		
		pressed = false;
		continueTrackVelocity = false;
		
		adjustScrollbars();
		
		el.addEventListener("e-scroll", onEScroll, false);
		el.addEventListener("click", onClick, true);
		
		contents.addEventListener("mousewheel", onWheel, false);
		contents.addEventListener("DOMMouseScroll", onWheel, false);
		
		contents.addEventListener("scroll", onScroll, false);
		contents.addEventListener("e-resized", onEResized, false);
		
		contents.addEventListener("touchstart", onContentsPointerDown, false);
		contents.addEventListener("mousedown", onContentsPointerDown, false);
		
		document.addEventListener("mousemove", onDocumentPointerMove, false);
		document.addEventListener("touchmove", onDocumentPointerMove, false);
		
		document.addEventListener("mouseup", onDocumentPointerUp, false);
		document.addEventListener("touchend", onDocumentPointerUp, false);
	}
	
	this.destroy = function()
	{	
		if(el.scrollable)
		{
			stopSmoothScroll();
			stopAutoscroll();
			
			continueTrackVelocity = false;
			
			el.removeEventListener("e-scroll", onEScroll);
			el.removeEventListener("click", onClick);
			contents.removeEventListener("mousewheel", onWheel);
			contents.removeEventListener("DOMMouseScroll", onWheel);
			contents.removeEventListener("scroll", onScroll);
			contents.removeEventListener("e-resized", onEResized);
			contents.removeEventListener("touchstart", onContentsPointerDown);
			contents.removeEventListener("mousedown", onContentsPointerDown);
			document.removeEventListener("mousemove", onDocumentPointerMove);
			document.removeEventListener("touchmove", onDocumentPointerMove);
			document.removeEventListener("mouseup", onDocumentPointerUp);
			document.removeEventListener("touchend", onDocumentPointerUp);
		
			if(contents)
			{
				jcc.resizeMonitor.removeElement(contents);
				
				contents.classList.remove("jcc-contents");
				contents = null;
			}
			
			el.classList.remove("jcc-scrollable-relative");	
			el.classList.remove("jcc-scrollable");
			el.classList.remove("jcc-scrollable-" + theme);
			
			if(hscroll)
			{
				if(hdragon)
				{
					jcc.unenhance(hdragon);
					hscroll.removeChild(hdragon);
					hdragon = null;
				}
				
				jcc.detach(hscroll);
				hscroll = null;
			}
			
			if(vscroll)
			{
				if(vdragon)
				{
					jcc.unenhance(vdragon);
					vscroll.removeChild(vdragon);
					vdragon = null;
				}
				
				jcc.detach(vscroll);
				vscroll = null;
			}
			
			delete el.scrollable;
		}
	}
	
	this.scrollLeft = function() { return contents ? contents.scrollLeft : 0; }
	this.scrollTop = function() { return contents ? contents.scrollTop : 0; }
	
	this.scrollTo = function(left, top)
	{
		stopAutoscroll();
		stopSmoothScroll();
		
		targetScrollTop = top;
		targetScrollLeft = left;
			
		if(targetScrollTop < 0)
			targetScrollTop = 0;
		else if(targetScrollTop > contents.scrollHeight - contents.clientHeight)
			targetScrollTop = contents.scrollHeight - contents.clientHeight;
			
		if(targetScrollLeft < 0)
			targetScrollLeft = 0;
		else if(targetScrollLeft > contents.scrollWidth - contents.clientWidth)
			targetScrollLeft = contents.scrollWidth - contents.clientWidth;
		
		stopSmoothScroll();
		shoothScrolling = true;
		startSmoothScroll();
	}
	
	this.scrollBy = function(deltaLeft, deltaTop)
	{
		this.scrollTo(this.scrollLeft() + deltaLeft, this.scrollTop() + deltaTop);
	}
	
	this.scrollToElement = function(targetElement, horizontal, vertical)
	{
		var crect = jcc.getElementRect(contents);
		var trect = jcc.getElementRect(targetElement);
		
		var left = 0;
		var top = 0;
		
		if(horizontal)
		{
			if(trect.right > crect.right)
			{
				left = trect.right - crect.right;
			
				var delta = crect.width - trect.width;
				if(delta > 0)
					left += Math.floor(0.3 * delta);
				
				trect.left -= left;
				trect.right -= left;
			}
			
			if(trect.left < crect.left)
			{
				left += trect.left - crect.left;
				
				var delta = crect.width - trect.width;
				if(delta > 0)
					left -= Math.floor(0.3 * delta);
					
				trect.left += left;
				trect.right += left;
			}
		}
		
		if(vertical)
		{
			if(trect.bottom > crect.bottom)
			{
				top = trect.bottom - crect.bottom;
			
				var delta = crect.height - trect.height;
				if(delta > 0)
					top += Math.floor(0.3 * delta);
				
				trect.top -= top;
				trect.bottom -= top;
			}
			
			if(trect.top < crect.top)
			{
				top += trect.top - crect.top;
				
				var delta = crect.height - trect.height;
				if(delta > 0)
					top -= Math.floor(0.3 * delta);
			}
		}
		
		if(horizontal || vertical)
			this.scrollBy(left, top);
	}
};

/* tabs */
jcc.widgets["tabs"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tabs";
	},
	enhance : function(el) { if(el.tabs) el.tabs.refresh(); else new jcc.tabs(el).refresh(); },
	unenhance : function(el) { if(el.tabs) el.tabs.destroy(); }
};
jcc.tabs = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	this.refresh = function()
	{
		this.destroy();
		
		el.tabs = this;
		
		//Set defaults
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth")
			el.dataset.corners = "smooth";
		
		el.classList.add("jcc-tabs");
		
		if(jcc.getComputedStyle(el, "position") == "static")
			el.classList.add("jcc-tabs-relative");
	}
	
	this.destroy = function()
	{	
		if(el.tabs)
		{
			el.classList.remove("jcc-tabs");
			el.classList.remove("jcc-tabs-relative");
			delete el.tabs;
		}
	}
};

/* tablist */
jcc.widgets["tablist"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tablist";
	},
	enhance : function(el) { if(el.tablist) el.tablist.refresh(); else new jcc.tablist(el).refresh(); },
	unenhance : function(el) { if(el.tablist) el.tablist.destroy(); }
};
jcc.tablist = function(el)
{
	this.scrollable = jcc.scrollable;
	this.scrollable(el);
	
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var theme, activeTab;
	
	function onEChanged(event)
	{
		if(el.dataset.eChanged && el.dataset.eChanged.length > 0)
			eval(el.dataset.eChanged);
	}
	
	this.__setActiveTab = function(tabID)
	{
		if(activeTab != tabID)
			jcc.dispatchCustomEvent(el, "e-changed", { bubbles: false, cancelable: false, detail: { tab: tabID } });
			
		el.dataset.activeTab = activeTab = tabID;
	}
	
	this.refresh = function()
	{
		if(!el.parentNode.tabs)
		{
			alert("JCC: A 'tablist' must be a direct child of 'tabs'. Please fix your HTML markup!");
			return;
		}
		
		//Set defaults
		if(el.dataset.activeTab == undefined)
			el.dataset.activeTab = "";
			
		if(el.dataset.position != "top" && el.dataset.position != "bottom")
			el.dataset.position = "top";
			
		if(el.dataset.centerTabs != "yes" && el.dataset.centerTabs != "no")
			el.dataset.centerTabs = "no";
		
		el.dataset.scrollDirection = "horizontal";
		el.dataset.scrollbarsVisibility = "none";
		el.dataset.kinetics = "yes";
		
		this.destroy();
		this.super_refresh();
		
		el.tablist = this;
		
		theme = this.theme();
		
		this.tabsMap = {};
		var tabs = el.querySelectorAll("label[data-role='tab']");
		for(var i=0;i<tabs.length;i++)
		{
			this.tabsMap[tabs[i].id] = 
			{
				element: tabs[i],
				index: i
			};
		}
		
		el.classList.add("jcc-tablist");
		el.classList.add("jcc-tablist-" + theme);
		
		if(el.dataset.centerTabs == "yes")
			el.classList.add("jcc-tablist-center-tabs");
			
		el.addEventListener("e-changed", onEChanged, false);
		
		if(el.dataset.activeTab != "")
		{
			var self = this;
			setTimeout(function()
			{
				self.activeTab(el.dataset.activeTab);
			}, 0);
		}
	}
	
	this.destroy = function()
	{	
		this.super_destroy();
		
		if(el.tablist)
		{
			el.removeEventListener("e-changed", onEChanged, false);
			
			el.classList.remove("jcc-tablist");
			el.classList.remove("jcc-tablist-" + theme);
			el.classList.remove("jcc-tablist-center-tabs");
		
			delete this.tabsMap;
			
			delete el.tablist;
		}
	}
	
	this.activeTab = function(/*tab_id*/)
	{
		if(arguments.length > 0)
		{
			var tabID = arguments[0];
			if(activeTab == tabID)
				return;
				
			var tab = document.getElementById(tabID);
			if(!tab || !tab.tab)
			{
				alert("JCC: Requested tab '" + tabID + "' does not exist or is not enhanced by JCC!");
				return;
			}
			tab.click();
		}
		else
			return activeTab;
	}
};

/* tab */
jcc.widgets["tab"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "LABEL" && el.getAttribute("data-role") == "tab";
	},
	enhance : function(el) { if(el.tab) el.tab.refresh(); else new jcc.tab(el).refresh(); },
	unenhance : function(el) { if(el.tab) el.tab.destroy(); }
};
jcc.tab = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var input, theme, target, div, pageview;
	
	function onInputChange()
	{
		if(input.checked == false)
			return;
			
		var targetElement = document.getElementById(target);
		if(!targetElement)
		{
			alert("JCC: A 'tab' target does not exist. Please fix your HTML markup!");
			return;
		}
		
		var tablist = el.parentNode.parentNode.tablist;
		if(!tablist)
		{
			alert("JCC: The 'tablist' of '' cannot be found or is not enhanced by JCC! Please fix your HTML markup!");
			return;
		}
		
		//Set defaults
		if(el.dataset.isotope != "normal" && el.dataset.isotope != "subscript")
			el.dataset.isotope = "normal";
			
		if(el.dataset.mark != "underscore" && el.dataset.mark != "content")
			el.dataset.mark = "underscore";
			
		if(targetElement.tabPage)
		{		
			var reversedAnimation = false;
			
			var prevTabID = tablist.activeTab();
			if(el.id == prevTabID)
				return; //alredy set
				
			var prevTab = document.getElementById(prevTabID);
			if(prevTab && prevTab.tab)
			{
				reversedAnimation = tablist.tabsMap[el.id].index < tablist.tabsMap[prevTabID].index;
				
				var prevTargetID = prevTab.tab.target();
				var prevTarget = document.getElementById(prevTargetID);
				if(prevTarget && prevTarget.tabPage)
					prevTarget.tabPage.__unload(reversedAnimation);
			}
			
			targetElement.tabPage.__load(reversedAnimation);
			
			tablist.__setActiveTab(el.id);
		}
		else if(targetElement.page)
		{
			if(!targetElement.page.isLoaded())
			{
				if(jcc.currentHistoryState().page == "")
				{
					var hash = location.hash.substr(1);
					var argIdx = hash.indexOf("?");
					var urlArgs = "";
					if(argIdx > -1)
						urlArgs = hash.substr(argIdx);
				
					window.history.replaceState(null, "", "#" + targetElement.id + urlArgs);
				}
				else
				{
					targetElement.page.load();
				}
			}	
			tablist.__setActiveTab(el.id);
		}
		else
		{
			alert("JCC: Target element must be a 'page' or a 'tabpage'. Please fix your HTML markup!");
			return;
		}
	}
	
	function onEChanged(event)
	{
		if(event.detail.page == target)
			el.click();
	}
	
	this.refresh = function()
	{
		if(!el.id || el.id == "")
		{
			alert("JCC: A 'tab' must have an unique 'id'. Please fix your HTML markup!");
			return;
		}
		
		if(!el.parentNode.parentNode.tablist)
		{
			alert("JCC: A 'tab' must be a child of the contents of a 'tablist'. Please fix your HTML markup!");
			return;
		}
		
		if(!el.dataset.target || el.dataset.target == "")
		{
			alert("JCC: A 'tab' must have non-empty 'data-target' attribute. Please fix your HTML markup!");
			return;
		}
		
		this.destroy();
		
		el.tab = this;
		
		theme = this.theme();
		
		target = el.dataset.target;
		
		el.classList.add("jcc-tab");
		el.classList.add("jcc-tab-" + theme);
		
		pageview = document.querySelector("div[data-role='pageview']");
		if(pageview)
			pageview.addEventListener("e-changed", onEChanged, false);
		
		input = el.querySelector("input");
		if(input)
		{
			input.checked = false;
			
			input.addEventListener("change", onInputChange, false);
			
			div = document.createElement("div");
			jcc.insertAfter(div, input);
		}
	}
	
	this.destroy = function()
	{	
		if(pageview)
		{
			pageview.removeEventListener("e-changed", onEChanged);
			pageview = null;
		}
		
		if(el.tab)
		{
			el.classList.remove("jcc-tab");
			el.classList.remove("jcc-tab-" + theme);
			
			if(input)
			{
				input.removeEventListener("change", onInputChange);
				input = null;
			}
			
			if(div)
			{
				jcc.detach(div);
				div = null;
			}
			
			delete el.tab;
		}
	}
	
	this.target = function() { return target; }
};

/* tabview */
jcc.widgets["tabview"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tabview";
	},
	enhance : function(el) { if(el.tabview) el.tabview.refresh(); else new jcc.tabview(el).refresh(); },
	unenhance : function(el) { if(el.tabview) el.tabview.destroy(); }
};
jcc.tabview = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.tabs)
		{
			alert("JCC: A 'tabview' must be a direct child of 'tabs'. Please fix your HTML markup!");
			return;
		}
		
		this.destroy();
		
		//Set defaults
		if(!el.dataset.animation || el.dataset.animation.length == 0)
			el.dataset.animation = "none";
		
		el.tabview = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-tabview");
		el.classList.add("jcc-tabview-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.tabview)
		{
			el.classList.remove("jcc-tabview");
			el.classList.remove("jcc-tabview-" + theme);
			delete el.tabview;
		}
	}
};

/* TAB PAGE */
jcc.widgets["tab-page"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tab-page";
	},
	enhance : function(el) { if(el.tabPage) el.tabPage.refresh(); else new jcc.tabPage(el).refresh(); },
	unenhance : function(el) { if(el.tabPage) el.tabPage.destroy(); }
};
jcc.tabPage = function(el)
{
	this.container = jcc.container;
	this.container(el);
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var loaded,
	animation, parentClass;
	
	function onELoad(event)
	{
		if(el.dataset.eLoad && el.dataset.eLoad.length > 0)
			eval(el.dataset.eLoad);
	}
	
	function onEUnload(event)
	{
		if(el.dataset.eUnload && el.dataset.eUnload.length > 0)
			eval(el.dataset.eUnload);
	}
	
	function onOutAnimationEnd()
	{
		if(!el.tabPage)
			return;
			
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		el.classList.add("jcc-tab-page-hidden");
	}
	
	function removeAnimationClasses()
	{
		el.classList.remove("jcc-animation-" + animation);
		el.classList.remove("jcc-in");
		el.classList.remove("jcc-out");
		el.classList.remove("jcc-back");
		if(parentClass && parentClass != "")
		{
			el.parentNode.classList.remove(parentClass);
			parentClass = null;
		}
	}
	
	function readAnimation()
	{
		animation = el.dataset.animation;
		if(!animation)
		{
			animation = el.parentNode.dataset.animation;
			if(!animation)
				animation = "none";
		}
		animation = jcc.animations[animation];
		if(animation)
		{
			animation = animation.suffix;
			parentClass = animation.parentClass;
		}
		else
		{
			animation = "none";
			parentClass = null;
		}
	}
	
	this.setOptions = function(opt)
	{
		var refresh = false;
		for(var o in opt)
		{
			if(typeof opt[o] == "number" || typeof opt[o] == "string")
				el.dataset[o] = opt[o].toString();
				
			if(o != "animation")
				refresh = true;
		}
		if(refresh)
			this.refresh();
	}
	
	this.refresh = function()
	{	
		if(!el.id || el.id.length == 0)
		{
			alert("JCC: Each 'tab-page' should have its unique 'id' attribute in the HTML markup!");
			return;
		}
		
		if(el.parentNode.dataset.role != "tabview")
		{
			alert("JCC: A 'tab-page' can exist only as a direct child of a 'tabview'! Please fix your HTML markup!");
			return;
		}
		
		this.destroy();
		this.super_refresh();
		
		el.tabPage = this;
		
		loaded = false;
		
		el.classList.add("jcc-tab-page");
		el.classList.add("jcc-tab-page-hidden");
		
		el.addEventListener("e-load", onELoad, false);
		el.addEventListener("e-unload", onEUnload, false);
	}
	
	this.__load = function(animationReversed)
	{
		if(!el.tabPage || loaded)
			return;
			
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		//Prev animation cleanup
		removeAnimationClasses();
		
		//Prepare new animation
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		el.classList.remove("jcc-tab-page-hidden");
		el.classList.remove("jcc-tab-page-front");
		
		el.classList.add("jcc-in");
		
		if(animationReversed)
			el.classList.add("jcc-back");
		
		loaded = true;
		jcc.dispatchCustomEvent(el, "e-load", { bubbles: false, cancelable: false });
	}
	
	this.__unload = function(animationReversed)
	{
		if(!el.tabPage || !loaded)
			return;
		
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		//Prev animation cleanup
		removeAnimationClasses();
		
		//Prepare new animation
		readAnimation();
		if(animation != "none")
		{
			el.classList.add("jcc-animation-" + animation);
			if(parentClass && parentClass != "")
				el.parentNode.classList.add(parentClass);
		}
		
		el.classList.add("jcc-tab-page-front");
		
		if( animation == "none" )
			onOutAnimationEnd();
		else
		{
			el.classList.add("jcc-out");
			
			if(animationReversed)
				el.classList.add("jcc-back");
			
			if(jcc.addAnimationEndListener(el, onOutAnimationEnd, false) == false)
				onOutAnimationEnd();
		}
		
		loaded = false;
		jcc.dispatchCustomEvent(el, "e-unload", { bubbles: false, cancelable: false });
	}
	
	this.destroy = function()
	{	
		this.super_destroy();
		
		el.removeEventListener("e-load", onELoad);
		el.removeEventListener("e-unload", onEUnload);
		jcc.removeAnimationEndListener(el, onOutAnimationEnd);
		
		removeAnimationClasses();
		
		if(el.tabPage)
		{
			el.classList.remove("jcc-tab-page");
			el.classList.remove("jcc-tab-page-hidden");
			el.classList.remove("jcc-tab-page-front");
			delete el.page;
		}
	}
	
	this.isLoaded = function()
	{
		return loaded && el.tabPage;
	}
};

/* collapsible-set */
jcc.widgets["collapsible-set"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "collapsible-set";
	},
	enhance : function(el) { if(el.collapsibleSet) el.collapsibleSet.refresh(); else new jcc.collapsibleSet(el).refresh(); },
	unenhance : function(el) { if(el.collapsibleSet) el.collapsibleSet.destroy(); }
};
jcc.collapsibleSet = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	this.refresh = function()
	{
		this.destroy();
		
		//Set defaults
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth")
			el.dataset.corners = "smooth";
		
		el.collapsibleSet = this;
		el.classList.add("jcc-collapsible-set");
	}
	
	this.destroy = function()
	{	
		if(el.collapsibleSet)
		{
			el.classList.remove("jcc-collapsible-set");
			delete el.collapsibleSet;
		}
	}
};

/* collapsible */
jcc.widgets["collapsible"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "collapsible";
	},
	enhance : function(el) { if(el.collapsible) el.collapsible.refresh(); else new jcc.collapsible(el).refresh(); },
	unenhance : function(el) { if(el.collapsible) el.collapsible.destroy(); }
};
jcc.collapsible = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var VIRTUAL_VERTICAL_CONTENTS_PADDING = 30; //For container it is 10h + 10v padding + 10 just in case :)
	
	var theme, contents, input, checkmark, styleMaxHeight, height, parentWidth;
	
	function __redrawState()
	{
		contents.classList.remove("jcc-collapsed");
		
		if(input.checked)
		{
			if(input.type == "radio")
			{
				var radioGroupName = input.name;
				if(radioGroupName != "")
				{
					var radios = document.querySelectorAll("input[type='radio'][name='" + radioGroupName + "']");
					for(var i=0;i<radios.length;i++)
					{
						if(radios[i] != input && radios[i].parentNode && 
						radios[i].parentNode.parentNode && radios[i].parentNode.parentNode.collapsible)
						{
							radios[i].parentNode.parentNode.collapsible.expanded(false);
						}
					}
				}
			}
			
			contents.style.maxHeight = height + "px";
		}
		else
		{
			contents.classList.add("jcc-collapsed");
			contents.style.maxHeight = "0";
		}
	}
	
	function onInputChange()
	{
		if(el.dataset.expanded != (input.checked ? "yes" : "no"))
		{
			el.dataset.expanded = input.checked ? "yes" : "no";
			jcc.dispatchCustomEvent(el, "e-changed", { bubbles: false, cancelable: false });
		}
		
		__redrawState();
	}
	
	function onEChanged(event)
	{
		if(el.dataset.eChanged && el.dataset.eChanged.length > 0)
			eval(el.dataset.eChanged);
	}
	
	function onParentResize()
	{
		var rect = jcc.getElementLocalRect(el.parentNode);
		if(rect.width != parentWidth)
		{
			height = contents.scrollHeight + VIRTUAL_VERTICAL_CONTENTS_PADDING;
			
			if(input.checked) //Update visually contents height if expanded
				__redrawState();
			
			parentWidth = rect.width;
		}
	}
	
	this.refresh = function()
	{	
		this.destroy();
		
		el.collapsible = this;
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.expanded != "yes" && el.dataset.expanded != "no")
			el.dataset.expanded = "no";
			
		if(el.dataset.animated != "yes" && el.dataset.animated != "no")
			el.dataset.animated = "yes";
			
		if(el.dataset.arrow != "yes" && el.dataset.arrow != "no")
			el.dataset.arrow = "yes";
		
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth")
			el.dataset.corners = "smooth";
			
		if(el.parentNode.dataset.role == "collapsible-set")
			el.dataset.corners = "";
		
		el.classList.add("jcc-collapsible");
		el.classList.add("jcc-collapsible-" + theme);
		
		input = el.querySelector("input");
		if(!input)
		{
			alert("JCC: Missing checkbox or radio input in 'collapsible' - please fix your HTML markup!");
			return;
		}
		contents = el.querySelector("label:first-child + div");
		if(!contents)
		{
			alert("JCC: Missing contents DIV in 'collapsible' - please fix your HTML markup!");
			return;
		}
		
		checkmark = document.createElement("div");
		jcc.insertAfter(checkmark, input);
		checkmark.classList.add("jcc-checkmark");
		
		el.addEventListener("e-changed", onEChanged, false);
		
		contents.classList.add("jcc-contents");
		styleMaxHeight = contents.style.maxHeight;
		parentWidth = jcc.getElementLocalRect(el.parentNode).width;
		height = contents.scrollHeight + VIRTUAL_VERTICAL_CONTENTS_PADDING;
		
		input.checked = el.dataset.expanded == "yes";
		onInputChange();
		
		input.addEventListener("change", onInputChange, false);
		
		jcc.resizeMonitor.addElement(el.parentNode);
		el.parentNode.addEventListener("e-resized", onParentResize, false);
		
		if(el.dataset.animated == "yes")
		{
			setTimeout(function()
			{
				contents.classList.add("jcc-animated");
			}, 0);
		}
	}
	
	this.destroy = function()
	{	
		if(el.collapsible)
		{
			jcc.resizeMonitor.removeElement(el.parentNode);
			el.parentNode.removeEventListener("e-resized", onParentResize);
			delete parentWidth;
				
			if(input)
			{
				input.removeEventListener("change", onInputChange);
				input = null;
			}
			
			if(checkmark)
			{
				jcc.detach(checkmark);
				checkmark = null;
			}
			
			if(contents)
			{
				contents.classList.remove("jcc-contents");
				contents.classList.remove("jcc-collapsed");
				contents.classList.remove("jcc-animated");
				
				contents.style.maxHeight = styleMaxHeight;
				
				contents = null;
			}
			
			el.removeEventListener("e-changed", onEChanged);
			
			el.classList.remove("jcc-collapsible");
			el.classList.remove("jcc-collapsible-" + theme);
			
			delete el.collapsible;
		}
	}
	
	this.expanded = function(/*expanded*/) 
	{
		if(arguments.length > 0)
		{
			if(el.dataset.expanded != (arguments[0] == true ? "yes" : "no"))
			{
				input.checked = arguments[0];
				onInputChange();
			}
		}
		else
			return el.dataset.expanded == "yes";
	}  
};

/* fieldset */
jcc.widgets["fieldset"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "FIELDSET" && el.getAttribute("data-role") == "fieldset";
	},
	enhance : function(el) { if(el.fieldset) el.fieldset.refresh(); else new jcc.fieldset(el).refresh(); },
	unenhance : function(el) { if(el.fieldset) el.fieldset.destroy(); }
};
jcc.fieldset = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.fieldset = this;
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth" && el.dataset.corners != "round")
			el.dataset.corners = "smooth";
			
		if(el.dataset.direction != "horizontal" && el.dataset.direction != "vertical")
			el.dataset.direction = "horizontal";
			
		if(el.dataset.delimiter != "yes" && el.dataset.delimiter != "no")
			el.dataset.delimiter = "yes";
		
		el.classList.add("jcc-fieldset");
		el.classList.add("jcc-fieldset-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.fieldset)
		{
			el.classList.remove("jcc-fieldset");
			el.classList.remove("jcc-fieldset-" + theme);
			delete el.fieldset;
		}
	}
};

/* list */
jcc.widgets["list"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "UL" && el.getAttribute("data-role") == "list";
	},
	enhance : function(el) { if(el.list) el.list.refresh(); else new jcc.list(el).refresh(); },
	unenhance : function(el) { if(el.list) el.list.destroy(); }
};
jcc.list = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.list = this;
		
		//Set defaults
		if(el.dataset.isotope != "normal" && el.dataset.isotope != "inset")
			el.dataset.isotope = "normal";
		
		theme = this.theme();
		
		el.classList.add("jcc-list");
		el.classList.add("jcc-list-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.list)
		{
			el.classList.remove("jcc-list");
			el.classList.remove("jcc-list-" + theme);
			delete el.list;
		}
	}
};

/* list-item */
jcc.widgets["list-item"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "LI" && el.getAttribute("data-role") == "list-item";
	},
	enhance : function(el) { if(el.listItem) el.listItem.refresh(); else new jcc.listItem(el).refresh(); },
	unenhance : function(el) { if(el.listItem) el.listItem.destroy(); }
};
jcc.listItem = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		this.destroy();
		
		el.listItem = this;
		
		//Set defaults
		if(el.dataset.isotope != "normal" && el.dataset.isotope != "header" && el.dataset.isotope != "chevron")
			el.dataset.isotope = "normal";
			
		if(el.dataset.tap != "yes" && el.dataset.tap != "no")
			el.dataset.tap = "no";
			
		if(el.dataset.hDense != "yes" && el.dataset.hDense != "no")
			el.dataset.hDense = "no";
			
		if(el.dataset.vDense != "yes" && el.dataset.vDense != "no")
			el.dataset.vDense = "no";
			
		if(el.dataset.dense != "yes" && el.dataset.dense != "no")
			el.dataset.dense = "no";
		
		theme = this.theme();
		
		el.classList.add("jcc-list-item");
		el.classList.add("jcc-list-item-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.listItem)
		{
			el.classList.remove("jcc-list-item");
			el.classList.remove("jcc-list-item-" + theme);
			delete el.listItem;
		}
	}
};

/* loader */
jcc.widgets["loader"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "loader";
	},
	enhance : function(el) { if(el.loader) el.loader.refresh(); else new jcc.loader(el).refresh(); },
	unenhance : function(el) { if(el.loader) el.list.destroy(); }
};
jcc.loader = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme, visibility, parent, container, label, text, bars, barHolder, offset, modal, animation, parentClass;
	
	function onEShow(event)
	{
		if(el.dataset.eShow && el.dataset.eShow.length > 0)
			eval(el.dataset.eShow);
	}
	
	function onEHide(event)
	{
		if(el.dataset.eHide && el.dataset.eHide.length > 0)
			eval(el.dataset.eHide);
	}
	
	function readOffset()
	{
		offset = { x: 0, y: 0 };
		if(el.dataset.offset && el.dataset.offset.length > 0)
		{
			var props = el.dataset.offset.split(" ");
			if(props.length > 0)
			{
				var v = parseInt(props[0]);
				if(!isNaN(v))
					offset.x = v;
					
				if(props.length > 1)
				{
					v = parseInt(props[1]);
					if(!isNaN(v))
						offset.y = v;
				}
			}
		}
	}
	
	function onOutAnimationEnd()
	{
		if(!el.loader)
			return;
			
		jcc.removeAnimationEndListener(container, onOutAnimationEnd);
		
		el.classList.add("jcc-loader-hidden");
	}
	
	function removeAnimationClasses()
	{
		container.classList.remove("jcc-animation-" + animation);
		container.classList.remove("jcc-in");
		container.classList.remove("jcc-out");
		container.classList.remove("jcc-back");
		if(parentClass && parentClass != "")
		{
			container.parentNode.classList.remove(parentClass);
			parentClass = null;
		}
	}
	
	function readAnimation()
	{
		animation = el.dataset.animation;
		if(!animation)
			animation = "none";
		
		animation = jcc.animations[animation];
		if(animation)
		{
			animation = animation.suffix;
			parentClass = animation.parentClass;
		}
		else
		{
			animation = "none";
			parentClass = null;
		}
	}
	
	this.setOptions = function(opt)
	{
		var refresh = false;
		for(var o in opt)
		{
			if(typeof opt[o] == "number" || typeof opt[o] == "string")
				el.dataset[o] = opt[o].toString();
				
			if(o != "animation")
				refresh = true;
		}
		if(refresh)
			this.refresh();
	}
	
	this.refresh = function()
	{
		this.destroy();
		
		el.loader = this;
		
		theme = this.theme();
		
		//Set defaults
		if(el.dataset.isotope != "spinner" && el.dataset.isotope != "screw" && el.dataset.isotope != "bars")
			el.dataset.isotope = "spinner";
			
		if(!el.dataset.animation || el.dataset.animation.length == 0)
			el.dataset.animation = "none";
			
		if(el.dataset.modal != "no" && el.dataset.modal != "implicit" && el.dataset.modal != "explicit")
			el.dataset.modal = "implicit";
			
		if(!el.dataset.offset || el.dataset.offset.length == 0)
			el.dataset.offset = "0 0";
			
		if(!el.dataset.anchor || el.dataset.anchor.length == 0)
			el.dataset.anchor = "center center";
			
		if(!el.dataset.visible || el.dataset.visible.length == 0)
			el.dataset.visible = "no";
			
		if(el.dataset.text == undefined)
			el.dataset.text = "";
		
		text = el.dataset.text != undefined ? el.dataset.text : "";
		
		modal = el.dataset.modal;
		
		readOffset();
		
		parent = el.parentNode;
		var parentPos = jcc.getComputedStyle(parent, "position");
		if(parentPos == "static" && parent != document.body)
			parent.classList.add("jcc-loader-make-parent-relative");
		
		container = document.createElement("div");
		container.classList.add("jcc-loader-container");
		el.appendChild(container);	
		
		if(el.dataset.isotope == "bars")
		{
			barHolder = document.createElement("div");
			barHolder.classList.add("jcc-loader-barholder");
			container.appendChild(barHolder);
			
			bars = [];
			for(var i=1;i<=5;i++)
			{
				var bar = document.createElement("div");
				bar.classList.add("jcc-loader-bars");
				bar.classList.add("jcc-loader-bar" + i);
				barHolder.appendChild(bar);
				bars.push(bar);
			}
		}
		
		label = document.createElement("div");
		label.classList.add("jcc-loader-label");
		label.innerHTML = jcc.xmlEncode(text);
		container.appendChild(label);
		
		container.style.marginLeft = offset.x + "px";
		container.style.marginTop = offset.y + "px";
		
		el.classList.add("jcc-loader");
		el.classList.add("jcc-loader-" + theme);
		
		el.addEventListener("e-show", onEShow, false);
		el.addEventListener("e-hide", onEHide, false);
		
		visibility = false;
		el.classList.add("jcc-loader-hidden");
		
		this.visible(el.dataset.visible == "yes");
	}
	
	this.destroy = function()
	{	
		if(el.loader)
		{
			el.removeEventListener("e-show", onEShow);
			el.removeEventListener("e-hide", onEHide);
			jcc.removeAnimationEndListener(container, onOutAnimationEnd);
			
			if(bars)
			{
				for(var i=0;i<bars.length;i++)
					jcc.detach(bars[i]);
				
				delete bars;
			}
			
			if(label)
			{
				jcc.detach(label);
				label = null;
			}
			
			if(barHolder)
			{
				jcc.detach(barHolder);
				barHolder = null;
			}
			
			if(container)
			{
				jcc.detach(container);
				container = null;
			}
			
			if(parent)
			{
				parent.classList.remove("jcc-loader-make-parent-relative");
				parent = null;
			}
			
			el.classList.remove("jcc-loader-hidden");
			
			el.classList.remove("jcc-loader");
			el.classList.remove("jcc-loader-" + theme);
			delete el.loader;
		}
	}
	
	this.label = function(/*text*/)
	{
		if(arguments.length > 0)
		{
			text = arguments[0];
			el.dataset.text = text;
			if(label)
				label.innerHTML = jcc.xmlEncode(text);
		}
		else
			return text;
	}
	
	this.visible = function(/*visibility*/)
	{
		if(arguments.length > 0)
		{
			var newVisibility = arguments[0] == true;
			if(newVisibility != visibility)
			{
				el.dataset.visible = visibility = newVisibility;
				
				jcc.removeAnimationEndListener(container, onOutAnimationEnd);
				
				//Prev animation cleanup
				removeAnimationClasses();
				
				//Prepare new animation
				readAnimation();
				if(animation != "none")
				{
					container.classList.add("jcc-animation-" + animation);
					if(parentClass && parentClass != "")
						container.parentNode.classList.add(parentClass);
				}
				
				if(visibility)
				{
					el.classList.remove("jcc-loader-hidden");
					
					container.classList.add("jcc-in");
					
					jcc.dispatchCustomEvent(el, "e-show", { bubbles: false, cancelable: false });
				}
				else
				{
					if( animation == "none" )
						onOutAnimationEnd();
					else
					{
						container.classList.add("jcc-out");
						
						if(jcc.addAnimationEndListener(container, onOutAnimationEnd, false) == false)
							onOutAnimationEnd();
					}
					
					jcc.dispatchCustomEvent(el, "e-hide", { bubbles: false, cancelable: false });
				}
			}
		}
		else
			return visibility && el.loader;
	}
};
