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
> Server is listening on port 8080
```

### API endpoints

```sh
$ curl -X GET …/api
> {
    "/endpoint": {
      "description": …,
      "method": …,
      "body": {…}
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
This behavior can be overwritten by specifying a custom `endpoint` property in the exported module.

<sup>**Note:** nested paths will be followed, so `api/foo/bar/baz.js` will match the route `api/foo/bar/baz`.</sup>

An optional `body` property can define the signature of the expected request body. If the request body does not match the defined signature, various verbose errors will be thrown instead of running the action.

The `action` property is the classic express middleware signature.

#### `api/echo.js`

```js
module.exports = {
  method: 'POST',
  // endpoint: 'echo/:param?',
  description: 'Return the body `message` property',
  contentType: 'application/json', // Optional, will fail all requests not matching content-type
  body: {
    message: {
      required: true,
      type: 'string', // Can also be an array of types in case of mixed types
      description: 'The message to echo'
    },
    delay: {
      required: false,
      default: 0,
      type: 'number',
      description: 'Delay before sending back the message'
    }
  },
  action: (req, res, next) => setTimeout(() => res.send(req.body.message), req.body.delay)
}
```
```sh
$ curl -X GET …/api
> {
  "/api/echo": {
    "description": "Return the payload",
    "method": "POST",
    "body": {…}
  }
}

$ curl -H 'Content-Type: application/json' -X POST …/api/echo -d '{ "message": "Hello world" }'
> "Hello world"
```

### Deployment
Deployment to [alwaysdata environment](https://api.tooooools.com) is done automatically via a [Github action](.github/workflows/deploy-alwaysdata.yml). Simply create a new release by running:

```console
$ npm version [<newversion> | major | minor | patch]
```

## License
[MIT.](https://tldrlegal.com/license/mit-license)
