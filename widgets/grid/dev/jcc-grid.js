/* grid */
jcc.widgets["grid"] = 
{
	version : "1.1.9",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "grid";
	},
	enhance : function(el) { if(el.grid) el.grid.refresh(); else new jcc.grid(el).refresh(); },
	unenhance : function(el) { if(el.grid) el.grid.destroy(); }
};
jcc.grid = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var DEFAULT_ROW_HEIGHT = 32;
	var EXTRA_SPACE_PER_SIDE = 200; //Create extra fake rows above and below the visible area (view)
	
	var theme, rowHeight, items, columns, columnsArray, columnWidths,
	view, viewContents, vScrollDetermine, fakeRows, headerElement,
	prevContentsHscroll, prevContentsVscroll, prevViewHeight,
	rangeSelect, appendSelect, lastSelectedItem, allUnbound,
	rowCounter;
	
	function onESort(event)
	{
		if(el.dataset.eSort && el.dataset.eSort.length > 0)
			eval(el.dataset.eSort);
	}
	
	function onEClickRow(event)
	{
		if(el.dataset.eClickRow && el.dataset.eClickRow.length > 0)
			eval(el.dataset.eClickRow);
	}
	
	function onEColumnResize(event)
	{
		columnWidths[event.detail.column] = event.detail.width;
		
		if(fakeRows)
		{
			for(var i=0;i<fakeRows.length;i++)
				fakeRows[i][event.detail.column].parentNode.style.width = event.detail.width + "px";
		}
		
		if(el.dataset.eColumnResize && el.dataset.eColumnResize.length > 0)
			eval(el.dataset.eColumnResize);
	}

	function onEColumnManualResize(event)
	{
		if(el.dataset.eColumnManualResize && el.dataset.eColumnManualResize.length > 0)
			eval(el.dataset.eColumnManualResize);
	}
	
	function onEBindRow(event)
	{
		if(el.dataset.eBindRow && el.dataset.eBindRow.length > 0)
			eval(el.dataset.eBindRow);
	}
	
	function onEUnbindRow(event)
	{
		if(el.dataset.eUnbindRow && el.dataset.eUnbindRow.length > 0)
			eval(el.dataset.eUnbindRow);
	}
	
	function onESelection(event)
	{
		if(el.dataset.eSelection && el.dataset.eSelection.length > 0)
			eval(el.dataset.eSelection);
	}
	
	function onShiftDown(evt)
	{
		if(evt.key == "Shift")
			el.grid.rangeSelect(true);
	}
	
	function onShiftUp(evt)
	{
		if(el.grid.rangeSelect() && evt.key == "Shift")
			el.grid.rangeSelect(false);
	}
	
	function onCtrlDown(evt)
	{
		if(evt.key == "Control")
			el.grid.appendSelect(true);
	}
	
	function onCtrlUp(evt)
	{
		if(el.grid.appendSelect() && evt.key == "Control")
			el.grid.appendSelect(false);
	}
	
	function createView()
	{
		view = document.createElement("div");
		view.dataset.role = "scrollable";
		view.dataset.scrollDirection = "all";
		view.dataset.kinetics = el.dataset.kinetics;
		view.dataset.hScrollbarLocation = "bottom";
		view.dataset.vScrollbarLocation = "right";
		view.dataset.scrollbarsVisibility = el.dataset.scrollbarsVisibility;
		view.classList.add("jcc-grid-view");
		view.addEventListener("e-scroll", onViewScroll, false);
		el.appendChild(view);
		
		viewContents = document.createElement("div");
		view.appendChild(viewContents);
		
		vScrollDetermine = document.createElement("div");
		vScrollDetermine.classList.add("jcc-grid-view-contents-v-scroll-determine");
		viewContents.appendChild(vScrollDetermine);
		
		jcc.enhance(view);
		
		fakeRows = [];
		allUnbound = true;
	}
	
	function bindRow(cells, itemIndex)
	{
		allUnbound = false;
		
		items[itemIndex].__$cells$__ = cells;
		
		if(el.dataset.biColor == "yes")
		{
			if(itemIndex % 2)
			{
				cells.__$row$__.classList.remove("jcc-grid-fake-row-even-" + theme);
				cells.__$row$__.classList.add("jcc-grid-fake-row-odd-" + theme);
			}
			else
			{
				cells.__$row$__.classList.add("jcc-grid-fake-row-even-" + theme);
				cells.__$row$__.classList.remove("jcc-grid-fake-row-odd-" + theme);
			}
		}
		
		if(items[itemIndex].__$selected$__)
			cells.__$row$__.classList.add("jcc-grid-fake-row-selected-" + theme);
		
		var event = jcc.dispatchCustomEvent(el, "e-bind-row", { bubbles: false, cancelable: true, detail: { rowElement: cells.__$row$__, cells: cells, items: items, index: itemIndex } });
		if(!event.defaultPrevented)
		{
			for(var i=0;i<columnsArray.length;i++)
			{
				var colID = columnsArray[i].id;
				cells[colID].dataset.align = columnsArray[i].dataset.align;
				var cellDefault = cells[colID].__$defaultCell$__;
				cellDefault.style.display = "";
				cellDefault.innerHTML = jcc.xmlEncode(items[itemIndex][colID].value.toString());
			}
		}
		else
		{
			for(var i=0;i<columnsArray.length;i++)
			{
				var colID = columnsArray[i].id;
				var cellDefault = cells[colID].__$defaultCell$__;
				cellDefault.style.display = "none";
			}
		}
	}
	
	function unbindRow(cells, itemIndex)
	{
		cells.__$row$__.classList.remove("jcc-grid-fake-row-selected-" + theme);
		
		var event = jcc.dispatchCustomEvent(el, "e-unbind-row", { bubbles: false, cancelable: true, detail: { rowElement: cells.__$row$__, cells: cells, items: items, index: itemIndex } });
		if(!event.defaultPrevented)
		{
			for(var i=0;i<columnsArray.length;i++)
			{
				var colID = columnsArray[i].id;
				var cellDefault = cells[colID].childNodes[0];
				cellDefault.innerHTML = "";
			}
		}
		
		delete items[itemIndex].__$cells$__;
	}
	
	function reindexRows()
	{
		if(!fakeRows || !viewContents)
			return;
			
		var scrollTop = viewContents.scrollTop;
		var fakeRowsCount = fakeRows.length;
		
		var rowsAbove = Math.floor(EXTRA_SPACE_PER_SIDE / rowHeight);
		var nextRowItemIndex = Math.floor(scrollTop / rowHeight) - rowsAbove;
		var nextRowTop = scrollTop - rowsAbove * rowHeight - scrollTop % rowHeight;
		
		for(var i=0;i<fakeRowsCount;i++)
		{
			var row = fakeRows[i];
			
			if(row.itemIndex >= 0)
				unbindRow(row, row.itemIndex);
			
			row.__$top$__ = nextRowTop;
			row.__$row$__.style.top = row.__$top$__ + "px";
			row.itemIndex = nextRowItemIndex < 0 || nextRowItemIndex >= items.length ? -1 : nextRowItemIndex;
			
			nextRowItemIndex++;
			nextRowTop += rowHeight;
			
			if(row.itemIndex >= 0)
			{
				row.__$row$__.style.display = "";
				bindRow(row, row.itemIndex);
			}
			else
				row.__$row$__.style.display = "none";
		}
	}
	
	function onViewScroll()
	{
		var scrollLeft = viewContents.scrollLeft;
		if(prevContentsHscroll != scrollLeft)
		{
			columnsArray[0].style.marginLeft = -scrollLeft + "px";
			prevContentsHscroll = scrollLeft;
		}
		
		var scrollTop = viewContents.scrollTop;
		if(prevContentsVscroll != scrollTop)
		{
			if(prevContentsVscroll == undefined)
				prevContentsVscroll = 0;
				
			var totalScrolled = scrollTop - prevContentsVscroll;
			prevContentsVscroll = scrollTop;
			
			var fakeRowsCount = fakeRows.length;
			if(fakeRowsCount == 0)
				return;
			
			if(totalScrolled > 0)
			{
				var row = fakeRows[fakeRowsCount - 1];
				if(row.__$top$__ + rowHeight - scrollTop < -EXTRA_SPACE_PER_SIDE)
				{
					el.grid.unbindRows();
					reindexRows();
					
					return;
				}
				
				for(var i=0;i<fakeRowsCount;i++)
				{	
					var row = fakeRows[0];
					if(row.__$top$__ + rowHeight - scrollTop < -EXTRA_SPACE_PER_SIDE)
					{
						if(row.itemIndex >= 0)
						{
							unbindRow(row, row.itemIndex);
							row.itemIndex = -1;
						}
						row.__$top$__ = fakeRows[fakeRowsCount - 1].__$top$__ + rowHeight;
						row.__$row$__.style.top = row.__$top$__ + "px";
						if(fakeRows[fakeRowsCount - 1].itemIndex >= 0)
						{
							row.itemIndex = fakeRows[fakeRowsCount - 1].itemIndex + 1;
							if(row.itemIndex >= items.length)
								row.itemIndex = -1;
						}
						
						fakeRows.shift();
						fakeRows.push(row);
						
						if(row.itemIndex >= 0)
						{
							row.__$row$__.style.display = "";
							bindRow(row, row.itemIndex);
						}
						else
							row.__$row$__.style.display = "none";
					}
					else
						break;
				}
			}
			else if(totalScrolled < 0)
			{
				var row = fakeRows[0];
				if(row.__$top$__ - scrollTop > prevViewHeight + EXTRA_SPACE_PER_SIDE)
				{
					el.grid.unbindRows();
					reindexRows();
					
					return;
				}
				
				for(var i=0;i<fakeRowsCount;i++)
				{	
					var row = fakeRows[fakeRowsCount - 1];
					if(row.__$top$__ - scrollTop > prevViewHeight + EXTRA_SPACE_PER_SIDE)
					{
						if(row.itemIndex >= 0)
						{
							unbindRow(row, row.itemIndex);
							row.itemIndex = -1;
						}
						row.__$top$__ = fakeRows[0].__$top$__ - rowHeight;
						row.__$row$__.style.top = row.__$top$__ + "px";
						if(fakeRows[0].itemIndex >= 0)
						{
							row.itemIndex = fakeRows[0].itemIndex - 1;
							if(row.itemIndex < 0)
								row.itemIndex = -1;
						}

						fakeRows.pop();
						fakeRows.unshift(row);
						
						if(row.itemIndex >= 0)
						{
							row.__$row$__.style.display = "";
							bindRow(row, row.itemIndex);
						}
						else
							row.__$row$__.style.display = "none";
					}
				}
			}
		}
	}
	
	function createFakeRow(nextRowTop, nextRowItemIndex)
	{
		var rowDiv = document.createElement("div");
		rowDiv.classList.add("jcc-grid-fake-row");
		rowDiv.classList.add("jcc-grid-fake-row-" + theme);
		rowDiv.style.top = nextRowTop + "px";
		rowDiv.style.height = rowHeight + "px";
		viewContents.appendChild(rowDiv);
		
		if(el.dataset.biColor == "no")
			rowDiv.classList.add("jcc-grid-fake-row-even-" + theme);
		
		var fakeRow = 
		{
			itemIndex : nextRowItemIndex,
			__$top$__ : nextRowTop,
			__$row$__ : rowDiv
		};
		
		function onRowClick()
		{
			var itemIndex = fakeRow.itemIndex;
			
			var event = jcc.dispatchCustomEvent(el, "e-click-row", { bubbles: false, cancelable: true, detail: { rowElement: rowDiv, cells: fakeRow, items: items, index: itemIndex } });
			if(event.defaultPrevented)
				return;
				
			if(el.dataset.selection == "none")
				return;
			
			var item = items[itemIndex];
			
			if(rangeSelect)
			{
				if(lastSelectedItem == null)
				{
					if(!item.__$selected$__)
						el.grid.scrollTo(itemIndex);
						
					el.grid.selection([itemIndex], true, item.__$selected$__);
				}
				else
				{
					var sel = [itemIndex];
					
					var lastSelectedIndex = el.grid.itemIndex(lastSelectedItem);
					
					if(itemIndex > lastSelectedIndex)
					{
						for(var i=itemIndex-1;i>=lastSelectedIndex;i--)
							sel.push(i);
					}
					else if(itemIndex < lastSelectedIndex)
					{
						for(var i=itemIndex+1;i<=lastSelectedIndex;i++)
							sel.push(i);
					}
					
					el.grid.scrollTo(itemIndex);
					el.grid.selection(sel);
				}
			}
			else
			{
				if(!item.__$selected$__)
					el.grid.scrollTo(itemIndex);
				
				var sel = el.grid.selection();
				el.grid.selection([itemIndex], appendSelect, item.__$selected$__);
				if(!appendSelect && sel.length > 1)
					el.grid.selection([itemIndex]);
			}
		}
		
		rowDiv.addEventListener("click", onRowClick, false);
		
		for(var j=0;j<columnsArray.length;j++)
		{
			var colID = columnsArray[j].id;
			
			var cellDiv = document.createElement("div");
			cellDiv.classList.add("jcc-grid-fake-row-cell");
			cellDiv.classList.add("jcc-grid-fake-row-cell-" + theme);
			cellDiv.style.width = columnWidths[colID] + "px";
			rowDiv.appendChild(cellDiv);
			
			var cellPlaceholder = document.createElement("div");
			cellPlaceholder.classList.add("jcc-grid-fake-row-cell-placeholder");
			cellDiv.appendChild(cellPlaceholder);
			
			var cellDefault = document.createElement("div");
			cellDefault.classList.add("jcc-grid-default-cell");
			cellPlaceholder.appendChild(cellDefault);
			
			fakeRow[colID] = cellPlaceholder;
			cellPlaceholder.__$defaultCell$__ = cellDefault;
		}
		fakeRows.push(fakeRow);
		/*
		if(fakeRow.itemIndex >= 0)
			bindRow(fakeRow, fakeRow.itemIndex);
		else
			rowDiv.style.display = "none"; //make the row invisible when not used
		
		nextRowTop += rowHeight;
		
		if(nextRowItemIndex < 0)
		{
			if(nextRowTop + rowHeight >= 0)
				nextRowItemIndex = 0;
		}
		else
			nextRowItemIndex++;
			
		if(nextRowItemIndex >= items.length)
			nextRowItemIndex = -1;*/
	}
	
	function adjustScrollHeight()
	{
		if(!vScrollDetermine)
			return;
			
		var height = items.length * rowHeight;
		vScrollDetermine.style.height = height + "px";
	}
	
	function onViewResize()
	{
		var viewHeight = jcc.getElementLocalRect(view).height;
		if(prevViewHeight != viewHeight)
		{
			prevViewHeight = viewHeight
			var fakeRowsDesiredCount = Math.max(Math.floor((viewHeight + 2 * EXTRA_SPACE_PER_SIDE) / rowHeight + 1), 3);
			var fakeRowsCount = fakeRows.length;
			if(fakeRowsDesiredCount > fakeRowsCount)
			{
				var topBegin = -(Math.floor(EXTRA_SPACE_PER_SIDE / rowHeight) * rowHeight);
				var nextRowTop = fakeRowsCount == 0 ? topBegin : (fakeRows[fakeRowsCount-1].__$top$__ + rowHeight);
				var nextRowItemIndex = fakeRowsCount == 0 ? -1 : fakeRows[fakeRowsCount-1].itemIndex;
				if(nextRowItemIndex >= 0)
					nextRowItemIndex++;
				if(nextRowItemIndex >= items.length)
					nextRowItemIndex = -1;
				
				var rowsToCreate = fakeRowsDesiredCount - fakeRowsCount;
				for(var i=0;i<rowsToCreate;i++)
					createFakeRow(nextRowTop, nextRowItemIndex);
			}
		}
		
		el.grid.refreshItems();
	}
	
	function destroyView()
	{
		var sel = el.grid.selection();
		if(sel.length > 0)
			el.grid.unselectAll();
		
		if(view)
		{
			jcc.unenhance(view);
			
			if(viewContents)
			{
				if(vScrollDetermine)
				{
					viewContents.removeChild(vScrollDetermine);
					vScrollDetermine = undefined;
				}		
				
				for(var i=0;i<fakeRows.length;i++)
				{
					var fakeRow = fakeRows[i];
					
					if(fakeRow.itemIndex >= 0)
					{
						var row = items[fakeRow.itemIndex].__$cells$__;
						unbindRow(row, fakeRow.itemIndex);
					}
					
					var rowDiv = fakeRow.__$row$__;
					rowDiv.removeEventListener("click", onRowClick);
					
					for(var cols=0;cols<rowDiv.childNodes.length;cols++)
					{
						var cellDiv = rowDiv.childNodes[0];
						
						for(var colPh=0;colPh<cellDiv.childNodes.length;colPh++)
						{
							var cellPlaceholder = cellDiv.childNodes[0];
							
							for(var cDef=0;cDef<cellPlaceholder.childNodes.length;cDef++)
							{
								var cellDefault = cellPlaceholder.childNodes[0];
								cellPlaceholder.removeChild(cellDefault);
							}
							
							cellDiv.removeChild(cellPlaceholder);
						}
						
						rowDiv.removeChild(cellDiv);
					}
					
					viewContents.removeChild(rowDiv);
				}
				fakeRows = undefined;
				
				for(var i=0;i<items.length;i++)
				{
					delete items[i].__$selected$__;
					delete items[i].__$unselectable$__;
					delete items[i].__$cells$__;
				}
				items = undefined;
				
				view.removeChild(viewContents);
				viewContents = undefined;
			}
			
			el.removeChild(view);
			view = undefined;
		}
	}
	
	this.reservedColumnIDs = 
	{
		itemIndex : true,
		__$top$__ : true,
		__$row$_ : true,
		__$enum$__ : true,
		__$selected$__ : true,
		__$unselectable$__ : true
	};
	
	this.refresh = function()
	{
		this.destroy();
		
		//Set defaults
		if(el.dataset.corners != "flat" && el.dataset.corners != "smooth")
			el.dataset.corners = "smooth";
		
		if(el.dataset.isotope != "normal" && el.dataset.isotope != "inset")
			el.dataset.isotope = "normal";
			
		if(el.dataset.biColor != "yes" && el.dataset.biColor != "no")
			el.dataset.biColor = "yes";
			
		if(el.dataset.selection != "none" && el.dataset.selection != "single" && el.dataset.selection != "multiple")
			el.dataset.selection = "none";
			
		if(el.dataset.scrollbarsVisibility != "always" && el.dataset.scrollbarsVisibility != "fade" && el.dataset.scrollbarsVisibility != "none")
			el.dataset.scrollbarsVisibility = "fade";
			
		if(el.dataset.kinetics != "yes" && el.dataset.kinetics != "no")
			el.dataset.kinetics = "yes";
			
		if(!el.dataset.items || el.dataset.items.length == 0)
			el.dataset.items = "[]";
			
		var htmlCols = el.querySelectorAll("*[data-role='grid-column']");
		columns = {};
		columnsArray = [];
		columnWidths = {};
		for(var i=0;i<htmlCols.length;i++)
		{
			var col = htmlCols[i];
			if(this.reservedColumnIDs[col.id] == true)
			{
				alert("JCC: The column ID '" + col.id + "' is reserved for internal use of JCC. Please specify another column ID!");
				return;
			}
			columns[col.id] = col;
			columnsArray.push(col);
		}
			
		rowHeight = parseInt(el.dataset.rowHeight);
		if(isNaN(rowHeight) || rowHeight < 1)
		{
			rowHeight = DEFAULT_ROW_HEIGHT;
			el.dataset.rowHeight = DEFAULT_ROW_HEIGHT;
		}
		EXTRA_SPACE_PER_SIDE = Math.max(EXTRA_SPACE_PER_SIDE, rowHeight*3);
		
		var itemsOrig;
		try
		{
			eval("itemsOrig=" + el.dataset.items);
			if(itemsOrig == null || itemsOrig.length == undefined || isNaN(itemsOrig.length))
				throw "Incorrect items source provided!";
		}
		catch(e)
		{
			alert("JCC: The items JavaScript you have specified for the grid seems to have errors. Please revise the data-items attribute data!");
			return;
		}
		
		el.grid = this;
		
		theme = this.theme();
		
		rowCounter = 0;
		
		lastSelectedItem = null;
		
		el.classList.add("jcc-grid");
		el.classList.add("jcc-grid-" + theme);
		
		var position = jcc.getComputedStyle(el, "position");
		if(position == "static")
			el.classList.add("jcc-grid-relative");
			
		headerElement = el.querySelector("*[data-role='grid-header']");
		
		items = [];
			
		el.addEventListener("e-sort", onESort, false);
		el.addEventListener("e-click-row", onEClickRow, false);
		el.addEventListener("e-column-resize", onEColumnResize, false);
		el.addEventListener("e-column-manual-resize", onEColumnManualResize, false);
		el.addEventListener("e-bind-row", onEBindRow, false);
		el.addEventListener("e-unbind-row", onEUnbindRow, false);
		el.addEventListener("e-selection", onESelection, false);
		window.addEventListener("keydown", onShiftDown, false);
		window.addEventListener("keyup", onShiftUp, false);
		window.addEventListener("keydown", onCtrlDown, false);
		window.addEventListener("keyup", onCtrlUp, false);
		
		setTimeout(function()
		{
			createView();
			onViewResize();
			
			el.addEventListener("e-resized", onViewResize, false);
			jcc.resizeMonitor.addElement(el);
			
			for(var i=0;i<itemsOrig.length;i++)
				el.grid.addItem(itemsOrig[i], i == itemsOrig.length-1);
			
			jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: [], items: items } });
			
		}, 0);
	}
	
	this.destroy = function()
	{	
		el.removeEventListener("e-sort", onESort);
		el.removeEventListener("e-click-row", onEClickRow);
		el.removeEventListener("e-column-resize", onEColumnResize);
		el.removeEventListener("e-column-manual-resize", onEColumnManualResize);
		el.removeEventListener("e-resized", onViewResize);
		el.removeEventListener("e-bind-row", onEBindRow);
		el.removeEventListener("e-unbind-row", onEUnbindRow);
		el.removeEventListener("e-selection", onESelection);
		window.removeEventListener("keydown", onShiftDown);
		window.removeEventListener("keyup", onShiftUp);
		window.removeEventListener("keydown", onCtrlDown);
		window.removeEventListener("keyup", onCtrlUp);
		
		if(el.grid)
		{
			jcc.resizeMonitor.removeElement(el);
			
			destroyView();
			
			el.classList.remove("jcc-grid");
			el.classList.remove("jcc-grid-" + theme);
			el.classList.remove("jcc-grid-relative");
			delete el.grid;
		}
		
		columns = undefined;
		columnsArray = undefined;
		columnWidths = undefined;
		headerElement = undefined;
		prevContentsHscroll = undefined;
		prevViewHeight = undefined;
	}
	
	this.fakeRows = function() { return fakeRows; }
	
	this.sort = function(columnID, ascending)
	{
		if(columnID == undefined && ascending == undefined)
		{
			for(var i in columns)
			{
				if(columns[i].id == undefined )
					continue;
				
				if(columns[i].dataset.sortable == "yes" && columns[i].dataset.sort != "none")
				{
					var res = 
					{	
						column: columns[i].id,
						sort: columns[i].dataset.sort
					};
					
					return res;
				}
			}
			
			var res = 
			{
				sort: "none"
			};
			
			return res; 
		}
		
		if(!columns[columnID] || columns[columnID].dataset.sortable == "no")
			return;
			
		for(var i in columns)
		{
			if(columns[i].id == undefined )
				continue;
			
			if(columns[i].id == columnID)
				columns[i].dataset.sort = ascending ? "asc" : "desc";
			else
				columns[i].dataset.sort = "none";
			
			var isIE = !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);
			if(isIE)
			{
				columns[i].style.display = "none";
				columns[i].style.display = "";
			}
		}
		
		if(items.length > 0)
		{
			this.unbindRows();
			jcc.sortedSubfieldArray(items, columnID, "sortValue", true, !ascending);
			reindexRows();
		}
		
		jcc.dispatchCustomEvent(el, "e-sort", { bubbles: false, cancelable: true, detail: { column: columnID, ascending: ascending, items: items } });	
	}
	
	this.column = function(columnID) { return columns[columnID] ? columns[columnID].gridColumn : undefined; }
	
	this.itemIndex = function(item)
	{
		return items.findIndexCompare(item, function(a, b) { return a == b; } );
	}
	
	this.itemChangedSortValue = function(item, ready)
	{
		if(ready == undefined)
			ready = true;
			
		var sorting = this.sort();
		if(sorting.column != undefined)
		{
			this.unbindRows();
			
			var itemIndex = this.itemIndex(item);
			items.splice(itemIndex, 1);
			items.add(item);
			
			if(ready)
				reindexRows();
		}
	}
	
	this.itemsChangedSortValue = function()
	{
		var sorting = this.sort();
		if(sorting.column != undefined)
		{
			this.unbindRows();
			jcc.sortedSubfieldArray(items, sorting.column, "sortValue", true, sorting.sort == "desc");
			reindexRows();
		}
	}
	
	this.refreshItem = function(itemIndex)
	{
		for(var i=0;i<fakeRows.length;i++)
		{
			var fakeRow = fakeRows[i];
			if(fakeRow.itemIndex == itemIndex)
			{
				unbindRow(fakeRow, itemIndex);
				bindRow(fakeRow, itemIndex);
				
				break;
			}
		}
	}
	
	this.refreshItems = function() 
	{ 
		adjustScrollHeight();
		this.unbindRows();
		reindexRows(); 
	}
	
	this.unbindRows = function() 
	{ 
		if(allUnbound)
			return; //alredy done
		
		if(fakeRows)
		{
			for(var i=0;i<fakeRows.length;i++)
			{
				var row = fakeRows[i];
				if(row.itemIndex >= 0)
				{
					unbindRow(row, row.itemIndex);
					row.itemIndex = -1;
				}
			}
		}
		
		allUnbound = true;
	}
	
	this.itemsSelectable = function(itemIndices, selectable)
	{
		if(selectable == undefined)
		{
			var res = [];
			for(var i=0;i<itemIndices.length;i++)
				res.push(items[itemIndices[i]].__$unselectable$__ != true)
	
			return res;
		}
		else
		{
			var sel = this.selection();
			var selMap = {};
			for(var i=0;i<sel.length;i++)
				selMap[sel[i]] = true;

			sel = [];
			
			for(var i=0;i<itemIndices.length;i++)
			{
				var itemIndex = itemIndices[i];
				var item = items[itemIndex];
				item.__$unselectable$__ = !selectable;
				
				if(selMap[itemIndex] == true && selectable == false) //item is selected but should not be...
					sel.push(i);
			}
			
			if(sel.length > 0)
				this.selection(sel, false, true);
		}
	}
	
	this.items = function() { return items; }
	
	this.addItem = function(item, ready)
	{
		if(ready == undefined)
			ready = true;
			
		item.__$enum$__ = rowCounter++;
			
		this.unbindRows();
		
		items.push(item);
		
		if(ready)
		{
			var sorting = this.sort();	
			if(sorting.column != undefined)
				jcc.sortedSubfieldArray(items, sorting.column, "sortValue", true, sorting.sort == "desc");
			else
				jcc.sortedArray(items, "__$enum$__", false);
			
			adjustScrollHeight();
			
			reindexRows();
		}
	}
	
	this.removeItems = function(itemIndices)
	{
		if(itemIndices.length == 0)
			return;
		
		var selectionChanged = false;
		
		itemIndices.sort(function(a,b)
		{
			return a > b ? 1 : -1;
		});
		
		if(fakeRows)
		{
			for(var i=0;i<fakeRows.length;i++)
			{
				var row = fakeRows[i];
				if(row.itemIndex >= 0)
				{
					unbindRow(row, row.itemIndex);
					row.itemIndex = -1;
				}
			}
		}
		
		for(var i=0;i<itemIndices.length;i++)
		{
			var itemIndex = itemIndices[i] - i;
			var item = items[itemIndex];
			
			if(item.__$selected$__)
			{
				selectionChanged = true;
				
				if(lastSelectedItem == item)
					lastSelectedItem = null;
			}
			
			items.splice(itemIndex, 1);
		}
		
		adjustScrollHeight();
		
		reindexRows();
				
		if(selectionChanged)
			jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: el.grid.selection(), items: items } });
	}
	
	this.removeAll = function()
	{
		var sel = this.selection();
		
		this.unbindRows();
		
		items.length = 0;
		
		lastSelectedItem = null;
		adjustScrollHeight();
		
		reindexRows();
		
		if(sel.length > 0)
			jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: [], items: items } });
	}
	
	this.rangeSelect = function(enable)
	{
		if(arguments.length == 0)
			return rangeSelect == true;
		else	
			rangeSelect = enable;
	}
	
	this.appendSelect = function(enable)
	{
		if(arguments.length == 0)
			return appendSelect == true;
		else	
			appendSelect = enable;
	}
	
	this.selection = function(itemIndices, append, remove)
	{
		if(arguments.length == 0)
		{
			var res = [];
			for(var i=0;i<items.length;i++)
			{
				if(items[i].__$selected$__)
					res.push(i);
			}
			
			return res;
		}
		
		if(el.dataset.selection == "none")
			return;
			
		if(el.dataset.selection == "single" && itemIndices.length > 1)
			itemIndices.splice(1, itemIndices.length - 1); 
		
		if(!append || el.dataset.selection == "single")
		{
			//remove previous selection
			for(var i=0;i<items.length;i++)
			{
				if(items[i].__$selected$__)
				{
					items[i].__$selected$__ = false;
					
					var row = items[i].__$cells$__;
					if(row)
					{
						unbindRow(row, i);
						bindRow(row, i);
					}
				}
			}
		}
		
		//add/remove new selection
		var theLastSelectedItem = null;
		for(var i=0;i<itemIndices.length;i++)
		{
			var itemIndex = itemIndices[i];
			
			var prevSelState = items[itemIndex].__$selected$__;
			
			if(!items[itemIndex].__$unselectable$__ && !remove)
			{
				items[itemIndex].__$selected$__ = true;
				theLastSelectedItem = items[itemIndex];
			}
			else
				items[itemIndex].__$selected$__ = false;
			
			var row = items[itemIndex].__$cells$__;
			if(row && prevSelState != items[itemIndex].__$selected$__)
			{
				unbindRow(row, itemIndex);
				bindRow(row, itemIndex);
			}
		}
		
		var sel = this.selection();
		if(sel.length == 0)
			lastSelectedItem = null;
		else if((rangeSelect && lastSelectedItem == null) || !rangeSelect)
			lastSelectedItem = theLastSelectedItem;
		
		jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: sel, items: items } });
	}
	
	this.selectAll = function()
	{
		var all = [];
		for(var i=0;i<items.length;i++)
			all.push(i);
		this.selection(all, true);
	}
	
	this.unselectAll = function()
	{
		this.selection([]);
	}
	
	this.scrollTo = function(rowIndex)
	{
		if(rowIndex < 0)
			rowIndex = 0;
		if(rowIndex >= items.length)
			rowIndex = items.length - 1;
		if(rowIndex < 0)
			return;
			
		var scrollTop = view.scrollable.scrollTop();
		
		var top = rowIndex * rowHeight - scrollTop;
		
		var crect = jcc.getElementLocalRect(viewContents);
		var trect = 
		{
			left: 0,
			right: crect.width,
			top: top,
			bottom: top + rowHeight,
			width: crect.width,
			height: rowHeight
		};
		
		top = 0;
		
		if(trect.bottom > crect.bottom)
		{
			top = trect.bottom - crect.bottom + Math.round(0.7 * rowHeight);
		
			trect.top -= top;
			trect.bottom -= top;
		}
		
		if(trect.top < crect.top)
			top += trect.top - crect.top - Math.round(0.7 * rowHeight);
		
		if(top != 0)
			view.scrollable.scrollBy(0, top);
	}
	
	this.getVisibleItems = function()
	{
		var res = [];
		for(var i=0;i<fakeRows.length;i++)
		{
			var row = fakeRows[i];
			if(row.itemIndex >= 0)
				res.push(row.itemIndex);
		}
		return res;
	}
};
/* grid-header*/
jcc.widgets["grid-header"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "grid-header";
	},
	enhance : function(el) { if(el.gridHeader) el.gridHeader.refresh(); else new jcc.gridHeader(el).refresh(); },
	unenhance : function(el) { if(el.gridHeader) el.gridHeader.destroy(); }
};
jcc.gridHeader = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.grid)
		{
			alert("JCC: The 'grid-header' must be a direct child of a 'grid'. Please revise your HTML code!");
			return;
		}
		
		this.destroy();
		
		//Set defaults
		if(el.dataset.size != "small" && el.dataset.size != "normal" && el.dataset.size != "large")
			el.dataset.size = "normal";
			
		if(el.dataset.visible != "yes" && el.dataset.visible != "no")
			el.dataset.visible = "no";
		
		el.gridHeader = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-grid-header");
		el.classList.add("jcc-grid-header-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.gridHeader)
		{
			el.classList.remove("jcc-grid-header");
			el.classList.remove("jcc-grid-header-" + theme);
			
			delete el.gridHeader;
		}
	}
};
/* grid-column */
jcc.widgets["grid-column"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "grid-column";
	},
	enhance : function(el) { if(el.gridColumn) el.gridColumn.refresh(); else new jcc.gridColumn(el).refresh(); },
	unenhance : function(el) { if(el.gridColumn) el.gridColumn.destroy(); }
};
jcc.gridColumn = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var MOVED_THRESHOLD = 2;
	
	var MIN_COLUMN_WIDTH = 
	{
		small: 44,
		normal: 54,
		large: 56
	};
	
	var theme, placeholder, resizeGrip, grid, headerElement, prex, targetWidth, will_move, pixelsMoved;
	
	function computeWidth(dataWidth)
	{
		var width = parseInt(dataWidth);
		if(/^\d+%$/.test(dataWidth))
			width = Math.round(headerElement.clientWidth * width / 100.0);
			
		return width;
	}
	
	function setWidth(newWidth)
	{
		if(newWidth == undefined)
			return el.offsetWidth;
		
		var minWidth = computeWidth(el.dataset.minWidth);
		if(newWidth < minWidth)
			newWidth = minWidth;
		if(el.dataset.maxWidth != "auto")
		{
			var maxWidth = computeWidth(el.dataset.maxWidth);
			if(maxWidth < minWidth) //this is stupid, but eh...
				maxWidth = minWidth;
				
			if(newWidth > maxWidth)
				newWidth = maxWidth;
		}
		
		el.style.width = newWidth + "px";
	
		jcc.dispatchCustomEvent(grid.element(), "e-column-resize", { bubbles: false, cancelable: true, detail: { column: el.id, width: newWidth } });
	}
	
	function onGridResize()
	{
		setWidth(computeWidth(el.dataset.width));
	}
	
	function onClick(evt)
	{
		if(pixelsMoved > MOVED_THRESHOLD)
		{
			pixelsMoved = 0;
			evt.preventDefault();
			evt.stopPropagation();
		}
		else
			grid.sort(el.id, el.dataset.sort != "asc");
	}
	
	function onGripPointerDown(evt)
	{
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
				
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
			pageX = evt.changedTouches[0].pageX;
		else
			pageX = evt.pageX;
		
		prex = pageX;
		targetWidth = el.gridColumn.width();
		pixelsMoved = 0;
		will_move = true;
	}
	
	function onDocumentPointerMove(evt)
	{
		if(!will_move)
			return;
			
		if(evt.touches && evt.touches.length > 1)
			return; //allow page zooming
			
		var pageX, pageY;
		if(evt.changedTouches && evt.changedTouches.length > 0)
			pageX = evt.changedTouches[0].pageX;
		else
			pageX = evt.pageX;
		
		var dx = pageX - prex;
		
		targetWidth += dx;
		el.gridColumn.width(targetWidth);
		
		prex = pageX;
		pixelsMoved += Math.abs(dx);

		jcc.dispatchCustomEvent(grid.element(), "e-column-manual-resize", { bubbles: false, cancelable: true, detail: { column: el.id, width: el.gridColumn.width() } });
		
		evt.preventDefault();
		evt.stopPropagation();
	}
	
	function onDocumentPointerUp(evt)
	{
		if(will_move)
			will_move = false;
	}
	
	this.super_setOptions = this.setOptions;
	this.setOptions = function(opt)
	{
		this.super_setOptions(opt);
		
		if(opt["align"] != undefined)
			grid.refreshItems();
			
		if(opt["sort"] != undefined && opt["sort"] != "none")
			grid.sort(el.id, el.dataset.sort == "asc");
	}
	
	this.refresh = function()
	{
		if(!el.parentNode.gridHeader)
		{
			alert("JCC: The 'grid-column' must be a direct child of a 'grid-header'. Please revise your HTML code!");
			return;
		}
		
		if(!el.id || el.id.length == 0)
		{
			alert("JCC: Each 'grid-column' must have an unique ID. Please revise your HTML code!");
			return;
		}
		
		this.destroy();
		
		placeholder = el.querySelector("div:first-child");
		if(el.parentNode.dataset.visible == "yes" && !placeholder)
		{
			alert("JCC: Visible columns musta contain a placeholder DIV. Please revise your HTML code!");
			return;
		}
		
		headerElement = el.parentNode;
		
		//Set defaults
		if(el.dataset.sort != "none" && el.dataset.sort != "asc" && el.dataset.sort != "desc")
			el.dataset.sort = "none";
			
		if(el.dataset.resizable != "yes" && el.dataset.resizable != "no")
			el.dataset.resizable = "no";
			
		if(el.dataset.sortable != "yes" && el.dataset.sortable != "no")
			el.dataset.sortable = "no";
		
		if(el.dataset.width == undefined || (/^\d+$/.test(el.dataset.width) == false && /^\d+%$/.test(el.dataset.width) == false) || (/^\d+$/.test(el.dataset.width) == true && parseInt(el.dataset.width) < MIN_COLUMN_WIDTH[headerElement.dataset.size]))
			el.dataset.width = MIN_COLUMN_WIDTH[headerElement.dataset.size];
			
		if(el.dataset.minWidth == undefined || (/^\d+$/.test(el.dataset.minWidth) == false && /^\d+%$/.test(el.dataset.minWidth) == false) || (/^\d+$/.test(el.dataset.minWidth) == true && parseInt(el.dataset.minWidth) < MIN_COLUMN_WIDTH[headerElement.dataset.size]))
			el.dataset.minWidth = MIN_COLUMN_WIDTH[headerElement.dataset.size];
			
		if(el.dataset.maxWidth == undefined || (/^\d+$/.test(el.dataset.maxWidth) == false && /^\d+%$/.test(el.dataset.maxWidth) == false))
			el.dataset.maxWidth = "auto";
			
		if(el.dataset.align != "left" && el.dataset.align != "right" && el.dataset.align != "center")
			el.dataset.align = "left";
		
		el.gridColumn = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-grid-column");
		el.classList.add("jcc-grid-column-" + theme);
		
		if(el.dataset.resizable == "yes")
		{
			resizeGrip = document.createElement("div");
			el.appendChild(resizeGrip);
			resizeGrip.classList.add("jcc-grid-column-resize-grip");
			resizeGrip.classList.add("jcc-grid-column-resize-grip-" + theme);
			
			resizeGrip.addEventListener("mousedown", onGripPointerDown, false);
			resizeGrip.addEventListener("touchstart", onGripPointerDown, false);
			
			document.addEventListener("mousemove", onDocumentPointerMove, false);
			document.addEventListener("touchmove", onDocumentPointerMove, false);
			
			document.addEventListener("mouseup", onDocumentPointerUp, false);
			document.addEventListener("touchend", onDocumentPointerUp, false);
		}
		
		if(placeholder)
			placeholder.classList.add("jcc-grid-column-placeholder");
			
		var gridNode = headerElement.parentNode;
		gridNode.addEventListener("e-resized", onGridResize, false);
		grid = gridNode.grid;
		onGridResize();
		
		if(el.dataset.sortable == "yes")
			el.addEventListener("click", onClick, false);
	}
	
	this.destroy = function()
	{	
		if(el.gridColumn)
		{
			el.classList.remove("jcc-grid-column");
			el.classList.remove("jcc-grid-column-" + theme);
			
			el.removeEventListener("click", onClick);
			
			var gridNode = el.parentNode.parentNode;
			gridNode.removeEventListener("e-resized", onGridResize);
			
			if(placeholder)
			{
				placeholder.classList.remove("jcc-grid-column-placeholder");
				placeholder = undefined;
			}
			
			if(resizeGrip)
			{
				el.removeChild(resizeGrip);
				resizeGrip = undefined;
				
				document.removeEventListener("mousemove", onDocumentPointerMove);
				document.removeEventListener("touchmove", onDocumentPointerMove);
				
				document.removeEventListener("mouseup", onDocumentPointerUp);
				document.removeEventListener("touchend", onDocumentPointerUp);
			}
			
			delete el.gridColumn;
		}
		
		headerElement = undefined;
	}
	
	this.width = function(newWidth)
	{
		if(newWidth == undefined)
			return el.offsetWidth;
		
		setWidth(newWidth);
		el.dataset.width = newWidth;
	}
};
/* grid-column-label */
jcc.widgets["grid-column-label"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "grid-column-label";
	},
	enhance : function(el) { if(el.gridColumnLabel) el.gridColumnLabel.refresh(); else new jcc.gridColumnLabel(el).refresh(); },
	unenhance : function(el) { if(el.gridColumnLabel) el.gridColumnLabel.destroy(); }
};
jcc.gridColumnLabel = function(el)
{
	this.widget = jcc.widget;
	this.widget(el);
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.parentNode.gridColumn)
		{
			alert("JCC: The 'grid-column-label' must be a direct child of a 'grid-column'-placeholder. Please revise your HTML code!");
			return;
		}
			
		this.destroy();
		
		//Set defaults
		if(el.dataset.multiline != "no" && el.dataset.multiline != "yes")
			el.dataset.multiline = "no";
		
		el.gridColumnLabel = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-grid-column-label");
	}
	
	this.destroy = function()
	{	
		if(el.gridColumnLabel)
		{
			el.classList.remove("jcc-grid-column-label");
			
			delete el.gridColumnLabel;
		}
	}
};
/* grid-footer */
jcc.widgets["grid-footer"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "grid-footer";
	},
	enhance : function(el) { if(el.gridFooter) el.gridFooter.refresh(); else new jcc.gridFooter(el).refresh(); },
	unenhance : function(el) { if(el.gridFooter) el.gridFooter.destroy(); }
};
jcc.gridFooter = function(el)
{
	this.toolbar = jcc.toolbar;
	this.toolbar(el);
	
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.grid)
		{
			alert("JCC: The 'grid-footer' must be a direct child of a 'grid'. Please revise your HTML code!");
			return;
		}
		
		//Set defaults
		el.dataset.orientation = "horizontal";
		el.dataset.position = "bottom";
		if(el.dataset.visible != "yes" && el.dataset.visible != "no")
			el.dataset.visible = "yes";
		
		this.destroy();
		this.super_refresh();
		
		el.gridFooter = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-grid-footer");
		el.classList.add("jcc-grid-footer-" + theme);
	}
	
	this.destroy = function()
	{	
		this.super_destroy();
		
		if(el.gridFooter)
		{
			el.classList.remove("jcc-grid-footer");
			el.classList.remove("jcc-grid-footer-" + theme);
			
			delete el.gridFooter;
		}
	}
};

