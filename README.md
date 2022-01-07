# fldb-apis

### Obtain API key for querying Youtube APIs

- [YouTube Data API](https://developers.google.com/youtube/)
- [YouTube API Documentation](https://developers.google.com/youtube/v3/docs/?apix=true)

### Configure credentials

Create a .env file at the root of the directory with values filled for below keys

```
MONGO_URI=<YOUR_MONGO_URI>
YOUTUBE_API_KEY=<YOUR_YOUTUBE_API_KEY>
PORT=<YOUR_PORT>
```

### Heroku

```
npm install -g heroku
heroku login
heroku git:remote -a fldb-apis
heroku config:set MONGO_URI="<YOUR_MONGO_URI>"
heroku config:set YOUTUBE_API_KEY="<YOUR_YOUTUBE_API_KEY>"

git add .
git commit -m "<commit-message>"

<!-- Only First time  -->
heroku create

git push heroku main
```
