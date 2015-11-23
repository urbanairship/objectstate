# ObjectState

[![Build Status](http://img.shields.io/travis/urbanairship/objectstate/master.svg?style=flat-square)](https://travis-ci.org/urbanairship/objectstate)
[![npm install](http://img.shields.io/npm/dm/objectstate.svg?style=flat-square)](https://www.npmjs.org/package/objectstate)
[![npm version](https://img.shields.io/npm/v/objectstate.svg?style=flat-square)](https://www.npmjs.org/package/objectstate)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
[![License](https://img.shields.io/npm/l/objectstate.svg?style=flat-square)](https://github.com/urbanairship/objectstate/blob/master/LICENSE)

## Overview

`objectstate` exports a function that constructs a stream. The stream is
designed to be the source of truth for the state of a system. It represents
state as a JavaScript object, and updates it by 'listening' to streams or
event emitters.

When any stream or event emitter emits new values, ObjectState updates its state
representation, and fires a "data" event. Client code can subscribe to the
"data" event for a full representation of the state of the system each time
it changes.

## Example

```javascript
var EE = require('events').EventEmitter

var objectState = require('objectstate')
var through = require('through')

var stream = through()

var ee1 = new EE
var ee2 = new EE

var os = objectState()

os.listen(stream, 'rat')
  .listenOn(ee1, 'data', ['cat', 'dog'])
  .listenOn(ee2, 'error', ['hat'])

os.on('data', function(state) {
  console.log(state)
})

stream.queue(5)             // {"rat": 5}
ee1.emit('data', 1)         // {"rat": 5, "cat":1}
ee1.emit('data', 1, 2)      // {"rat": 5, "cat":1, "dog":2}
ee2.emit('data', 100)       // does not log, since os does not listen to ee2's
                            // data event.
stream.queue(5)             // does not log, because this changes nothing.
ee2.emit('error', "hello")  // {"rat": 5, "cat":1, "dog":2, "hat":"hello"}
ee1.emit('data')            // {"rat": 5, "hat":"hello"}
```

## Notes

ObjectState will never alter any object that is passed to it, instead it makes a
deep copy for use internally. Likewise, it only ever emits a deep copy of its
state in order to avoid outside mutation.

For performance reasons, deep copy is implemented using
`JSON.parse(JSON.stringify(state))`, which has a few limitations.

1. It will throw an error if there is a self-reference,
2. It will have strange side effects on properties that are not `null`,
   `string`, `boolean`, `array`, or a plain JavaScript `object`.
   This includes functions, typed arrays, and objects with prototype other than
   `Object.prototype`.

In practice, these limitations are mostly inconsequential. ObjectState is meant
to manage **data**, not complicated instances.

ObjectState only ever emits when its internal state changes, a condition
determined via a deep comparison of the new state object versus the previous
one.

ObjectState speaks "keypaths", meaning you can reference deeply nested
properties by dot-separated strings. For example, given the object
`{animals: {cats: {sound: 'meow'}}}`, `'animals.cats.sound'` would refer to the
string `'meow'`. If you do not need deep property access, a regular string will
work as you would expect.

## API

`objectState(_initial, _options) -> DuplexStream`

* `_initial` is an optional object to use as the initial state.
* `_options` is an optional configuration object, accepting as options:
  - `batch: Boolean` - A boolean indicating whether or not emissions should be
    "batched", controlled by the `batchFn` parameter.
  - `batchFn: Function` - A function that takes a callback that is used to
    coordinate batch emissions, defaults to [`process.nextTick`](https://nodejs.org/api/process.html#process_process_nexttick_callback_arg).

ObjectState instances are readable/writable streams. ObjectState emits whenever
its internal state changes, and can be written to with an object to set its
internal state.

### Instance Methods

#### `os.listen(stream, keypath) -> os`
- `stream`: A stream
- `keypath`: The keypath to update on emit

#### `os.listenOn(ee, eventName, keypaths) -> os`
- `ee`: An event emitter
- `eventName`: When `ee` emits events named `eventName`, their objects are
  recorded on the internal state object.
- `keypaths`: An array of keypaths.

When the `ee` emits the event `eventName`, `ObjectState` saves each argument
passed to the event handler under the `keypaths` array element at the same
index. The Nth argument passed to the listener is saved under the Nth element of
keypaths: `state[keypaths[N]] = arguments[N]`.

If an emitted argument is undefined, `ObjectState` deletes the corresponding
keypath in its internal state object.

If a specified parameter is falsey, it is skipped over during assignment.

#### `os.get(keypath)`

Returns the value for state keypath `keypath` (or `undefined` if not set).

#### `os.set(keypath, value)`

Set the value for keypath `keypath` to `value` on the state.

#### `os.remove(keypath)`

Delete the keypath `keypath` from the state.

#### `os.emitState()`

Emit the current state as a `data` event.

#### `os.wait(fn)`

`fn` is a function that is immediately called. All changes that happen during
its execution will be collected into a single `data` event, if the state changed
at all.

#### `os.state()`

Returns a deep copy of the current state object.

## Contributing

Please see [CONTRIBUTING](./CONTRIBUTING.md) for details on how to contribute
to this project.

## License 

This project is licensed under the Apache License, Version 2.0. See
[LICENSE](./LICENSE) for the full license.
