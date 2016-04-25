/*
 * Variables
 */
var margin = { top: 20, right: 10, bottom: 20, left: 10 }
  , width = 960 - margin.left - margin.right
  , height = 375 - margin.top - margin.bottom
  , duration = 500 // milliseconds per transition
  , files = {
          bcj: "data/brennan.csv"
        , info: "data/reference.csv"
        , geo: "data/usa.json"
      }
  , signal = d3.dispatch(
          "display" // display query resulting from dropdowns
        , "hilite"  // hilite a group of states
        , "state" // focus on a specific state
      )
  // Data shared between modules
  , reference // the parsed reference from files.info above
  , results = {} // Results of Query
  , browser = get_browser(navigator.userAgent)
;
/*
 * Helper Functions
 */
function identity(d)    { return d; }
function identikey(d)   { return d.key; }
function identival(d)   { return d.value; }
function identivals(d)  { return d.values; }
function identistate(d) { return d.State; }

function flatten(a, b)  { return a.concat(b); }
function sum(a, b)      { return a + b; }
function slugify(d)     {
    return d.toLowerCase()
        .split('&').join('and')
        .split("'").join()
        .split(':').join()
        .split(' ').join('_')
    ;
} // slugify()

d3_queue.queue()
  .defer(d3.text, files.bcj)
  .defer(d3.csv, files.info)
  .defer(d3.json, files.geo)
  .await(function(error, bcj, info, geo) {
      if(error) throw error;

      var data = ingest(bcj)
        , panels = {
              corpus: corpus()
              , abacus: abacus()
              , oculus: oculus()
              , atlas: atlas()
            }
      ;
      /*
       * Parse the reference file
       */
      reference = d3.nest()
          .key(function(d) { return d.Term; })
          .rollup(function(leaves) { return leaves[0]; })
          .map(info)
      ;
      /*
       * Use the csv file to build a query selector
       */
      d3.select("#corpus")
          .datum(data)
          .call(panels.corpus)
      ;
      /*
       * Use the geo file to draw a map
       */
      d3.select("#atlas")
          .datum(geo)
          .call(panels.atlas)
        .select("svg")
      ;
      /*
       * Use query results to draw the legend/barchart
       */
      d3.select("#abacus")
        .datum(panels.corpus.counts())
        .call(panels.abacus.reference(reference));
      ;
      /*
       * Focus on a single state in the details info area
       */
      d3.select("#oculus")
          .datum(panels.corpus.data())
        .call(panels.oculus.reference(reference))
      ;
      /*
       * Messaging/signaling infrastructure
       */
      d3.map(panels).forEach(function(n, panel) {
          panel.connect(signal);
        })
      ;
      /*
       * Cross-wiring -- future work to make this more elegant
       */
      // Attach the State dropdown to the querying system
      panels.atlas.control(panels.corpus.atlas())

      // Resize all the controls to be of the same height
      var hs = [];
      d3.selectAll(".btn").each(function() {
          hs.push(d3.select(this).style("height"));
        })
      ;
      if(browser !== "ienew") {
          d3.selectAll(".btn")
              .style("height", function() { return d3.max(hs); })
          ;
      }
      /*
       * Let's start!
       */
      // Parse and render the dataset
      panels.corpus.start(getQueryVariables());

      window.onpopstate = function(event) { panels.corpus.start(getQueryVariables()); };
      window.onresize = function(event) { panels.atlas.resize(); panels.abacus.resize(); };
  })
;

// Capture URL query param
function getQueryVariables() {
    var inits = {}
      , query = window.location.search.substring(1).toLowerCase().split("&")
      , arg // loop variable

    ;
    query
        .forEach(function(q) {
            arg = q.split("=");
            if(arg[0].length && arg[1].length)
                inits[arg[0]] = decodeURIComponent(arg[1]);
          })
    ;
    return inits;
} // getQueryVariables()


/*
 * Ingest, Parse, and Simplify the data set.
 */
function ingest(text) {
    var rows = d3.csv.parseRows(text)
      , headers = []
      , ref = [] // reference headers
      , row
    ;
    // Capture headers
    do {
      row = rows.shift();
      headers.push(row);
    } while (!row[0]);  // last header row is the first column's header

    // Capture the actual data
    return rows
      .map(function(row) {
          var info = {};
          ref = []; // reset the reference headers
          row.forEach(function(cell, index) {
              if(typeof(cell) === "string")
                  cell = cell.trim()
              ;
              _.set(info, attributes(headers, index), cell);
          });
          return info;
      })
    ;
    // Helper function to set the multiple levels of attributes
    function attributes(headers, index) {
        headers
          .map(function(h) { return h[index]; })
          .forEach(function(header, i) {
            if(header) { // if this cell has a header,
                // Reset all headers on/below this
                for(var j = i; j < ref.length; ++j) { ref[j] = null; }

                // Set the reference header from this header
                ref[i] = header;
            }
            else header = ref[i]; // set it from the reference
          })
        ;
        return ref.filter(identity); // Remove blank headers
    } // attributes()
} // ingest()

function get_browser(uastring) {
    if(~uastring.indexOf("Edge"))
      return "edge";
    if(~uastring.indexOf("Trident"))
      return "ienew";
    if(~uastring.indexOf("MSIE"))
      return "ie";
    if(~uastring.indexOf("Firefox"))
      return "firefox";
    return uastring;
} // get_browser()
