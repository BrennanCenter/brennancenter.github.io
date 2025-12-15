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
                    d3.select(this).on("change").call(this, null, d, i);
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
            Object.entries(row.Phases)
                .forEach(function([phaseKey, phaseValue]) {
                    if(phaseKey === "Overview") {
                        leaves.push({ // This is a Court Leaf node
                                  State: row.State
                                , USPS: row.Abbrev
                                , Court: row.Court
                                , Overview: categorify(phaseValue.Category)
                                , Description: phaseValue["Text Box"] || null
                          })
                        ;
                        return;
                    } // Overview information

                    var procs = processify(phaseValue.Process);
                    procs.forEach(function(proc) {
                          leaves.push({
                                State: row.State
                              , USPS: row.Abbrev
                              , Court: row.Court
                              , Phase : phaseKey
                              , Category: categorify(phaseValue.Category)
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
            else ret = Object.entries(cat) // Overview pseudo-phase
                .filter(function([key, value]) { return value === "Yes"; })
                .map(function([key, value]) { return key.trim(); })
              [0]
            ;
            return ret || "Not Applicable";
        } // categorify()

        function processify(procs) {
            var ret = [];
            Object.entries(procs)
                .filter(function([key, value]) {
                    return value["Yes/No"] === "Yes"
                })
                .forEach(function([key, value]) {
                    if(~key.toLowerCase().indexOf("confirmation"))
                        ret.push(confirmify(key, value))
                    ;
                    if(~key.toLowerCase().indexOf("elections"))
                        electify(key, value).forEach(function(e) { ret.push(e); })
                    ;
                    if(~key.toLowerCase().indexOf("appointment"))
                        ret.push(appointify(key, value))
                    ;
                    if(~key.toLowerCase().indexOf("nominat"))
                        ret.push(committify(key, value))
                    ;
                })
            ;
            return ret;
        } // processify()

        function electify(procKey, procValue) {
            return procValue.Type.split(',')
                .map(function(t) {
                    return {
                          step: "Process"
                        , Process: procKey
                        , Type: t.trim() + " " + procKey
                      }
                  })
            ;
        } // electify()

        function appointify(procKey, procValue) {
            return {
                  step: "Process"
                , Process: procKey
              }
            ;
        } // appointify()

        /*
         * Commissions & Confirmations.
         */
        function committify(procKey, procValue) {
          return {
                step: "Nomination"
              , Process: procKey
              , Type: procValue.Type
            }
          ;
        }

        function confirmify(procKey, procValue) {
            var k = procValue.Legislative ? "Legislative" : "Other";
            return {
                  step: "Confirmation"
                , Process: "Confirmation"
                , Type: k
                , Body: procValue[k]
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
        // Helper to convert nested Map to plain object (D3 v7 compatibility)
        function mapToObject(map) {
            if (!(map instanceof Map)) return map;
            var obj = {};
            map.forEach(function(value, key) {
                obj[key] = mapToObject(value);
            });
            return obj;
        }

        // Helper to convert d3.groups output to old {key, values} format
        function groupsToEntries(data, keyFn) {
            return d3.groups(data, keyFn).map(function(pair) {
                return { key: pair[0], values: pair[1] };
            });
        }

        // Local helper function
        var overview = dom.datum().filter(function(l) { return l.Overview; })
          , details = dom.datum().filter(function(l) { return l.Phase; })
          , skeleton = {
                  Court: mapToObject(d3.rollup(overview,
                    function(leaves) {
                        return groupsToEntries(leaves, function(d) { return d.USPS; });
                    },
                    function(d) { return d.Court; },
                    function(d) { return d.Overview; }
                  ))
                , Phase: mapToObject(d3.rollup(details,
                    function(leaves) {
                        return groupsToEntries(leaves, function(d) { return d.USPS; });
                    },
                    function(d) { return d.Court; },
                    function(d) { return d.Phase; },
                    function(d) { return d.Category; }
                  ))
                , Process: mapToObject(d3.rollup(details,
                    function(leaves) {
                        var complex = leaves.filter(function(d) {
                                return d.step !== "Process";
                            })
                          , keys = []
                        ;
                        if(complex.length) {
                            keys.push(function(d) { return d.Type; });
                            if(complex.some(function(d) { return d.Body; }))
                                keys.push(function(d) { return d.Body; });
                        } else {
                            complex = null;
                        }
                        keys.push(function(d) { return d.USPS; });
                        // Build nested grouping with dynamic keys
                        var result = d3.group.apply(null, [complex || leaves].concat(keys));
                        return mapToObject(result);
                    },
                    function(d) { return d.Court; },
                    function(d) { return d.Phase; },
                    function(d) { return d.Category; },
                    function(d) { return d.Process === "Elections" ? d.Type : d.Process; }
                  ))
              }
        ;
        // RESET the counts object, then populate it
        counts = { Court: {}, Phase: {}};
        pivots = { Court: [], Phase: []}
        Object.entries(skeleton.Court).forEach(function([crt, cats]) {
            var tmp = crt.split(' ');
            tmp.pop(); // pop the "Court" off the name
            var court = tmp.pop();
            pivots.Court.push({ key: court, value: crt });
            // Create the tree of Court counts
            counts.Court[court] = Object.entries(cats).map(function([key, value]) {
                return leafify({ key: key, value: value });
            });
            counts.Phase[court] = {};

            // Navigate the tree of Phase counts at this Court level
            Object.entries(skeleton.Process[crt])
                .forEach(function([faze, cats]) {
                    var phase = faze.split(' ')[0];
                    pivots.Phase.push({ key: phase, value: faze })
                    counts.Phase[court][phase] = Object.entries(cats)
                        .map(function([key, value]) {
                            return processize({ key: key, value: value });
                        })
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
        });
        // Deduplicate pivots.Phase by key, keeping first occurrence
        pivots.Phase = Array.from(
            pivots.Phase.reduce(function(map, item) {
                if (!map.has(item.key)) map.set(item.key, item);
                return map;
            }, new Map()).values()
        );
        return;

        // Local Helpers
        function leafify(d) {
            d.values = d.value.map(function(s) {
                s.value = s.values.pop();
                s.values = null;
                return s;
            });
            d.value = null;
            return d;
        } // leafify()

        function statify(b) {
            return Object.entries(b).map(function([key, value]) {
                return { key: key, value: value[0] };
            });
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
            };
            Object.entries(cat.value).forEach(function([procKey, procValue]) {
                if(procKey === cat.key) {
                    node.values = statify(procValue);
                    return;
                }
                if(cat.key !== "Commission Reappoints") // Hawaii
                    node.children.push(process_process({ key: procKey, value: procValue }))
                ;
            });
            return node;
        } // processize()

      function process_process(proc) {
          switch(proc.key) {
              case "Nominating Commission":
                  proc.children = Object.entries(proc.value)
                      .map(function([key, value]) { // (Non-)Binding
                          return {
                              key: key,
                              values: statify(value),
                              value: null,
                              level: "Commission"
                          };
                      })
                  ;
                  proc.values = Object.values(proc.value)
                      .map(statify)
                      .reduce(flatten)
                  ;
                  break;
              case "Confirmation":
                  proc.values = Object.values(proc.value)
                      .map(function(f) {
                          return Object.values(f)
                              .map(statify)
                              .reduce(flatten)
                          ;
                      })
                      .reduce(flatten)
                  ;
                  proc.children = Object.entries(proc.value)
                      .map(function([conftypeKey, conftypeValue]) {
                          return {
                              key: conftypeKey,
                              values: Object.values(conftypeValue)
                                  .map(statify)
                                  .reduce(flatten),
                              children: Object.entries(conftypeValue)
                                  .map(function([bodyKey, bodyValue]) {
                                      return {
                                          key: bodyKey,
                                          values: statify(bodyValue),
                                          value: null,
                                          level: "Body"
                                      };
                                  }),
                              value: null,
                              level: "Confirmation"
                          };
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
            dispatch.call("state", null, query);
            set_url(query);
            return;
        }
        query.result = query.Phase === "all"
          ? counts.Court[query.Court]
          : query.result = counts.Phase[query.Court][query.Phase]
        ;
        if(query.result) {
            dispatch.call("display", null, query);
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
                d3.select(this).on("change").call(this, null, d, i);
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
