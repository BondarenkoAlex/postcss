let isComplete = Symbol('isComplete')
let isDirty = Symbol('isDirty')
// let isVisitorMode = Symbol('isVisitorMode')
// isVisitorMode = false
// let listeners = Symbol('listeners')
// listeners = {}

class Visitor {
  constructor () {
    this[isComplete] = false // признак того, что завершен обхода узла
    this[isDirty] = true // признак того, что узел грязный и его надо обойти
  }

  /**
   * Маркеруем узел "обойденным"
   * @return {undefined}
   */
  markComplete () {
    this[isComplete] = true
  }

  /**
   * @description Маркеруем узел грязным
   * @return {undefined}
   */
  markDirty () {
    this[isDirty] = false
  }

  /**
   * Проверка узла на "грязность"
   * @return {boolean} Истина, если узел грязный
   */
  get isDirty () {
    return this[isDirty]
  }

  // /**
  //  * Проверка AST дерева на режим обхода в режиме "посетитель"
  //  * @private
  //  * @return {boolean} Истина, если режим обхода "посетитель"
  //  */
  // isVisitorModeRoot () {
  //   let root = this.root()
  //   return root.isVisitorMode
  // }

  /**
   * Сброс узла до значения по умолчанию (на "грязный")
   * @private
   * @return {undefined}
   */
  resetNodeWalk () {
    let root = this.root && this.root()
    if (root.isVisitorMode === false) {
      return
    }

    this[isDirty] = true

    if (this[isComplete]) {
      this[isComplete] = false

      if (this.parent) {
        this.parent.resetNodeWalk()
      }
    }
  }
}

export default Visitor
