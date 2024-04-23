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
<script>
  // KaTeX
  // - {{output}} is the output of the compute() function.
  // - {{...key}} is each key in the initialize() object, such as {{a}} and {{b}} in this example.
  template = "{{output}} = {{a}} + {{b}}";
  
  // The function to compute {{output}}.
  // ({a, b, ...}: Record<string, number>) => number
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
      value: 1,
      step: 0.1,
      min: 0,
      max: "b", // The value of "b" (synced with the value of "b)
    },
    b: {
      value: 10
    }, 
    ...
  });
</script>
```

## Template

The template used to render the interactive math is a string that containes the KaTeX math and the variables to be replaced.

KaTeX is a faster version of LaTeX that is used to render the math. You can find a list of supported functions [here](https://katex.org/docs/supported.html).

You can use any variable names in the template that are defined in the `initialize()` function. The `{{output}}` variable is the result of the `compute()` function.
