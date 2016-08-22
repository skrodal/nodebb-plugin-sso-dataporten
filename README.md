# NodeBB OAuth Plugin for UNINETT Dataporten

[NodeBB](https://github.com/NodeBB/NodeBB) Plugin that allows users to login/register via Dataporten from UNINETT. 

The plugin is a rewrite from [julianlam/nodebb-plugin-sso-github](https://github.com/julianlam/nodebb-plugin-sso-github)

Note to self: tested and working.

## Installation

Install straight from this repo:

    npm install skrodal/nodebb-plugin-sso-dataporten --save


**Styling of login button**

NodeBB does not allow for much flexibility when it comes to social login sources and styling. Only an (fa-)icon is allowed per default, no text. To circumvent this, go to the `Appearance`=>`Custom HTML & CSS`=>`Custom Header` page and paste something like this in the code view:

```js
<script>
    $( document ).ready(function() {
        $('li.dataporten').html(
          "<a rel='nofollow' target='_top' style='text-align: center;' href='/auth/dataporten'>" + 
          "<img src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuNCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHdpZHRoPSIzMDAuNjYxcHgiIGhlaWdodD0iNDAwLjg4MXB4IiB2aWV3Qm94PSIwIDAgMzAwLjY2MSA0MDAuODgxIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMDAuNjYxIDQwMC44ODEiCgkgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxnPgoJPGc+CgkJPGc+CgkJCTxwb2x5Z29uIGZpbGw9IiNGMTY2NzYiIHBvaW50cz0iMjAwLjQ0LDMwMC42NjEgMzAwLjY2MSwyMDAuNDQgMjAwLjQ0LDEwMC4yMiAJCQkiLz4KCQk8L2c+CgkJPGc+CgkJCTxwb2x5Z29uIGZpbGw9IiNGMTY2NzYiIHBvaW50cz0iMTAwLjIyMSwyMDAuNDQgMCwxMDAuMjIgMTAwLjIyMSwwIAkJCSIvPgoJCTwvZz4KCTwvZz4KCTxnPgoJCTxwb2x5Z29uIGZpbGw9IiNFRDFDMjQiIHBvaW50cz0iMTAwLjIyMSwyMDAuNDQgMjAwLjQ0MSwxMDAuMjIgMTAwLjIyMSwwIAkJIi8+Cgk8L2c+Cgk8Zz4KCQk8cG9seWdvbiBmaWxsPSIjRjdBQ0JDIiBwb2ludHM9IjEwMC4yMjEsNDAwLjg4MSAwLDMwMC42NjEgMTAwLjIyMSwyMDAuNDQgCQkiLz4KCTwvZz4KCTxnPgoJCTxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfMV8iIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTAwLjIxNjMiIHkxPSIxOTkuNTUzNyIgeDI9IjE5OS42NjMxIiB5Mj0iMzAwLjc1MTUiPgoJCQk8c3RvcCAgb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjojNjcwMDAwIi8+CgkJCTxzdG9wICBvZmZzZXQ9IjAuMDYxMSIgc3R5bGU9InN0b3AtY29sb3I6IzcxMDAwMCIvPgoJCQk8c3RvcCAgb2Zmc2V0PSIwLjM5NTQiIHN0eWxlPSJzdG9wLWNvbG9yOiNBMzBCMTciLz4KCQkJPHN0b3AgIG9mZnNldD0iMC42NzQzIiBzdHlsZT0ic3RvcC1jb2xvcjojQ0ExNTI4Ii8+CgkJCTxzdG9wICBvZmZzZXQ9IjAuODgzOCIgc3R5bGU9InN0b3AtY29sb3I6I0UyMTkzMSIvPgoJCQk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojRUQxQjM0Ii8+CgkJPC9saW5lYXJHcmFkaWVudD4KCQk8cG9seWdvbiBmaWxsPSJ1cmwoI1NWR0lEXzFfKSIgcG9pbnRzPSIyMDAuNDQxLDMwMC42NjEgMjAwLjQ0LDMwMC42NTkgMjAwLjQ0LDEwMC4yMiAxMDAuMjIsMjAwLjQ0IDEwMC4yMjEsMjAwLjQ0MSAKCQkJMTAwLjIyMSw0MDAuODgxIAkJIi8+Cgk8L2c+CjwvZz4KPC9zdmc+' width='15'>" + 
          " Dataporten</a>"
        );
    });
</script>
```

The code will make a more sensible login button for Dataporten, specifically.

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

