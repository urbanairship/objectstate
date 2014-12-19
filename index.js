// Copyright 2014 Urban Airship and Contributors

var Stream = require('stream')

var deepequal = require('deep-equal')
  , prop = require('deep-property')

module.exports = ObjectState

function ObjectState(_initial, _deepcopy) {
  var self = this

  Stream.call(self)

  self.writable = true
  self.readable = true
  self._deepcopy = _deepcopy || defaultDeepcopy

  var state = _initial || {}

  self.state = function() {
    return self._deepcopy(state)
  }
}

ObjectState.prototype = Object.create(Stream.prototype)

ObjectState.prototype.wait = function wait(fn) {
  var original = this.state()
    , shouldEmit = false
    , emit = this.emit

  // shadow the prototype property
  this.emit = function() {
    shouldEmit = true
  }

  try {
    fn()
  } finally {
    this.emit = emit

    if(shouldEmit && !equal(this.state, original)) {
      this.emitState()
    }
  }
}

ObjectState.prototype.stream = function stream(src, key) {
  src.on('data', this.set.bind(this, key))
}

ObjectState.prototype.listen = function listen(ee, name, params) {
  var paramsLength = params.length
    , self = this

  ee.on(name, receiveEvent)

  return self

  function receiveEvent() {
    var args = [].slice.call(arguments)

    self.wait(applyContext)

    function applyContext() {
      var param
        , arg

      for(var i = 0; i < paramsLength; ++i) {
        param = params[i]
        arg = args[i]

        if(!param) {
          continue
        }

        if(typeof arg === 'undefined') {
          self.remove(param)

          continue
        }

        self.set(param, arg)
      }
    }
  }
}

ObjectState.prototype.emitState = function emitState() {
  this.emit('data', this.state())
}

ObjectState.prototype.get = function get(key) {
  return prop.get(this.state(), key)
}

ObjectState.prototype.set = function set(key, val) {
  var state = this.state()

  prop.set(state, key, val)

  this.write(state)
}

ObjectState.prototype.remove = function remove(key) {
  var state = this.state()

  if(!state.hasOwnProperty(key)) {
    return false
  }

  delete state[key]

  this.write(state)
}

ObjectState.prototype.write = function write(data) {
  var self = this
  var shouldEmit = !equal(self.state(), data)

  self.state = function() {
    return self._deepcopy(data)
  }

  if(shouldEmit) {
    self.emitState()
  }
}

function defaultDeepcopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function equal(x, y) {
  return deepequal(x, y, {strict: true})
}
