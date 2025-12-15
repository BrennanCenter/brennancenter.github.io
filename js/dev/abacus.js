function abacus() {
		/* Private Vars */
		var dom, ul
		  , percent = d3.scaleLinear()
							.domain([0, 51])
							.rangeRound([0, 100])
		  , reference // hold the tooltip data
		  , dispatch // signaler
		  , hilite
		;
		/*
		 * Main function object
		 */
		function widget(el) {
				dom = el
						.on("click", function(event) { clickbar(event); })
				;
				ul = dom.select("ul");
				resize();
		} // main function object

		/*
		 * Helper functions
		 */
		function display(query) {
				// Parse the query results into a more usable format
				// This step basically adds parent relationships to the dataset
				// (which already has children relationships (via children or values))
				var root = d3.hierarchy({ children: query.result })
					.sort(function(a, b) {
						var aLen = a.data.values ? a.data.values.length : 0;
						var bLen = b.data.values ? b.data.values.length : 0;
						return d3.descending(aLen, bLen)
							|| d3.ascending(a.data.key, b.data.key)
						;
					})
				;
				// Flatten hierarchy and merge data properties onto nodes (D3 v3 compatibility)
				dom.datum(
						root.descendants().map(function(node) {
							Object.keys(node.data || {}).forEach(function(key) {
								if (!(key in node)) node[key] = node.data[key];
							});
							node.fork = false;
							return node;
						})
				);
				hilite = false;
				ul
						.datum(dom.datum()[0].children)
						.call(render, 1)
				;
		} // display()

		function render(sel, depth) {
				var li = sel.selectAll("li")
					  .data(identity, joiner)
				;
				// EXIT Selection (handle before enter/update in D3 v4+)
				li.exit()
						.filter(function(d) { return !hilite || d.depth === depth; })
						.each(deleteLegendItem)
				;
				// ENTER selection
				var liEnter = li.enter()
				  .append("li")
						.each(createLegendItem)
				;
				// MERGE enter + update (required in D3 v4+)
				li = liEnter.merge(li);
				// UPDATE selections (now includes entered elements)
				li.each(updateLegendItem);
				li.order();

				if(hilite) {
						var forked = li.filter(function(l) { return l.fork; });
						li
								.classed("soften", forked.size() ? true : false)
						;
						forked
								.classed("soften", false)
						;
				} else {
						li
								.classed("soften", false)
						;
				}
		} // render()

		function createLegendItem(l) {
				var self = d3.select(this)
							.attr("class", "level")
							.classed("legend-row", true)
							.classed(" legend-row--new", true)
							.on("click", clickbar)
				  , row = self
					  .append("div")
							.attr("class", function(d) {
									return "legend-item row " + (d.children
											? (d.fork ? "branch--opened" : "branch--closed")
											: "branch--leaf"
										)
									;
							  })
							.classed("legend-item", true)
							.classed("row", true)
				;
				var bar = row
				  .append("div")
						.attr("class", "col-xs-5 legend-bar-container")
						.attr("role", "presentation")
						.attr("pointer-events", "all")
						.attr("data-balloon-pos", "up")
						.attr("data-balloon-length", "small")
				;
				bar
				  .append("div")
						.attr("class", function(d) { return slugify(d.key); })
						.classed("legend-bar", true)
						.style("width", "0%")
				;
				bar
					.filter(function(d) {
							return ~["Confirmation", "Body"].indexOf(d.level);
					  })
					.each(function(d) {
							d3.select(this).select(".legend-bar")
								.classed(slugify(d.values[0].value.Category), true)
							;
					  })
				;
				var div = row
				  .append("div")
						.attr("class", "col-xs-7 legend-label-container")
						.attr("pointer-events", "all")
						.attr("data-balloon", function(d) {
								var ref =  reference[d.key]
										|| reference[d.parent.key]
										|| reference[d.parent.parent.key]
								;
								return ref ? ref.Summary : "";
						})
					.attr("data-balloon-pos", "left")
					.attr("data-balloon-length", "large")
				;
				div
				  .append("span")
						.attr("class", "legend-label--text")
						.attr("pointer-events", "all")
						.style("margin-left", function(d) {
								return (+d.depth - 1) + 0.25 + "em";
						  })
				;
				bar.style("height", div.style("height"));
				// Append a sub-tree
				self
				  .append("ul")
						.attr("class", "kids legend")
				;
		} // createLegendItem()

		function updateLegendItem(l) {
				var self = d3.select(this);
				if(l.fork && l.children) {
						self.select("ul")
								.datum(l.children)
								.call(render, l.depth)
						;
				}
				if(!l.children) {
						self.select("ul")
								.datum([])
								.call(render, l.depth + 1)
						;
				}
				self.select(".legend-item")
					.attr("class", function() {
						return l.children
						  ? (l.fork ? "branch--opened" : "branch--closed")
						  : "branch--leaf"
					  })
					.classed("legend-item", true)
					.classed("row", true)
				;
				self
				  .transition().duration(duration)
					.on("end", function() {
						d3.select(this)
							.classed("legend-row--new", false)
						;
					})
				;
				self.select(".legend-label--text")
					.text(function() {
						return " " + l.key + " (" + l.values.length + ")";
					  })
				;
				var bar = self.select(".legend-bar-container")
					.attr("data-balloon", function(d) {
							var vals = d.values
									.map(function(v) { // hybrid processes
											var ref = v.values ? v.values[0] : v.value;
											return ref.State;
									  })
							;
							return vals.length
								+ " state"+ (vals.length > 1 ? "s" : "") + ": "
								+ vals.join(", ")
							;
						})
					.attr("data-balloon-pos", "right")
					.attr("data-balloon-length", "large")
				;
				bar.select(".legend-bar")
						.style("width", function(d) {
								return percent(d.values.length) + "%";
						  })
					  .filter(function(d) {
								return ~["Confirmation", "Body"].indexOf(d.level);
						  })
						.each(function(d) {
								var self = d3.select(this)
								  , confirmer = d.level === "Confirmation"
										  ? d
										  : d.parent
								;
								self
										.classed(slugify(confirmer.key), true)
								;
						  })
				;
		} // updateLegendItem()

		function deleteLegendItem(l) {
				d3.select(this)
				  .transition().duration(500)
						.on("start", function(d) {
								if(d.children) {
									d3.select(this).select("ul")
										.datum([])
										.call(render, d.depth)
									;
								}
								d3.select(this).classed("legend-row--remove", true);
						})
						.on("end", function() {
								d3.select(this).remove();
						})
				;
		} // deleteLegendItem()

		/*
		 * Helper functions
		**/
		function joiner(d) {
				return [
						  d.key
						, d.depth
						, (d.parent && d.parent.depth) ? d.parent.key : null
				  ]
				;
		} // joiner()

		function clickbar(event, b) {
				if (event) event.stopPropagation();

				var result = ul.datum()
				  , depth = 1
				;
				if(b !== undefined) {
						var to_fork = !b.fork;
						b.parent.children.forEach(function(c) { c.fork = false; });
						b.fork = to_fork;

						var root = b.fork ? b : b.parent
						  , kids = root.children || []
						;
						kids.forEach(function(k) { k.fork = false; });

						result = [root].concat(kids)
								.filter(function(d) { return d.depth; })
						;
						hilite = true;
						depth = b.depth + 1;
				} else {
						ul.datum().forEach(function(s) { s.fork = false; });
						hilite = false;
				}
				ul.call(render, depth);
				dispatch.call("hilite", null, { result: result, hilite: hilite });
		} // clickbar()

		function resize() {
				dom.style("height", d3.select("#atlas").style("height"));
		} // resize()
		/*
		 * API (Getters/Setters)
		 */
		widget.connect = function(arg) {
				if(arguments.length)
					dispatch = arg
					  .on("display.legend", display)
				;
				return widget;
		  } // widget.connect()
		;
		widget.reference = function(arg) {
				if(!arguments.length)
					return reference
				;
				reference = arg;
				return widget;
		  } // widget.reference()
		;
		widget.resize = function() {
				resize();
			} // widget.resize()
		;
		/*
		 * This is always the last thing returned.
		 */
		return widget;
} // abacus()
