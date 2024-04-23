# DocMath

Code to embed in your documentation to make LaTeX math interactive.

## Usage

Include the following code in the head of your document:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.10.0-rc.1/dist/katex.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.10.0-rc.1/dist/katex.js"></script>
```

## KaTeX

The rendering of the math is done by [KaTeX](https://katex.org/), a fast LaTeX math renderer for the web.

Since it is a minimal version of LaTeX, it does not support everything that LaTeX does. You can find a list of supported functions [here](https://katex.org/docs/supported.html).
