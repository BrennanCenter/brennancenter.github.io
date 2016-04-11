function askus() {
    /* Private Variables */
    var dom
      , name
      , buttons = { all: null, pick: null }
      , dropdown
      , callback // button click callback sent by caller
      , value
    ;

    // Main Function Object
    function widget(el) {
        dom = el;
        buttons.all = dom.select(".choice-all");
        buttons.pick = dom.select(".choice-pick");
        dropdown = buttons.pick.select("select");
        name = dom.attr("id").split("-")[1];
        draw();
    } // main function object

    function draw() {
        buttons.all
            .on("click", function() {
                value = "all";
                dom.select(".choice-pick select").selectAll("option")
                    .property("selected", function(d, i) { return !i; })
                ;
                callback({
                      key: name
                    , value: value
                  })
                ;
              })
        ;
        buttons.pick
            .on("click", function() {
                var val = d3.select(this).select("input").node().value;
                if(!dropdown.node().value) {
                    dropdown.selectAll("option:enabled")
                        .property("selected", function(d, i) {
                            return !val
                              ? i === 1 // first option
                              : d.key === val // set it to what it was last time
                            ;
                          })
                      ;
                      dropdown.each(function(d, i) {
                          d3.select(this).on("change").apply(this, [d, i]);
                        })
                      ;
                }
              })
        ;
    } // draw()

    function populate(choices) {
        choices.unshift({
              key: ""
            , value: dropdown.select("optgroup").node().label
          })
        ;
        dropdown
            .on("change", function() {
                value = this.value;
                d3.select(this.parentNode).select("input")
                    .node()
                    .value = value
                ;
                callback({ key: name, value: value });
              })
        ;
        dropdown.selectAll("option")
            .data(choices, identikey)
          .enter().append("option")
            .text(identival)
            .attr("value", identikey)
            .attr("hidden", function(d, i) { return i ? null : "hidden"; })
        ;
    } // populate()

    /*
     * API Getters/Setters
     */
    widget.callback = function(arg) {
      if(!arguments.length) return callback;

        callback = arg;
        return widget;
      } // widget.callback()
    ;
    widget.choices = function(arg) {
        if(!arguments.length)
            return dropdown.selectAll("option").data();

        populate(arg);
        return widget;
      } // widget.choices()
    ;
    widget.reset = function() {
        buttons.all.node().click();

        return widget;
      } // widget.reset()
    ;
    widget.value = function(arg) {
        if(!arguments.length)
          return value
        ;
        if(arg === "all" || arg === "")
            buttons.all.node().click()
        ;
        if(arg === "") {}

        else {
            dropdown.selectAll("option")
                .property("selected", function(d, i) {
                    return ~d.key.indexOf(arg) || !i;
                  })
            ;
            if(dropdown.node().value) {
                dropdown.each(function(d, i) {
                    d3.select(this).on("change").apply(this, [d, i]);
                  })
                ;
                buttons.pick.node().click();
            }
            else {
                buttons.all.node().click()
            }
        }
        return widget;
      } // widget.value()
    ;
    // This is ALWAYS the last thing returned
    return widget;
} // askus()
