// Copyright 2014 Urban Airship and Contributors

var EE = require('events').EventEmitter

var through = require('through')
  , test = require('tape')

var objectState = require('./')

test('is a function', function(assert) {
  assert.equal(typeof objectState, 'function')
  assert.end()
})

test('is a readable stream', function(assert) {
  assert.plan(1)

  var ws = through(write)
    , ee = new EE

  function write(obj) {
    assert.deepEqual(obj, {salutation: 'sup'})
  }

  var os = objectState()

  os.pipe(ws)

  os.listenOn(ee, 'data', ['salutation'])

  ee.emit('data', 'sup')
})

test('can write to object state', function(assert) {
  assert.plan(1)

  var os = objectState()
  var testState = {cats: true}

  os.on('data', function(state) {
    assert.deepEqual(state, testState)
  })

  os.write(testState)
})

test('is a writable stream', function(assert) {
  assert.plan(1)

  var os = objectState()
  var stream = through()
  var testState = {cats: true}

  stream.pipe(os)

  os.on('data', function(state) {
    assert.deepEqual(state, testState)
  })

  stream.queue(testState)
})

test('`.emitState()` emits current state', function(assert) {
  assert.plan(1)

  var os = objectState({cats: true})

  os.on('data', function(state) {
    assert.deepEqual(state, {cats: true})
  })

  os.emitState()
})

test('`.listen()` listens to streams for attributes', function(assert) {
  assert.plan(3)

  var stream = through()
    , os = objectState()
    , otherStream = through()

  var cats = ['top cat', 'smarf']
    , dogs = ['droopy d']

  os.once('data', function(state) {
    assert.deepEqual(state, {cats: cats})
  })

  os.listen(stream, 'cats')

  stream.queue(cats)

  os.once('data', function(state) {
    assert.deepEqual(state, {cats: cats, dogs: dogs})
  })

  os.listen(otherStream, 'dogs')

  otherStream.queue(dogs)

  otherStream.end()

  os.once('data', function(state) {
    assert.deepEqual(state, {cats: cats, dogs: dogs})
  })

  os.emitState()
})

test('`.listenOn()` maps emitted values to parameters', function(assert) {
  assert.plan(2)

  var eeOne = new EE()
    , eeTwo = new EE()

  var os = objectState()

  os.listenOn(eeOne, 'data', [
      'hat'
    , 'bat'
    , 'cat'
  ])
  os.listenOn(eeTwo, 'data', [
      'rat'
    , null
    , 'cat'
  ])

  os.once('data', function(state) {
    assert.deepEqual(state, {
        hat: 1
      , bat: 2
      , cat: 3
    })
  })

  eeOne.emit('data', 1, 2, 3)

  os.once('data', function(state) {
    assert.deepEqual(state, {
        rat: 4
      , hat: 1
      , bat: 2
    })
  })

  eeTwo.emit('data', 4, 5, undefined)
})

test('`.wait()` will hold events within given function', function(assert) {
  var value2 = Math.random() + 10
    , value1 = Math.random()
    , os = objectState()
    , ee = new EE()
    , count = 0

  os.listenOn(ee, 'data', ['value'])

  os.on('data', function(state) {
    ++count
    assert.equal(
        state.value
      , value2 + (count === 2 ? 1 : 0)
    )
  })

  os.wait(function() {
    ee.emit('data', value1)
    ee.emit('data', value2)
  })

  assert.equal(count, 1)

  ee.emit('data', value2 + 1)

  assert.equal(count, 2)

  assert.end()
})

test('`.wait()` sends no event if nothing was emitted', function(assert) {
  var os = objectState()
    , ee = new EE()
    , count = 0

  os.listenOn(ee, 'data', ['value'])

  os.on('data', function() {
    ++count
  })

  os.wait(noop)

  assert.equal(count, 0)
  assert.end()
})

test('does not emit if value is unchanged', function(assert) {
  assert.plan(1)

  var os = objectState()
    , ee = new EE
    , count = 0

  os.listen(ee, 'cats')

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

test('always emits copies', function(assert) {
  assert.plan(4)

  var original = {cats: true}
    , written = {cats: false}

  var os = objectState(original)

  os.once('data', function(state) {
    // verifies that the state and original do not share a reference,
    // but that they are identical otherwise.
    assert.notEqual(state, original)
    assert.deepEqual(state, original)
  })

  os.emitState()

  os.once('data', function(state) {
    assert.notEqual(state, written)
    assert.deepEqual(state, written)
  })

  os.write(written)
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
  os = objectState(expect)
  result = os.state()
  assert.notEqual(result.inner, expect.inner)
  assert.notEqual(result, expect)
  assert.deepEqual(result, expect)
})

test('emits a deep-copy of state', function(assert) {
  assert.plan(4)

  var original = {cats: true}
    , result2
    , result
    , os

  os = objectState(original)

  os.once('data', function(state) {
    result = state
  })

  os.emitState()

  assert.deepEqual(original, result)
  assert.notEqual(original, result)

  os.once('data', function(state) {
    result2 = state
  })

  os.emitState()

  assert.deepEqual(result, result2)
  assert.notEqual(result, result2)
})

test('deep copies on write', function(assert) {
  assert.plan(2)

  var written = {cats: {hats: true}}
    , os = objectState()

  os.write(written)

  os.set('cats.hats', false)

  assert.equal(written.cats.hats, true)
  assert.equal(os.get('cats.hats'), false)
})

test('can nest `.wait()` statements', function(assert) {
  assert.plan(1)

  var os = objectState()
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

  var os = objectState()

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

  var os = objectState({a: false, b: '1', d: {hey: 'cats'}})

  assert.equal(os.get('a'), false)
  assert.equal(os.get('b'), '1')
  assert.equal(os.get('c'), undefined)
  assert.equal(os.get('d.hey'), 'cats')
})

test('can remove an attr via `.remove()`', function(assert) {
  assert.plan(2)

  var os = objectState({why: 'yes', no: {sure: 'whynot'}})

  os.once('data', function(state) {
    assert.deepEqual(state, {no: {sure: 'whynot'}})
  })

  os.remove('why')

  os.once('data', function(state) {
    assert.deepEqual(state, {no: {}})
  })

  os.remove('no.sure')
})

function noop() {
  // no-op
}
