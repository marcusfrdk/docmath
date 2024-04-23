let fractions;
let equations;

let _config;
let _values;
let _references;

let _variables;
let _answers;

const DEFAULT_FRACTIONS = 3;

// --- COMPUTE ---
function recompute(){
  const args =  Object.keys(_values)
  .filter(key => _variables.includes(key))
  .reduce((obj, key) => {
    obj[key] = _values[key];
    return obj;
  }, {});

  let values = {
    ..._values,
    ...compute(args)
  };

  // Apply fractions
  if(typeof fractions !== "number"){
    fractions = DEFAULT_FRACTIONS;
  }

  Object.entries(values).forEach(([key, value]) => {
    if(typeof value === "number"){
      console.log(fractions);
      if(fractions === 0){
        values[key] = Math.floor(value);
      } else {
        values[key] = parseFloat(value.toFixed(fractions));
      };
    };
  });

  // Update equations
  equations.forEach((equation, index) => {
    let output = equation;
    
    Object.entries(values).forEach(([key, value]) => {
      const val = value || key;
      output = output.replaceAll(`{{${key}}}`, val);
    });

    const equationElement = document.getElementById(`equation-${index + 1}`);
    equationElement.innerHTML = katex.renderToString(output, {throwOnError: false});
  });
}

function onUpdate(event){
  const id = event.srcElement.id;
  const node = document.getElementById(id);
  const config = _config[id];

  let value = parseFloat(node.value) ?? undefined;

  // Validate
  if(typeof config.min !== "undefined" && value < config.min){
    value = config.min;
    node.value = value;
  }
  
  if(typeof config.max !== "undefined" && value > config.max){
    value = config.max;
    node.value = value;
  }

  // Update incoming references
  if(_references[id]){
    Object.entries(_references[id]["i"]).forEach(([key, attributes]) => {
      attributes.forEach(attribute => {
        _config[key][attribute] = value;
        document.getElementById(key)[attribute] = value;
      });
    });
  }

  _values[id] = Number(value);

  // console.log("Config:", _config);
  // console.log("Values:", _values);
  // console.log("References:", _references);
  // console.log()

  recompute();
};

// --- INITIALIZATION ---
function parseEquations(){
  if(typeof equations === "string") equations = [equations];

  // create a new set
  let _variables = new Set();
  let _answers = new Set();

  equations.forEach((equation, index) => {
    const ans_regex = /=\s*\{\{([^{}]+)\}\}$/g;
    const ans_match = ans_regex.exec(equation);
    
    if(ans_match) _answers.add(ans_match[1]);

    const var_matches = equation.match(/{{(.*?)}}/g).map((match) => match.replace(/{{|}}/g, ""));
    
    var_matches.forEach((var_match) => {
      if(!_answers.has(var_match)) {
        _variables.add(var_match);
      };
    });
  });

  return [[..._variables], [..._answers]];
}

