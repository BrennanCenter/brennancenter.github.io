# judicialselectionmap.brennancenter.org
This is the website that hosts the Judicial Selection Map of the U.S. The files here all play a role in building the final site.
The site is hosted on GitHub, and by default is at brennancenter.github.io

## Updates

### Data
#### Main data
The main data is controlled in a Google Spreadsheet.  This spreadsheet serves as the master file of record.  Whenever any changes are made to the spreadsheet, they are not immediately reflected in this visualization.  To do that:
  1. Load the [Google spreadsheet](https://docs.google.com/spreadsheets/d/1-sU2EAuAO-C0TJQewpMSOWIFu4kIw2S_J961g2kDJKk/edit#gid=1290804713)
  2. Select the "Vertical Data" tab.
  3. Make changes to the dataset here. Important: Please don't change any of the headers (rows 1-5).
  4. Download the tab as a CSV file to your computer
    * On the spreadsheet, click the "File" menu
    * Scroll down to "Download as"
    * In the new list, scroll to "Comma-separated values (.csv, current sheet)"
    * Confirm to "save" in the next dialog box
  5. Using your File Explorer application (e.g. Finder (Mac) or Windows Explorer):
    * Find the Download folder (or wherever your csv file is downloaded)
    * Rename the csv file:
      * From: "Judicial Selection Dataset (Vertical Data).csv"
      * To "brennan.csv"
  6. In your web browser, travel to the [data/ subdirectory in this repository](https://github.com/BrennanCenter/brennancenter.github.io/tree/master/data)
  7. Click the "Upload Files" button and upload your brennan.csv file
  8. Make a comment and commit
    * In your comment, please try and summarize the changes that were made to the dataset.
  9. The visualization should reflect the dataset changes in less that 10 minutes (and usually immediately).

### Colors
The various colors in use on the site are easily configurable.
Note: you will need to know the [hex-code](http://www.color-hex.com/) of the color you want to change.


The main functionality of the visualization is written in javascript, using the d3.js library. Thus, modification of code will require the services of someone familiar with javscript, and comfortable with d3.js.

Additionally, the various 
