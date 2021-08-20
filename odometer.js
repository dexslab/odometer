/**
 * ES6 code for modern browsers!
 */
const VALUE_HTML = '<span class="odometer-value"></span>'
const RIBBON_HTML =
  '<span class="odometer-ribbon"><span class="odometer-ribbon-inner">' +
  VALUE_HTML +
  '</span></span>'
const DIGIT_HTML =
  '<span class="odometer-digit"><span class="odometer-digit-spacer">8</span><span class="odometer-digit-inner">' +
  RIBBON_HTML +
  '</span></span>'
const FORMAT_MARK_HTML = '<span class="odometer-formatting-mark"></span>'

// The bit within the parenthesis will be repeated, so (,ddd) becomes 123,456,789....
//
// If your locale uses spaces to seperate digits, you could consider using a
// Narrow No-Break Space ( ), as it's a bit more correct.
//
// Numbers will be rounded to the number of digits after the radix seperator.
//
// When values are set using `.update` or the `.innerHTML`-type attributes,
// strings are assumed to already be in the locale's format.
//
// This is just the default, it can also be set as options.format.
const DIGIT_FORMAT = '(,ddd).dd'

// Minimum length (number of digits) of the integer-part of the number
const MIN_INTEGER_LEN = 0

const FORMAT_PARSER = /^\(?([^)]*)\)?(?:(.)(D*)(d*))?$/

// What is our target framerate?
const FRAMERATE = 30

// How long will the animation last?
const DURATION = 2000

// What is the fastest we should update values when we are
// counting up (not using the wheel animation).
const COUNT_FRAMERATE = 20

// What is the minimum number of frames for each value on the wheel?
// We won't render more values than could be reasonably seen
const FRAMES_PER_VALUE = 2

// If more than one digit is hitting the frame limit, they would all get
// capped at that limit and appear to be moving at the same rate.  This
// factor adds a boost to subsequent digits to make them appear faster.
const DIGIT_SPEEDBOOST = 0.5

const MS_PER_FRAME = 1000 / FRAMERATE
const COUNT_MS_PER_FRAME = 1000 / COUNT_FRAMERATE

const TRANSITION_END_EVENTS =
  'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd'

const createFromHTML = (html) => {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.children[0]
}

const removeClass = (el, ...classes) => {
  return el.classList.remove(...classes)
}

const addClass = (el, ...classes) => {
  removeClass(el, ...classes)
  return el.classList.add(...classes)
}

const trigger = (el, name) => {
  return el.dispatchEvent(
    new CustomEvent(name, { bubbles: true, cancelable: true })
  )
}

const now = () => window.performance.now()

const round = (val, precision = 0) => {
  if (!precision) {
    return Math.round(val)
  }

  val *= Math.pow(10, precision)
  val += 0.5
  val = Math.floor(val)
  return val / Math.pow(10, precision)
}

const truncate = (val) => {
  // | 0 fails on numbers greater than 2^32
  if (val < 0) {
    return Math.ceil(val)
  } else {
    return Math.floor(val)
  }
}

class Odometer {
  constructor(options) {
    this.options = options
    this.el = this.options.el
    if (this.el.odometer) {
      return this.el.odometer
    }

    this.el.odometer = this

    for (let k in Odometer.options) {
      const v = Odometer.options[k]
      if (this.options[k] == null) {
        this.options[k] = v
      }
    }

    if (this.options.duration == null) {
      this.options.duration = DURATION
    }
    this.MAX_VALUES =
      (this.options.duration / MS_PER_FRAME / FRAMES_PER_VALUE) | 0

    this.resetFormat()

    this.value = this.cleanValue(
      this.options.value != null ? this.options.value : ''
    )

    this.renderInside()
    this.render()

    try {
      for (let property of ['innerHTML', 'innerText', 'textContent']) {
        if (this.el[property] != null) {
          ;((property) => {
            return Object.defineProperty(this.el, property, {
              get: () => {
                if (property === 'innerHTML') {
                  return this.inside.outerHTML
                } else {
                  // It's just a single HTML element, so innerText is the
                  // same as outerText.
                  return this.inside.innerText != null
                    ? this.inside.innerText
                    : this.inside.textContent
                }
              },
              set: (val) => {
                return this.update(val)
              },
            })
          })(property)
        }
      }
    } catch (e) {
      // Safari
      this.watchForMutations()
    }
  }

