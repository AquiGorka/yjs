import Item from './Item.js'
import EventHandler from '../Util/EventHandler.js'
import ID from '../Util/ID.js'

// restructure children as if they were inserted one after another
function integrateChildren (y, start) {
  let right
  do {
    right = start._right
    start._right = null
    start._right_origin = null
    start._origin = start._left
    start._integrate(y)
    start = right
  } while (right !== null)
}

export function getListItemIDByPosition (type, i) {
  let pos = 0
  let n = type._start
  while (n !== null) {
    if (!n._deleted) {
      if (pos <= i && i < pos + n._length) {
        const id = n._id
        return new ID(id.user, id.clock + i - pos)
      }
      pos++
    }
    n = n._right
  }
}

export default class Type extends Item {
  constructor () {
    super()
    this._map = new Map()
    this._start = null
    this._y = null
    this._eventHandler = new EventHandler()
    this._deepEventHandler = new EventHandler()
  }
  getPathTo (type) {
    if (type === this) {
      return []
    }
    const path = []
    const y = this._y
    while (type._parent !== this && this._parent !== y) {
      let parent = type._parent
      if (type._parentSub !== null) {
        path.push(type._parentSub)
      } else {
        // parent is array-ish
        for (let [i, child] of parent) {
          if (child === type) {
            path.push(i)
            break
          }
        }
      }
      type = parent
    }
    if (this._parent !== this) {
      throw new Error('The type is not a child of this node')
    }
    return path
  }
  _callEventHandler (transaction, event) {
    const changedParentTypes = transaction.changedParentTypes
    this._eventHandler.callEventListeners(transaction, event)
    let type = this
    while (type !== this._y) {
      let events = changedParentTypes.get(type)
      if (events === undefined) {
        events = []
        changedParentTypes.set(type, events)
      }
      events.push(event)
      type = type._parent
    }
  }
  _transact (f) {
    const y = this._y
    if (y !== null) {
      y.transact(f)
    } else {
      f(y)
    }
  }
  observe (f) {
    this._eventHandler.addEventListener(f)
  }
  observeDeep (f) {
    this._deepEventHandler.addEventListener(f)
  }
  unobserve (f) {
    this._eventHandler.removeEventListener(f)
  }
  unobserveDeep (f) {
    this._deepEventHandler.removeEventListener(f)
  }
  _integrate (y) {
    super._integrate(y)
    this._y = y
    // when integrating children we must make sure to
    // integrate start
    const start = this._start
    if (start !== null) {
      this._start = null
      integrateChildren(y, start)
    }
    // integrate map children
    const map = this._map
    this._map = new Map()
    for (let t of map.values()) {
      // TODO make sure that right elements are deleted!
      integrateChildren(y, t)
    }
  }
  _delete (y, createDelete) {
    super._delete(y, createDelete)
    y._transaction.changedTypes.delete(this)
    // delete map types
    for (let value of this._map.values()) {
      if (value instanceof Item && !value._deleted) {
        value._delete(y, false)
      }
    }
    // delete array types
    let t = this._start
    while (t !== null) {
      if (!t._deleted) {
        t._delete(y, false)
      }
      t = t._right
    }
  }
}
