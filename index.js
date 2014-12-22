// Copyright 2014 Urban Airship and Contributors

var through = require('through')

var deepequal = require('deep-equal')
  , prop = require('deep-property')

module.exports = objectstate

function objectstate(_initial) {
  var state = deepcopy(_initial) || {}
    , stream = through(write)

  stream.wait = wait
  stream.state = copyState
  stream.emitState = emitState
  stream.listen = listen
  stream.listenOn = listenOn
  stream.set = set
  stream.get = get
  stream.remove = remove

  return stream

  function write(data) {
    if(equal(state, data)) {
      return
    }

    state = deepcopy(data)

    emitState()
  }

  function emitState() {
    stream.queue(deepcopy(state))
  }

  function copyState() {
    return deepcopy(state)
  }

  function set(keypath, val) {
    if(equal(get(keypath), val)) {
      return
    }

    prop.set(state, keypath, deepcopy(val))

    emitState()
  }

  function get(keypath) {
    return deepcopy(prop.get(state, keypath))
  }

  function listen(src, keypath) {
    src.on('data', function(data) {
      set(keypath, data)
    })

    return stream
  }

  function listenOn(ee, name, params) {
    var paramsLength = params.length

    ee.on(name, receiveEvent)

    function receiveEvent() {
      var args = [].slice.call(arguments)

      wait(setParams)

      function setParams() {
        var param
          , arg

        for(var i = 0; i < paramsLength; ++i) {
          param = params[i]
          arg = args[i]

          if(!param) {
            continue
          }

          if(typeof arg === 'undefined') {
            remove(param)

            continue
          }

          set(param, arg)
        }
      }
    }
  }

  function remove(keypath) {
    var shouldEmit = prop.remove(state, keypath)

    if(shouldEmit) {
      stream.queue(state)
    }
  }

  function wait(fn) {
    var original = deepcopy(state)
      , queue = stream.queue
      , shouldEmit = false

    stream.queue = function() {
      shouldEmit = true
    }

    try {
      fn()
    } finally {
      stream.queue = queue

      if(shouldEmit && !equal(state, original)) {
        emitState()
      }
    }
  }
}

function deepcopy(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj
}

function equal(x, y) {
  return deepequal(x, y, {strict: true})
}
