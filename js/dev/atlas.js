function atlas() {
    /* Private Variables */
    var path = d3.geo.path().projection(null)
      , width = 960
      , height = 600
      , margin = { top: 10, left: 20, right: 20, bottom: 10 }
      , state_list = []
      , all_states
      , svg
      , dispatch
      , control
      , tooltip = d3.tip()
            .attr("class", "d3-tip")
    ;
    /*
     * Main function object.  This gets returned all over the place,
     * and enables the caller to chain methods.
     *    Arguments: DOM element to which to attach the widget.
     */
    function widget(el) {
        svg = el
            .datum(geogrify)
          .select("svg")
            .attr("viewBox", "0 0 " + width + " " + height)
            .call(tooltip)
        ;
        if(~browser.indexOf("ie")) {
            svg
                .attr("preserveAspectRatio", "xMidYMin slice")
                .style({
                      width: "100%"
                    , height: "1px"
                    , overflow: "visible"
                  })
                .style("padding-bottom", (100 * height / width) + "%")
            ;
        }
        svg
            .attr("role", "img")
            .attr("aria-labelledby", "title")
          .append("title")
            .attr("id", "title")
            .text("Map of the USA")
        ;
        svg
            .attr("aria-describedby", "desc")
          .append("desc")
            .attr("id", "desc")
            .text(
                "An interactive map of the United States. "
                + "Each state changes color to reflect its category or process."
              )
        ;
        svg
          .append("defs")
        ;
        svg
          .append("g")
            .attr("id", "visual")
            .attr("transform"
                , "translate(" + margin.top + "," + margin.left + ")"
              )
        ;
        draw();
        resize();
    } // Main Function Object

    /*
     * Helper function to parses the geo file
     */
    function geogrify(us) {
        return topojson.feature(us, us.objects.states).features
            .map(function(d) {
                // Add this to the state directory
                state_list.push({
                      key: d.properties.usps
                    , value: d.properties.name
                  })
                ;
                // Now calculate each state's:
                // 1. centroid
                // 2. bounds
                // And attach to the datum
                var centroid = path.centroid(d);

                if(centroid.some(isNaN)) return;

                centroid.x = centroid[0];
                centroid.y = centroid[1];
                centroid.feature = d;

                var bounds = path.bounds(centroid.feature);
                centroid.feature.properties.bounds = {
                  dx: bounds[1][0] - bounds[0][0]
                  , dy: bounds[1][1] - bounds[0][1]
                  , x: (bounds[0][0] + bounds[1][0]) / 2
                  , y: (bounds[0][1] + bounds[1][1]) / 2
                };
                return centroid;
              })
            .filter(identity) // remove NaNs
        ;
    } // geogrify()

    function draw() {
        // Background rectangle to catch "reset" clicks
        var states = svg.select("#visual");
        states
          .append("rect")
            .attr("class", "click-target")
            .attr({ x: 0, y: 0, width: "100%", height: "100%" })
          .on("click", function() {
              control.value("all");
            })
        ;
        // State Shapes
        states
          .append("g")
            .attr("id", "states")
          .selectAll(".state")
            .data(identity)
          .enter().append("g")
            .attr("class", function(d) {
                return d.feature.properties.usps + " state";
              })
          .append("path")
            .attr("d", function(d) { return path(d.feature); })
            .attr("pointer-events", "all")
            .attr("cursor", "pointer")
            .on("click", function(d) {
                var abbr = d.feature.properties.usps;
                control
                    .value(abbr === control.value() ? "all" : abbr)
                ;
              })
            .on("mouseover", function(d) {
                tooltip
                    .html(d.feature.properties.name)
                    .show()
                ;
              })
            .on("mouseout", tooltip.hide)
        ;
        // State Stamps
        svg.select("defs")
          .append("g")
          .attr("id", "stamps")
          .selectAll("path")
            .data(identity)
          .enter().append("path")
            .attr("id", function(d) {
                return d.feature.properties.usps;
              })
            .attr("d", function(d) { return path(d.feature); })
        ;
        // Confirmation Patterns
        svg.select("defs")
          .append("g")
            .attr("id", "patterns")
          .selectAll("pattern") // modifier patterns/colors
            .data(["Legislative Confirmation", "Other Confirmation"], identity)
          .enter().append("pattern")
            .attr("id", function(d) { return "pattern_" + slugify(d); })
            .attr("patternUnits", "userSpaceOnUse")
            .attr("patternTransform", function(d, i) {
                return "rotate(" + (i * 90 + 10) + " 0 0)";
              })
            .attr({ width: 10, height: 10 })
          .append("rect")
            .attr({ width: 4, height: 10 })
            .attr("transform", "translate(0,0)")
            .attr("class", "confirmation")
        ;
        all_states = state_list.map(identikey);
    } // draw()

    function display(query) {
        var states = query.result.map(function(q) {
                  return q.values.map(identikey);
              })
            .reduce(flatten)
          , na = _.difference(all_states, states)
          , g = svg.select("#states")
        ;
        update(query);
        g.selectAll(".state")
            .classed("soften", false)
        ;
        if(na.length)
            g.selectAll(na.map(function(s) { return "." + s; }).join(","))
                .classed("soften", true)
              .select("path")
                .attr("class", "not_applicable")
        ;
    } // display()

    function update(query) {
        query.result.forEach(function(d) {
            if(d.key === "Confirmation") {
                d.children.forEach(function(c) {
                    var conf = slugify(c.key + " " + d.key);
                    states = c.values
                        .map(function(s) { return "." + s.key; })
                        .join(',')
                    ;
                    svg.select("#states").selectAll(states).each(function(o) {
                        if(!d3.select(this).select(".overlay").size())
                            d3.select(this)
                              .append("use")
                                .attr("xlink:href"
                                    , "#" + o.feature.properties.usps
                                  )
                                .attr("class", "overlay")
                                .style("fill"
                                    , "url(#pattern_" + conf + ")"
                                  )
                            ;
                      })
                    ;
                  })
                ;
                return;
            }
            var process = slugify(d.key)
              , states = d.values
                      .map(function(s) { return "." + s.key; })
                      .join(',')
              , conf = d.level === "Confirmation" || d.level === "Body"
            ;
            svg.select("#states").selectAll(states).select("path")
                .attr("class", conf ? "blank" : process)
            ;
            if(conf)
                svg.selectAll(".overlay")
                    .style("stroke", "darkgray")
            ;
          })
        ;
        var confs = query.result.filter(function(q) {
                return q.key === "Confirmation"
                  || q.level === "Confirmation"
                  || q.level === "Body"
                ;
              })
        ;
        if(!confs.length) {
            svg.selectAll(".overlay")
              .transition().duration(duration)
                .each("start", function() {
                    d3.select(this).classed("soften", true);
                  })
                .each("end", function() { d3.select(this).remove(); })
            ;
        }
    } // update()

    function hilite(query) {
        var g = svg.select("#states")
          , result = query.result[0]
        ;
        update(query);

        g.selectAll(".state")
            .classed("soften", query.hilite ? result.fork : false)
        ;
        if(query.hilite) {
            var states = result.values
                  .map(function(s) { return "." + s.key; })
                  .join(',')
            ;
            g.selectAll(states).classed("soften", false);
            g.selectAll(states).select(".overlay").classed("soften", false);
        }
        // Always soften not applicables
        g.selectAll(".not_applicable").classed("soften", true);

        // If the group has only one state, outline it
        if(query.result.length === 1 && result.values.length === 1)
            control.value(result.values[0].key)
        ;
        else
            control.value("all")
        ;
    } // query()

    function outline() {
        var state = control.value() || "";

        svg.select("#states").selectAll(".state")
          .transition()
            .each("start", function(d) {
                if(d.feature.properties.usps === state) {
                    this.parentNode.parentNode.appendChild(this.parentNode);
                    this.parentNode.appendChild(this);
                }
              })
            .each("end", function(d) {
                d3.select(this)
                    .classed("clicked", d.feature.properties.usps === state)
                ;
              })
        ;
    } // outline()

    function resize() {
        // Set height of parent element
        if(~browser.indexOf("ie"))
            svg.style("width", "100%");
    } // resize()

    /*
     * API (Getters/Setters)
     */
    widget.connect = function(arg) {
        if(arguments.length)
            dispatch = arg
              .on("display.atlas", display)
              .on("hilite.atlas", hilite)
              .on("state.atlas", outline)
        ;
        return widget;
      } // widget.connect()
    ;
    widget.control = function(arg) {
        if(!arguments.length)
            return control;

        control = arg
            .choices(state_list.sort(function(a, b) {
                return d3.ascending(a.value, b.value);
              }))
        ;
        return widget;
      } // widget.control()
    ;
    widget.resize = function() {
        resize();
      } // widget.resize()
    ;
    /*
     * The Main Function Object is always the last thing returned.
     */
    return widget;
} // atlas()
