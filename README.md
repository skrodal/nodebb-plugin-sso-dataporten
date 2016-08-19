# NodeBB OAuth Plugin for UNINETT Dataporten

[NodeBB](https://github.com/NodeBB/NodeBB) Plugin that allows users to login/register via Dataporten from UNINETT. 

The plugin is a rewrite from [julianlam/nodebb-plugin-sso-github](https://github.com/julianlam/nodebb-plugin-sso-github)

Note to self: tested and working.

## Installation

Install straight from this repo:

    npm install skrodal/nodebb-plugin-sso-dataporten --save

## Dependencies 

As defined in package.json:

- [passport-uninett-dataporten](https://github.com/skrodal/passport-uninett-dataporten), a [Passport](http://passportjs.org/) 
strategy for OAuth2 authentication with [Dataporten](https://docs.dataporten.no/).
- [unidecode](https://github.com/FGRibreau/node-unidecode) (to avoid accented characters in usernames)

## Own notes

Developed/tested with NodeBB v1.1.0 in Docker, using the following:


Store the following to file `docker-compose.yml`:

```yml
nodebb:
  image: vimagick/nodebb
  ports:
    - "4567:4567"
  links:
    - redis
  restart: always

redis:
  image: redis
  ports:
    - "127.0.0.1:6379:6379"
  restart: always
```

...and run


```sh
docker-compose up -d
open http://localhost:4567 
```

Follow installation prompts and change _Host IP or address of your Redis instance_ to `redis`.

Enter the container's terminal with

```sh
docker exec -ti nodebbdocker_nodebb_1 env TERM=xterm bash -l 
```

Update a few things:

```sh
apk update
apk add git
npm install
```

And then install the plugin:

```sh
npm install skrodal/nodebb-plugin-sso-dataporten --save
```

...back in browser, activate the Dataporten plugin and then use the menu to restart the forum and then refresh the page. 

A 'Social Authentication' in which your Client ID and Secret may be added should now be available. Fill inn and restart the server again. That's it.

