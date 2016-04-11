function tellus() {
    /* Private variables */
    var tooltip;
    /*
     * Main Function Object
     */
    function widget(sel) {
        tooltip = sel
          .classed("hidden", true)
          .style("position", "absolute")
        ;
    } // widget()

    function move(node) {
        var e = d3.event
          , x = e.clientX
          , y = e.clientY
          , doctop = window.pageYOffset
          , nBB = node.getBoundingClientRect()
        ;
        tooltip
            .style("top", (y + doctop - 30) + "px")
            .style(
                "left"
              , Math.min(
                        Math.max(0, 0.9 * (x-nBB.width/2))
                      , window.innerWidth - nBB.width)
                  + "px")
        ;
    } // move()

    /*
     * API - Getters/Setters
     */
    widget.hide = function() {
        tooltip.classed("hidden", true);
      } // widget.hide()
    ;
    widget.show = function(el, html) {
        tooltip
            .html(html)
            .classed("hidden", false)
        ;
        move(el);
      } // widget.show()
    ;
    return widget;
} // tellus()
