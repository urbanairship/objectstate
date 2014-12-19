// Copyright 2014 Urban Airship and Contributors

var Stream = require('stream')

function ObjectState(initial) {
  Stream.call(this)

  this.writable = true
  this.readable = true
  this.state = initial || {}
}

var cons = ObjectState
  , proto = cons.prototype = Object.create(Stream.prototype)

proto.constructor = cons

proto.wait = function(fn) {
  var should_emit = false

  // shadow the prototype property
  this.emit = function() {
    should_emit = true
  }

  try {
    fn()
  } finally {
    delete this.emit
    should_emit && this.emitState()
  }
}

proto.listen = function(ee, name, params) {
  ee.on(name, this.receive_event.bind(this, params))

  return this
}

proto.emitState = function() {
  this.emit('data', this.state)
}

proto.deepcopy = function() {
  return JSON.parse(JSON.stringify(this.state))
}

proto.copy = function() {
  var out = {}

  for(var key in this.state) {
    out[key] = this.state[key]
  }

  return out
}

proto.snapshot = function(deep) {
  deep = deep === undefined ? true : deep

  var self = this
    , state = self[deep ? 'deepcopy' : 'copy']()

  return restore

  function restore() {
    self.state = state
    self.emitState()
  }
}

proto.include = function(os) {
  var self = this

  os.on('data', ondata)
    .on('delete-key', ondeletekey)

  return os

  function ondata(state) {
    for(var key in state) {
      self.state[key] = state[key]
    }

    self.emitState()
  }

  function ondeletekey(key) {
    self._remove(key)
  }
}

proto.get = function(key) {
  return this.state[key]
}

proto.set = function(key, val) {
  this.state[key] = val

  this.emitState()
}

proto.remove = function(attr) {
  this._remove(attr)
  this.emitState()
}

proto.write = function(data) {
  this.state = data

  this.emitState()
}

proto._remove = function(attr) {
  if(this.state.hasOwnProperty(attr)) {
    delete this.state[attr]

    this.emit('delete-key', attr)
  }
}

proto.receive_event = function(params) {
  var self = this
    , values = [].slice.call(arguments, 1)
    , context

  context = params.reduce(map_value_to_attr, {})

  Object.keys(context).forEach(apply_context_to_state)

  self.emitState()

  function map_value_to_attr(lhs, rhs) {
    var value = values.shift()

    if(rhs !== null) {
      lhs[rhs] = value
    }

    return lhs
  }

  function apply_context_to_state(key) {
    if(context[key] === undefined) {
      return self._remove(key)
    }

    self.state[key] = context[key]
  }
}

module.exports = cons
