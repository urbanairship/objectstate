// Copyright 2015 Urban Airship and Contributors

var through = require('through')

var deepequal = require('deep-equal')
var prop = require('deep-property')

module.exports = objectState

function objectState (_initial, _opts) {
  var state = deepcopy(_initial) || {}
  var opts = _opts || {}
  var stream = through(write)
  var calledBatchFn = false

  if (opts.batch && !opts.batchFn) {
    opts.batchFn = process.nextTick
  }

  stream.get = get
  stream.set = set
  stream.remove = remove

  stream.listen = listen
  stream.listenOn = listenOn

  stream.wait = wait

  stream.state = copyState
  stream.emitState = emitState

  return stream

  function write (data) {
    if (typeof data === 'undefined' || equal(state, data)) {
      return
    }

    state = deepcopy(data)

    emitState()
  }

  function get (keypath) {
    return deepcopy(prop.get(state, keypath))
  }

  function set (keypath, val) {
    if (equal(get(keypath), val)) {
      return
    }

    prop.set(state, keypath, deepcopy(val))

    emitState()
  }

  function remove (keypath) {
    var shouldEmit = prop.remove(state, keypath)

    if (shouldEmit) {
      emitState()
    }
  }

  function listen (src, keypath) {
    src.on('data', ondata)

    src.once('end', function () {
      src.removeListener('data', ondata)
    })

    return stream

    function ondata (data) {
      set(keypath, data)
    }
  }

  function listenOn (ee, name, params) {
    var paramsLength = params.length

    ee.on(name, receiveEvent)

    return stream

    function receiveEvent () {
      var args = [].slice.call(arguments)

      wait(setParams)

      function setParams () {
        var param
        var arg

        for (var i = 0; i < paramsLength; ++i) {
          param = params[i]
          arg = args[i]

          if (!param) {
            continue
          }

          if (typeof arg === 'undefined') {
            remove(param)

            continue
          }

          set(param, arg)
        }
      }
    }
  }

  function wait (fn) {
    var original = deepcopy(state)
    var queue = stream.queue
    var shouldEmit = false

    stream.queue = function () {
      shouldEmit = true
    }

    try {
      fn()
    } finally {
      stream.queue = queue

      if (shouldEmit && !equal(state, original)) {
        emitState()
      }
    }
  }

  function copyState () {
    return deepcopy(state)
  }

  function emitState () {
    if (opts.batch || opts.batchFn) {
      if (!calledBatchFn) {
        calledBatchFn = true
        opts.batchFn(function () {
          calledBatchFn = false
          actuallyEmit()
        })
      }
    } else {
      actuallyEmit()
    }
  }

  function actuallyEmit () {
    stream.queue(deepcopy(state))
  }
}

function deepcopy (obj) {
  return typeof obj !== 'undefined' ? JSON.parse(JSON.stringify(obj)) : void 0
}

function equal (x, y) {
  return deepequal(x, y, {strict: true})
}
