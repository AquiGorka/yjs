import Type from '../Struct/Type.js'
import Item from '../Struct/Item.js'
import ItemJSON from '../Struct/ItemJSON.js'
import { logID } from '../MessageHandler/messageToString.js'
import YEvent from '../Util/YEvent.js'

class YMapEvent extends YEvent {
  constructor (ymap, subs, remote) {
    super(ymap)
    this.keysChanged = subs
    this.remote = remote
  }
}

export default class YMap extends Type {
  _callObserver (transaction, parentSubs, remote) {
    this._callEventHandler(transaction, new YMapEvent(this, parentSubs, remote))
  }
  toJSON () {
    const map = {}
    for (let [key, item] of this._map) {
      if (!item._deleted) {
        let res
        if (item instanceof Type) {
          if (item.toJSON !== undefined) {
            res = item.toJSON()
          } else {
            res = item.toString()
          }
        } else {
          res = item._content[0]
        }
        map[key] = res
      }
    }
    return map
  }
  keys () {
    let keys = []
    for (let [key, value] of this._map) {
      if (!value._deleted) {
        keys.push(key)
      }
    }
    return keys
  }
  delete (key) {
    this._transact((y) => {
      let c = this._map.get(key)
      if (y !== null && c !== undefined) {
        c._delete(y)
      }
    })
  }
  set (key, value) {
    this._transact(y => {
      const old = this._map.get(key) || null
      if (old !== null) {
        if (old.constructor === ItemJSON && !old._deleted && old._content[0] === value) {
          // Trying to overwrite with same value
          // break here
          return value
        }
        if (y !== null) {
          old._delete(y)
        }
      }
      let v
      if (typeof value === 'function') {
        v = new value() // eslint-disable-line new-cap
        value = v
      } else if (value instanceof Item) {
        v = value
      } else {
        v = new ItemJSON()
        v._content = [value]
      }
      v._right = old
      v._right_origin = old
      v._parent = this
      v._parentSub = key
      if (y !== null) {
        v._integrate(y)
      } else {
        this._map.set(key, v)
      }
    })
    return value
  }
  get (key) {
    let v = this._map.get(key)
    if (v === undefined || v._deleted) {
      return undefined
    }
    if (v instanceof Type) {
      return v
    } else {
      return v._content[v._content.length - 1]
    }
  }
  has (key) {
    let v = this._map.get(key)
    if (v === undefined || v._deleted) {
      return false
    } else {
      return true
    }
  }
  _logString () {
    const left = this._left !== null ? this._left._lastId : null
    const origin = this._origin !== null ? this._origin._lastId : null
    return `YMap(id:${logID(this._id)},mapSize:${this._map.size},left:${logID(left)},origin:${logID(origin)},right:${logID(this._right)},parent:${logID(this._parent)},parentSub:${this._parentSub})`
  }
}