  static init() {
    const elements = document.querySelectorAll(
      Odometer.options.selector || '.odometer'
    )
    return Array.from(elements).map(
      (el) =>
        (el.odometer = new Odometer({
          el,
          value: el.innerText != null ? el.innerText : el.textContent,
        }))
    )
  }

  renderInside() {
    this.inside = document.createElement('div')
    this.inside.className = 'odometer-inside'
    this.el.innerHTML = ''
    return this.el.appendChild(this.inside)
  }

  watchForMutations() {
    // Safari doesn't allow us to wrap .innerHTML, so we listen for it
    // changing.
    try {
      if (!this.observer) {
        this.observer = new MutationObserver((mutations) => {
          const newVal = this.el.innerText

          this.renderInside()
          this.render(this.value)
          return this.update(newVal)
        })
      }

      this.watchMutations = true
      return this.startWatchingMutations()
    } catch (e) {}
  }

  startWatchingMutations() {
    if (this.watchMutations) {
      return this.observer.observe(this.el, { childList: true })
    }
  }

  stopWatchingMutations() {
    return this.observer && this.observer.disconnect()
  }

  cleanValue(val) {
    if (typeof val === 'string') {
      // We need to normalize the format so we can properly turn it into
      // a float.
      val = val.replace(this.format.radix || '.', '<radix>')
      val = val.replace(/[.,]/g, '')
      val = val.replace('<radix>', '.')
      val = parseFloat(val, 10) || 0
    }

    return round(val, this.format.precision)
  }

  bindTransitionEnd() {
    if (this.transitionEndBound) {
      return
    }
    this.transitionEndBound = true

    // The event will be triggered once for each ribbon, we only
    // want one render though
    let renderEnqueued = false
    return TRANSITION_END_EVENTS.split(' ').map((event) =>
      this.el.addEventListener(event, () => {
        if (renderEnqueued) {
          return true
        }

        renderEnqueued = true

        setTimeout(() => {
          this.render()
          renderEnqueued = false

          return trigger(this.el, 'odometerdone')
        }, 0)

        return true
      })
    )
  }

  resetFormat() {
    let format = this.options.format || DIGIT_FORMAT
    if (!format) {
      format = 'd'
    }

    const parsed = FORMAT_PARSER.exec(format)
    if (!parsed) {
      throw new Error('Odometer: Unparsable digit format')
    }

    const [repeating, radix, fractional1, fractional2] = parsed.slice(1, 5)

    let fractional = fractional1 ? fractional1.length : 0

    const precision = fractional + (fractional2 ? fractional2.length : 0)

    return (this.format = { repeating, radix, precision, fractional })
  }

  render(value = this.value) {
    this.stopWatchingMutations()
    this.resetFormat()

    this.inside.innerHTML = ''

    let { theme } = this.options

    const newClasses = []
    for (let cls of this.el.classList) {
      if (cls.length) {
        var match

        if ((match = /^odometer-theme-(.+)$/.exec(cls))) {
          theme = match[1]
          continue
        }

        if (/^odometer(-|$)/.test(cls)) {
          continue
        }

        newClasses.push(cls)
      }
    }

    newClasses.push('odometer')

    if (theme) {
      newClasses.push(`odometer-theme-${theme}`)
    } else {
      // This class matches all themes, so it should do what you'd expect if only one
      // theme css file is brought into the page.
      newClasses.push('odometer-auto-theme')
    }

    this.el.className = newClasses.join(' ')

    this.ribbons = {}

    this.formatDigits(value)

    return this.startWatchingMutations()
  }

  formatDigits(value) {
    let digit
    this.digits = []

    if (this.options.formatFunction) {
      const valueString = this.options.formatFunction(value)
      for (let valueDigit of valueString.split('').reverse()) {
        if (valueDigit.match(/[0-9]/)) {
          digit = this.renderDigit()
          digit.querySelector('.odometer-value').innerHTML = valueDigit
          this.digits.push(digit)
          this.insertDigit(digit)
        } else {
          this.addSpacer(valueDigit)
        }
      }
    } else {
      let v = Math.abs(value)
      let fractionalCount = Math.max(
        this.format.fractional,
        this.getFractionalDigitCount(v)
      )
      if (fractionalCount) {
        v = Math.round(v * Math.pow(10, fractionalCount))
      }
      let i = 0
      while (v > 0) {
        this.addDigit((v % 10).toString(), i >= fractionalCount)
        v = Math.floor(v / 10)
        i++
        if (i === fractionalCount) {
          this.addDigit('.', true)
        }
      }

      // Pad with zeroes if under length
      let minIntegerLength = this.options.minIntegerLength || MIN_INTEGER_LEN;
      let renderedDigits = i - fractionalCount;
      while (renderedDigits++ < minIntegerLength) {
        this.addDigit(0, true);
      }

      if (value < 0) {
        this.addDigit('-', true)
      }
    }
  }