/* tree */
jcc.widgets["tree"] = 
{
	version : "1.1.1",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tree";
	},
	enhance : function(el) { if(el.tree) el.tree.refresh(); else new jcc.tree(el).refresh(); },
	unenhance : function(el) { if(el.tree) el.tree.destroy(); }
};
jcc.tree = function(el)
{
	this.grid = jcc.grid;
	this.grid(el);
	
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	this.super_selection = this.selection;
	this.super_scrollTo = this.scrollTo;
	
	var NODE_LEVEL_INDENT = 16;
	
	var theme, roots, sortFunc, header, column, cname, nodeCounter, indent,
	lastSelectedNode, selectedNodes, collapseSelectionChanged, viewContents;

	function treeNode()
	{
		this.__$level$__ = 0;
		this.__$nodeIndex$__ = -1;
		this.__$expanded$__ = false;
		
		this.parentNode = null;
		this.childNodes = [];
		
		this.isExpanded = function() { return this.__$expanded$__; }
	}
	
	function onESelection(event)
	{
		if(el.dataset.eSelection && el.dataset.eSelection.length > 0)
			eval(el.dataset.eSelection);
	}
	
	function onEClickTreeRow(event)
	{
		if(el.dataset.eClickTreeRow && el.dataset.eClickTreeRow.length > 0)
			eval(el.dataset.eClickTreeRow);
	}
	
	function onEBindNode(event)
	{
		if(el.dataset.eBindNode && el.dataset.eBindNode.length > 0)
			eval(el.dataset.eBindNode);
	}
	
	function onEUnbindNode(event)
	{
		if(el.dataset.eUnbindNode && el.dataset.eUnbindNode.length > 0)
			eval(el.dataset.eUnbindNode);
	}
	
	function onRowClick(evt)
	{
		var rowDiv = evt.detail.rowElement;
		var cells = evt.detail.cells;
		var items = evt.detail.items;
		var node = items[evt.detail.index][cname].value;
		
		evt.preventDefault();
		
		var event = jcc.dispatchCustomEvent(el, "e-click-tree-row", { bubbles: false, cancelable: true, detail: { rowElement: rowDiv, node: node, iconElement: cells.__$icon$__, textElement: cells.__$text$__ } });
		if(event.defaultPrevented)
			return;
			
		if(el.dataset.selection == "none")
			return;
		
		var rangeSelect = el.tree.rangeSelect();
		
		if(rangeSelect)
		{
			if(!lastSelectedNode)
			{
				if(!node.__$selected$__)
					el.tree.scrollTo(node);
					
				el.tree.selection([node], true, node.__$selected$__);
			}
			else
			{
				var sel = [node];
				
				if(node.__$nodeIndex$__ >= 0 && lastSelectedNode.__$nodeIndex$__ >= 0)
				{
					if(node.__$nodeIndex$__ > lastSelectedNode.__$nodeIndex$__)
					{
						for(var i=node.__$nodeIndex$__-1;i>=lastSelectedNode.__$nodeIndex$__;i--)
						{
							var n = items[i][cname].value;
							sel.push(n);
						}
					}
					else if(node.__$nodeIndex$__ < lastSelectedNode.__$nodeIndex$__)
					{
						for(var i=node.__$nodeIndex$__+1;i<=lastSelectedNode.__$nodeIndex$__;i++)
						{
							var n = items[i][cname].value;
							sel.push(n);
						}
					}
				}
				
				el.tree.scrollTo(node);
				el.tree.selection(sel);
			}
		}
		else
		{
			if(!node.__$selected$__)
				el.tree.scrollTo(node);
			
			var appendSelect = el.tree.appendSelect();
			
			if(!appendSelect && selectedNodes.length > 1)
				el.tree.selection([node]);
			else
				el.tree.selection([node], appendSelect, node.__$selected$__);
		}
	}
	
	function prepareFakeRow(cells)
	{
		if(cells.__$placeholder$__ == undefined)
		{
			cells[cname].classList.add("jcc-tree-node-cell");
			
			//Create node placeholder
			var placeholder = document.createElement("div");
			placeholder.classList.add("jcc-tree-node-placeholder");
			cells.__$placeholder$__ = placeholder;
			
			//Create node expanded/collapsed arrow
			var arrow = document.createElement("div");
			arrow.classList.add("jcc-tree-node-arrow");
			placeholder.appendChild(arrow);
			cells.__$arrow$__ = arrow;
			
			//Create node icon
			var icon = document.createElement("i");
			icon.classList.add("jcc-tree-node-icon");
			icon.dataset.role = "icon";
			placeholder.appendChild(icon);
			cells.__$icon$__ = icon;
			jcc.enhance(icon);
				
			//Create node text
			var text = document.createElement("div");
			text.classList.add("jcc-tree-node-text");
			placeholder.appendChild(text);
			cells.__$text$__ = text;
		}
	}
	
	function unprepareFakeRows()
	{
		var fakeRows = el.tree.fakeRows();
		for(var i=0;i<fakeRows.length;i++)
		{
			var cells = fakeRows[i];
			
			if(cells.__$placeholder$__ != undefined)
			{
				var placeholder = cells.__$placeholder$__;
				if(placeholder.parentNode == cells[cname])
					cells[cname].removeChild(placeholder);	
				delete cells.__$placeholder$__;
				
				var arrow = cells.__$arrow$__;
				placeholder.removeChild(arrow);
				delete cells.__$arrow$__;
				
				var icon = cells.__$icon$__;
				jcc.unenhance(icon);
				placeholder.removeChild(icon);
				delete cells.__$icon$__;
				
				var text = cells.__$text$__;
				placeholder.removeChild(text);
				delete cells.__$text$__;
			}
		}
	}
	
	function adjustFakeRows()
	{
		var fakeRows = el.tree.fakeRows();
		
		for(var i=0;i<fakeRows.length;i++)
		{
			var cells = fakeRows[i];
			var cellHolder = cells[cname].parentNode;
			cellHolder.style.width =  "0px";
		}
		
		var newWidth = Math.abs(el.scrollWidth - viewContents.scrollWidth) <= 8 ? viewContents.scrollWidth : (viewContents.scrollWidth + 8);
		
		for(var i=0;i<fakeRows.length;i++)
		{
			var cells = fakeRows[i];
			var cellHolder = cells[cname].parentNode;
			cellHolder.style.width = newWidth + "px";
		}
	}
	
	function onViewResize()
	{
		adjustFakeRows();
	}
	
	function onBindRow(evt)
	{
		var rowDiv = evt.detail.rowElement;
		var items = evt.detail.items;
		var cells = evt.detail.cells;
		var node = items[evt.detail.index][cname].value;
		
		prepareFakeRow(cells);
		
		if(node.__$selected$__)
			rowDiv.classList.add("jcc-grid-fake-row-selected-" + theme);
		
		cells.__$arrow$__.onclick = 
		function(evt)
		{
			el.tree.expanded(node, !node.isExpanded(), false, true);
			if(node.isExpanded())
				el.tree.scrollTo(node.childNodes[0]);
			
			evt.preventDefault();
			evt.stopPropagation();
		};
		cells.__$arrow$__.style.visibility = node.childNodes.length > 0 ? "" : "hidden";
		cells.__$placeholder$__.dataset.expanded = node.isExpanded() ? "yes" : "no";
		cells.__$placeholder$__.style.marginLeft = (node.__$level$__ * indent) + "px";
		
		var event = jcc.dispatchCustomEvent(el, "e-bind-node", { bubbles: false, cancelable: true, detail: { rowElement: rowDiv, node: node, iconElement: cells.__$icon$__, textElement: cells.__$text$__ } });
		if(!event.defaultPrevented)
			cells.__$text$__.innerHTML = jcc.xmlEncode(node.value);
		
		if(node.icon == undefined || node.icon.length == 0)
			cells.__$icon$__.style.display = "none";
		else
		{
			cells.__$icon$__.style.display = "";
			cells.__$icon$__.icon.setOptions({ icon : node.icon });
		}
		
		cells[cname].appendChild(cells.__$placeholder$__);
		
		evt.preventDefault();
	}
	
	function onUnbindRow(evt)
	{
		var rowDiv = evt.detail.rowElement;
		var items = evt.detail.items;
		var cells = evt.detail.cells;
		var node = items[evt.detail.index][cname];
		
		rowDiv.classList.remove("jcc-grid-fake-row-selected-" + theme);
		
		if(cells.__$placeholder$__)
		{
			var event = jcc.dispatchCustomEvent(el, "e-unbind-node", { bubbles: false, cancelable: true, detail: { rowElement: rowDiv, node: node, iconElement: cells.__$icon$__, textElement: cells.__$text$__ } });
			if(!event.defaultPrevented)
				cells.__$text$__.innerHTML = "";
				
			cells.__$arrow$__.onclick = undefined;
			cells[cname].removeChild(cells.__$placeholder$__);
		}
		
		evt.preventDefault();
	}
	
	function insertNode(parentNode, nodeInfo)
	{
		parentNode = el.tree.addNode(parentNode, nodeInfo, false);
		
		if(nodeInfo.children)
		{
			for(var i=0;i<nodeInfo.children.length;i++)
				insertNode(parentNode, nodeInfo.children[i]);
		}
	}
	
	this.reservedColumnIDs["__$placeholder$__"] = true;
	
	this.refresh = function()
	{
		//Set defaults
		el.dataset.items = "[]";
		el.dataset.biColor = "no";
		
		if(el.dataset.sort != "none" && el.dataset.sort != "asc" && el.dataset.sort != "desc")
			el.dataset.sort = "none";

		if(isNaN(el.dataset.itemIndent))
			indent = NODE_LEVEL_INDENT;
		else
			indent = parseInt(el.dataset.itemIndent);
			
		if(!el.dataset.nodes || el.dataset.nodes.length == 0)
			el.dataset.nodes = "[]";
		
		this.destroy();
		
		theme = this.theme();
		
		nodeCounter = 0;
		
		lastSelectedNode = null;
		selectedNodes = [];
		jcc.sortedArray(selectedNodes, "__$enum$__", false);
		
		var refElement = el.querySelector("div:first-child");
		
		header = document.createElement("div");
		header.dataset.role = "grid-header";
		header.dataset.visible = "no";
		if(refElement)
			jcc.insertBefore(header, refElement);
		else
			el.appendChild(header);
		
		cname = "##treecol##";
		column = document.createElement("div");
		column.dataset.role = "grid-column";
		column.dataset.align = "left";
		column.dataset.sortable = "no";
		column.dataset.resizable = "no";
		column.dataset.width = "100%";
		column.id = cname;
		header.appendChild(column);
		
		this.super_refresh();
		
		el.tree = this;
		
		var nodesOrig;
		try
		{
			eval("nodesOrig=" + el.dataset.nodes);
			if(nodesOrig == null || nodesOrig.length == undefined || isNaN(nodesOrig.length))
				throw "Incorrect nodes source provided!";
		}
		catch(e)
		{
			alert("JCC: The nodes JavaScript you have specified for the tree seems to have errors. Please revise the data-nodes attribute data!");
			return;
		}
		
		roots = [];
		jcc.sortedArray(roots, "sortValue", false, el.dataset.sort == "desc");
		
		theme = this.theme();
		
		el.classList.add("jcc-tree");
		el.classList.add("jcc-tree-" + theme);
		
		el.addEventListener("e-click-row", onRowClick, false);
		el.addEventListener("e-click-tree-row", onEClickTreeRow, false);
		el.addEventListener("e-bind-row", onBindRow, false);
		el.addEventListener("e-unbind-row", onUnbindRow, false);
		el.addEventListener("e-selection", onESelection, false);
		el.addEventListener("e-bind-node", onEBindNode, false);
		el.addEventListener("e-unbind-node", onEUnbindNode, false);
		
		setTimeout(function()
		{
			viewContents = el.querySelector(".jcc-contents");
			el.addEventListener("e-resized", onViewResize, false);
			jcc.resizeMonitor.addElement(el);
			
			for(var i=0;i<nodesOrig.length;i++)
				insertNode(null, nodesOrig[i]);
				
			el.grid.refreshItems();
			adjustFakeRows();
		}, 0);
	}
	
	this.destroy = function()
	{	
		jcc.resizeMonitor.removeElement(el);
		el.removeEventListener("e-resized", onViewResize);
		
		el.removeEventListener("e-click-row", onRowClick);
		el.removeEventListener("e-click-tree-row", onEClickTreeRow);
		el.removeEventListener("e-bind-row", onBindRow);
		el.removeEventListener("e-unbind-row", onUnbindRow);
		el.removeEventListener("e-selection", onESelection);
		el.removeEventListener("e-bind-node", onEBindNode);
		el.removeEventListener("e-unbind-node", onEUnbindNode);
		
		if(el.tree)
			unprepareFakeRows();
		
		this.super_destroy();
		
		if(el.tree)
		{
			roots = undefined;
			
			selectedNodes = undefined;
			
			if(header)
			{
				if(column)
				{
					if(column.gridColumn)
						column.gridColumn.destroy();
						
					header.removeChild(column);
					column = undefined;
				}
				
				if(header.gridHeader)
					header.gridHeader.destroy();
					
				el.removeChild(header);
				header = undefined;
			}
		
			el.classList.remove("jcc-tree");
			el.classList.remove("jcc-tree-" + theme);
			
			delete el.tree;
		}
	}
	
	function nodeLargestIndex(node)
	{
		var index = node.__$nodeIndex$__;
		
		if(node.isExpanded() && node.childNodes.length > 0)
			index = nodeLargestIndex(node.childNodes[node.childNodes.length-1]);
		
		return index;
	}
	
	function updateNodeIndices(items, startIndex)
	{
		for(var i=startIndex,u=0;i<items.length;i++, u++)
			items[i][cname].value.__$nodeIndex$__ = startIndex + u;
	}
	
	this.addNode = function(parentNode, nodeInfo, ready)
	{
		if(ready == undefined)
			ready = true;
			
		var node = new treeNode();
		
		node.__$enum$__ = nodeCounter++;
		node.icon = nodeInfo.icon;
		node.sortValue = nodeInfo.sortValue == undefined ? node.__$enum$__ : nodeInfo.sortValue;
		node.value = nodeInfo.value;
		node.extra = nodeInfo.extra;
		node.parentNode = parentNode;
		jcc.sortedArray(node.childNodes, "sortValue", false, el.dataset.sort == "desc");
		
		var insertIndex = -1;
		
		if(parentNode)
		{
			node.__$level$__ = parentNode.__$level$__ + 1;
			
			var index = parentNode.childNodes.add(node);
			
			if(parentNode.isExpanded())
			{
				if(index > 0)
					insertIndex = nodeLargestIndex(parentNode.childNodes[index-1]) + 1;
				else
					insertIndex = parentNode.__$nodeIndex$__ + 1;
			}
		}
		else
		{
			var index = roots.add(node);
			if(index == 0)
				insertIndex = 0;
			else
				insertIndex = nodeLargestIndex(roots[index-1]) + 1;
		}
		
		if(insertIndex >= 0)
		{
			this.unbindRows();
			
			var item = {};
			item[cname] = { value: node };
			var items = this.items();
			items.splice(insertIndex, 0, item);
			updateNodeIndices(items, insertIndex);
		}
		
		if(ready)
		{
			this.refreshItems();
			adjustFakeRows();
			
			//send fake scroll event to make the scrollbar visible/hidden
			jcc.dispatchCustomEvent(viewContents, "scroll", { bubbles: true, cancelable: true });
		}
		
		return node;
	}
	
	this.removeNode = function(node, ready)
	{
		if(ready == undefined)
			ready = true;
		
		var nodes = [];
		this.visitNodes(node, function(n) { nodes.push(n); })
		
		this.expanded(node, false, true, false);
		
		var parentNode = node.parentNode;
		
		if(parentNode)
		{
			parentNode.childNodes.remove(node);
			if(parentNode.childNodes.length == 0)
				parentNode.__$expanded$__ = false;
		}
		else
		{
			roots.remove(node);
		}
		
		this.unbindRows();
			
		if(node.__$nodeIndex$__ >= 0)
		{
			var items = this.items();
			items.splice(node.__$nodeIndex$__, 1);
			updateNodeIndices(items, node.__$nodeIndex$__);
		}
		
		if(ready)
		{
			this.refreshItems();
			adjustFakeRows();
		}
		
		if(node.__$selected$__)
		{
			if(lastSelectedNode == node)
				lastSelectedNode = null;
			
			selectedNodes.remove(node);
			
			//send fake scroll event to make the scrollbar visible/hidden
			jcc.dispatchCustomEvent(viewContents, "scroll", { bubbles: true, cancelable: true });
			
			jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: selectedNodes } });
		}
	}
	
	this.removeAll = function()
	{
		for(var i=0;i<roots.length;i++)
			this.removeNode(roots[i], i == roots.length-1);
	}
	
	function expandParents(node)
	{
		if(node == null)
			return;
	
		expandParents(node.parentNode);
		
		el.tree.expanded(node, true, false, false);
	}
	
	function addNodeChildren(items, node, itemsAdded, startIndex)
	{
		for(var i=0;i<node.childNodes.length;i++)
		{	
			var item = {};
			item[cname] = { value: node.childNodes[i] };
			
			itemsAdded[0]++;
			var insertIndex = startIndex + itemsAdded[0];
			node.childNodes[i].__$nodeIndex$__ = insertIndex;
			items.splice(insertIndex, 0, item);
		
			if(!node.childNodes[i].isExpanded())
				continue;
			
			addNodeChildren(items, node.childNodes[i], itemsAdded, startIndex);
		}
	}
	
	function removeNodeChildren(node, itemsRemoved)
	{
		for(var i=0;i<node.childNodes.length;i++)
		{	
			itemsRemoved[0]++;
			
			if(node.childNodes[i].__$selected$__)
			{
				collapseSelectionChanged = true;
				selectedNodes.remove(node.childNodes[i]);
				node.childNodes[i].__$selected$__ = false;
				if(lastSelectedNode == node.childNodes[i])
					lastSelectedNode = null;
			}
			
			node.childNodes[i].__$nodeIndex$__ = -1;
			
			if(!node.childNodes[i].isExpanded())
				continue;
			
			removeNodeChildren(node.childNodes[i], itemsRemoved);
		}
	}
	
	this.__expanded = function(node, expanded, recursive, ready)
	{
		if(node.isExpanded() == expanded || node.childNodes.length == 0)
			return;
			
		var items = this.items();
		
		this.unbindRows();
		
		if(expanded)
		{
			expandParents(node.parentNode);
			
			node.__$expanded$__ = true;
			
			var itemsAdded = [0];
			addNodeChildren(items, node, itemsAdded, node.__$nodeIndex$__);
			
			//Update all items below indices
			for(var i=node.__$nodeIndex$__ + itemsAdded[0] + 1;i<items.length;i++)
				items[i][cname].value.__$nodeIndex$__ += itemsAdded[0];
		}
		else
		{
			var itemsRemoved = [0];
			
			node.__$expanded$__ = false;
			
			removeNodeChildren(node, itemsRemoved);
			items.splice(node.__$nodeIndex$__ + 1, itemsRemoved[0]);
			
			//Update all items below indices
			for(var i=node.__$nodeIndex$__ + 1;i<items.length;i++)
				items[i][cname].value.__$nodeIndex$__ -= itemsRemoved[0];
		}
		
		if(recursive)
		{
			for(var i=0;i<node.childNodes.length;i++)
				this.__expanded(node.childNodes[i], expanded, recursive, false);
		}
	}
	
	this.expanded = function(node, expanded, recursive, ready)
	{
		if(arguments.length == 1)
			return node.isExpanded();
		
		if(ready == undefined)
			ready = true;
		
		collapseSelectionChanged = false;
		
		this.__expanded(node, expanded, recursive, ready);
		
		if(collapseSelectionChanged)
			this.selection([node], true);
		
		if(ready)
		{
			this.refreshItems();
			adjustFakeRows();
			
			//send fake scroll event to make the scrollbar visible/hidden
			jcc.dispatchCustomEvent(viewContents, "scroll", { bubbles: true, cancelable: true });
		}
	}
	
	this.expandedAll = function(expanded)
	{
		for(var i=0;i<roots.length;i++)
			this.expanded(roots[i], expanded, true, i == roots.length-1);
	}
	
	this.nodeChangedSortValue = function(node, ready)
	{
		if(ready == undefined)
			ready = true;
			
		var parent = node.parentNode;
		if(parent)
		{
			var parentWasExpanded = parent.isExpanded();
			this.expanded(parent, false, false, false);
			
			for(var i=0;i<parent.childNodes.length;i++)
			{
				if(parent.childNodes[i] == node)
				{
					parent.childNodes.splice(i, 1);
					break;
				}
			}
			parent.childNodes.add(node);
			
			if(parentWasExpanded)
				this.expanded(parent, true, false, ready);
		}
		else //some of the roots
		{
			var rootsExpanded = {};
			for(var i=0;i<roots.length;i++)
			{
				rootsExpanded[roots[i].sortValue] = roots[i].isExpanded();
				this.expanded(roots[i], false, false, false);
			}
			
			var items = this.items();
			
			items.splice(node.__$nodeIndex$__, 1);
			roots.splice(node.__$nodeIndex$__, 1);
			
			var insertIndex = roots.add(node);
			node.__$nodeIndex$__ = insertIndex;
			
			var item = {};
			item[cname] = { value: node };
			items.splice(insertIndex, 0, item);
			
			for(var i=0;i<roots.length;i++)
				roots[i].__$nodeIndex$__ = i;
				
			for(var i=0;i<roots.length;i++)
			{
				this.expanded(roots[i], rootsExpanded[roots[i].sortValue], false, ready && i == roots.length-1);
			}
		}
	}
	
	this.refreshNode = function(node, recursive)
	{
		var self = this;
		function refreshNode(n)
		{
			if(n.__$nodeIndex$__ >= 0)
				self.refreshItem(n.__$nodeIndex$__);
		}
		
		if(recursive)
			this.visitNodes(node, refreshNode);
		else
			refreshNode(node);
	}
	
	function visitNodes(node, visitFunction)
	{
		if(visitFunction(node) == true)
			return;
			
		for(var i=0;i<node.childNodes.length;i++)
			visitNodes(node.childNodes[i], visitFunction);
	}
	
	this.visitNodes = function(node, visitFunction)
	{
		if(visitFunction == undefined)
		{
			visitFunction = 
			function(n)
			{
				jcc.dispatchCustomEvent(el, "e-visit-node", { bubbles: false, cancelable: true, detail: { node: node } });
			};
		}
		visitNodes(node, visitFunction);
	}
	
	this.findNodes = function(cmpFunction, stopOnFirstMatch)
	{
		var nodes = [];
		for(var i=0;i<roots.length;i++)
		{
			this.visitNodes(roots[i],
			function(node)
			{
				if(cmpFunction(node) == true)
				{
					nodes.push(node);
					return stopOnFirstMatch;
				}
			});
		}
		return nodes;
	}
	
	this.roots = function()	{ return roots; }
	
	this.scrollTo = function(node)
	{
		if(node.parentNode)
			this.expanded(node.parentNode, true, false);
		
		if(node.__$nodeIndex$__ >= 0)
			this.super_scrollTo(node.__$nodeIndex$__);
	}
	
	this.nodesSelectable = function(nodes, selectable)
	{
		if(selectable == undefined)
		{
			var res = [];
			for(var i=0;i<nodes.length;i++)
				res.push(!nodes[i].__$unselectable$__ ? true : false);
			
			return res;
		}
		
		var sel = [];
		for(var i=0;i<nodes.length;i++)
		{
			nodes[i].__$unselectable$__ = !selectable;
			if(!selectable && nodes[i].__$selected$__)
				sel.push(nodes[i]);
		}
		
		if(sel.length > 0)
			this.selection(sel, false, true);
	}
	
	this.selection = function(nodes, append, remove)
	{
		if(arguments.length == 0)
			return selectedNodes.slice();
		
		if(el.dataset.selection == "none")
			return;
			
		if(el.dataset.selection == "single" && nodes.length > 1)
			nodes.splice(1, nodes.length - 1); 
		
		if(!append || el.dataset.selection == "single")
		{
			//remove previous selection
			for(var i=0;i<selectedNodes.length;i++)
			{
				selectedNodes[i].__$selected$__ = false;
				this.refreshNode(selectedNodes[i], false);
			}
			selectedNodes.length = 0;
		}
		
		//add/remove new selection
		var theLastSelectedNode = null;
		for(var i=0;i<nodes.length;i++)
		{
			var node = nodes[i];
			
			if(!node.__$unselectable$__ && !remove && !node.__$selected$__)
			{
				if(node.parentNode && node.__$nodeIndex$__ < 0) //node is not visible -> make it visible
					this.expanded(node.parentNode, true, false, true);
					
				node.__$selected$__ = true;
				theLastSelectedNode = node;
				selectedNodes.add(node);
			}
			else
			{
				if(node.__$selected$__)
					selectedNodes.remove(node);
					
				node.__$selected$__ = false;
			}
			
			this.refreshNode(node);
		}
		
		if(lastSelectedNode && !lastSelectedNode.__$selected$__)
			lastSelectedNode = null;
			
		if(selectedNodes.length == 0)
			lastSelectedNode = null;
		else 
		{
			var rangeSelect = this.rangeSelect();
			if((rangeSelect && !lastSelectedNode) || !rangeSelect)
				lastSelectedNode = theLastSelectedNode;
		}
		
		jcc.dispatchCustomEvent(el, "e-selection", { bubbles: false, cancelable: false, detail: { selection: selectedNodes.slice() } });
	}
	
	this.selectAll = function()
	{
		var nodes = [];
		for(var i=0;i<roots.length;i++)
		{
			this.visitNodes(roots[i],
			function(node)
			{
				nodes.push(node);
			});
		}
		
		this.expandedAll(true);
		
		this.selection(nodes);
	}
	
	this.unselectAll = function()
	{
		this.selection([]);
	}
};

