# tooooools-api [<img src="https://github.com/chevalvert.png?size=100" align="right">](http://chevalvert.fr/)
_RESTful API with various utils for tooooools-* clients_

<br>

## Installation

```sh
$ git clone https://github.com/chevalvert/tooooools-api
$ cd tooooools-api
$ npm install
```

## Usage

### Launch

```sh
$ node tooooools-api
> Server is listenning on port 8080
```

### API endpoints

```sh
$ curl -X GET …/api
> {
    "/endpoint": {
      "description": …,
      "method" : …
    },
    …
  }
```

### Configuration

See [`.env.example`](.env.example).

## Development

```sh
$ npm run start
> NODE_ENV=development node index.js
> Server is up and running on port 8080

$ npm run lint
```

### Extending the API

Create a new endpoint by creating a new JavaScript file in [`/api`](api/).

By default, the RESTful endpoint will match the file path.
This behavior can be overwritten by specifying a custom `endpoint` key in the exported module.

<sup>**Note:** nested paths will be followed, so `api/foo/bar/baz.js` will match the route `api/foo/bar/baz`.</sup>

The `action` key is the classic express middleware signature.

#### `api/echo.js`

```js
module.exports = {
  method: 'POST',
  // endpoint: 'echo/:message?',
  description: 'Return the payload',
  action: (req, res, next) => res.send(req.body)
}
```
```sh
$ curl -X GET …/api
> {
  "/api/echo": {
    "description": "Return the payload",
    "method": "POST"
  }
}

$ curl -H 'Content-Type: application/json' -X POST …/api/echo -d '{ "foo": "bar" }'
> {"foo":"bar"}
```

## License
[MIT.](https://tldrlegal.com/license/mit-license)