  update(newValue) {
    let diff = newValue - this.value
    newValue = this.cleanValue(newValue)

    if (!diff) {
      return
    }

    removeClass(
      this.el,
      'odometer-animating-up',
      'odometer-animating-down',
      'odometer-animating'
    )
    if (diff > 0) {
      addClass(this.el, 'odometer-animating-up')
    } else {
      addClass(this.el, 'odometer-animating-down')
    }

    this.stopWatchingMutations()
    this.animate(newValue)
    this.startWatchingMutations()

    setTimeout(() => {
      // Force a repaint
      this.el.offsetHeight

      return addClass(this.el, 'odometer-animating')
    }, 0)

    return (this.value = newValue)
  }

  renderDigit() {
    return createFromHTML(DIGIT_HTML)
  }

  insertDigit(digit, before) {
    if (before != null) {
      return this.inside.insertBefore(digit, before)
    } else if (!this.inside.children.length) {
      return this.inside.appendChild(digit)
    } else {
      return this.inside.insertBefore(digit, this.inside.children[0])
    }
  }

  addSpacer(chr, before, ...extraClasses) {
    const spacer = createFromHTML(FORMAT_MARK_HTML)
    spacer.innerHTML = chr
    if (extraClasses) {
      addClass(spacer, ...extraClasses)
    }
    return this.insertDigit(spacer, before)
  }

  addDigit(value, repeating = true) {
    if (value === '-') {
      return this.addSpacer(value, null, 'odometer-negation-mark')
    }

    if (value === '.') {
      return this.addSpacer(
        this.format.radix || '.',
        null,
        'odometer-radix-mark'
      )
    }

    if (repeating) {
      let resetted = false
      while (true) {
        if (!this.format.repeating.length) {
          if (resetted) {
            throw new Error('Bad odometer format without digits')
          }

          this.resetFormat()
          resetted = true
        }

        const chr = this.format.repeating[this.format.repeating.length - 1]
        this.format.repeating = this.format.repeating.substring(
          0,
          this.format.repeating.length - 1
        )

        if (chr === 'd') {
          break
        }

        this.addSpacer(chr)
      }
    }

    const digit = this.renderDigit()
    digit.querySelector('.odometer-value').innerHTML = value
    this.digits.push(digit)

    return this.insertDigit(digit)
  }

  animate(newValue) {
    if (this.options.animation === 'count') {
      return this.animateCount(newValue)
    } else {
      return this.animateSlide(newValue)
    }
  }

  animateCount(newValue) {
    let diff = +newValue - this.value,
      last = now(),
      tick
    if (!diff) {
      return
    }

    const start = last

    let cur = this.value
    return (tick = () => {
      if (now() - start > this.options.duration) {
        this.value = newValue
        this.render()
        return trigger(this.el, 'odometerdone')
      }

      const delta = now() - last

      if (delta > COUNT_MS_PER_FRAME) {
        last = now()

        const fraction = delta / this.options.duration
        const dist = diff * fraction

        cur += dist
        this.render(Math.round(cur))
      }

      return requestAnimationFrame(tick)
    })()
  }

  getDigitCount(...values) {
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      values[i] = Math.abs(value)
    }

    const max = Math.max(...values)

