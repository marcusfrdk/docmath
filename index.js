let _values;
let _options;
let _references;

let template;
let displayElement;
let interactiveElement;

// const displayElement = document.getElementById('output');
// const interactiveElement = document.getElementById('input');

function onInput(event){
  console.log(event);
}

function initialize(initial, options){
  // Error handling
  if(typeof template !== "string"){
    throw new Error("Invalid template string");
  }

  if(typeof compute !== "function"){
    throw new Error("Invalid compute function");
  }

  // Parent nodes
  displayElement = document.createElement('div');
  displayElement.id = 'display';
  
  interactiveElement = document.createElement('div');
  interactiveElement.id = 'interactive';
  
  // Values
  const inputAttributes = ["value", "step", "min", "max"];

  const values = {};
  const keys = Object.keys(initial);
  const references = keys.reduce((acc, key) => {
    acc[key] = {};
    return acc;
  }, {});

  Object.entries(initial).forEach(([key, config]) => {
    values[key] = {};
    
    // Default values
    inputAttributes.forEach(attribute => {
      if(typeof config[attribute] !== "undefined"){
        values[key][attribute] = config[attribute];
      }
    });
    
    // References
    Object.entries(config).forEach(([attribute, value]) => {
      if(typeof value === "string"){
        // Check if key exists
        if(keys.includes(value)){
          // Add reference to referenced node
          if(Array.isArray(references[value][key])){
            references[value][key].push(attribute);
          } else {
            references[value][key] = [attribute];
          }
  
          // Set value
          // values[key][attribute] = initial[value]?.[attribute];
          values[key][attribute] = initial[value].value;
        }
      }
    });
  });

  // Child nodes
  Object.entries(values).forEach(([key, attribute]) => {
    const containerElement = document.createElement('div');

    const labelElement = document.createElement('label');
    labelElement.textContent = key;
    containerElement.appendChild(labelElement);

    const inputElement = document.createElement('input');
    inputElement.id = key;
    inputElement.type = "number";
    
    Object.entries(attribute).forEach(([attribute, value]) => {
      if(typeof value !== "undefined"){
        inputElement[attribute] = value;
      }
    });

    containerElement.appendChild(inputElement);
    interactiveElement.appendChild(containerElement);
  })
  
  
  // Set globals
  _references = references;
  _values = values;
  _options = options;

  // console.log("Values:", _values);
  console.log("References:", _values["a"]);

  document.body.appendChild(displayElement);
  document.body.appendChild(interactiveElement);

  // Register event listeners
  Object.keys(_values).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.addEventListener('input', onInput);
  });
}

function onUnload(){
  Object.keys(_values).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.removeEventListener('input', onInput);
  });
}