import Container from './container'

function isString (obj) {
  return typeof obj === 'string' ||
    (!!obj && typeof obj === 'object' && obj.constructor === String)
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
    this.isVisitorMode = false // режим работы
    if (!this.nodes) this.nodes = []
    if (!this.listeners) this.listeners = {}
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

  on (typeNode, cb) {
    /*
    css.on("decl", (node) => {})  or  css.on("decl.enter", (node) => {})
    css.on("rule.exit", (node) => {})
     */
    this.validateNameTypeNode(typeNode)
    let listener = this.normalizeVisitorPlugin(typeNode, cb)
    this.updateVisitorPlugins(listener)
  }

  // todo сделать проверку на тип узла

  validateNameTypeNode (typeNode) {
    let type = typeNode
    if (!isString(type)) {
      throw new Error('typeNode должен быть строкой')
    }
    let arr = type.split('.')
    if (arr.length === 2) {
      if (arr[1] !== 'enter' && arr[1] !== 'exit') {
        throw new Error(
          'Плагин должен подписаться или на enter или на exit узла')
      }
    } else if (arr.length > 2) {
      throw new Error('Плагин должен подписаться или на enter или на exit узла')
    }
  }

  /* Приведение к общему виду имен типа узла */
  normalizeVisitorPlugin (typeNode, cb = function () {}) {
    // typeNode имеет вид "decl" или "decl.exit" или "decl.enter"
    // return { decl: {enter: cb}}
    let type = typeNode
    if (!type.includes('.')) {
      type = `${ type }.enter`
    }

    let arr = type.split('.')
    return ({
      [arr[0]]: {
        [arr[1]]: cb
      }
    })
  }

  updateVisitorPlugins (listeners) {
    let type = Object.keys(listeners).pop()
    let eventName = Object.keys(listeners[type]).pop()
    let cb = listeners[type][eventName]

    let visitorPlugins = this.listeners || {}
    let eventByType = visitorPlugins[type] || {}
    let callbacksByEvent = eventByType[eventName] || []

    this.listeners = {
      ...visitorPlugins,
      [type]: {
        ...eventByType,
        [eventName]: [
          ...callbacksByEvent,
          cb
        ]
      }
    }
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
