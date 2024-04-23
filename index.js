let _values;
let _options;
let _references;

let template;
let displayElement;
let interactiveElement;

// const displayElement = document.getElementById('output');
// const interactiveElement = document.getElementById('input');

function getResult(result){
  // console.log("result:", result);
  if(typeof result === "string") return result;
  else if(typeof result == "number") return String(result);
  else if(Array.isArray(result)){
    return result.map((value) => getResult(value)).join(", ");
  }
  else if(typeof result === "object"){
    // console.log("x:", result);
    // console.log(getResult(result[key]));
    return Object.keys(result).map((key) => `${key}: ${result[key]}`).join(", ");
  }

  return "-";
};

function recompute(){
  const values = Object.keys(_values).reduce((acc, key) => {
    const value = document.getElementById(key).value;
    acc[key] = value === "" ? key : Number(value);
    return acc;
  }, {});

  const result = getResult(compute(values));

  // Update display
  let output = template.replaceAll("{{output}}", result || "Error");

  Object.entries(values).forEach(([key, value]) => {
    console.log(key);
    output = output.replaceAll(`{{${key}}}`, value === 0 || value ? value : key);
  });

  displayElement.innerHTML = output;
};

function onInput(event){
  const id = event.srcElement.id;
  const node = document.getElementById(id);
  const config = _values[id];
  let value = node.value || undefined;

  // Validate
  if(typeof config.min !== "undefined" && value < config.min){
    value = config.min;
    node.value = value;
  }
  
  if(typeof config.max !== "undefined" && value > config.max){
    value = config.max;
    node.value = value;
  }

  // Update references
  if(_references[id]){
    Object.entries(_references[id]).forEach(([key, attributes]) => {
      attributes.forEach(attribute => {
        _values[key][attribute] = value;
        document.getElementById(key)[attribute] = value;
      });
    });
  }

  _values[id].value = value;

  recompute();
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
          // values[key][attribute] = initial[value]?.[attribute]; // Reference any attribute
          values[key][attribute] = initial[value].value; // Reference value only
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

  document.body.appendChild(displayElement);
  document.body.appendChild(interactiveElement);

  // Register event listeners
  Object.keys(_values).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.addEventListener("input", onInput);
  });

  // Render
  recompute();
}

function onUnload(){
  Object.keys(_values).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.removeEventListener("input", onInput);
  });
}