function oculus() {
    /* Private Vars */
    var dom
      , textbox
      , dispatch
      , reference
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
                .attr("class", "phase col-md-4 col-xs-12")
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
        var state;
        if(query.State && query.State !== "all")
            state = dom.datum()[query.State][query.Court]
        ;
        textbox.html(state ? state.description : null)
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
                  .html(identikey)
              ;
            })
        ;
        // Exit selection - clear out all rows
        phase.exit().each(function() {
            d3.select(this).selectAll("li")
                .attr("class", "process")
              .select("span")
                .html(identikey)
            ;
          })
        ;
    } // display()

    function hilite(arg) {
        var hl = arg.result.filter(function(d) { return d.fork; });
        if(hl.length) {
            display({});
            var text = reference[hl[0].key];
            textbox.html(text ? text.Description : null);
        }
    } // hilite()

    /*
     * Helper function to slice the dataset by state and by phase
     */
    function byphase(arg) {
        return d3.nest()
            .key(function(d) { return d.Phase; })
            .key(function(d) { return d.Process; })
            .rollup(function(leaves) {
                return d3.nest()
                    .key(function(d) { return d.USPS; })
                    .entries(leaves);
                ;
              })
            .entries(arg.filter(function(d) { return d.Phase; }))
            .map(function(d) {
                d.values.sort(function(a, b) {
                    return d3.ascending(a.key, b.key);
                  })
                ;
                return d;
              })
        ;
    } // byphase()

    function bystate(arg) {
        return d3.nest()
            .key(function(d) { return d.USPS; })
            .key(function(d) {
                var crt = d.Court.split(' ');
                crt.pop(); // pop the Court off the name
                return crt.pop();
              })
            .rollup(function(leaves) {
                var procs = d3.nest()
                      .key(function(d) { return d.Phase; })
                      .key(function(d) { return d.Process; })
                    .entries(leaves.filter(function(d) { return d.Process; }))
                , desc = leaves.filter(function(d) { return !d.Process; })[0]
                ;
                return {
                    description: desc.Description
                  , overview: desc.Overview
                  , values: procs
                };
              })
            .map(arg)
        ;
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
