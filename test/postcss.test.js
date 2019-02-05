let Processor = require('../lib/processor')
let postcss = require('../lib/postcss')

let pluginPostcssWillChange = postcss.plugin('postcss-will-change', () => {
  return function (css) {
    css.on('decl', node => {
      if (node.prop !== 'will-change') {
        return
      }

      let already = node.parent.some(i => {
        return i.type === 'decl' && i.prop === 'backface-visibility'
      })

      if (already) {
        return
      }

      node.cloneBefore({
        prop: 'backface-visibility',
        value: 'hidden'
      })
    })
  }
})

let pluginAddPropWillChange = postcss.plugin('add-prop-will-change', () => {
  return function (css) {
    css.on('decl', node => {
      if (node.prop !== 'will-change') {
        return
      }
      let root = node.root()

      root.walkDecls('color', decl => {
        let already = decl.parent.some(i => {
          return i.type === 'decl' && i.prop === 'will-change'
        })

        if (already) {
          return
        }

        decl.cloneBefore({
          prop: 'will-change',
          value: 'transform'
        })
      })
    })
  }
})

let pluginReplaceColor = postcss.plugin('postcss-replace-color', () => {
  return function (css) {
    css.walkDecls('color', decl => {
      decl.value = 'green'
    })
  }
})

it('creates plugins list', () => {
  let processor = postcss()
  expect(processor instanceof Processor).toBeTruthy()
  expect(processor.plugins).toEqual([])
})

it('saves plugins list', () => {
  let a = () => 1
  let b = () => 2
  expect(postcss(a, b).plugins).toEqual([a, b])
})

it('saves plugins list as array', () => {
  let a = () => 1
  let b = () => 2
  expect(postcss([a, b]).plugins).toEqual([a, b])
})

it('takes plugin from other processor', () => {
  let a = () => 1
  let b = () => 2
  let c = () => 3
  let other = postcss([a, b])
  expect(postcss([other, c]).plugins).toEqual([a, b, c])
})

it('supports injecting additional processors at runtime', () => {
  let plugin1 = postcss.plugin('one', () => {
    return css => {
      css.walkDecls(decl => {
        decl.value = 'world'
      })
    }
  })
  let plugin2 = postcss.plugin('two', () => {
    return (css, result) => {
      result.processor.use(plugin1())
    }
  })

  return postcss([plugin2]).process('a{hello: bob}', { from: undefined })
    .then(result => {
      expect(result.css).toEqual('a{hello: world}')
    })
})

it('creates plugin', () => {
  let plugin = postcss.plugin('test', filter => {
    return root => {
      root.walkDecls(filter || 'two', i => i.remove())
    }
  })

  let func1 = postcss(plugin).plugins[0]
  expect(func1.postcssPlugin).toEqual('test')
  expect(func1.postcssVersion).toMatch(/\d+.\d+.\d+/)

  let func2 = postcss(plugin()).plugins[0]
  expect(func2.postcssPlugin).toEqual(func1.postcssPlugin)
  expect(func2.postcssVersion).toEqual(func1.postcssVersion)

  let result1 = postcss(plugin('one')).process('a{ one: 1; two: 2 }')
  expect(result1.css).toEqual('a{ two: 2 }')

  let result2 = postcss(plugin).process('a{ one: 1; two: 2 }')
  expect(result2.css).toEqual('a{ one: 1 }')
})

it('does not call plugin constructor', () => {
  let calls = 0
  let plugin = postcss.plugin('test', () => {
    calls += 1
    return () => { }
  })
  expect(calls).toBe(0)

  postcss(plugin).process('a{}')
  expect(calls).toBe(1)

  postcss(plugin()).process('a{}')
  expect(calls).toBe(2)
})

it('creates a shortcut to process css', () => {
  let plugin = postcss.plugin('test', str => {
    return root => {
      root.walkDecls(i => {
        i.value = str || 'bar'
      })
    }
  })

  let result1 = plugin.process('a{value:foo}')
  expect(result1.css).toEqual('a{value:bar}')

  let result2 = plugin.process('a{value:foo}', { }, 'baz')
  expect(result2.css).toEqual('a{value:baz}')

  return plugin.process('a{value:foo}', { from: 'a' }, 'baz').then(result => {
    expect(result.opts).toEqual({ from: 'a' })
    expect(result.css).toEqual('a{value:baz}')
  })
})

it('contains parser', () => {
  expect(postcss.parse('').type).toEqual('root')
})

it('contains stringifier', () => {
  expect(typeof postcss.stringify).toEqual('function')
})

it('allows to build own CSS', () => {
  let root = postcss.root({ raws: { after: '\n' } })
  let comment = postcss.comment({ text: 'Example' })
  let media = postcss.atRule({ name: 'media', params: 'screen' })
  let rule = postcss.rule({ selector: 'a' })
  let decl = postcss.decl({ prop: 'color', value: 'black' })

  root.append(comment)
  rule.append(decl)
  media.append(rule)
  root.append(media)

  expect(root.toString()).toEqual('/* Example */\n' +
                                  '@media screen {\n' +
                                  '    a {\n' +
                                  '        color: black\n' +
                                  '    }\n' +
                                  '}\n')
})