    return Math.ceil(Math.log(max + 1) / Math.log(10))
  }

  getFractionalDigitCount(...values) {
    // This assumes the value has already been rounded to
    // @format.precision places
    //
    const parser = /^\-?\d*\.(\d*?)0*$/
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      values[i] = value.toString()

      const parts = parser.exec(values[i])

      if (!parts) {
        values[i] = 0
      } else {
        values[i] = parts[1].length
      }
    }

    return Math.max(...values)
  }

  resetDigits() {
    this.digits = []
    this.ribbons = []
    this.inside.innerHTML = ''
    return this.resetFormat()
  }

  animateSlide(newValue) {
    let diff, frame, frames, i, start
    let asc, end1, k
    let oldValue = this.value

    const fractionalCount = Math.max(
      this.format.fractional,
      this.getFractionalDigitCount(oldValue, newValue)
    )

    if (fractionalCount) {
      newValue = Math.round(newValue * Math.pow(10, fractionalCount))
      oldValue = Math.round(oldValue * Math.pow(10, fractionalCount))
    }

    if (!(diff = newValue - oldValue)) {
      return
    }

    this.bindTransitionEnd()

    // check if we need to pad with zeroes
    let minIntegerLength = this.options.minIntegerLength || MIN_INTEGER_LEN
    const digitCount = Math.max(
      this.getDigitCount(oldValue, newValue),
      minIntegerLength + fractionalCount
    )

    const digits = []
    let boosted = 0
    // We create a array to represent the series of digits which should be
    // animated in each column
    for (
      k = 0, i = k, end1 = digitCount, asc = 0 <= end1;
      asc ? k < end1 : k > end1;
      asc ? k++ : k--, i = k
    ) {
      start = truncate(oldValue / Math.pow(10, digitCount - i - 1))
      const end = truncate(newValue / Math.pow(10, digitCount - i - 1))

      const dist = end - start

      if (Math.abs(dist) > this.MAX_VALUES) {
        // We need to subsample
        frames = []

        // Subsequent digits need to be faster than previous ones
        const incr =
          dist /
          (this.MAX_VALUES + this.MAX_VALUES * boosted * DIGIT_SPEEDBOOST)
        let cur = start

        while ((dist > 0 && cur < end) || (dist < 0 && cur > end)) {
          frames.push(Math.round(cur))
          cur += incr
        }

        if (frames[frames.length - 1] !== end) {
          frames.push(end)
        }

        boosted++
      } else {
        frames = __range__(start, end, true);
      }

      // We only care about the last digit
      for (i = 0; i < frames.length; i++) {
        frame = frames[i]
        frames[i] = Math.abs(frame % 10)
      }

      digits.push(frames)
    }

    this.resetDigits()

    const iterable = digits.reverse()
    for (i = 0; i < iterable.length; i++) {
      frames = iterable[i]
      if (!this.digits[i]) {
        this.addDigit(' ', i >= fractionalCount)
      }

      if (this.ribbons[i] == null) {
        this.ribbons[i] = this.digits[i].querySelector('.odometer-ribbon-inner')
      }
      this.ribbons[i].innerHTML = ''

      if (diff < 0) {
        frames = frames.reverse()
      }

      for (let j = 0; j < frames.length; j++) {
        frame = frames[j]
        const numEl = document.createElement('div')
        numEl.className = 'odometer-value'
        numEl.innerHTML = frame

        this.ribbons[i].appendChild(numEl)

        if (j === frames.length - 1) {
          addClass(numEl, 'odometer-last-value')
        }
        if (j === 0) {
          addClass(numEl, 'odometer-first-value')
        }
      }
    }

    if (start < 0) {
      this.addDigit('-')
    }

    const mark = this.inside.querySelector('.odometer-radix-mark')
    if (mark) {
      mark.parent.removeChild(mark)
    }

    if (fractionalCount) {
      return this.addSpacer(
        this.format.radix,
        this.digits[fractionalCount - 1],
        'odometer-radix-mark'
      )
    }
  }
}

Odometer.options = window.odometerOptions || {}

document.addEventListener('DOMContentLoaded', () => {
  if (Odometer.options.auto !== false) {
    return Odometer.init()
  }
})

if (typeof define === 'function' && define.amd) {
  // AMD. Register as an anonymous module.
  define([], () => Odometer)
} else if (typeof exports !== 'undefined' && exports != null) {
  // CommonJS
  module.exports = Odometer
} else {
  // Browser globals
  window.Odometer = Odometer
}

function __range__(left, right, inclusive) {
  let range = []
  let step = left < right ? 1 : -1;
  let end = !inclusive ? right : right + step;
  while (left !== end) {
    range.push(left);
    left += step;
  }
  return range
}