function init(config){
  // Equations
  if(typeof equations === "undefined"){
    throw new Error("No equations are defined.")
  }
  
  const [variableDefinitions, answerDefinitions] = parseEquations(equations);

  // Check if any values are both defined and computed
  const common = variableDefinitions.filter(value => answerDefinitions.includes(value));
  if(common.length > 0){
    throw new Error(`Variable${common.length === 1 ? "" : "s"} ${common.join(", ")} ${common.length === 1 ? "is" : "are"} both defined and computed.`);
  }

  // Undefined variables
  variableDefinitions.forEach(key => {
    if(!config.hasOwnProperty(key)){
      throw new Error(`Undefined variable '${key}' in config.`);
    }
  });

  // Answer defined in config
  answerDefinitions.forEach(key => {
    if(config.hasOwnProperty(key)){
      throw new Error(`Cannot define variable '${key}' in config since it is a computed value.`);
    }
  });

  _variables = variableDefinitions;
  _answers = answerDefinitions;

  // Validate compute function
  if(typeof compute === "undefined"){
    throw new Error("No compute function is defined.")
  }

  const computeString = compute.toString();
  const returnRegex = /return\s+((?:[^;\n]*\{[^\}]*\})|(?:[^;\n]*))(?=(;|\/\/|\/\*|$))/gm;
  const returnMatch = returnRegex.exec(computeString);
  
  if(!returnMatch){
    throw new Error("No return statement found in compute function.");
  }
  
  const returnStatement = (returnMatch.length < 1 ? returnMatch.join("") : returnMatch[1]).replace(/\s|\/\//g, "");

  const returnVariables = [...new Set(returnStatement.match(/(?:\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b(?=\s*(?::|\,|\})))+/g))];

  
  const missingVariables = answerDefinitions.filter(variable => !returnVariables.includes(variable));
  const redundantVariables = returnVariables.filter(variable => !answerDefinitions.includes(variable));

  if(missingVariables.length > 0){
    throw new Error(`Missing variable${missingVariables.length === 1 ? "" : "s"} ${missingVariables.join(", ")} in the compute function's return value.`);
  }

  if(redundantVariables.length > 0){
    throw new Error(`Redundant variable${redundantVariables.length === 1 ? "" : "s"} ${redundantVariables.join(", ")} in the compute function's return value.`);
  }

  // Fractions
  if(typeof fractions !== "undefined"){
    if(typeof fractions !== "number"){
      throw new Error("Fractions must be a number.");
    }

    if(fractions < 0){
      throw new Error("Fractions must be a positive integer.");
    }
  }

  // Types
  const validTypes = {
    "min": ["number", "string", "undefined"],
    "max": ["number", "string", "undefined"],
    "value": ["number", "undefined"],
    "step": ["number", "undefined"],
  };

  Object.entries(config).forEach(([key, value]) => {
    if(typeof value !== "object"){
      throw new Error(`Invalid type for '${key}'.`);
    }

    Object.entries(value).forEach(([attribute, val]) => {
      if(!validTypes.hasOwnProperty(attribute)){
        throw new Error(`Invalid attribute '${attribute}' for '${key}'.`);
      }

      if(!validTypes[attribute].includes(typeof val)){
        const expectedTypes = validTypes[attribute].join(", ");
        throw new Error(`Invalid type for '${key}.${attribute}', got '${typeof val}', expected one of ${expectedTypes}.`);
      }
    });
  });

  // References
  const configKeys = Object.keys(config);
  const referenceAttributes = ["min", "max"];
  const references = configKeys.reduce((acc, key) => {
    acc[key] = {i: {}, o: {}};
    return acc;
  }, {});

  Object.entries(config).forEach(([key, value]) => {
    referenceAttributes.forEach(attribute => {
      if(typeof value[attribute] === "string"){
        // Undefined reference
        if(!configKeys.includes(value[attribute])){
          if(answerDefinitions.includes(value[attribute])){
            throw new Error(`Only static values can be referenced at the moment, found computed value '${value[attribute]}' for '${key}.${attribute}'.`)
          } else {
            throw new Error(`Undefined reference '${value[attribute]}' for '${key}.${attribute}'.`);
          }
        }

        // Self reference
        if(value[attribute] === key){
          throw new Error(`Self reference found for '${key}.${attribute}'.`);
        }

        // Add reference
        if(Array.isArray(references[key][value[attribute]])){
          references[key]["o"][value[attribute]].push(attribute);
          references[value[attribute]]["i"][key].push(attribute);
        } else {
          references[key]["o"][value[attribute]] = [attribute];
          references[value[attribute]]["i"][key] = [attribute];
        }
      }
    });
  });

  // Circular references
  Object.entries(references).forEach(([key, value]) => {
    Object.entries(value["o"]).forEach(([ref, attributes]) => {
      if(value["i"].hasOwnProperty(ref)){
        throw new Error(`Circular reference between '${key}' and '${ref}'.`);
      }
    });
  });

  // Update config
  Object.entries(config).forEach(([key, value]) => {
    referenceAttributes.forEach(attribute => {
      if(typeof value[attribute] === "string"){
        config[key][attribute] = config[value[attribute]][attribute];
      }
    });
  });

  // Set global variables
  _config = config;
  _references = references;
  _values = Object.entries(config).reduce((acc, [key, value]) => {
    acc[key] = typeof value.value === "number" ? value.value : NaN;
    return acc;
  }, {});

  // DOM
  const inputAttributes = ["step", "min", "max", "value"];

  const equationsElement = document.createElement("div");
  equationsElement.id = "equations";

  const variablesElement = document.createElement("form");
  variablesElement.id = "variables";

  equations.forEach((_, index) => {
    const equationElement = document.createElement("div");
    equationElement.id = `equation-${index + 1}`;
    equationElement.className = "equation";
    equationsElement.appendChild(equationElement);
  });

  variableDefinitions.forEach((variable) => {
    const containerElement = document.createElement("div");

    const labelElement = document.createElement("label");
    labelElement.for = variable;
    labelElement.textContent = variable;

    const inputElement = document.createElement("input");
    inputElement.id = variable;
    inputElement.name = variable;
    inputElement.type = "number";

    // Set attributes
    inputAttributes.forEach((attribute) => {
      let value;

      if(referenceAttributes.includes(attribute)){
        const key = _config[variable][attribute];
        value = typeof _values[key] === "number" ? _values[key] : _config[variable][attribute];
      } else {
        value = _config[variable][attribute];
      }

      if(typeof value !== "undefined"){
        inputElement.setAttribute(attribute, value);
      }
    });

    containerElement.appendChild(labelElement);
    containerElement.appendChild(inputElement);
    variablesElement.appendChild(containerElement);
  });

  document.body.appendChild(equationsElement);
  document.body.appendChild(variablesElement);

  // Add event listeners
  Object.keys(_config).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.addEventListener("input", onUpdate);
  });

  recompute();
}

function onUnload(){
  Object.keys(_config).forEach(key => {
    const inputElement = document.getElementById(key);
    inputElement.removeEventListener("input", onUpdate);
  });
}