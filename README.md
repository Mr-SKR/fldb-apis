# Food Lovers Database APIs

## About

TODO

## Project Setup

### Install project dependencies

Install [Node.js](https://nodejs.org/en/) if you haven't already.
From the root of the project folder, execute below command(s)

```
npm install
```

### Obtain credentials

- [Google API Key](https://developers.google.com/workspace/guides/create-credentials) for querying Youtube, MAPS APIs with youtube, maps and places services enabled
- [MongoDB connection string](https://docs.atlas.mongodb.com/tutorial/create-new-cluster/)
- [New Relic License key](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/) for monitoring

### Configure credentials

Create a `.env` file at the root of the directory with values filled for below keys

```
MONGO_URI=<YOUR_MONGO_URI>
YOUTUBE_API_KEY=<YOUR_YOUTUBE_API_KEY>
PORT=<YOUR_PORT>
NEW_RELIC_APP_NAME=<NEW_RELIC_APP_NAME>
NEW_RELIC_LICENSE_KEY=<NEW_RELIC_LICENSE_KEY>
NODE_ENV=development | production
```

### Run locally

From the root of the project folder, execute below command(s)

```
npm start
```

### Deploy using Heroku (optional)

```
npm install -g heroku
heroku login
heroku git:remote -a <project-name>
heroku config:set MONGO_URI="<YOUR_MONGO_URI>"
heroku config:set YOUTUBE_API_KEY="<YOUR_YOUTUBE_API_KEY>"
heroku config:set NEW_RELIC_APP_NAME="<NEW_RELIC_APP_NAME>"
heroku config:set NEW_RELIC_LICENSE_KEY="<NEW_RELIC_LICENSE_KEY>"
heroku config:set NODE_ENV=production

git add .
git commit -m "<commit-message>"

<!-- Only First time  -->
heroku create

git push heroku <branch-name>

<!-- View logs -->
heroku logs --tail

<!-- Heroku dyno keep-alive using new relic -->
heroku addons:add newrelic:standard
```
