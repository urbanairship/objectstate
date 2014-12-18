# ObjectState

`objectstate` exports a function that constructs a stream. The stream is
designed to be the source of truth for the state of a system. It represents
state as a JavaScript object, and updates it by 'listening' to event emitters.
When any emitter emits new values, ObjectState updates its state
representation, and fires a "data" event. Client code can subscribe to the
"data" event for a full representation of the state of the system each time
it changes.

```javascript
var EE = require('events').EventEmitter

var ObjectState = require('objectstate')

var ee1 = new EE
  , ee2 = new EE

var os = new ObjectState

os.listen(ee1, 'data', ['cat', 'dog'])
  .listen(ee2, 'error', ['hat'])

os.on('data', function(state) { console.log(state) })

ee1.emit('data', 1)         // {"cat":1}
ee1.emit('data', 1, 2)      // {"cat":1, "dog":2}
ee2.emit('data', 100)       // does not log, since os does not listen to ee2's
                            // data event.
ee2.emit('error', "hello")  // {"cat":1, "dog":2, "hat":"hello"}
ee1.emit('data')            // {"hat":"hello"}
```

## API

`ObjectState = require('modules/objectstate')`

Returns a function constructor.

`ObjectState(_initial) -> Stream`

Optionally takes an initial state (meaning an object), and returns an
ObjectState instance.

ObjectState instances are readable/writable streams. ObjectState emits whenever
its internal state changes, and can be written to with an object to set its
state.

### Instance Methods

#### `os.listen(ee, eventName, attributes)`

 - `ee`: An event emitter

 - `eventName`: When `ee` emits events named `eventName`, their objects are
   recorded on the internal state object.

 - `attributes`: An array of attribute names.
 
   When the `ee` emits the event, `eventName`, `ObjectState` saves each
   argument passed to the event handler under the `attributes` array element at
   the same index. The i-th argument passed to the listener is saved under the
   i-th element of attributes: `state[attributes[i]] = arguments[i]`.

   If an emitted argument is undefined, `ObjectState` deletes
   the corresponding attribute in its internal state object.

 - returns itself.

#### `os.get(attr)`

Returns the value for state attribute `attr` (or `undefined` if not set)

#### `os.set(attr, value)`

Set the value for attribute `attr` to `value` on the object state.

#### `os.remove(attr)`

Delete the attribute `attr` from the object state.

#### `os.emitState()`

Emit the current state as a `data` event.

#### `os.wait(fn)`

`fn` is a function that is immediately called. All changes that happen
during its execution will be collected into a single `data` event, if the state
changed at all.

#### `os.copy()`

Returns a shallow copy of the instance's current state.

#### `os.deepcopy()`

Returns a deep copy of the instance's current state.

Deep copy is implemented using `JSON.parse(JSON.stringify(state))` which has
a few limitations.  It will throw an error if there is a self-reference,
and will have strange side effects on properties that are not `null`, `strings`,
`booleans`, `arrays`, or plain JavaScript `objects`.  This includes functions,
typed arrays, and objects with prototype other than `Object.prototype`.

#### `os.snapshot(deep=true)`

**WARNING** This method is deprecated and should not be used. It is scheduled to
be removed in the next major version.

Returns a function that can be used to reset the object's state. Calling the
returned restore function will emit a `data` event. 

`deep` specifies whether to shallow-copy or deep-copy the current state.

if the snapshot uses a deep copy, it is subject to the same limitations as
os.deepcopy.

Usage:

```javascript
   os = new ObjectState
   restore = os.snapshot()
   // time passes...
   restore()
```

#### `os.include(otherOS)`

**WARNING** This method is deprecated and should not be used. It is scheduled to
be removed in the next major version.

 - `otherOS`: another objectstate instance

The invoking instance becomes a combination of both itself and the passed
`objectstate`. Properties from the invoking instance take precedence over
`otherOS`'s properties.

### Instance Properties

#### `os.state`

A reference to the internal state object which represents the state of the
system.

## License 

This project is licensed under the Apache License, Version 2.0. See
[LICENSE](./LICENSE) for the full license.