it('contains vendor module', () => {
  expect(postcss.vendor.prefix('-moz-tab')).toEqual('-moz-')
})

it('contains list module', () => {
  expect(postcss.list.space('a b')).toEqual(['a', 'b'])
})

it('works with null', () => {
  expect(() => {
    postcss([() => true]).process(null).css
  }).toThrowError(/PostCSS received null instead of CSS string/)
})

it('example visitor plugin will-change', () => {
  return postcss([pluginPostcssWillChange])
    .process(
      '@media screen and(min-width: 480 px) {' +
        'body {' +
          'background-color: lightgreen;' +
          'color: red;' +
        '}' +
        '.foo {' +
          'will-change: transform; ' +
        '}' +
      '}' +
      'div {' +
        'color: green;' +
      '}', { from: undefined })
    .then(result => {
      expect(result.css).toEqual(
        '@media screen and(min-width: 480 px) {' +
          'body {' +
            'background-color: lightgreen;' +
            'color: red;' +
          '}' +
          '.foo {' +
            'backface-visibility: hidden;' +
            'will-change: transform; ' +
          '}' +
        '}' +
        'div {' +
          'color: green;' +
        '}')
    })
})
//
// it('example visitor plugin will-change 2', () => {
//   let plugin = postcss.plugin('postcss-will-change', () => {
//     return function (css) {
//       css.on('decl.exit', node => {
//         if (node.prop !== 'will-change') {
//           return
//         }
//
//         let already = node.parent.some(i => {
//           return i.type === 'rule' && i.prop === 'backface-visibility'
//         })
//
//         if (already) {
//           return
//         }
//
//         node.cloneBefore({
//           prop: 'backface-visibility',
//           value: 'hidden'
//         })
//       })
//     }
//   })
//
//   return postcss([plugin]).process(
//     '.a{ backface-visibility: visible; } ' +
//     '.b{ will-change: transform; }', { from: undefined })
//     .then(result => {
//       expect(result.css).toEqual(
//         '.a{ backface-visibility: visible; } ' +
//         '.b{ backface-visibility: hidden; will-change: transform; }'
//       )
//     })
// })
//
// it('example visitor plugin will-change 3', () => {
//   let plugin = postcss.plugin('postcss-will-change', () => {
//     return function (css) {
//       css.on('decl', node => {
//         if (node.prop !== 'will-change') {
//           return
//         }
//
//         let already = node.parent.some(i => {
//           return i.type === 'rule' && i.prop === 'backface-visibility'
//         })
//
//         if (already) {
//           return
//         }
//
//         node.cloneBefore({
//           prop: 'backface-visibility',
//           value: 'hidden'
//         })
//       })
//     }
//   })
//
//   return postcss([plugin]).process(
//     '.a{ backface-visibility: visible; } ' +
//     '.b{ will-change: transform; } ' +
//     '.c{ will-change: transform; }', { from: undefined })
//     .then(result => {
//       expect(result.css).toEqual(
//         '.a{ backface-visibility: visible; } ' +
//         '.b{ backface-visibility: hidden; will-change: transform; } ' +
//         '.c{ backface-visibility: hidden; will-change: transform; }'
//       )
//     })
// })

it('example pluginReplaceColor', () => {
  return postcss([pluginReplaceColor]).process(
    '.a{ color: red; } ' +
    '.b{ will-change: transform; }', { from: undefined })
    .then(result => {
      expect(result.css).toEqual(
        '.a{ color: green; } ' +
        '.b{ will-change: transform; }'
      )
    })
})

it('example visitor plugin add-prop', () => {
  return postcss([pluginAddPropWillChange]).process(
    '.a{ color: red; } ' +
    '.b{ will-change: transform; }', { from: undefined })
    .then(result => {
      expect(result.css).toEqual(
        '.a{ will-change: transform; color: red; } ' +
        '.b{ will-change: transform; }'
      )
    })
})

it('example visitor plugin will-change 4', () => {
  return postcss([pluginPostcssWillChange, pluginAddPropWillChange]).process(
    '.a{ ' +
      'color: red; ' +
    '} ' +
    '.b{ will-change: transform; }', { from: undefined })
    .then(result => {
      expect(result.css).toEqual(
        '.a{ ' +
          'backface-visibility: hidden; ' +
          'will-change: transform; ' +
          'color: red; ' +
        '} ' +
        '.b{ backface-visibility: hidden; will-change: transform; }'
      )
    })
})

it('example visitor plugin 3', () => {
  return postcss([
    pluginReplaceColor,
    pluginPostcssWillChange,
    pluginAddPropWillChange]
  ).process(
    '.a{ ' +
      'color: red; ' +
    '} ' +
    '.b{ will-change: transform; }', { from: undefined })
    .then(result => {
      expect(result.css).toEqual(
        '.a{ ' +
          'backface-visibility: hidden; ' +
          'will-change: transform; ' +
          'color: green; ' +
        '} ' +
        '.b{ backface-visibility: hidden; will-change: transform; }'
      )
    })
})
