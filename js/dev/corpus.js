function corpus() {
    /* Private Variables */
    var dom
      , dispatch
      , controls = {}
      , query = {} // the values of all the inputs
      , counts = {} // the count tree
      , pivots = {} // dropdown contents
    ;

    /*
     * Main function Object
     */
    function widget(el) {
        dom = el.datum(parse);
        count(); // populate the counts object

        controls.Court = dom.select("#chooser-Court .btn");
        controls.Phase = askus();
        controls.State = askus();

        draw();
    } // main function object

    /*
     * Draw the controls to help the user navigate the data
     */
    function draw() {
        /*
         * Court dropdown + button
         */
        controls.Court.select("select")
            .on("change", function() {
                d3.select(this.parentNode).select("input")
                    .node()
                    .value = this.value
                ;
                run_query({ key: "Court", value: this.value });
              })
        ;
        controls.Court.select("select").selectAll("option")
            .data(pivots.Court)
          .enter().append("option")
            .text(identival)
            .attr("value", identikey)
        ;
        /*
         * Phase button + dropdown combo
         */
        dom.select("#chooser-Phase")
            .call(controls.Phase)
        ;
        controls.Phase.choices(pivots.Phase).callback(run_query);
        /*
         * State button + dropdown combo
         */
        d3.select("#chooser-State") // different parent <div>
            .call(controls.State.callback(run_query))
        ;
        /*
         * Reset button
         */
        controls.reset = dom.select(".reset-button button")
            .on("click", function() {
                controls.Court.select("select").selectAll("option")
                    .property("selected", function(d, i) { return !i; })
                ;
                controls.Court.select("select").each(function(d, i) {
                    d3.select(this).on("change").apply(this, [d, i]);
                  })
                ;
                controls.Court.node().click();
                controls.Phase.reset();
                controls.State.reset();
              })
        ;
     } // draw()

    /*
     * Helper function to parse the Brennan dataset
     * First, we put split the data into manageable chunks.
     * Here, we create deep objects with the appropriate properties
     * addressable by name, essentially a JSON of the datasheet.
     * It is trimmed such that there are no empty keys.
     * This result is usable by the oculus module.
     * The atlas and abacus modules need more pre-processing(counting)
     */
    function parse(rows) {
        // Create a tree of data out of the collected rows.
        var leaves = [];
        rows.forEach(function(row) {
            d3.entries(row.Phases)
                .forEach(function(phase) {
                    if(phase.key === "Overview") {
                        leaves.push({ // This is a Court Leaf node
                                  State: row.State
                                , USPS: row.Abbrev
                                , Court: row.Court
                                , Overview: categorify(phase.value.Category)
                                , Description: phase.value["Text Box"] || null
                          })
                        ;
                        return;
                    } // Overview information

                    var procs = processify(phase.value.Process);
                    procs.forEach(function(proc) {
                          leaves.push({
                                State: row.State
                              , USPS: row.Abbrev
                              , Court: row.Court
                              , Phase : phase.key
                              , Category: categorify(phase.value.Category)
                              , step: proc.step
                              , Process: proc.Process
                              , Type: proc.Type || null // nom comm + elections
                              , Body: proc.Body || null // + confirmaton
                            })
                          ;
                      })
                    ; // Process information
                }) // row.Phases.forEach
            ;
          }) // rows.forEach
        ;
        return leaves;

        // Helper functions called from above
        function categorify(cat) {
            var ret;
            if(typeof cat == "string")
                ret = cat
            ;
            else ret = d3.entries(cat) // Overview pseudo-phase
                .filter(function(e) { return e.value === "Yes"; })
                .map(function(k) { return k.key.trim(); })
              [0]
            ;
            return ret || "Not Applicable";
        } // categorify()

        function processify(procs) {
            var ret = [];
            d3.entries(procs)
                .filter(function(p) {
                    return p.value["Yes/No"] === "Yes"
                  })
                .forEach(function(p) {
                    if(~p.key.toLowerCase().indexOf("confirmation"))
                        ret.push(confirmify(p))
                    ;
                    if(~p.key.toLowerCase().indexOf("elections"))
                        electify(p).forEach(function(e) { ret.push(e); })
                    ;
                    if(~p.key.toLowerCase().indexOf("appointment"))
                        ret.push(appointify(p))
                    ;
                    if(~p.key.toLowerCase().indexOf("nominat"))
                        ret.push(committify(p))
                    ;
                  })
            ;
            return ret;
        } // processify()

        function electify(proc) {
            return proc.value.Type.split(',')
                .map(function(t) {
                    return {
                          step: "Process"
                        , Process: proc.key
                        , Type: t.trim() + " " + proc.key
                      }
                  })
            ;
        } // electify()

        function appointify(proc) {
            return {
                  step: "Process"
                , Process: proc.key
              }
            ;
        } // appointify()

        /*
         * Commissions & Confirmations.
         */
        function committify(proc) {
          return {
                step: "Nomination"
              , Process: proc.key
              , Type: proc.value.Type
            }
          ;
        }

        function confirmify(proc) {
            var k = proc.value.Legislative ? "Legislative" : "Other";
            return {
                  step: "Confirmation"
                , Process: "Confirmation"
                , Type: k
                , Body: proc.value[k]
              }
            ;
        } // confirmify()
        // End parser helper functions
    } // parse()


    /**
     * Now that we have a navigable object, we can create a tree to feed the
     * numberical displays (atlas and abacus):
     * First we collect things:
     *   - courts by overview, then:
     *   - phases by category [by process [by type [by body] ] ]
     * At each of those levels, we need to show:
     *   - the number of states
     *      - 5 levels of states, one for each "by" above
     *   - a way to get to the next level down
    **/
    function count() {
        // Local helper function
        var overview = dom.datum().filter(function(l) { return l.Overview; })
          , details = dom.datum().filter(function(l) { return l.Phase; })
          , skeleton = {
                  Court: d3.nest()
                    .key(function(d) { return d.Court; })
                    .key(function(d) { return d.Overview; })
                    .rollup(function(leaves) {
                        return d3.nest()
                            .key(function(d) { return d.USPS; })
                            .entries(leaves)
                        ;
                      })
                    .map(overview)
                , Phase: d3.nest()
                    .key(function(d) { return d.Court; })
                    .key(function(d) { return d.Phase; })
                    .key(function(d) { return d.Category; })
                    .rollup(function(leaves) {
                        return d3.nest()
                            .key(function(d) { return d.USPS; })
                            .entries(leaves)
                        ;
                      })
                    .map(details)
                , Process: d3.nest()
                    .key(function(d) { return d.Court; })
                    .key(function(d) { return d.Phase; })
                    .key(function(d) { return d.Category; })
                    .key(function(d) {
                        return d.Process === "Elections" ? d.Type : d.Process;
                      })
                    .rollup(function(leaves) {
                        var complex = leaves.filter(function(d) {
                                return d.step !== "Process";
                              })
                          , nester = d3.nest()
                        ;
                        if(complex.length) {
                            nester.key(function(d) { return d.Type; });

                            if(complex.some(function(d) { return d.Body; }))
                                nester.key(function(d) { return d.Body; })
                            ;
                        } else
                            complex = null
                        ;
                        return nester.key(function(d) { return d.USPS; })
                            .map(complex || leaves)
                        ;
                      })
                    .map(details)
              }
        ;
        // RESET the counts object, then populate it
        counts = { Court: {}, Phase: {}};
        pivots = { Court: [], Phase: []}
        d3.map(skeleton.Court).forEach(function(crt, cats) {
            var tmp = crt.split(' ');
            tmp.pop(); // pop the "Court" off the name
            var  court = tmp.pop();
            pivots.Court.push({ key: court, value: crt });
            // Create the tree of Court counts
            counts.Court[court] = d3.entries(cats).map(leafify);
            counts.Phase[court] = {};

            // Navigate the tree of Phase counts at this Court level
            d3.map(skeleton.Process[crt])
                .forEach(function(faze, cats) {
                    var phase = faze.split(' ')[0];
                    pivots.Phase.push({ key: phase, value: faze })
                    counts.Phase[court][phase] = d3.entries(cats)
                        .map(processize)
                        .map(function(cat) {
                            cat.values = cat.values ||
                                skeleton.Phase[crt][faze][cat.key]
                                    .map(multistatify)
                            ;
                            return cat;
                          })
                    ;
                  })
            ;
          })
        ;
        pivots.Phase = d3.nest()
            .key(identikey)
            .rollup(function(leaves) { return leaves[0]; })
            .entries(pivots.Phase)
            .map(function(d) { return d.values; })
        ;
        return;

        // Local Helpers
        function leafify(d) {
            d.values = d.value.map(function(s) {
                s.value = s.values.pop();
                s.values = null;
                return s;
              })
            ;
            d.value = null;
            return d;
        } // leafify()

        function statify(b) {
            return d3.entries(b).map(function(s) {
                s.value = s.value[0];
                return s;
              })
            ;
        } // statify()

        function multistatify(s) {
            s.value = s.values;
            return s;
        } // multistatify()

        function processize(cat) {
            var node = {
                  key: cat.key
                , children: []
                , values: null
              }
            ;
            d3.entries(cat.value).forEach(function(proc) {
                if(proc.key === cat.key) {
                    node.values = statify(proc.value);
                    return proc;
                }
                if(cat.key !== "Commission Reappoints") // Hawaii
                    node.children.push(process_process(proc))
                ;
              })
            ;
            return node;
        } // processize()

      function process_process(proc) {
          switch(proc.key) {
              case "Nominating Commission":
                  proc.children = d3.entries(proc.value)
                      .map(function(comtype) { // (Non-)Binding
                          comtype.values = statify(comtype.value);
                          comtype.value = null;
                          comtype.level = "Commission";
                          return comtype;
                        })
                  ;
                  proc.values = d3.values(proc.value)
                      .map(statify)
                      .reduce(flatten)
                  ;
                  break;
              case "Confirmation":
                  proc.values = d3.values(proc.value)
                      .map(function(f) {
                          return d3.values(f)
                              .map(statify)
                              .reduce(flatten)
                          ;
                        })
                      .reduce(flatten)
                  ;
                  proc.children = d3.entries(proc.value)
                      .map(function(conftype) {
                          conftype.values = d3.values(conftype.value)
                              .map(statify)
                              .reduce(flatten)
                          ;
                          conftype.children = d3.entries(conftype.value)
                              .map(function(body) {
                                  body.values = statify(body.value);
                                  body.value = null;
                                  body.level = "Body";
                                  return body;
                              })
                          ;
                          conftype.value = null;
                          conftype.level = "Confirmation";
                          return conftype;
                        })
                  ;
                  break;
              default:
                  proc.values = statify(proc.value);
                  proc.children = null;
          }
          proc.value = null;
          proc.level = "Process"
          return proc;
        } // process_process()
    } // count()


    /*
     * Query API
     */
    function run_query(arg) {
        query[arg.key] = arg.value;
        if(arg.key === "State") {
            dispatch.state(query);
            set_url(query);
            return;
        }
        query.result = query.Phase === "all"
          ? counts.Court[query.Court]
          : query.result = counts.Phase[query.Court][query.Phase]
        ;
        if(query.result) {
            dispatch.display(query);
            set_url(query);
        }
        return;
    } // run_query()

    /*
     * API Helper functions
     */
    function set_url(query) {
        var val = [];
        val.push("court" + "=" + query.Court);
        if(query.Phase !== "all")
            val.push("phase" + "=" + query.Phase)
        ;
        if(query.State !== "all")
            val.push("state" + "=" + query.State)
        ;
        // if(highlight) val.push("highlight=" + highlight);
        history.pushState(null, null, '?' + val.join('&'));
    } // set_url()

    /*
     * API - Getters
     */
    widget.data = function() {
       return dom.datum();
     } // widget.data()
    ;
    widget.counts = function() {
       return counts;
     } // widget.stats()
    ;
    /*
     * API - Getters/Setters
     */
    widget.connect = function(signal) {
        if(arguments.length)
            dispatch = signal
        ;
        return widget;
      } // widget.connect()
    ;
    widget.atlas = function(arg) {
        if(!arguments.length)
            return controls.State;

        controls.State = arg;  // the States dropdown
      } // widget.atlas()
    ;
    /*
     * API - Commands
     */
    widget.start = function(arg) {
        if(!arg.court && !arg.phase)
            controls.reset.node().click()
        ;
        var dropdown;
        if(arg.court) {
            dropdown = controls.Court.select("select");
            dropdown.selectAll("option")
                .property("selected", function(d, i) {
                    return ~d.key.toLowerCase().indexOf(arg.court) || !i;
                  })
            ;
            dropdown.each(function(d, i) {
                d3.select(this).on("change").apply(this, [d, i]);
              })
            ;
            controls.Court.node().click();
        }
        controls.Phase.value(_.capitalize(arg.phase));
        controls.State.value(arg.state ? arg.state.toUpperCase() : "all");
        return widget;
      } // widget.start()
    ;
    widget.query = function(arg) {
        run_query(arg);

        return widget;
      } // widget.query()
    ;
    /*
     * This is always the last thing returned.
     */
    return widget;
} // corpus()
