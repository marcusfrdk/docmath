let _values;
let _options;
let _references;
let template;
let displayElement;
let interactiveElement;

// const displayElement = document.getElementById('output');
// const interactiveElement = document.getElementById('input');

function initialize(values, options){
  // Error handling
  if(typeof template !== "string"){
    throw new Error("Invalid template string")
  }

  if(typeof compute !== "function"){
    throw new Error("Invalid compute function")
  }

  // Parent nodes
  displayElement = document.createElement('div');
  displayElement.id = 'display';
  
  interactiveElement = document.createElement('div');
  interactiveElement.id = 'interactive';
  
  // Compute
  
  // Child nodes
  document.body.appendChild(displayElement);
  document.body.appendChild(interactiveElement);

  // References

  // Set globals
  _values = values;
  _options = options;

  console.log(_values);

  // _references = keys.map(key => ({ [key]: {} }));


  // Object.entries(values).forEach(([key, config]) => {
  //   // // Get references
  //   // Object.entries(config).forEach(([attribute, value]) => {
  //   //   if(keys.includes(value)) {
  //   //     _references[key][attribute]
  //   //   }
  //   // });

  //   console.log(key, config);
  // });
}