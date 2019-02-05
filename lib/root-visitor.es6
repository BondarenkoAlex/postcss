import Container from './container'

function isString (obj) {
  return typeof obj === 'string' ||
    (!!obj && typeof obj === 'object' && obj.constructor === String)
}

let isVisitorMode = Symbol('isVisitorMode')
let listeners = Symbol('listeners')

class RootVisitor extends Container {
  constructor (defaults) {
    super(defaults)
    this[isVisitorMode] = false // режим работы
    this[listeners] = {}
  }

  get isVisitorMode () {
    return this[isVisitorMode]
  }

  set isVisitorMode (value) {
    this[isVisitorMode] = value
  }

  get listeners () {
    return this[listeners]
  }

  set listeners (value) {
    this[listeners] = value
  }

  on (typeNode, cb) {
    /*
    css.on("decl", (node) => {})  or  css.on("decl.enter", (node) => {})
    css.on("rule.exit", (node) => {})
     */
    this.validateNameTypeNode(typeNode)
    let plugin = this.normalizeVisitorPlugin(typeNode, cb)
    this.updateVisitorPlugins(plugin)
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

  updateVisitorPlugins (plugin) {
    let type = Object.keys(plugin).pop()
    let eventName = Object.keys(plugin[type]).pop()
    let cb = plugin[type][eventName]

    let visitorPlugins = this.listeners
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
}

export default RootVisitor
