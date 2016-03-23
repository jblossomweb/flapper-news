# flapper-news
Node/Express/Mongo server support for '[flapper](https://github.com/jblossomweb/flapper "Flapper")'


see live demo [here](https://jblossom-flapper-news.herokuapp.com/ "heroku")


# notes

favicons and screenshots will attempt to save locally to public/img/favicons and public/img/screenshots.
these directories are gitignored, so you will need to create them before running.

If you wish to use AWS S3 instead (required for Heroku), setup the following .env vars:

USE_AWS_S3=true
AWS_ACCESS_KEY_ID=(your access key id)
AWS_SECRET_ACCESS_KEY=(your secret access key)
S3_BUCKET=(the bucket you wish to use)

once the directories are created, or AWS is setup, start the application with npm start