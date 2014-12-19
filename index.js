var Stream = require('stream')

var deepequal = require('deep-equal')
  , extend = require('xtend')
  , clone = require('clone')

function ObjectState(initial) {
  Stream.call(this)

  this.writable = true
  this.readable = true
  this.state = initial ? deepcopy(initial) : {}
}

var cons = ObjectState
  , proto = cons.prototype = Object.create(Stream.prototype)

proto.constructor = cons

proto.wait = function(fn) {
  var original = this.deepcopy()
    , shouldEmit = false

  // shadow the prototype property
  this.emit = function() {
    shouldEmit = true
  }

  try {
    fn()
  } finally {
    delete this.emit

    if(shouldEmit && !equal(this.state, original)) {
      this.emitState()
    }
  }
}

proto.listen = function(ee, name, params) {
  var self = this

  ee.on(name, receiveEvent)

  return self

  function receiveEvent() {
    var values = [].slice.call(arguments)
      , original
      , context

    original = self.deepcopy()

    context = params.reduce(mapValueToAttr, {})

    Object.keys(context).forEach(applyContextToState)

    if(!equal(self.state, original)) {
      self.emitState()
    }

    function mapValueToAttr(lhs, rhs) {
      var value = values.shift()

      if(rhs !== null) {
        lhs[rhs] = value
      }

      return lhs
    }

    function applyContextToState(key) {
      if(context[key] === undefined) {
        return self._remove(key)
      }

      self.state[key] = context[key]
    }
  }
}

proto.emitState = function() {
  this.emit('data', this.deepcopy())
}

proto.deepcopy = function() {
  return deepcopy(this.state)
}

proto.copy = function() {
  return extend({}, this.state)
}

proto.snapshot = function(deep) {
  deep = deep === undefined ? true : deep

  var self = this
    , state = self[deep ? 'deepcopy' : 'copy']()

  return restore

  function restore() {
    var shouldEmit = !equal(self.state, state)

    self.state = state

    if(shouldEmit) {
      self.emitState()
    }
  }
}

proto.include = function(os) {
  var self = this

  os.on('data', ondata)
    .on('delete-key', ondeletekey)

  return os

  function ondata(state) {
    var original = self.deepcopy()

    self.state = extend(self.state, state)

    if(!equal(self.state, original)) {
      self.emitState()
    }
  }

  function ondeletekey(key) {
    self._remove(key)
  }
}

proto.get = function(key) {
  return this.state[key]
}

proto.set = function(key, val) {
  var shouldEmit = !equal(this.get(key), val)

  this.state[key] = deepcopy(val)

  if(shouldEmit) {
    this.emitState()
  }
}

proto.remove = function(attr) {
  var shouldEmit = this._remove(attr)

  if(shouldEmit) {
    this.emitState()
  }
}

proto.write = function(data) {
  var shouldEmit = !equal(this.state, data)

  this.state = deepcopy(data)

  if(shouldEmit) {
    this.emitState()
  }
}

proto._remove = function(attr) {
  if(!this.state.hasOwnProperty(attr)) {
    return false
  }

  delete this.state[attr]

  this.emit('delete-key', attr)

  return true
}

function deepcopy(obj) {
  return clone(obj, false)
}

function equal(x, y) {
  return deepequal(x, y, {strict: true})
}

module.exports = cons
