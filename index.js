// Copyright 2014 Urban Airship and Contributors

var through = require('through')

var prop = require('deep-property')
  , equal = require('is-equal')

module.exports = objectState

function objectState(_initial) {
  var state = deepcopy(_initial) || {}
    , stream = through(write)

  stream.get = get
  stream.set = set
  stream.remove = remove

  stream.listen = listen
  stream.listenOn = listenOn

  stream.wait = wait

  stream.state = copyState
  stream.emitState = emitState

  return stream

  function write(data) {
    if(equal(state, data)) {
      return
    }

    state = deepcopy(data)

    emitState()
  }

  function get(keypath) {
    return deepcopy(prop.get(state, keypath))
  }

  function set(keypath, val) {
    if(equal(get(keypath), val)) {
      return
    }

    prop.set(state, keypath, deepcopy(val))

    emitState()
  }

  function remove(keypath) {
    var shouldEmit = prop.remove(state, keypath)

    if(shouldEmit) {
      stream.queue(state)
    }
  }

  function listen(src, keypath) {
    src.on('data', ondata)

    src.once('end', function() {
      src.removeListener('data', ondata)
    })

    return stream

    function ondata(data) {
      set(keypath, data)
    }
  }

  function listenOn(ee, name, params) {
    var paramsLength = params.length

    ee.on(name, receiveEvent)

    return stream

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

  function copyState() {
    return deepcopy(state)
  }

  function emitState() {
    stream.queue(deepcopy(state))
  }
}

function deepcopy(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj
}
