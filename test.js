// Copyright 2014 Urban Airship and Contributors

var EE = require('events').EventEmitter

var ObjectState = require('./')

var through = require('through')
  , test = require('tape')

test('ObjectState is a function', function(assert) {
  assert.equal(typeof ObjectState, 'function')
  assert.end()
})

test('ObjectState is a readable stream', function(assert) {
  var os = new ObjectState()

  assert.ok('emit' in os)
  assert.ok('on' in os)
  assert.end()
})

test('Can pipe object state', function(assert) {
  var ws = new through(write)
    , ee = new EE

  function write(obj) {
    assert.deepEqual(obj, {'salutation': 'sup'})
    assert.end()
  }

  var os = new ObjectState()

  os.pipe(ws)

  os.listen(ee, 'data', ['salutation'])

  ee.emit('data', 'sup')
})

test('Can write to object state', function(assert) {
  var os = new ObjectState
  var test_state = {cats: true}

  os.on('data', function(state) {
    assert.deepEqual(state, test_state)
    assert.deepEqual(os.state, test_state)
    assert.end()
  })

  os.write(test_state)
})

test('Is a writable stream', function(assert) {
  var os = new ObjectState
  var stream = through()
  var test_state = {cats: true}

  stream.pipe(os)

  os.on('data', function(state) {
    assert.deepEqual(state, test_state)
    assert.deepEqual(os.state, test_state)
    assert.end()
  })

  stream.queue(test_state)
})

test('os.emitState emits current state', function(assert) {
  var os = new ObjectState({cats: true})

  os.on('data', function(state) {
    assert.deepEqual(state, {cats: true})
    assert.end()
  })

  os.emitState()
})

test('ObjectState maps events from emitters to context', function(assert) {
  var ee_one = new EE()
    , ee_two = new EE()

  var os = new ObjectState()

  os.listen(ee_one, 'data', [
      'hat'
    , 'bat'
    , 'cat'
  ])
  os.listen(ee_two, 'data', [
      'rat'
    , null
    , 'cat'
  ])

  ee_one.emit('dne', Math.random())

  assert.deepEqual(os.state, {})

  ee_one.emit('data', 1, 2, 3)

  assert.deepEqual(os.state, {
      hat: 1
    , bat: 2
    , cat: 3
  })

  ee_two.emit('data', 4, 5, undefined)

  assert.deepEqual(os.state, {
      rat: 4
    , hat: 1
    , bat: 2
  })

  assert.end()
})

test('wait will quelch events executed inside of the block', function(assert) {
  var value_2 = Math.random() + 10
    , value_1 = Math.random()
    , os = new ObjectState()
    , ee = new EE()
    , count = 0

  os.listen(ee, 'data', ['value'])

  os.on('data', function(state) {
    ++count
    assert.equal(state.value, value_2)
  })

  os.wait(function() {
    ee.emit('data', value_1)
    ee.emit('data', value_2)
  })

  assert.equal(count, 1)

  ee.emit('data', value_2)

  assert.equal(count, 2)

  assert.end()
})

test('wait will not send an event if none were emitted', function(assert) {
  var os = new ObjectState()
    , ee = new EE()
    , count = 0

  os.listen(ee, 'data', ['value'])

  os.on('data', function(state) {
    ++count
  })

  os.wait(function() {

  })

  assert.equal(count, 0)
  assert.end()
})

test('deepcopy creates deep copy of state', function(assert) {
  var expect = {}
    , inner = {}
    , result
    , os

  expect.inner = inner
  expect.inner.a = Math.random()
  expect.inner.b = [Math.random()]
  os = new ObjectState(expect)
  result = os.deepcopy()
  assert.notStrictEqual(result.inner, expect.inner)
  assert.notStrictEqual(result, expect)
  assert.deepEqual(result, expect)
  assert.end()
})

test('copy creates shallow copy of state', function(assert) {
  var expect = {}
    , inner = {}
    , result
    , os

  expect.inner = inner
  expect.inner.a = Math.random()
  expect.inner.b = [Math.random()]
  os = new ObjectState(expect)
  result = os.copy()
  assert.notStrictEqual(result, expect)
  assert.equal(result.inner, expect.inner)
  assert.deepEqual(result, expect)
  assert.end()
})

test('snapshot resets state', function(assert) {
  var os = new ObjectState()
    , ee = new EE()
    , count = 0
    , expect_0
    , expect_1
    , restore

  os.on('data', function() {
    ++count
  })

  expect_0 = Math.random()
  expect_1 = expect_0 + 1
  os.listen(ee, 'data', ['value'])
  ee.emit('data', expect_0)
  assert.equal(os.state.value, expect_0)
  restore = os.snapshot()
  ee.emit('data', expect_1)
  assert.equal(os.state.value, expect_1)
  restore()
  assert.equal(os.state.value, expect_0)
  assert.equal(count, 3)
  assert.end()
})

test('include returns other instance of OS', function(assert) {
  var os_one = new ObjectState()
    , os_two = new ObjectState()

  assert.equal(os_one.include(os_two), os_two)
  assert.end()
})

test('include puts os_b\'s properties on os_a; chains', function(assert) {
  var os_a = new ObjectState()
    , os_b = new ObjectState()
    , os_c = new ObjectState()
    , ee = new EE()

  os_a.include(os_b).include(os_c)
  os_c.listen(ee, 'foo', ['c'])
  os_b.listen(ee, 'foo', ['b'])
  os_a.listen(ee, 'boo', ['a'])
  ee.emit('boo', 2)
  assert.equal(os_a.state.a, 2)
  assert.equal(os_a.state.b, undefined)
  assert.equal(os_a.state.c, undefined)
  assert.equal(os_b.state.a, undefined)
  assert.equal(os_b.state.b, undefined)
  assert.equal(os_b.state.c, undefined)
  assert.equal(os_c.state.a, undefined)
  assert.equal(os_c.state.b, undefined)
  assert.equal(os_c.state.c, undefined)
  ee.emit('foo', 3)
  assert.equal(os_a.state.a, 2)
  assert.equal(os_a.state.b, 3)
  assert.equal(os_a.state.c, 3)
  assert.equal(os_b.state.a, undefined)
  assert.equal(os_b.state.b, 3)
  assert.equal(os_b.state.c, 3)
  assert.equal(os_c.state.a, undefined)
  assert.equal(os_c.state.b, undefined)
  assert.equal(os_c.state.c, 3)
  assert.end()
})

test('can set attr via `.set` method', function(assert) {
  assert.plan(1)

  var os = new ObjectState()

  os.on('data', function(state) {
    assert.deepEqual(state, {herp: 'derp'})
  })

  os.set('herp', 'derp')
})

test('can get attr vi `.get` method', function(assert) {
  assert.plan(3)

  var os = new ObjectState({a: false, b: '1'})

  assert.equal(os.get('a'), false)
  assert.equal(os.get('b'), '1')
  assert.equal(os.get('c'), undefined)
})

test('can remove an attr from object state', function(assert) {
  assert.plan(3)

  var os = new ObjectState({'why': 'yes'})

  os.on('delete-key', function(key) {
    assert.equal(key, 'why')
  })

  os.on('data', function(state) {
    assert.deepEqual(state, {})
  })

  os.remove('why')

  assert.ok(!os.state.hasOwnProperty('why'), 'removed the property')
})