/* tree-header */
jcc.widgets["tree-header"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tree-header";
	},
	enhance : function(el) { if(el.treeHeader) el.treeHeader.refresh(); else new jcc.treeHeader(el).refresh(); },
	unenhance : function(el) { if(el.treeHeader) el.treeHeader.destroy(); }
};
jcc.treeHeader = function(el)
{
	this.toolbar = jcc.toolbar;
	this.toolbar(el);
	
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.tree)
		{
			alert("JCC: The 'tree-header' must be a direct child of a 'tree'. Please revise your HTML code!");
			return;
		}
		
		this.destroy();
		this.super_refresh();
		
		//Set defaults
		el.dataset.orientation = "horizontal";
		el.dataset.position = "top";
		if(el.dataset.visible != "yes" && el.dataset.visible != "no")
			el.dataset.visible = "yes";
		
		el.treeHeader = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-tree-header");
		el.classList.add("jcc-tree-header-" + theme);
	}
	
	this.destroy = function()
	{	
		if(el.treeHeader)
		{
			el.classList.remove("jcc-tree-header");
			el.classList.remove("jcc-tree-header-" + theme);
			
			delete el.treeHeader;
		}
	}
};

/* tree-footer */
jcc.widgets["tree-footer"] = 
{
	version : "1.0",
	can_enhance : function(el) 
	{ 
		return el.nodeName == "DIV" && el.getAttribute("data-role") == "tree-footer";
	},
	enhance : function(el) { if(el.treeFooter) el.treeFooter.refresh(); else new jcc.treeFooter(el).refresh(); },
	unenhance : function(el) { if(el.treeFooter) el.treeFooter.destroy(); }
};
jcc.treeFooter = function(el)
{
	this.toolbar = jcc.toolbar;
	this.toolbar(el);
	
	this.super_refresh = this.refresh;
	this.super_destroy = this.destroy;
	
	var theme;
	
	this.refresh = function()
	{
		if(!el.parentNode.tree)
		{
			alert("JCC: The 'tree-footer' must be a direct child of a 'tree'. Please revise your HTML code!");
			return;
		}
		
		//Set defaults
		el.dataset.orientation = "horizontal";
		el.dataset.position = "bottom";
		if(el.dataset.visible != "yes" && el.dataset.visible != "no")
			el.dataset.visible = "yes";
		
		this.destroy();
		this.super_refresh();
		
		el.treeFooter = this;
		
		theme = this.theme();
		
		el.classList.add("jcc-tree-footer");
		el.classList.add("jcc-tree-footer-" + theme);
	}
	
	this.destroy = function()
	{	
		this.super_destroy();
		
		if(el.treeFooter)
		{
			el.classList.remove("jcc-tree-footer");
			el.classList.remove("jcc-tree-footer-" + theme);
			
			delete el.treeFooter;
		}
	}
};