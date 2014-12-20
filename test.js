// Copyright 2014 Urban Airship and Contributors

var EE = require('events').EventEmitter

var through = require('through')
  , test = require('tape')

var ObjectState = require('./')

test('is a function', function(assert) {
  assert.equal(typeof ObjectState, 'function')
  assert.end()
})

test('is a readable stream', function(assert) {
  assert.plan(1)

  var ws = through(write)
    , ee = new EE

  function write(obj) {
    assert.deepEqual(obj, {salutation: 'sup'})
  }

  var os = new ObjectState()

  os.pipe(ws)

  os.listenOn(ee, 'data', ['salutation'])

  ee.emit('data', 'sup')
})

test('can write to object state', function(assert) {
  assert.plan(2)

  var os = new ObjectState
  var testState = {cats: true}

  os.on('data', function(state) {
    assert.deepEqual(state, testState)
    assert.deepEqual(os._state, testState)
  })

  os.write(testState)
})

test('is a writable stream', function(assert) {
  assert.plan(2)

  var os = new ObjectState
  var stream = through()
  var testState = {cats: true}

  stream.pipe(os)

  os.on('data', function(state) {
    assert.deepEqual(state, testState)
    assert.deepEqual(os._state, testState)
  })

  stream.queue(testState)
})

test('`.emitState()` emits current state', function(assert) {
  var os = new ObjectState({cats: true})

  os.on('data', function(state) {
    assert.deepEqual(state, {cats: true})
    assert.end()
  })

  os.emitState()
})

test('`.listenOn()` maps events from emitters to context', function(assert) {
  var ee_one = new EE()
    , ee_two = new EE()

  var os = new ObjectState()

  os.listenOn(ee_one, 'data', [
      'hat'
    , 'bat'
    , 'cat'
  ])
  os.listenOn(ee_two, 'data', [
      'rat'
    , null
    , 'cat'
  ])

  ee_one.emit('dne', Math.random())

  assert.deepEqual(os._state, {})

  ee_one.emit('data', 1, 2, 3)

  assert.deepEqual(os._state, {
      hat: 1
    , bat: 2
    , cat: 3
  })

  ee_two.emit('data', 4, 5, undefined)

  assert.deepEqual(os._state, {
      rat: 4
    , hat: 1
    , bat: 2
  })

  assert.end()
})

test('`.wait()` will hold events within given function', function(assert) {
  var value_2 = Math.random() + 10
    , value_1 = Math.random()
    , os = new ObjectState()
    , ee = new EE()
    , count = 0

  os.listenOn(ee, 'data', ['value'])

  os.on('data', function(state) {
    ++count
    assert.equal(
        state.value
      , value_2 + (count === 2 ? 1 : 0)
    )
  })

  os.wait(function() {
    ee.emit('data', value_1)
    ee.emit('data', value_2)
  })

  assert.equal(count, 1)

  ee.emit('data', value_2 + 1)

  assert.equal(count, 2)

  assert.end()
})

test('`.wait()` sends no event if nothing was emitted', function(assert) {
  var os = new ObjectState()
    , ee = new EE()
    , count = 0

  os.listenOn(ee, 'data', ['value'])

  os.on('data', function() {
    ++count
  })

  os.wait(Function())

  assert.equal(count, 0)
  assert.end()
})

test('does not emit if value is unchanged', function(assert) {
  assert.plan(1)

  var os = new ObjectState
    , ee = new EE
    , count = 0

  os.listenOn(ee, 'data', ['cats'])

  os.on('data', function() {
    ++count
  })

  ee.emit('data', true)
  ee.emit('data', true)

  os.set('cats', true)

  os.write({cats: true})

  os.remove('dogs')

  assert.equal(count, 1)
})

test('makes copy of object on construction and write', function(assert) {
  assert.plan(4)

  var original = {cats: true}
    , written = {cats: false}
    , os = new ObjectState(original)

  // verifies that the state and original do not share a reference,
  // but that they are identical otherwise.
  assert.notEqual(os._state, original)
  assert.deepEqual(os._state, original)

  os.write(written)

  assert.notEqual(os._state, written)
  assert.deepEqual(os._state, written)
})

test('`.state()` returns deep copy of state', function(assert) {
  assert.plan(3)

  var expect = {}
    , inner = {}
    , result
    , os

  expect.inner = inner
  expect.inner.a = Math.random()
  expect.inner.b = [Math.random()]
  os = new ObjectState(expect)
  result = os.state()
  assert.notStrictEqual(result.inner, expect.inner)
  assert.notStrictEqual(result, expect)
  assert.deepEqual(result, expect)
})

test('emits a deep-copy of state', function(assert) {
  assert.plan(5)

  var written = {cats: true}
    , result
    , os

  os = new ObjectState

  os.once('data', function(state) {
    result = state
  })

  os.write(written)

  assert.deepEqual(written, result)
  assert.deepEqual(os._state, result)

  assert.notEqual(written, result)
  assert.notEqual(os._state, written)
  assert.notEqual(result, os._state)
})

test('can nest `.wait()` statements', function(assert) {
  assert.plan(1)

  var os = new ObjectState
    , stream = through()
    , count = 0

  os.listen(stream, 'herp')

  os.on('data', function() {
    ++count
  })

  os.wait(function() {
    os.wait(function() {
      stream.queue('flerp')
      stream.queue('werp')
    })

    stream.queue('herp')
    stream.queue('merp')
  })

  assert.equal(count, 1)
})

test('can set attr via `.set()` method', function(assert) {
  assert.plan(2)

  var os = new ObjectState

  os.once('data', function(state) {
    assert.deepEqual(state, {herp: 'derp'})
  })

  os.set('herp', 'derp')

  os.once('data', function(state) {
    assert.deepEqual(state, {herp: 'derp', derp: {herp: 'flerp'}})
  })

  os.set('derp.herp', 'flerp')
})

test('can get attr via `.get()` method', function(assert) {
  assert.plan(4)

  var os = new ObjectState({a: false, b: '1', d: {hey: 'cats'}})

  assert.equal(os.get('a'), false)
  assert.equal(os.get('b'), '1')
  assert.equal(os.get('c'), undefined)
  assert.equal(os.get('d.hey'), 'cats')
})

test('can remove an attr via `.remove()`', function(assert) {
  assert.plan(4)

  var os = new ObjectState({why: 'yes', no: {sure: 'whynot'}})

  os.once('data', function(state) {
    assert.deepEqual(state, {no: {sure: 'whynot'}})
  })

  os.remove('why')

  assert.ok(!os._state.hasOwnProperty('why'), 'removed the property')

  os.once('data', function(state) {
    assert.deepEqual(state, {no: {}})
  })

  os.remove('no.sure')

  assert.ok(!os._state.no.hasOwnProperty('sure'))
})
