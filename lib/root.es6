import Container from './container'
import { isVisitorMode, listeners } from './symbols'

function isString (obj) {
  return typeof obj === 'string' ||
    (!!obj && typeof obj === 'object' && obj.constructor === String)
}

function validateNameTypeNode (typeNode) {
  let type = typeNode

  if (!isString(type)) {
    throw new Error('typeNode must be a string')
  }

  let arr = type.split('.')
  if (arr.length === 2) {
    if (arr[1] !== 'enter' && arr[1] !== 'exit') {
      throw new Error(
        'The plugin must subscribe to either the enter or exit node')
    }
  } else if (arr.length > 2) {
    throw new Error('The plugin must subscribe ' +
      'to either the enter or exit node')
  }
}

/* General view of node type names */
function normalizeVisitorPlugin (typeNode, callback = () => {}) {
  // typeNode have view "decl" or "decl.exit" or "decl.enter"
  // return { decl: {enter: cb}}
  let type = typeNode
  if (!type.includes('.')) {
    type = `${ type }.enter`
  }

  type = type.toLowerCase()

  let arr = type.split('.')
  return ({
    [arr[0]]: {
      [arr[1]]: callback
    }
  })
}

function buildVisitorObject (plugin, listenersForUpdate) {
  let type = Object.keys(plugin).pop()
  let eventName = Object.keys(plugin[type]).pop()
  let cb = plugin[type][eventName]

  let visitorPlugins = listenersForUpdate
  let eventByType = visitorPlugins[type] || {}
  let callbacksByEvent = eventByType[eventName] || []

  return ({
    ...visitorPlugins,
    [type]: {
      ...eventByType,
      [eventName]: [
        ...callbacksByEvent,
        cb
      ]
    }
  })
}

/**
 * Represents a CSS file and contains all its parsed nodes.
 *
 * @extends Container
 *
 * @example
 * const root = postcss.parse('a{color:black} b{z-index:2}')
 * root.type         //=> 'root'
 * root.nodes.length //=> 2
 */
class Root extends Container {
  constructor (defaults) {
    super(defaults)
    this.type = 'root'
    this[isVisitorMode] = false // mode work
    this[listeners] = {}

    if (!this.nodes) this.nodes = []
  }

  removeChild (child, ignore) {
    let index = this.index(child)

    if (!ignore && index === 0 && this.nodes.length > 1) {
      this.nodes[1].raws.before = this.nodes[index].raws.before
    }

    return super.removeChild(child)
  }

  normalize (child, sample, type) {
    let nodes = super.normalize(child)

    if (sample) {
      if (type === 'prepend') {
        if (this.nodes.length > 1) {
          sample.raws.before = this.nodes[1].raws.before
        } else {
          delete sample.raws.before
        }
      } else if (this.first !== sample) {
        for (let node of nodes) {
          node.raws.before = sample.raws.before
        }
      }
    }

    return nodes
  }

  /**
   * Returns a {@link Result} instance representing the root’s CSS.
   *
   * @param {processOptions} [opts] Options with only `to` and `map` keys.
   *
   * @return {Result} Result with current root’s CSS.
   *
   * @example
   * const root1 = postcss.parse(css1, { from: 'a.css' })
   * const root2 = postcss.parse(css2, { from: 'b.css' })
   * root1.append(root2)
   * const result = root1.toResult({ to: 'all.css', map: true })
   */
  toResult (opts = { }) {
    let LazyResult = require('./lazy-result')
    let Processor = require('./processor')

    let lazy = new LazyResult(new Processor(), this, opts)
    return lazy.stringify()
  }

  /**
   * The method registrations the plugins in postcss to their bypass with
   * algorithm visitor. The plugin must subscribes to the type of the node.
   * It can be "atrule", "rule", "decl", "comment". Example: "atrule" is
   * "@media", "@keyframes"; "rule" is selector (class, id, tag); "decl" is
   * property (color, border, etc.); "comment" is comment. The plugin will
   * call on the type of the node to which it is subscribed. The plugin can
   * be subscribed at the enter to node or at the exit from node. The plugin get
   * node and index.
   *
   * @param {string} [type] The type of the node ("atrule", "rule",
   * "decl", "comment").
   * @param {function} [callback] Function receives node and index.
   *
   * @return {undefined}
   *
   * @example
   * css.on("decl", (node, index) => {})
   * // is shorthand for
   * css.on("decl.enter", (node, index) => {})
   *
   * css.on("decl.exit", (node, index) => {})
   */
  on (type, callback) {
    validateNameTypeNode(type)
    let plugin = normalizeVisitorPlugin(type, callback)
    this[listeners] = buildVisitorObject(plugin, this[listeners])
  }

  /**
   * @memberof Root#
   * @member {object} raws Information to generate byte-to-byte equal
   *                       node string as it was in the origin input.
   *
   * Every parser saves its own properties,
   * but the default CSS parser uses:
   *
   * * `after`: the space symbols after the last child to the end of file.
   * * `semicolon`: is the last child has an (optional) semicolon.
   *
   * @example
   * postcss.parse('a {}\n').raws //=> { after: '\n' }
   * postcss.parse('a {}').raws   //=> { after: '' }
   */
}

export default Root
