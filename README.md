# flapper-news
Node/Express/Mongo server support for '[flapper](https://github.com/jblossomweb/flapper "Flapper")'

see live demo [here](https://jblossom-flapper-news.herokuapp.com/ "heroku")


# notes

favicons and screenshots will attempt to save locally to the following directories:

```
public/img/favicons
public/img/screenshots
```
these directories will be created when cloning the repository, with their contents gitignored.

If you wish to use AWS S3 instead (required for Heroku), setup the following .env vars:
```
USE_AWS_S3=true
AWS_ACCESS_KEY_ID=(your access key id)
AWS_SECRET_ACCESS_KEY=(your secret access key)
S3_BUCKET=(the bucket you wish to use)
```

The REST API is built into the app. If you'd like to decouple it entirely, you can change the URL:
```
API_BASE=(the URL of the API, with trailing slash)
```
(eg: https://jblossom-flapper-news.herokuapp.com/api/)

once ready, start the application with

```
npm start
```

and it will install npm and bower dependencies automatically.
