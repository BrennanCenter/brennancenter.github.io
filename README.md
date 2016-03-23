# judicialselectionmap.brennancenter.org
This is the website that hosts the Judicial Selection Map of the U.S. The files here all play a role in building the final site.
The site is hosted on GitHub, and by default is at brennancenter.github.io

## Updates
The importance of Commit Messages. Throughout this document, you will see mention of commit messages.  This web application will likely be maintained/updated by different people at different times.  And sometimes, you might make a change at one point, and then go back a few months later only to try and remember what you were thinking at the time you'd made that change.  A commit message is a favor to your future self, and any other people in the future, who are trying to understand what the status of the visualization is.

A commit message is just like an email message: a short subject to summarize the changes you've made, and a longer message (if necessary only) to put any important details.  It's like "the ship's log" in a way -- it maps the journey of this visualization.

Also: the Github interface only enables the "Commit changes" button when you have typed in a commit message subject.

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
  6. In your web browser, go to the [data/ subdirectory in this repository](https://github.com/BrennanCenter/brennancenter.github.io/tree/master/data)
  7. Click the "Upload Files" button and upload your brennan.csv file
  8. Make a comment and commit
    * In your comment, please try and summarize the changes that were made to the dataset.

#### Tooltips/Descriptions
  1. On the same [Google spreadsheet](https://docs.google.com/spreadsheets/d/1-sU2EAuAO-C0TJQewpMSOWIFu4kIw2S_J961g2kDJKk/edit#gid=1290804713) as above, select the "Tooltips" tab
    1. Make necessary changes
    2. Select "File"
    3. Select "Download as.."
    4. Select "Comma-separated values (.csv, current sheet)"
    5. Confirm the file should be saved.
  2. Using Windows Explorer or Finder, as appropriate, go to the Downloads folder (or wherever the csv was saved)
  3. Rename the csv file
    * From: "Judicial Selection Dataset (Tooltips).csv"
    * To: "reference.csv"
  4. In your web browser, go to the [data/ subdirectory in this repository](https://github.com/BrennanCenter/brennancenter.github.io/tree/master/data)
  5. Click the "Upload Files" button and upload your reference.csv file
  6. Make a comment and commit
    * In your commit message, please summarize the changes that were made to the dataset
  

### Colors
The various colors in use on the site are configurable in [one css stylesheet file](https://github.com/BrennanCenter/brennancenter.github.io/blob/master/_sass/_colors.scss).
Click the pencil icon, which will then let you edit the file.
When you are ready to commit, please put a brief description/reason for your change, and then click "Commit"

### Introduction Text
The introduction text is currently divided into three columns on a desktop view.  Each column is contained in a separate file.  So, simply go into the [_introduction](https://github.com/BrennanCenter/brennancenter.github.io/tree/master/_introduction) directory and edit the file which corresponds to the column that you want to change.

To edit the file, click on its name, then click on the pencil icon.
Please make sure to put a brief description/reason for your change when you commit the change.  Use [markdown](https://guides.github.com/features/mastering-markdown/) to format the text.  Markdown is easy to learn and easy to read by both humans and computers.

### Site title, description, logo image, etc
These are all configured in the [_config.yml file](https://github.com/BrennanCenter/brennancenter.github.io/blob/master/_config.yml)


### Behavior/Transitions, New Visualizations

The main functionality of the visualization is written in javascript, using the d3.js library. Thus, modification of code will require the services of someone familiar with javscript, and comfortable with d3.js.

