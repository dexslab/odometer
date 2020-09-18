Odometer
========

Odometer is a Javascript and CSS library for smoothly transitioning numbers.

## Overview

Odometer is a Javascript and CSS library for smoothly transitioning numbers. See the demo page for some examples.

Odometer's animations are handled entirely in CSS using transforms making them extremely performant, with automatic fallback on older browsers.

The library and largest theme is less than 3kb when minified and compressed.

All of the themes can be resized by setting the font-size of the .odometer element.

### [Demo](http://github.hubspot.com/odometer)

### Usage
```
var el = document.querySelector('.some-element');

od = new Odometer({
  el: el,
  value: 333555,

  // Any option (other than auto and selector) can be passed in here
  format: '',
  theme: 'digital'
});

od.update(555)
// or
el.innerHTML = 555
```

You can set options by creating a odometerOptions object:

```
window.odometerOptions = {
  auto: false, // Don't automatically initialize everything with class 'odometer'
  selector: '.my-numbers', // Change the selector used to automatically find things to be animated
  format: '(,ddd).dd', // Change how digit groups are formatted, and how many digits are shown after the decimal point
  minIntegerLength: 0, // Pad with leading zeroes if the value has less digits.
  duration: 3000, // Change how long the javascript expects the CSS animation to take
  theme: 'car', // Specify the theme (if you have more than one theme css file on the page)
  animation: 'count' // Count is a simpler animation method which just increments the value,
                     // use it when you're looking for something more subtle.
};
```

### Format
```
The format option allows you to configure how the digit groups are formatted, and how many digits are shown after the decimal point.

Format    -  Example
(,ddd)    -  12,345,678
(,ddd).dd -  12,345,678.09 (lowercase `d` omits decimal zeroes)
(,ddd).DD -  12,345,678.00 (uppercase `D` adds trailing zeros)
(.ddd),dd -  12.345.678,09
( ddd),dd -  12 345 678,09
d         -  12345678
```

### Browser support (caution!)
This version is for modern browsers supporting native ES2015 features like arrow functions, classes, default arguments and spread operator. As of 2020 that is the following browser versions
Edge 13+
Firefox 45+ (79+ on Android)
Chrome 49+ (85 on Android)
Safari 9+ (iOS Safari 9+)
Opera 36+ (46+ on mobile)
Samsung browser 5+.

### Dependencies
None!
