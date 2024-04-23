# DocMath

Code to embed in your documentation to make LaTeX math interactive.

## Installation

Include the following code in the head of your document:

### `<head>`

```html
<!-- Stylesheets -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.10.0-rc.1/dist/katex.css">
<link rel="stylesheet" href="https://raw.githubusercontent.com/marcusfrdk/docmath/main/index.css">

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/katex@0.10.0-rc.1/dist/katex.js"></script>
<script src="https://raw.githubusercontent.com/marcusfrdk/docmath/main/index.js"></script>
```

### `<body>`

```html
<div id="output"></div>
<div id="input"></div>

<script>
  // KaTeX
  // - {{output}} is the output of the compute() function.
  // - {{...key}} is each key in the initialize() object, such as {{a}} and {{b}} in this example.
  const template = "{{output}} = {{a}} + {{b}}";
  
  // The function to compute {{output}}.
  // ({a, b, ...}: Record<string, string>) => number
  function compute({a, b, ...}){
    return a + b;
  }

  // Initialize the input fields and values
  //
  // initialize(values, options?);
  //
  // values: {
  //   [id]: {
  //     value: number, // optional
  //     step: number | string, // optional
  //     min: number | string, // optional
  //     max: number | string, // optional
  //   }
  // }
  //
  // options: {
  //   fractions: number,
  // }
  //
  initialize({
    a: {
      value: number,
      step: number,
      min: number,
      max: "b", // the value of b will be used (updates when "b" changes)
    },
    b: {
      value: 1
    }, 
    ...
  });
</script>
```

## KaTeX


<!-- The rendering of the math is done by [KaTeX](https://katex.org/), a fast LaTeX math renderer for the web.

Since it is a minimal version of LaTeX, it does not support everything that LaTeX does. You can find a list of supported functions [here](https://katex.org/docs/supported.html). -->
