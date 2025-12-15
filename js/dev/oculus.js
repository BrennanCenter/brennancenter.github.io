function oculus() {
    /* Private Vars */
    var dom
      , textbox
      , dispatch
      , reference
      , state
      , content = null
    ;

    /*
     * Main Function Object
     */
    function widget(el) {
        dom = el;
        textbox = dom.select("#focus");
        draw();
        dom.datum(bystate);
    } // main function object


    /*
     * Draw the table appropriate to the current query
     * It is unpopulated until the "follow" signal
     */
    function draw() {
        var data = byphase(dom.datum());
        // Create the list of processes in each stage
        var phase = dom.select("#locus").selectAll("div")
              .data(data, identikey)
            .enter().append("div")
                .attr("class", "phase col-md-4 col-12")
        ;
        phase
          .append("h5")
            .html(identikey)
            .attr("data-balloon", function(d) { return reference[d.key].Summary; })
            .attr("data-balloon-pos", "up")
            .attr("data-balloon-length", "medium")
        ;
        phase = phase
          .append("ul")
            .attr("class", "list-unstyled")
        ;
        phase.selectAll("li")
            .data(
                function(d) {
                    return d.values
                        .sort(function(a, b) {
                            return d3.ascending( // sort by last word of process
                                a.key.split(' ').pop()
                              , b.key.split(' ').pop()
                            );
                        })
                      .sort(function(a, b) { // put at top:
                          return b.key === "Nominating Commission";
                        })
                  ;
                }
              , identikey
            )
          .enter().append("li")
            .attr("class", "process")
            .attr("data-balloon", function(d) { return reference[d.key].Summary; })
            .attr("data-balloon-pos", "left")
            .attr("data-balloon-length", "large")
          .append("span")
            .html(identikey)
        ;
    } // draw()

    /*
     * Signal Responders
     */
    function display(query) {
        state = (query.State && query.State !== "all")
          ? dom.datum()[query.State][query.Court]
          : null
        ;
        textbox.html(state ? state.description : content)
        var phase = dom.select("#locus").selectAll("div")
              .data(state ? state.values : [], identikey)
        ;
        // Enter Selection is unnecessary
        // Update Selection
        phase.each(function(p) {
            var li = d3.select(this).selectAll("li")
                .data(p.values, identikey)
            ;
            // Enter selection is unnecessary here as well
            li
                .attr("class", function(d) {
                    return slugify(d.key === "Elections"
                      ? d.values[0].Type
                      : d.key
                    );
                  })
                .classed("process", true)
              ;
              li.select("span")
                .classed("hilite", true)
                .html(function(d) {
                    if(d.values.length > 1) // assumes multiple election types
                        return d.values
                            .map(function(v) { return v.Type.split(' ')[0]; })
                            .join(", ")
                          + " "  + d.values[0].Process
                    ;
                    var ret = reference[
                              d.values[0].Body
                            || d.values[0].Type
                            || d.values[0].Process
                          ]
                    ;
                    return ret
                      ? ret.Title
                      : d.values[0].Type || d.values[0].Process
                    ;
                  })
              ;
              // Exit selection - clear out unused rows
              li.exit()
                  .attr("class", "process")
                .select("span")
                  .classed("hilite", false)
                  .html(identikey)
              ;
            })
        ;
        // Exit selection - clear out all rows
        phase.exit().each(function() {
            d3.select(this).selectAll("li")
                .attr("class", "process")
              .select("span")
                .classed("hilite", false)
                .html(identikey)
            ;
          })
        ;
    } // display()

    function hilite(arg) {
        var text = null;
        if(arg.hilite && !state) {
            var d = arg.result[0]
              , text = reference[d.key]
                  || reference[d.parent.key]
                  || reference[d.parent.parent.key]
            ;
            if(text) text = text.Description;
        }
        content = text;
    } // hilite()

    /*
     * Helper function to slice the dataset by state and by phase
     */
    // Helper to convert nested Map to plain object (D3 v7 compatibility)
    function mapToObject(map) {
        if (!(map instanceof Map)) return map;
        var obj = {};
        map.forEach(function(value, key) {
            obj[key] = mapToObject(value);
        });
        return obj;
    }

    // Helper to convert d3.groups/d3.rollups [[key, value], ...] to [{key, values}, ...]
    function convertToEntries(arr) {
        if (!Array.isArray(arr)) return arr;
        // Check if this looks like a groups/rollups result (array of [key, value] pairs)
        if (arr.length > 0 && Array.isArray(arr[0]) && arr[0].length === 2) {
            return arr.map(function(pair) {
                return { key: pair[0], values: convertToEntries(pair[1]) };
            });
        }
        return arr;  // Already in final form (e.g., rollup result)
    }

    function byphase(arg) {
        var filtered = arg.filter(function(d) { return d.Phase; });
        var result = d3.rollups(filtered,
            function(leaves) {
                return d3.groups(leaves, function(d) { return d.USPS; })
                    .map(function(pair) { return { key: pair[0], values: pair[1] }; });
            },
            function(d) { return d.Phase; },
            function(d) { return d.Process; }
        );
        return convertToEntries(result).map(function(d) {
            d.values.sort(function(a, b) {
                return d3.ascending(a.key, b.key);
            });
            return d;
        });
    } // byphase()

    function bystate(arg) {
        return mapToObject(d3.rollup(arg,
            function(leaves) {
                var procsData = leaves.filter(function(d) { return d.Process; });
                var procs = convertToEntries(d3.groups(procsData,
                    function(d) { return d.Phase; },
                    function(d) { return d.Process; }
                ));
                var desc = leaves.filter(function(d) { return !d.Process; })[0];
                return {
                    description: desc.Description
                  , overview: desc.Overview
                  , values: procs
                };
            },
            function(d) { return d.USPS; },
            function(d) {
                var crt = d.Court.split(' ');
                crt.pop(); // pop the Court off the name
                return crt.pop();
            }
        ));
    } // bystate()

    /*
     * API - Getters/Setters
     */
    widget.connect = function(arg) {
        if(!arguments.length)
            return dispatch
        ;
        dispatch = arg
          .on("state.oculus", display)
          .on("hilite.oculus", hilite)
          .on("display.oculus", display)
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
    /*
     * Always return the main function object LAST
     */
    return widget;
} // oculus()
